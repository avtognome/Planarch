export type PaletteId =
  | 'themberchaud'
  | 'fulgur'
  | 'exanimo'
  | 'celeste'
  | 'lady-of-silver'
  | 'kreldo';

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
    id: 'themberchaud',
    name: 'Themberchaud',
    mode: 'dark',
    canvas: '#304352',
    surface: '#9a2421',
    surfaceWarm: '#58768e',
    text: '#eebd83',
    muted: '#f7a653',
    border: '#58768e',
    accent: '#f7a653',
    secondary: '#e06a3c',
    swatches: ['#304352', '#9a2421', '#58768e', '#eebd83', '#f7a653', '#e06a3c'],
    description: 'Deep slate canvas and crimson dragon scales with steel blue, warm sand, amber gold, and dragon orange.'
  },
  {
    id: 'fulgur',
    name: 'Fulgur',
    mode: 'dark',
    canvas: '#1a284b',
    surface: '#321a6b',
    surfaceWarm: '#064a69',
    text: '#c3a7e3',
    muted: '#4f95b1',
    border: '#064a69',
    accent: '#794cc3',
    secondary: '#4f95b1',
    swatches: ['#1a284b', '#321a6b', '#064a69', '#c3a7e3', '#794cc3', '#4f95b1'],
    description: 'Midnight navy canvas and deep violet panels with storm teal, lavender lightning, electric purple, and sea blue.'
  },
  {
    id: 'exanimo',
    name: 'Exanimo',
    mode: 'dark',
    canvas: '#0f0f0f',
    surface: '#4a1c1a',
    surfaceWarm: '#797d62',
    text: '#f5f0e6',
    muted: '#797d62',
    border: '#797d62',
    accent: '#8b0000',
    secondary: '#5d3fd3',
    swatches: ['#0f0f0f', '#4a1c1a', '#797d62', '#f5f0e6', '#8b0000', '#5d3fd3'],
    description: 'Grit black canvas and burnt caramel panels with dust olive, bone white, blood red, and electric indigo.'
  },
  {
    id: 'celeste',
    name: 'Celeste',
    mode: 'dark',
    canvas: '#1a2342',
    surface: '#4a4066',
    surfaceWarm: '#2f4945',
    text: '#e4d3b4',
    muted: '#99a4b0',
    border: '#2f4945',
    accent: '#c2a368',
    secondary: '#818db8',
    swatches: ['#1a2342', '#4a4066', '#2f4945', '#e4d3b4', '#c2a368', '#818db8'],
    description: 'Midnight blue canvas and dusty plum panels with forest moss, aged parchment, star gold, and starlight lilac.'
  },
  {
    id: 'lady-of-silver',
    name: 'Lady of Silver',
    mode: 'dark',
    canvas: '#181818',
    surface: '#282828',
    surfaceWarm: '#484048',
    text: '#b8b0b0',
    muted: '#887878',
    border: '#484048',
    accent: '#b8b0a0',
    secondary: '#887878',
    swatches: ['#181818', '#282828', '#484048', '#b8b0b0', '#b8b0a0', '#887878'],
    description: 'Obsidian canvas and charcoal surfaces with dusk plum, silver mist, pale sage parchment, and muted mauve.'
  },
  {
    id: 'kreldo',
    name: 'Kreldo',
    mode: 'dark',
    canvas: '#060d08',
    surface: '#1d2a10',
    surfaceWarm: '#595d2b',
    text: '#e6d3b3',
    muted: '#cd8a39',
    border: '#595d2b',
    accent: '#cd8a39',
    secondary: '#a24502',
    swatches: ['#060d08', '#1d2a10', '#595d2b', '#e6d3b3', '#cd8a39', '#a24502'],
    description: 'Racing green shadow and seaweed surfaces with olive moss, warm birch parchment, raw sienna, and oregon rust.'
  }
];

const PALETTE_INDEX = new Map<string, PaletteDef>(
  PALETTES.map((palette) => [palette.id, palette])
);

// ponytail: fallback to celeste when input unrecognized. upgrade to user-configured fallback if needed.
export function resolvePalette(raw: string | null | undefined): PaletteDef {
  const fallback = PALETTE_INDEX.get('celeste')!;
  if (!raw) return fallback;
  return PALETTE_INDEX.get(raw) ?? fallback;
}
