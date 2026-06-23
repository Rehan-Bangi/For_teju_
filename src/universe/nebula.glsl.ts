import * as THREE from 'three';

// ─── Nebula vertex shader ───────────────────────────────────────────────────
// Plain UV passthrough — all visual work happens in the fragment stage.

export const nebulaVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// ─── Nebula fragment shader ─────────────────────────────────────────────────
// 5-octave fBm cloud field, driven by a runtime octave-count uniform so the
// same compiled program serves every UniverseQualityManager tier without
// a shader recompile. 5-color gradient supports the richer finale palette.

export const nebulaFragmentShader = `
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

// ─── Uniform helpers ─────────────────────────────────────────────────────────

export interface NebulaUniforms {
  uTime:    { value: number };
  uSpeed:   { value: number };
  uOpacity: { value: number };
  uOctaves: { value: number };
  uColor0:  { value: THREE.Vector3 };
  uColor1:  { value: THREE.Vector3 };
  uColor2:  { value: THREE.Vector3 };
  uColor3:  { value: THREE.Vector3 };
  uColor4:  { value: THREE.Vector3 };
}

export function hexToVec3(hex: string): THREE.Vector3 {
  const n = parseInt(hex.replace('#', ''), 16);
  return new THREE.Vector3(
    ((n >> 16) & 255) / 255,
    ((n >> 8) & 255) / 255,
    (n & 255) / 255,
  );
}

/** Pads/truncates a color array to exactly 5 entries, repeating the last color. */
export function normalizeNebulaColors(
  colors: string[],
): [string, string, string, string, string] {
  const safe = colors.length > 0 ? [...colors] : ['#000000'];
  while (safe.length < 5) safe.push(safe[safe.length - 1]!);
  return safe.slice(0, 5) as [string, string, string, string, string];
}

export interface CreateNebulaUniformsOptions {
  colors: string[];
  opacity: number;
  speed: number;
  octaves: number;
}

export function createNebulaUniforms({
  colors,
  opacity,
  speed,
  octaves,
}: CreateNebulaUniformsOptions): NebulaUniforms {
  const [h0, h1, h2, h3, h4] = normalizeNebulaColors(colors);
  const c0 = hexToVec3(h0);
  const c1 = hexToVec3(h1);
  const c2 = hexToVec3(h2);
  const c3 = hexToVec3(h3);
  const c4 = hexToVec3(h4);
  return {
    uTime:    { value: 0 },
    uSpeed:   { value: speed },
    uOpacity: { value: opacity },
    uOctaves: { value: octaves },
    uColor0:  { value: c0 },
    uColor1:  { value: c1 },
    uColor2:  { value: c2 },
    uColor3:  { value: c3 },
    uColor4:  { value: c4 },
  };
}

/** Mutates an existing uniforms object's color slots in place — avoids reallocation. */
export function updateNebulaColorUniforms(
  uniforms: NebulaUniforms,
  colors: string[],
): void {
  const [h0, h1, h2, h3, h4] = normalizeNebulaColors(colors);
  uniforms.uColor0.value = hexToVec3(h0);
  uniforms.uColor1.value = hexToVec3(h1);
  uniforms.uColor2.value = hexToVec3(h2);
  uniforms.uColor3.value = hexToVec3(h3);
  uniforms.uColor4.value = hexToVec3(h4);
}

/** Convenience factory for a fully configured ShaderMaterial. */
export function createNebulaMaterial(
  options: CreateNebulaUniformsOptions,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: createNebulaUniforms(options) as unknown as { [uniform: string]: THREE.IUniform },
    vertexShader:   nebulaVertexShader,
    fragmentShader: nebulaFragmentShader,
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
    side:        THREE.DoubleSide,
  });
}
