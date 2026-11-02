export type Ruleset='2014'|'2024';
export type Combatant={id:string,name:string,role:'Player'|'Monster',hp:number,maxHp:number,initiative:number,modifier:number,conditions:string,concentration:string,cr?:string,xp?:number,reference?:{id:string,name:string},turnState?:'ready'|'delayed'};
export type Encounter={id:string,name:string,description:string,environment:string,difficulty:string,ruleset?:Ruleset,partyLevel:number,partySize:number,members:Combatant[],status:'Prepared'|'Completed'};

export type AbilityName = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
export type AbilityScores = Record<AbilityName, number>;

export type SkillName =
  | 'athletics'
  | 'acrobatics'
  | 'sleightOfHand'
  | 'stealth'
  | 'arcana'
  | 'history'
  | 'investigation'
  | 'nature'
  | 'religion'
  | 'animalHandling'
  | 'insight'
  | 'medicine'
  | 'perception'
  | 'survival'
  | 'deception'
  | 'intimidation'
  | 'performance'
  | 'persuasion';

export type DeathSaves = {
  successes: number;
  failures: number;
};

export type HitDice = {
  current: number;
  max: number;
  die: string;
};

export type TrackedResource = {
  id: string;
  name: string;
  current: number;
  max: number;
  resetOn: 'short' | 'long' | 'none';
};

export type InventoryItem = {
  id: string;
  name: string;
  qty: number;
  weight: number;
  attuned: boolean;
  notes?: string;
};

export type CharacterSpell = {
  id: string;
  name: string;
  level: number;
  school?: string;
  ritual?: boolean;
  concentration?: boolean;
  prepared: boolean;
  compendiumId?: string;
};

export type SpellSlotEntry = {
  max: number;
  used: number;
};

export type SpellSlots = Record<number, SpellSlotEntry>;

export type Character = {
  id: string;
  name: string;
  kind: 'Player' | 'NPC';
  role: string;
  portrait: string;
  personality: string;
  motivation: string;
  relationships: string;
  notes: string;
  hp: number;
  initiative: number;
  ac?: number;
  passivePerception?: number;

  // Extended character sheet properties (optional for backwards compatibility)
  maxHp?: number;
  tempHp?: number;
  speed?: number;
  level?: number;
  className?: string;
  subclass?: string;
  species?: string;
  background?: string;
  alignment?: string;
  inspiration?: boolean;
  exhaustion?: number;
  conditions?: string[];
  defenses?: string[];
  stats?: Partial<Record<AbilityName, number>>;
  savingThrowProficiencies?: AbilityName[];
  skillProficiencies?: string[];
  skillExpertise?: string[];
  hitDice?: HitDice;
  deathSaves?: DeathSaves;
  resources?: TrackedResource[];
  inventory?: InventoryItem[];
  spells?: CharacterSpell[];
  spellSlots?: SpellSlots;
  languages?: string[];
  proficiencies?: string;
};
export type WikiImage={id:string,name:string,data:string,caption:string};
export type WikiPage={id:string,title:string,category:string,body:string,tags:string,updated:string,thumbnail?:string,images?:WikiImage[]};
export const uid=()=>crypto.randomUUID();
export const seedEncounters=(_campaign:string):Encounter[]=>[];
export const seedCharacters=(_campaign:string):Character[]=>[];
export const seedPages=(_campaign:string):WikiPage[]=>[];
