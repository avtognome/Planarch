export type PaletteId =
  | 'black-stallion'
  | 'space-cadet'
  | 'ceres'
  | 'twinkle'
  | 'charcoal';

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
    id: 'black-stallion',
    name: 'Black Stallion',
    mode: 'dark',
    canvas: '#081919',
    surface: '#223330',
    surfaceWarm: '#4d524b',
    text: '#d8d5ce',
    muted: '#837f78',
    border: 'transparent',
    accent: '#ce1a1e',
    secondary: '#65060e',
    swatches: ['#081919', '#223330', '#4d524b', '#837f78', '#65060e', '#ce1a1e'],
    description: 'Black stallion canvas with concealed green surfaces, chain link stone, and thunder mountain pepper red.'
  },
  {
    id: 'space-cadet',
    name: 'Space Cadet',
    mode: 'dark',
    canvas: '#101323',
    surface: '#23294e',
    surfaceWarm: '#3f436e',
    text: '#e8eaff',
    muted: '#646894',
    border: 'transparent',
    accent: '#646894',
    secondary: '#3f436e',
    swatches: ['#101323', '#151b38', '#23294e', '#3f436e', '#646894', '#e8eaff'],
    description: 'Cosmic xiketic black canvas, space cadet navy panels, and starlight silver typography.'
  },
  {
    id: 'ceres',
    name: 'Ceres',
    mode: 'dark',
    canvas: '#0a1b22',
    surface: '#132530',
    surfaceWarm: '#273a47',
    text: '#cbd1d2',
    muted: '#96a7ab',
    border: 'transparent',
    accent: '#cbd1d2',
    secondary: '#4a5d6b',
    swatches: ['#0a1b22', '#132530', '#273a47', '#4a5d6b', '#96a7ab', '#cbd1d2'],
    description: 'Abyssal teal canvas, midnight slate panels, storm horizon cards, and starlight ice text.'
  },
  {
    id: 'twinkle',
    name: 'Twinkle',
    mode: 'dark',
    canvas: '#141722',
    surface: '#1e2233',
    surfaceWarm: '#424a59',
    text: '#ead7c0',
    muted: '#96a5ac',
    border: 'transparent',
    accent: '#c59b76',
    secondary: '#96a5ac',
    swatches: ['#141722', '#1e2233', '#424a59', '#96a5ac', '#c59b76', '#ead7c0'],
    description: 'Deep obsidian canvas, midnight navy cards, warm champagne tan, and soft cream text.'
  },
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

const PALETTE_INDEX = new Map<string, PaletteDef>(
  PALETTES.map((palette) => [palette.id, palette])
);

// ponytail: fallback to charcoal when input unrecognized. upgrade to user-configured fallback if needed.
export function resolvePalette(raw: string | null | undefined): PaletteDef {
  const fallback = PALETTE_INDEX.get('charcoal')!;
  if (!raw) return fallback;
  return PALETTE_INDEX.get(raw) ?? fallback;
}
