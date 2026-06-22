import * as THREE from 'three';

// ─── Particle vertex shader ──────────────────────────────────────────────────
// WebGL1 / WebGL2 / Mobile Safari / Android Chrome compatible.
// No gl_VertexID (unsupported in WebGL1 / GLSL ES 1.00) — color selection is
// driven entirely by a baked `colorIndex` float attribute instead.

export const particleVertexShader = `
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

// ─── Particle fragment shader ────────────────────────────────────────────────
// Soft circular sprite with additive glow falloff.

export const particleFragmentShader = `
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

// ─── Uniform helpers ─────────────────────────────────────────────────────────

export interface ParticleUniforms {
  uTime:       { value: number };
  uSpeed:      { value: number };
  uSize:       { value: number };
  uPixelRatio: { value: number };
  uColorA:     { value: THREE.Vector3 };
  uColorB:     { value: THREE.Vector3 };
  uColorC:     { value: THREE.Vector3 };
  uColorD:     { value: THREE.Vector3 };
  uColorE:     { value: THREE.Vector3 };
}

export function hexToRgbNorm(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Pads/truncates a color array to exactly 5 entries, repeating the last color. */
export function normalizeParticleColors(colors: string[]): string[] {
  const safe = [...colors];
  while (safe.length < 5) safe.push(safe[safe.length - 1]);
  return safe.slice(0, 5);
}

export interface CreateParticleUniformsOptions {
  colors: string[];
  speed: number;
  size: number;
  pixelRatio?: number;
}

export function createParticleUniforms({
  colors,
  speed,
  size,
  pixelRatio,
}: CreateParticleUniformsOptions): ParticleUniforms {
  const [ca, cb, cc, cd, ce] = normalizeParticleColors(colors).map(hexToRgbNorm);
  const dpr = pixelRatio ?? (typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1);

  return {
    uTime:       { value: 0 },
    uSpeed:      { value: speed },
    uSize:       { value: size },
    uPixelRatio: { value: dpr },
    uColorA:     { value: new THREE.Vector3(...ca) },
    uColorB:     { value: new THREE.Vector3(...cb) },
    uColorC:     { value: new THREE.Vector3(...cc) },
    uColorD:     { value: new THREE.Vector3(...cd) },
    uColorE:     { value: new THREE.Vector3(...ce) },
  };
}

/** Mutates an existing uniforms object's color slots in place — avoids reallocation. */
export function updateParticleColorUniforms(
  uniforms: ParticleUniforms,
  colors: string[],
): void {
  const [ca, cb, cc, cd, ce] = normalizeParticleColors(colors).map(hexToRgbNorm);
  uniforms.uColorA.value.set(...ca);
  uniforms.uColorB.value.set(...cb);
  uniforms.uColorC.value.set(...cc);
  uniforms.uColorD.value.set(...cd);
  uniforms.uColorE.value.set(...ce);
}

/** Convenience factory for a fully configured ShaderMaterial. */
export function createParticleMaterial(
  options: CreateParticleUniformsOptions,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: createParticleUniforms(options) as unknown as { [uniform: string]: THREE.IUniform },
    vertexShader:   particleVertexShader,
    fragmentShader: particleFragmentShader,
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
  });
}

// ─── Attribute helpers ───────────────────────────────────────────────────────

export interface ParticleAttributeData {
  positions:   Float32Array;
  phases:      Float32Array;
  amplitudes:  Float32Array;
  frequencies: Float32Array;
  colorIndex:  Float32Array;
}

/**
 * Builds the static per-particle attribute set used by ParticleSystem.tsx.
 * `colorIndex` cycles 0..4 per-vertex — this is what replaces gl_VertexID
 * for WebGL1 compatibility.
 */
export function buildParticleAttributeData(
  maxParticles: number,
  bounds: number,
): ParticleAttributeData {
  const positions   = new Float32Array(maxParticles * 3);
  const phases      = new Float32Array(maxParticles * 3);
  const amplitudes  = new Float32Array(maxParticles);
  const frequencies = new Float32Array(maxParticles * 3);
  const colorIndex  = new Float32Array(maxParticles);

  for (let i = 0; i < maxParticles; i++) {
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

    colorIndex[i] = i % 5;
  }

  return { positions, phases, amplitudes, frequencies, colorIndex };
}

/** Builds a BufferGeometry from particle attribute data plus a dynamic active mask. */
export function createParticleGeometry(
  data: ParticleAttributeData,
  maxParticles: number,
): { geometry: THREE.BufferGeometry; activeAttribute: THREE.BufferAttribute } {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',   new THREE.BufferAttribute(data.positions,   3));
  geometry.setAttribute('phase',      new THREE.BufferAttribute(data.phases,      3));
  geometry.setAttribute('amplitude',  new THREE.BufferAttribute(data.amplitudes,  1));
  geometry.setAttribute('frequency',  new THREE.BufferAttribute(data.frequencies, 3));
  geometry.setAttribute('colorIndex', new THREE.BufferAttribute(data.colorIndex,  1));

  const active = new Float32Array(maxParticles);
  const activeAttribute = new THREE.BufferAttribute(active, 1);
  activeAttribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('active', activeAttribute);

  return { geometry, activeAttribute };
}

/** Updates the active mask in place — pool approach, zero reallocation. */
export function setActiveParticleCount(
  activeAttribute: THREE.BufferAttribute,
  count: number,
  maxParticles: number,
): void {
  const arr = activeAttribute.array as Float32Array;
  const clamped = Math.max(0, Math.min(count, maxParticles));
  for (let i = 0; i < maxParticles; i++) {
    arr[i] = i < clamped ? 1 : 0;
  }
  activeAttribute.needsUpdate = true;
}
