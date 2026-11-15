export type PaletteId = 'charcoal';

export interface PaletteDef {
  id: PaletteId;
  name: string;
  mode: 'dark' | 'light';
  canvas: string;
  surface: string;
  surfaceWarm?: string;
  text: string;
  muted?: string;
  border: string;
  accent: string;
  secondary: string;
  swatches: [string, string, string, string, string, string];
  description: string;
}

export const PALETTES: PaletteDef[] = [
  {
    id: 'charcoal',
    name: 'Charcoal',
    mode: 'dark',
    canvas: '#17191a',
    surface: '#222527',
    surfaceWarm: '#2c3033',
    text: '#f2f2f2',
    muted: '#a1a1aa',
    border: '#383c40',
    accent: '#f2f2f2',
    secondary: '#2c3033',
    swatches: ['#101214', '#17191a', '#222527', '#2c3033', '#a1a1aa', '#f2f2f2'],
    description: 'Modern dark slate canvas, elevated graphite panels, and crisp chalk text.'
  }
];

// ponytail: fallback to charcoal always. Supports 'light' alabaster mode.
export function resolvePalette(raw: string | null | undefined): PaletteDef {
  const base = PALETTES[0];
  if (raw === 'light') {
    return {
      ...base,
      mode: 'light',
      canvas: '#f8fafc',
      surface: '#ffffff',
      surfaceWarm: '#f1f5f9',
      text: '#0f172a',
      muted: '#64748b',
      border: '#e2e8f0',
      accent: '#0f172a',
      secondary: '#e2e8f0',
      swatches: ['#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#64748b', '#0f172a'],
      description: 'Crisp alabaster canvas, pure white cards, subtle slate borders, and deep ink text.'
    };
  }
  return base;
}
