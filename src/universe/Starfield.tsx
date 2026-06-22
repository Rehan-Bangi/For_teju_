import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { UNIVERSE_DEFAULTS } from './universe.config';
import { UniverseQualityManager } from './UniverseQualityManager';

interface StarfieldProps {
  count?: number;
  twinkleSpeed?: number;
  brightness?: number;
  radius?: number;
}

const LAYER_COUNT = 3;
const LAYER_SPLITS = [0.5, 0.3, 0.2];
// Allocate geometry for the maximum possible star count to avoid re-allocation
const MAX_STARS = 5000;

const VERTEX_SHADER = `
  attribute float size;
  attribute float phase;
  attribute float layer;
  attribute float active;
  uniform float uTime;
  uniform float uTwinkleSpeed;
  uniform float uBrightness;
  uniform float uPixelRatio;
  varying float vAlpha;
  varying float vLayer;

  void main() {
    if (active < 0.5) {
      gl_Position = vec4(0.0);
      gl_PointSize = 0.0;
      vAlpha = 0.0;
      return;
    }
    vLayer = layer;
    float twinkle = sin(uTime * uTwinkleSpeed + phase) * 0.5 + 0.5;
    float layerFade = 1.0 - layer * 0.2;
    vAlpha = twinkle * uBrightness * layerFade;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float distFade = clamp(1.0 - length(mvPosition.xyz) / 60.0, 0.0, 1.0);
    vAlpha *= distFade;
    gl_PointSize = size * (300.0 / -mvPosition.z) * uPixelRatio * (0.8 + twinkle * 0.4);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = `
  varying float vAlpha;
  varying float vLayer;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;
    float circle = 1.0 - smoothstep(0.0, 0.5, dist);
    float glow = exp(-dist * 4.0) * 0.4;
    float alpha = (circle + glow) * vAlpha;
    vec3 color = mix(vec3(0.8, 0.9, 1.0), vec3(1.0, 0.97, 0.9), vLayer * 0.3);
    gl_FragColor = vec4(color, alpha);
  }
`;

// Build static position/size/phase/layer data for MAX_STARS once
function buildStaticStarData(radius: number) {
  const positions = new Float32Array(MAX_STARS * 3);
  const sizes     = new Float32Array(MAX_STARS);
  const phases    = new Float32Array(MAX_STARS);
  const layers    = new Float32Array(MAX_STARS);

  let idx = 0;
  for (let l = 0; l < LAYER_COUNT; l++) {
    const lCount = Math.floor(MAX_STARS * LAYER_SPLITS[l]);
    const lRadius = radius * (0.5 + l * 0.25);
    for (let i = 0; i < lCount && idx < MAX_STARS; i++, idx++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = lRadius * (0.7 + Math.random() * 0.3);
      positions[idx * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[idx * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[idx * 3 + 2] = r * Math.cos(phi);
      sizes[idx]   = (0.3 + Math.random() * 0.7) * (1 - l * 0.15);
      phases[idx]  = Math.random() * Math.PI * 2;
      layers[idx]  = l;
    }
  }
  return { positions, sizes, phases, layers };
}

let _staticData: ReturnType<typeof buildStaticStarData> | null = null;
// Intentional module-level cache: built once for MAX_STARS regardless of `radius`.
// `radius` does not change at runtime in this app, so this trade-off avoids re-generating
// the full star field on every mount (including React Strict Mode's double-invoke).
function getStaticStarData(radius: number) {
  if (!_staticData) _staticData = buildStaticStarData(radius);
  return _staticData;
}

export const Starfield = React.memo(function Starfield({
  count = 3000,
  twinkleSpeed = 1.0,
  brightness = 0.9,
  radius = UNIVERSE_DEFAULTS.starfieldRadius,
}: StarfieldProps) {
  const meshRef   = useRef<THREE.Points>(null);
  const qm        = useMemo(() => UniverseQualityManager.getInstance(), []);
  const activeRef = useRef(0);

  const { geometry, material, activeAttr } = useMemo(() => {
    const { positions, sizes, phases, layers } = getStaticStarData(radius);
    const active = new Float32Array(MAX_STARS);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sizes,     1));
    geo.setAttribute('phase',    new THREE.BufferAttribute(phases,    1));
    geo.setAttribute('layer',    new THREE.BufferAttribute(layers,    1));
    const activeAttribute = new THREE.BufferAttribute(active, 1);
    activeAttribute.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('active', activeAttribute);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:        { value: 0 },
        uTwinkleSpeed:{ value: twinkleSpeed },
        uBrightness:  { value: brightness },
        uPixelRatio:  { value: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1 },
      },
      vertexShader:   VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    });

    return { geometry: geo, material: mat, activeAttr: activeAttribute };
  }, [radius]);

  // Update active star mask when count changes (pool approach, no reallocation)
  useEffect(() => {
    const scaledCount = Math.min(qm.applyToStarCount(count), MAX_STARS);
    if (activeRef.current === scaledCount) return;
    activeRef.current = scaledCount;
    const arr = activeAttr.array as Float32Array;
    for (let i = 0; i < MAX_STARS; i++) arr[i] = i < scaledCount ? 1 : 0;
    activeAttr.needsUpdate = true;
  }, [count, qm, activeAttr]);

  // Cleanup on unmount
  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame((state, delta) => {
    const u = material.uniforms;
    u.uTime.value         = state.clock.elapsedTime;
    u.uTwinkleSpeed.value = twinkleSpeed;
    u.uBrightness.value   = brightness;

    if (meshRef.current) {
      const rotSpeed = qm.getProfile().tier === 'low' ? 0.003 : 0.005;
      meshRef.current.rotation.y += delta * rotSpeed;
      meshRef.current.rotation.x += delta * rotSpeed * 0.4;
    }
  });

  return <points ref={meshRef} geometry={geometry} material={material} />;
});
