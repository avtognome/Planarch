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
    canvas: '#101010',
    surface: '#272727',
    surfaceWarm: '#393939',
    text: '#f2f2f2',
    muted: '#8c8c8c',
    border: 'transparent',
    accent: '#f2f2f2',
    secondary: '#393939',
    swatches: ['#000000', '#101010', '#171717', '#272727', '#393939', '#f2f2f2'],
    description: 'Pure carbon canvas, graphite panels, pitch black accents, and crisp chalk white text.'
  }
];

// ponytail: fallback to charcoal always. Supports 'light' inverted mode.
export function resolvePalette(raw: string | null | undefined): PaletteDef {
  const base = PALETTES[0];
  if (raw === 'light') {
    return {
      ...base,
      mode: 'light',
      canvas: '#f2f2f2',
      surface: '#e5e5e5',
      surfaceWarm: '#d4d4d4',
      text: '#101010',
      muted: '#525252',
      accent: '#101010',
      secondary: '#d4d4d4',
      swatches: ['#ffffff', '#f2f2f2', '#e5e5e5', '#d4d4d4', '#525252', '#101010'],
      description: 'Crisp inverted chalk canvas, elevated platinum panels, and pure charcoal text.'
    };
  }
  return base;
}
