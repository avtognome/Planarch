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
  border?: string;
  accent: string;
  secondary?: string;
  description: string;
}

export const PALETTES: PaletteDef[] = [
  {
    id: 'themberchaud',
    name: 'Themberchaud',
    mode: 'dark',
    canvas: '#1b262f',
    surface: '#304352',
    surfaceWarm: '#3d5467',
    text: '#eebd83',
    muted: '#b59b7c',
    border: '#58768e',
    accent: '#f7a653',
    secondary: '#e06a3c',
    description: 'Deep cavern slate and steel blue lit by molten dragon gold and crimson ember.'
  },
  {
    id: 'fulgur',
    name: 'Fulgur',
    mode: 'dark',
    canvas: '#121b33',
    surface: '#1a284b',
    surfaceWarm: '#321a6b',
    text: '#ece4f8',
    muted: '#c3a7e3',
    border: '#064a69',
    accent: '#c3a7e3',
    secondary: '#4f95b1',
    description: 'Storm-lashed midnight navy and deep violet struck by lavender lightning and sea blue.'
  },
  {
    id: 'exanimo',
    name: 'Exanimo',
    mode: 'dark',
    canvas: '#0f0f0f',
    surface: '#1c1211',
    surfaceWarm: '#4a1c1a',
    text: '#f5f0e6',
    muted: '#a8ab96',
    border: '#797d62',
    accent: '#d13b3b',
    secondary: '#5d3fd3',
    description: 'Grit black and burnt caramel contrasted with bone white, blood red, and electric indigo.'
  },
  {
    id: 'celeste',
    name: 'Celeste',
    mode: 'dark',
    canvas: '#131a31',
    surface: '#1a2342',
    surfaceWarm: '#2f4945',
    text: '#e4d3b4',
    muted: '#99a4b0',
    border: '#4a4066',
    accent: '#c2a368',
    secondary: '#818db8',
    description: 'Celestial midnight inkwell with aged parchment, star gold, and starlight lilac.'
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
    border: '#504848',
    accent: '#b8b0a0',
    secondary: '#887878',
    description: 'Moonlit obsidian and charcoal stone veiled in silver mist and dusk plum.'
  },
  {
    id: 'kreldo',
    name: 'Kreldo',
    mode: 'dark',
    canvas: '#060d08',
    surface: '#1d2a10',
    surfaceWarm: '#293a18',
    text: '#e8d7bd',
    muted: '#a89f81',
    border: '#595d2b',
    accent: '#cd8a39',
    secondary: '#a24502',
    description: 'Deep forest shadow and seaweed moss warmed by raw sienna and oregon rust.'
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
