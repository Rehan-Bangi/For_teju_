import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { UNIVERSE_DEFAULTS } from './universe.config';
import { UniverseQualityManager } from './UniverseQualityManager';

interface ParticleSystemProps {
  count?: number;
  speed?: number;
  size?: number;
  colors?: string[];
  bounds?: number;
}

function hexToRgbNorm(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const MAX_PARTICLES = 200;

function buildParticleData(bounds: number) {
  const positions   = new Float32Array(MAX_PARTICLES * 3);
  const phases      = new Float32Array(MAX_PARTICLES * 3);
  const amplitudes  = new Float32Array(MAX_PARTICLES);
  const frequencies = new Float32Array(MAX_PARTICLES * 3);
  // colorIndex: 0.0–4.0 baked per-vertex, avoids gl_VertexID (WebGL1 incompatible)
  const colorIndex  = new Float32Array(MAX_PARTICLES);

  for (let i = 0; i < MAX_PARTICLES; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * bounds * 2;
    positions[i * 3 + 1] = (Math.random() - 0.5) * bounds * 2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * bounds * 0.5;

    phases[i * 3]     = Math.random() * Math.PI * 2;
    phases[i * 3 + 1] = Math.random() * Math.PI * 2;
    phases[i * 3 + 2] = Math.random() * Math.PI * 2;

    amplitudes[i] = 0.3 + Math.random() * 0.7;

    frequencies[i * 3]     = 0.2 + Math.random() * 0.6;
    frequencies[i * 3 + 1] = 0.15 + Math.random() * 0.5;
    frequencies[i * 3 + 2] = 0.1 + Math.random() * 0.3;

    // Distribute colours evenly across 5 slots — stored as attribute, not gl_VertexID
    colorIndex[i] = i % 5;
  }

  return { positions, phases, amplitudes, frequencies, colorIndex };
}

let _particleData: ReturnType<typeof buildParticleData> | null = null;
// Intentional module-level cache: built once for MAX_PARTICLES regardless of `bounds`.
// `bounds` does not change at runtime in this app, so this trade-off avoids re-generating
// the full particle field on every mount (including React Strict Mode's double-invoke).
function getParticleData(bounds: number) {
  if (!_particleData) _particleData = buildParticleData(bounds);
  return _particleData;
}

// WebGL1/WebGL2/Mobile Safari compatible — no gl_VertexID, no integer attributes
const VERTEX_SHADER = `
  attribute vec3  phase;
  attribute float amplitude;
  attribute vec3  frequency;
  attribute float active;
  attribute float colorIndex;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uColorC;
  uniform vec3  uColorD;
  uniform vec3  uColorE;
  varying vec3  vColor;
  varying float vAlpha;

  vec3 pickColor(float idx) {
    if (idx < 0.5) return uColorA;
    if (idx < 1.5) return uColorB;
    if (idx < 2.5) return uColorC;
    if (idx < 3.5) return uColorD;
    return uColorE;
  }

  void main() {
    if (active < 0.5) {
      gl_Position  = vec4(0.0);
      gl_PointSize = 0.0;
      vAlpha       = 0.0;
      vColor       = vec3(0.0);
      return;
    }

    vColor = pickColor(colorIndex);

    float t = uTime * uSpeed;
    vec3 drift;
    drift.x = sin(t * frequency.x + phase.x) * amplitude * 0.8;
    drift.y = cos(t * frequency.y + phase.y) * amplitude * 0.6 + t * frequency.z * 0.3;
    drift.z = sin(t * frequency.z + phase.z) * amplitude * 0.3;

    vec3 pos   = position + drift;
    float pulse = sin(uTime * frequency.x * 2.0 + phase.x) * 0.3 + 0.7;
    vAlpha = pulse * amplitude;

    vec4 mvPos   = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = uSize * 400.0 / -mvPos.z * uPixelRatio * pulse;
    gl_Position  = projectionMatrix * mvPos;
  }
`;

const FRAGMENT_SHADER = `
  varying vec3  vColor;
  varying float vAlpha;

  void main() {
    vec2  uv   = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;
    float core = smoothstep(0.5, 0.0, dist);
    float glow = exp(-dist * 3.0) * 0.6;
    gl_FragColor = vec4(vColor, (core + glow) * vAlpha * 0.8);
  }
`;

export const ParticleSystem = React.memo(function ParticleSystem({
  count  = 100,
  speed  = 0.15,
  size   = 0.05,
  colors = ['#7eb8f7', '#a8d4ff', '#c5e3ff'],
  bounds = UNIVERSE_DEFAULTS.particleBounds,
}: ParticleSystemProps) {
  const qm        = useMemo(() => UniverseQualityManager.getInstance(), []);
  const activeRef = useRef(0);

  const { geometry, material, activeAttr } = useMemo(() => {
    const { positions, phases, amplitudes, frequencies, colorIndex } = getParticleData(bounds);
    const active = new Float32Array(MAX_PARTICLES);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position',   new THREE.BufferAttribute(positions,   3));
    geo.setAttribute('phase',      new THREE.BufferAttribute(phases,      3));
    geo.setAttribute('amplitude',  new THREE.BufferAttribute(amplitudes,  1));
    geo.setAttribute('frequency',  new THREE.BufferAttribute(frequencies, 3));
    geo.setAttribute('colorIndex', new THREE.BufferAttribute(colorIndex,  1));

    const activeAttribute = new THREE.BufferAttribute(active, 1);
    activeAttribute.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('active', activeAttribute);

    const safeColors = [...colors];
    while (safeColors.length < 5) safeColors.push(safeColors[safeColors.length - 1]);
    const [ca, cb, cc, cd, ce] = safeColors.slice(0, 5).map(hexToRgbNorm);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:       { value: 0 },
        uSpeed:      { value: speed },
        uSize:       { value: size },
        uPixelRatio: { value: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1 },
        uColorA:     { value: new THREE.Vector3(...ca) },
        uColorB:     { value: new THREE.Vector3(...cb) },
        uColorC:     { value: new THREE.Vector3(...cc) },
        uColorD:     { value: new THREE.Vector3(...cd) },
        uColorE:     { value: new THREE.Vector3(...ce) },
      },
      vertexShader:   VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    });

    return { geometry: geo, material: mat, activeAttr: activeAttribute };
  }, [bounds]); // colours/speed/size updated via uniforms, no geometry rebuild

  // Active mask — pool approach
  useEffect(() => {
    const scaledCount = Math.min(qm.applyToConfig({ count }).count, MAX_PARTICLES);
    if (activeRef.current === scaledCount) return;
    activeRef.current = scaledCount;
    const arr = activeAttr.array as Float32Array;
    for (let i = 0; i < MAX_PARTICLES; i++) arr[i] = i < scaledCount ? 1 : 0;
    activeAttr.needsUpdate = true;
  }, [count, qm, activeAttr]);

  // Colour uniforms — no geometry rebuild
  useEffect(() => {
    if (!material.uniforms) return;
    const safeColors = [...colors];
    while (safeColors.length < 5) safeColors.push(safeColors[safeColors.length - 1]);
    const [ca, cb, cc, cd, ce] = safeColors.slice(0, 5).map(hexToRgbNorm);
    material.uniforms.uColorA.value.set(...ca);
    material.uniforms.uColorB.value.set(...cb);
    material.uniforms.uColorC.value.set(...cc);
    material.uniforms.uColorD.value.set(...cd);
    material.uniforms.uColorE.value.set(...ce);
  }, [colors, material]);

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  useFrame((state) => {
    if (!material.uniforms) return;
    material.uniforms.uTime.value  = state.clock.elapsedTime;
    material.uniforms.uSpeed.value = speed;
    material.uniforms.uSize.value  = size;
  });

  return <points geometry={geometry} material={material} />;
});
