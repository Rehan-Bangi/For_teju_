import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { UniverseQualityManager } from './UniverseQualityManager';

// ─── StarBloom ────────────────────────────────────────────────────────────────
// Additive fullscreen quad that softly blooms the star layer during finale

const BLOOM_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BLOOM_FRAG = `
  uniform float uIntensity;
  uniform float uTime;
  uniform vec3  uColor;
  varying vec2  vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 17.5);
    return fract(p.x * p.y);
  }

  void main() {
    vec2 uv = vUv - 0.5;
    float radial = 1.0 - smoothstep(0.0, 0.5, length(uv));
    float pulse = sin(uTime * 0.6) * 0.15 + 0.85;
    float noise = hash(uv * 8.0 + uTime * 0.05) * 0.08;
    float alpha = radial * uIntensity * pulse + noise * uIntensity;
    gl_FragColor = vec4(uColor * (radial * 1.2), alpha * 0.18);
  }
`;

interface StarBloomProps {
  intensity: number; // 0→1
}

export const StarBloom = React.memo(function StarBloom({ intensity }: StarBloomProps) {
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(40, 40);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uIntensity: { value: 0 },
        uTime:      { value: 0 },
        uColor:     { value: new THREE.Vector3(0.7, 0.5, 1.0) },
      },
      vertexShader:   BLOOM_VERT,
      fragmentShader: BLOOM_FRAG,
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
      side:        THREE.DoubleSide,
    });
    return { geometry: geo, material: mat };
  }, []);

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  useFrame((state) => {
    if (!material.uniforms) return;
    material.uniforms.uTime!.value      = state.clock.elapsedTime;
    material.uniforms.uIntensity!.value +=
      (intensity - material.uniforms.uIntensity!.value) * 0.04;
  });

  return (
    <mesh geometry={geometry} material={material} position={[0, 0, -6]} />
  );
});

// ─── FinaleParticleSurge ──────────────────────────────────────────────────────
// Extra burst layer of spiralling particles — only visible at high intensity

const MAX_SURGE = 120;

const SURGE_VERT = `
  attribute float phase;
  attribute float radius;
  attribute float speed;
  attribute float active;
  uniform float uTime;
  uniform float uIntensity;
  uniform float uPixelRatio;
  varying float vAlpha;
  varying float vHue;

  void main() {
    if (active < 0.5 || uIntensity < 0.01) {
      gl_Position = vec4(0.0);
      gl_PointSize = 0.0;
      vAlpha = 0.0;
      return;
    }

    float t = uTime * speed + phase;
    float r = radius * (0.6 + sin(t * 0.7) * 0.4);
    vec3 pos;
    pos.x = cos(t) * r;
    pos.y = sin(t * 1.3 + phase) * r * 0.5;
    pos.z = sin(t * 0.5) * r * 0.3;

    float pulse = sin(uTime * speed * 3.0 + phase) * 0.35 + 0.65;
    vAlpha = pulse * uIntensity * (0.5 + radius * 0.1);
    vHue = fract(phase / 6.283);

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (2.5 + radius * 0.4) * (200.0 / -mvPos.z) * uPixelRatio * pulse;
    gl_Position  = projectionMatrix * mvPos;
  }
`;

const SURGE_FRAG = `
  uniform float uTime;
  varying float vAlpha;
  varying float vHue;

  vec3 hsl2rgb(float h) {
    float r = abs(h * 6.0 - 3.0) - 1.0;
    float g = 2.0 - abs(h * 6.0 - 2.0);
    float b = 2.0 - abs(h * 6.0 - 4.0);
    return clamp(vec3(r, g, b), 0.0, 1.0);
  }

  void main() {
    vec2  uv   = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;
    float core = smoothstep(0.5, 0.0, dist);
    float glow = exp(-dist * 3.5) * 0.5;
    vec3  col  = mix(hsl2rgb(vHue + 0.6), vec3(1.0), 0.4);
    gl_FragColor = vec4(col, (core + glow) * vAlpha);
  }
`;

interface FinaleParticleSurgeProps {
  intensity: number;
}

export const FinaleParticleSurge = React.memo(function FinaleParticleSurge({
  intensity,
}: FinaleParticleSurgeProps) {
  const qm = useMemo(() => UniverseQualityManager.getInstance(), []);

  const { geometry, material } = useMemo(() => {
    const count = MAX_SURGE;
    const phases    = new Float32Array(count);
    const radii     = new Float32Array(count);
    const speeds    = new Float32Array(count);
    const active    = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      phases[i]  = Math.random() * Math.PI * 2;
      radii[i]   = 0.5 + Math.random() * 3.5;
      speeds[i]  = 0.2 + Math.random() * 0.8;
      active[i]  = 1;
    }

    // Dummy positions (shader computes actual position from phase+radius)
    const positions = new Float32Array(count * 3);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('phase',    new THREE.BufferAttribute(phases,    1));
    geo.setAttribute('radius',   new THREE.BufferAttribute(radii,     1));
    geo.setAttribute('speed',    new THREE.BufferAttribute(speeds,    1));
    geo.setAttribute('active',   new THREE.BufferAttribute(active,    1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:       { value: 0 },
        uIntensity:  { value: 0 },
        uPixelRatio: { value: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1 },
      },
      vertexShader:   SURGE_VERT,
      fragmentShader: SURGE_FRAG,
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    });

    return { geometry: geo, material: mat };
  }, []);

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  useFrame((state) => {
    if (!material.uniforms) return;
    material.uniforms.uTime!.value = state.clock.elapsedTime;
    // Smooth intensity ramp — no hard cuts. Low-tier devices get zero contribution
    // via target intensity instead of unmounting, avoiding Strict Mode re-create churn.
    const tier = qm.getProfile().tier;
    const targetIntensity = tier === 'low' ? 0 : intensity;
    material.uniforms.uIntensity!.value +=
      (targetIntensity - material.uniforms.uIntensity!.value) * 0.03;
  });

  return <points geometry={geometry} material={material} />;
});

// ─── CinematicAtmosphere ──────────────────────────────────────────────────────
// Letterbox vignette + colour shift overlay rendered as a DOM layer
// (avoids extra draw call for a full-screen quad on low-end)

interface CinematicAtmosphereProps {
  intensity: number;
  fogColor: string;
}

export function CinematicAtmosphere({ intensity, fogColor }: CinematicAtmosphereProps) {
  const smoothRef = useRef(0);
  const rafRef    = useRef<number>(0);
  const divRef    = useRef<HTMLDivElement>(null);
  const lbTopRef  = useRef<HTMLDivElement>(null);
  const lbBotRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let running = true;

    const tick = () => {
      if (!running) return;
      smoothRef.current += (intensity - smoothRef.current) * 0.04;
      const s = smoothRef.current;

      if (divRef.current) {
        divRef.current.style.opacity = String(s * 0.55);
      }
      // Letterbox height: 0px at intensity=0, 28px at intensity=1
      const lbH = `${s * 28}px`;
      if (lbTopRef.current)  lbTopRef.current.style.height  = lbH;
      if (lbBotRef.current)  lbBotRef.current.style.height  = lbH;

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [intensity]);

  return (
    <>
      {/* Chromatic vignette */}
      <div
        ref={divRef}
        style={{
          position:      'absolute',
          inset:         0,
          pointerEvents: 'none',
          zIndex:        15,
          background:    `
            radial-gradient(ellipse at 50% 50%, transparent 30%, ${fogColor}cc 100%),
            linear-gradient(180deg, ${fogColor}44 0%, transparent 15%, transparent 85%, ${fogColor}66 100%)
          `,
          mixBlendMode:  'multiply',
          opacity:       0,
          transition:    'none',
        }}
      />
      {/* Letterbox top */}
      <div
        ref={lbTopRef}
        style={{
          position:      'absolute',
          top:           0,
          left:          0,
          right:         0,
          height:        0,
          background:    '#000',
          pointerEvents: 'none',
          zIndex:        16,
        }}
      />
      {/* Letterbox bottom */}
      <div
        ref={lbBotRef}
        style={{
          position:      'absolute',
          bottom:        0,
          left:          0,
          right:         0,
          height:        0,
          background:    '#000',
          pointerEvents: 'none',
          zIndex:        16,
        }}
      />
    </>
  );
}

// ─── FinaleEffects3D (composed 3D entry point) ────────────────────────────────

interface Finale3DProps { intensity: number; }

export const FinaleEffects3D = React.memo(function FinaleEffects3D({
  intensity,
}: Finale3DProps) {
  // Always render — children gate themselves via shader uniforms.
  // Conditional unmounting causes double-disposal in React Strict Mode.
  return (
    <>
      <StarBloom intensity={intensity} />
      <FinaleParticleSurge intensity={intensity} />
    </>
  );
});
