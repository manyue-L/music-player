export enum ShapeType {
  GALAXY = 'Galaxy Spiral',
  SPHERE = 'Quantum Sphere',
  LORENZ = 'Lorenz Attractor',
  MOBIUS = 'Mobius Strip',
  MENGER = 'Menger Sponge',
  HEART = 'Cartesian Heart',
  TORUS = 'Flux Torus',
  DNA = 'Double Helix'
}

export interface Song {
  id: string; // Database ID (UUID or Timestamp)
  file?: File | Blob; // The raw data
  name: string;
  url: string;
  uniqueId: number; // For visualizer seed generation
}

export interface VisualizerConfig {
  particleCount: number;
  particleSize: number;
  speed: number;
  bloomStrength: number;
  shape: ShapeType;
  colorTheme: string[];
  sensitivity: number;
}