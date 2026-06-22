export type UniverseMood = 'calm' | 'nostalgic' | 'romantic' | 'magical';

export interface MoodConfig {
  nebula: {
    colors: string[];
    opacity: number;
    speed: number;
  };
  stars: {
    count: number;
    twinkleSpeed: number;
    brightness: number;
  };
  particles: {
    count: number;
    speed: number;
    size: number;
    colors: string[];
  };
  fog: {
    color: string;
    near: number;
    far: number;
  };
  ambient: {
    color: string;
    intensity: number;
  };
}

export const MOOD_CONFIGS: Record<UniverseMood, MoodConfig> = {
  calm: {
    nebula: {
      colors: ['#0a1628', '#0d2145', '#0f2d5e', '#1a3a6b'],
      opacity: 0.6,
      speed: 0.0003,
    },
    stars: {
      count: 3000,
      twinkleSpeed: 0.8,
      brightness: 0.7,
    },
    particles: {
      count: 80,
      speed: 0.15,
      size: 0.04,
      colors: ['#7eb8f7', '#a8d4ff', '#c5e3ff'],
    },
    fog: {
      color: '#060d1a',
      near: 8,
      far: 40,
    },
    ambient: {
      color: '#1a3a6b',
      intensity: 0.4,
    },
  },
  nostalgic: {
    nebula: {
      colors: ['#1a0a28', '#2d1045', '#3d1a5e', '#52286b'],
      opacity: 0.75,
      speed: 0.0004,
    },
    stars: {
      count: 2500,
      twinkleSpeed: 0.6,
      brightness: 0.85,
    },
    particles: {
      count: 100,
      speed: 0.12,
      size: 0.05,
      colors: ['#f7c87e', '#ffd9a8', '#ffe8c5'],
    },
    fog: {
      color: '#0f0614',
      near: 7,
      far: 35,
    },
    ambient: {
      color: '#52286b',
      intensity: 0.5,
    },
  },
  romantic: {
    nebula: {
      colors: ['#28060f', '#450d1a', '#6b1a2b', '#8b2540'],
      opacity: 0.8,
      speed: 0.0005,
    },
    stars: {
      count: 2800,
      twinkleSpeed: 1.0,
      brightness: 0.9,
    },
    particles: {
      count: 120,
      speed: 0.18,
      size: 0.045,
      colors: ['#f77eb8', '#ffa8d4', '#ffc5e4'],
    },
    fog: {
      color: '#140306',
      near: 6,
      far: 32,
    },
    ambient: {
      color: '#8b2540',
      intensity: 0.55,
    },
  },
  magical: {
    nebula: {
      colors: ['#060a28', '#0a1a45', '#1a0a5e', '#2a1a7b'],
      opacity: 0.85,
      speed: 0.0007,
    },
    stars: {
      count: 4000,
      twinkleSpeed: 1.4,
      brightness: 1.0,
    },
    particles: {
      count: 150,
      speed: 0.25,
      size: 0.06,
      colors: ['#b87ef7', '#d4a8ff', '#e8c5ff', '#c5ffed'],
    },
    fog: {
      color: '#03060f',
      near: 5,
      far: 30,
    },
    ambient: {
      color: '#2a1a7b',
      intensity: 0.65,
    },
  },
};

export const TRANSITION_DURATION = 2.5;

export const UNIVERSE_DEFAULTS = {
  cameraPosition: [0, 0, 5] as [number, number, number],
  cameraFov: 75,
  starfieldRadius: 50,
  nebulaScale: 12,
  particleBounds: 8,
};
