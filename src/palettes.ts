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
    canvas: '#141517',
    surface: '#1c1d20',
    surfaceWarm: '#24262a',
    text: '#f3ede2',
    muted: '#a69f93',
    border: '#312e2a',
    accent: '#d4a962',
    secondary: '#2c2a26',
    swatches: ['#101214', '#141517', '#1c1d20', '#2c2a26', '#be9454', '#f3ede2'],
    description: 'Warm obsidian canvas, elevated charcoal panels, antique gold accents, and ivory text.'
  }
];

// ponytail: fallback to charcoal always. Supports 'light' warm ivory mode.
export function resolvePalette(raw: string | null | undefined): PaletteDef {
  const base = PALETTES[0];
  if (raw === 'light') {
    return {
      ...base,
      mode: 'light',
      canvas: '#f6f1e7',
      surface: '#fcf9f2',
      surfaceWarm: '#efe8da',
      text: '#1f1b16',
      muted: '#655b4e',
      border: '#dfd5c3',
      accent: '#825d24',
      secondary: '#e6dcc8',
      swatches: ['#fcf9f2', '#f6f1e7', '#efe8da', '#dfd5c3', '#825d24', '#1f1b16'],
      description: 'Warm vellum ivory canvas, crisp parchment cards, aged gold accents, and warm ink text.'
    };
  }
  return base;
}
