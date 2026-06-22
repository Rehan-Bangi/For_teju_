// SSR-safe singleton quality manager

export type QualityTier = 'high' | 'medium' | 'low';

export interface QualityProfile {
  tier: QualityTier;
  dpr: number;
  starMultiplier: number;
  particleMultiplier: number;
  nebulaOctaves: number;        // passed as uniform to nebula shader
  enableBloom: boolean;
}

interface QualityTierConfig {
  tier: QualityTier;
  dprCap: number;
  starMultiplier: number;
  particleMultiplier: number;
  nebulaOctaves: number;
  enableBloom: boolean;
}

const TIER_CONFIGS: Record<QualityTier, QualityTierConfig> = {
  high: {
    tier: 'high',
    dprCap: 2,
    starMultiplier: 1.0,
    particleMultiplier: 1.0,
    nebulaOctaves: 5,
    enableBloom: false,
  },
  medium: {
    tier: 'medium',
    dprCap: 1.5,
    starMultiplier: 0.65,
    particleMultiplier: 0.65,
    nebulaOctaves: 4,
    enableBloom: false,
  },
  low: {
    tier: 'low',
    dprCap: 1,
    starMultiplier: 0.35,
    particleMultiplier: 0.35,
    nebulaOctaves: 3,
    enableBloom: false,
  },
};

// Lazily compute actual DPR from the live window value, capped per tier.
// Never baked into a module-level constant — avoids SSR/hydration staleness.
function resolveDpr(dprCap: number): number {
  const liveDpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
  return Math.min(liveDpr || 1, dprCap);
}

function buildProfile(tier: QualityTier): QualityProfile {
  const cfg = TIER_CONFIGS[tier];
  return {
    tier: cfg.tier,
    dpr: resolveDpr(cfg.dprCap),
    starMultiplier: cfg.starMultiplier,
    particleMultiplier: cfg.particleMultiplier,
    nebulaOctaves: cfg.nebulaOctaves,
    enableBloom: cfg.enableBloom,
  };
}

// ─── Device detection (SSR-safe) ─────────────────────────────────────────────

function detectInitialTier(): QualityTier {
  if (typeof window === 'undefined') return 'medium';

  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem   = (navigator as { deviceMemory?: number }).deviceMemory ?? 4;
  const dpr   = window.devicePixelRatio ?? 1;

  if (isMobile && (cores <= 4 || mem <= 2 || dpr > 2.5)) return 'low';
  if (isMobile) return 'medium';
  if (cores <= 2 || mem <= 1) return 'low';
  return 'high';
}

// ─── FPS tracker ─────────────────────────────────────────────────────────────

class FpsTracker {
  private samples: number[] = [];
  private lastTime = 0;
  private readonly windowSize = 60;

  record(now: number): number {
    if (this.lastTime !== 0) {
      const dt = now - this.lastTime;
      if (dt > 0 && dt < 500) {
        this.samples.push(1000 / dt);
        if (this.samples.length > this.windowSize) this.samples.shift();
      }
    }
    this.lastTime = now;
    return this.average();
  }

  average(): number {
    if (this.samples.length === 0) return 60;
    return this.samples.reduce((s, v) => s + v, 0) / this.samples.length;
  }

  reset(): void {
    this.samples = [];
    this.lastTime = 0;
  }
}

// ─── Manager ─────────────────────────────────────────────────────────────────

type QualityListener = (profile: QualityProfile) => void;

export class UniverseQualityManager {
  private tier: QualityTier;
  private profile: QualityProfile;
  private fps = new FpsTracker();
  private listeners = new Set<QualityListener>();
  private cooldownUntil = 0;
  private readonly COOLDOWN_MS = 8000;
  private readonly DROP_FPS_THRESHOLD = 42;
  private readonly RECOVER_FPS_THRESHOLD = 56;
  private readonly MIN_SAMPLES = 30;
  private sampleCount = 0;
  private frameCount = 0;
  private readonly CHECK_INTERVAL = 90; // frames

  constructor() {
    this.tier    = detectInitialTier();
    this.profile = buildProfile(this.tier);
  }

  getProfile(): QualityProfile {
    return this.profile;
  }

  getTier(): QualityTier {
    return this.tier;
  }

  /** Call once per R3F frame from a useFrame callback */
  tick(nowMs: number): boolean {
    const avgFps = this.fps.record(nowMs);
    this.sampleCount++;
    this.frameCount++;

    if (this.frameCount < this.CHECK_INTERVAL || this.sampleCount < this.MIN_SAMPLES) {
      return false;
    }

    this.frameCount = 0;
    const now = performance.now();
    if (now < this.cooldownUntil) return false;

    let changed = false;

    if (avgFps < this.DROP_FPS_THRESHOLD && this.tier !== 'low') {
      this.tier    = this.tier === 'high' ? 'medium' : 'low';
      this.profile = buildProfile(this.tier);
      this.cooldownUntil = now + this.COOLDOWN_MS;
      this.fps.reset();
      this.sampleCount = 0;
      changed = true;
    } else if (avgFps > this.RECOVER_FPS_THRESHOLD && this.tier !== 'high') {
      const next: QualityTier = this.tier === 'low' ? 'medium' : 'high';
      // Only recover one tier at a time
      this.tier    = next;
      this.profile = buildProfile(this.tier);
      this.cooldownUntil = now + this.COOLDOWN_MS * 1.5;
      this.fps.reset();
      this.sampleCount = 0;
      changed = true;
    }

    if (changed) {
      this.listeners.forEach(l => l(this.profile));
    }

    return changed;
  }

  subscribe(listener: QualityListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Force a specific tier (e.g. from user setting) */
  forceTier(tier: QualityTier): void {
    this.tier    = tier;
    this.profile = buildProfile(tier);
    this.cooldownUntil = performance.now() + this.COOLDOWN_MS * 2;
    this.fps.reset();
    this.sampleCount = 0;
    this.listeners.forEach(l => l(this.profile));
  }

  /** Apply quality multipliers to raw config counts */
  applyToConfig<T extends { count: number }>(base: T): T {
    return {
      ...base,
      count: Math.max(10, Math.round(base.count * this.profile.particleMultiplier)),
    };
  }

  applyToStarCount(baseCount: number): number {
    return Math.max(500, Math.round(baseCount * this.profile.starMultiplier));
  }

  /** Singleton-style factory — one instance per module scope */
  static instance: UniverseQualityManager | null = null;
  static getInstance(): UniverseQualityManager {
    if (!UniverseQualityManager.instance) {
      UniverseQualityManager.instance = new UniverseQualityManager();
    }
    return UniverseQualityManager.instance;
  }

  /** Explicit reset for tests / HMR — call manually if needed, no auto-wiring */
  static resetInstance(): void {
    UniverseQualityManager.instance = null;
  }
}
