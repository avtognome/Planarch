export type PaletteId =
  | 'totality'
  | 'futuristic'
  | 'spacex'
  | 'mission-control'
  | 'apple'
  | 'premium'
  | 'cursor'
  | 'ollama';

export interface PaletteDef {
  id: PaletteId;
  name: string;
  mode: 'dark' | 'light';
  canvas: string;
  surface: string;
  surfaceWarm?: string;
  text: string;
  muted?: string;
  border?: string;
  accent: string;
  secondary?: string;
  description: string;
}

export const PALETTES: PaletteDef[] = [
  {
    id: 'totality',
    name: 'Totality Festival',
    mode: 'dark',
    canvas: '#121318',
    surface: '#1e1f25',
    surfaceWarm: '#292a2f',
    text: '#e3e1e9',
    muted: '#d0c6ab',
    border: '#34265e',
    accent: '#ffd700',
    secondary: '#00e3fd',
    description: 'Totality Festival cosmic purple canvas with gold and cyan.'
  },
  {
    id: 'futuristic',
    name: 'Futuristic',
    mode: 'dark',
    canvas: '#090b12',
    surface: '#121722',
    surfaceWarm: '#1b2233',
    text: '#f8fafc',
    muted: '#94a3b8',
    border: '#2a3447',
    accent: '#3b82f6',
    description: 'Futuristic deep slate indigo canvas with electric blue.'
  },
  {
    id: 'spacex',
    name: 'SpaceX',
    mode: 'dark',
    canvas: '#000000',
    surface: '#000000',
    surfaceWarm: '#111116',
    text: '#f0f0fa',
    muted: 'rgba(240,240,250,0.7)',
    border: 'rgba(240,240,250,0.35)',
    accent: '#f0f0fa',
    description: 'SpaceX pure monochrome pitch black and starship white.'
  },
  {
    id: 'mission-control',
    name: 'Mission Control',
    mode: 'dark',
    canvas: '#0b1120',
    surface: '#111827',
    surfaceWarm: '#1a2535',
    text: '#e8f0fe',
    muted: '#8ba3c7',
    border: '#1e3a5f',
    accent: '#ffb800',
    secondary: '#00d4ff',
    description: 'Mission Control command center navy with amber and cyan.'
  },
  {
    id: 'apple',
    name: 'Apple',
    mode: 'light',
    canvas: '#ffffff',
    surface: '#f5f5f7',
    surfaceWarm: '#fbfbfd',
    text: '#1d1d1f',
    muted: '#6e6e73',
    border: '#d2d2d7',
    accent: '#0071e3',
    description: 'Apple clean neutral minimalist light interface with system blue.'
  },
  {
    id: 'premium',
    name: 'Premium',
    mode: 'light',
    canvas: '#faf8f4',
    surface: '#ffffff',
    surfaceWarm: '#f0e7d8',
    text: '#1c1b19',
    muted: '#746d63',
    border: '#ded6c9',
    accent: '#a06a3b',
    description: 'Premium warm ivory paper, tailored bronze, and dark ink typography.'
  },
  {
    id: 'cursor',
    name: 'Cursor',
    mode: 'light',
    canvas: '#f2f1ed',
    surface: '#e6e5e0',
    surfaceWarm: '#ebeae5',
    text: '#26251e',
    muted: 'rgba(38,37,30,0.55)',
    border: 'rgba(38,37,30,0.1)',
    accent: '#f54e00',
    description: 'Cursor warm stone editor theme with blazing orange highlight.'
  },
  {
    id: 'ollama',
    name: 'Ollama',
    mode: 'light',
    canvas: '#ffffff',
    surface: '#fafafa',
    surfaceWarm: '#f0f0f0',
    text: '#000000',
    muted: '#737373',
    border: '#e5e5e5',
    accent: '#000000',
    description: 'Ollama clean stark monochrome white and deep black.'
  }
];

const PALETTE_INDEX = new Map<string, PaletteDef>(
  PALETTES.map((palette) => [palette.id, palette])
);

// ponytail: fallback to premium when input unrecognized. upgrade to user-configured fallback if needed.
export function resolvePalette(raw: string | null | undefined): PaletteDef {
  const fallback = PALETTE_INDEX.get('premium')!;
  if (!raw) return fallback;
  if (raw === 'dark') return PALETTE_INDEX.get('mission-control')!;
  if (raw === 'light') return fallback;
  return PALETTE_INDEX.get(raw) ?? fallback;
}
