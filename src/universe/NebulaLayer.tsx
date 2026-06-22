import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { UNIVERSE_DEFAULTS } from './universe.config';
import { UniverseQualityManager } from './UniverseQualityManager';

interface NebulaLayerProps {
  colors?: string[];
  opacity?: number;
  speed?: number;
  scale?: number;
}

function hexToVec3(hex: string): THREE.Vector3 {
  const n = parseInt(hex.replace('#', ''), 16);
  return new THREE.Vector3(
    ((n >> 16) & 255) / 255,
    ((n >> 8) & 255) / 255,
    (n & 255) / 255,
  );
}

// Shader is static — defined once outside component
const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Octave count driven by uniform — single shader variant handles all quality tiers
const FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uOpacity;
  uniform float uOctaves;
  uniform vec3  uColor0;
  uniform vec3  uColor1;
  uniform vec3  uColor2;
  uniform vec3  uColor3;
  uniform vec3  uColor4;
  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p, float octaves) {
    float value = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for (int i = 0; i < 5; i++) {
      if (float(i) >= octaves) break;
      value += amp * noise(p * freq);
      amp  *= 0.5;
      freq *= 2.1;
    }
    return value;
  }

  void main() {
    vec2 uv = vUv - 0.5;
    float t = uTime * uSpeed * 1000.0;

    vec2 p1 = uv * 2.5 + vec2(t * 0.3,  t * 0.2);
    vec2 p2 = uv * 1.8 + vec2(-t * 0.2, t * 0.35);
    vec2 p3 = uv * 3.2 + vec2(t * 0.15, -t * 0.25);

    float n1 = fbm(p1, uOctaves);
    float n2 = fbm(p2 + n1 * 0.8, uOctaves);
    float n3 = fbm(p3 + n2 * 0.6, max(uOctaves - 1.0, 2.0));

    float cloud = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
    cloud = smoothstep(0.3, 0.8, cloud);

    float radial = 1.0 - smoothstep(0.0, 0.6, length(uv));
    cloud *= radial;

    // 5-color gradient for richer finale state
    vec3 col = mix(uColor0, uColor1, n1);
    col = mix(col, uColor2, n2 * 0.7);
    col = mix(col, uColor3, n3 * 0.5);
    col = mix(col, uColor4, n3 * n2 * 0.3);

    col *= cloud * 0.8 + 0.2;
    gl_FragColor = vec4(col, cloud * uOpacity * radial);
  }
`;

const CLOUD_INSTANCES = [
  { position: [0,  0,  -8 ] as const, rotation: [0,    0,    0   ] as const, scale: 1.0  },
  { position: [2,  1,  -12] as const, rotation: [0.3,  0.2,  0.5 ] as const, scale: 0.7  },
  { position: [-3,-1,  -10] as const, rotation: [-0.2,-0.3, -0.3 ] as const, scale: 0.8  },
];

export const NebulaLayer = React.memo(function NebulaLayer({
  colors = ['#0a1628', '#0d2145', '#0f2d5e', '#1a3a6b'],
  opacity = 0.6,
  speed   = 0.0003,
  scale   = UNIVERSE_DEFAULTS.nebulaScale,
}: NebulaLayerProps) {
  const qm      = useMemo(() => UniverseQualityManager.getInstance(), []);

  const { geometry, material } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(scale * 2, scale * 2, 1, 1);

    const safeColors = [...colors];
    while (safeColors.length < 5) safeColors.push(safeColors[safeColors.length - 1]);
    const colorVecs = safeColors.slice(0, 5).map(hexToVec3);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:    { value: 0 },
        uSpeed:   { value: speed },
        uOpacity: { value: opacity },
        uOctaves: { value: qm.getProfile().nebulaOctaves },
        uColor0:  { value: colorVecs[0] },
        uColor1:  { value: colorVecs[1] },
        uColor2:  { value: colorVecs[2] },
        uColor3:  { value: colorVecs[3] },
        uColor4:  { value: colorVecs[4] },
      },
      vertexShader:   VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
      side:        THREE.DoubleSide,
    });

    return { geometry: geo, material: mat };
  }, [scale, qm]); // intentionally omit colors/opacity/speed — updated via uniforms

  // Update color uniforms when colors prop changes — no geometry rebuild
  useEffect(() => {
    if (!material.uniforms) return;
    const safeColors = [...colors];
    while (safeColors.length < 5) safeColors.push(safeColors[safeColors.length - 1]);
    const vecs = safeColors.slice(0, 5).map(hexToVec3);
    material.uniforms.uColor0.value = vecs[0];
    material.uniforms.uColor1.value = vecs[1];
    material.uniforms.uColor2.value = vecs[2];
    material.uniforms.uColor3.value = vecs[3];
    material.uniforms.uColor4.value = vecs[4];
  }, [colors, material]);

  // Cleanup
  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame((state) => {
    if (!material.uniforms) return;
    const u = material.uniforms;
    u.uTime.value    = state.clock.elapsedTime;
    u.uSpeed.value   = speed;
    u.uOpacity.value = opacity;
    u.uOctaves.value = qm.getProfile().nebulaOctaves;
  });

  return (
    <group>
      {CLOUD_INSTANCES.map((inst, i) => (
        <mesh
          key={i}
          geometry={geometry}
          material={material}
          position={inst.position}
          rotation={inst.rotation}
          scale={inst.scale}
        />
      ))}
    </group>
  );
});
