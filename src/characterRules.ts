import { type Character, type AbilityName, type SkillName } from './models';

// Pure 2024 D&D calculation helpers

export const SKILL_DEFINITIONS: ReadonlyArray<{
  id: SkillName;
  name: string;
  ability: AbilityName;
}> = [
  { id: 'athletics', name: 'Athletics', ability: 'str' },
  { id: 'acrobatics', name: 'Acrobatics', ability: 'dex' },
  { id: 'sleightOfHand', name: 'Sleight of Hand', ability: 'dex' },
  { id: 'stealth', name: 'Stealth', ability: 'dex' },
  { id: 'arcana', name: 'Arcana', ability: 'int' },
  { id: 'history', name: 'History', ability: 'int' },
  { id: 'investigation', name: 'Investigation', ability: 'int' },
  { id: 'nature', name: 'Nature', ability: 'int' },
  { id: 'religion', name: 'Religion', ability: 'int' },
  { id: 'animalHandling', name: 'Animal Handling', ability: 'wis' },
  { id: 'insight', name: 'Insight', ability: 'wis' },
  { id: 'medicine', name: 'Medicine', ability: 'wis' },
  { id: 'perception', name: 'Perception', ability: 'wis' },
  { id: 'survival', name: 'Survival', ability: 'wis' },
  { id: 'deception', name: 'Deception', ability: 'cha' },
  { id: 'intimidation', name: 'Intimidation', ability: 'cha' },
  { id: 'performance', name: 'Performance', ability: 'cha' },
  { id: 'persuasion', name: 'Persuasion', ability: 'cha' },
];

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function getModifier(score: number): number {
  return Math.floor(((score ?? 10) - 10) / 2);
}

export function getProficiencyBonus(level: number): number {
  const lvl = clamp(Math.floor(level || 1), 1, 20);
  return Math.floor((lvl - 1) / 4) + 2;
}

export function getPassiveScore(
  abilityMod: number,
  isProficient: boolean,
  profBonus: number,
  bonus?: number,
): number {
  return 10 + abilityMod + (isProficient ? profBonus : 0) + (bonus ?? 0);
}

// 2024 D&D full caster progression: Wizard, Sorcerer, Cleric, Druid, Bard
const FULL_CASTER_SLOTS: Record<number, Record<number, number>> = {
  1: { 1: 2 },
  2: { 1: 3 },
  3: { 1: 4, 2: 2 },
  4: { 1: 4, 2: 3 },
  5: { 1: 4, 2: 3, 3: 2 },
  6: { 1: 4, 2: 3, 3: 3 },
  7: { 1: 4, 2: 3, 3: 3, 4: 1 },
  8: { 1: 4, 2: 3, 3: 3, 4: 2 },
  9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
  11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
  18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
  19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
  20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
};

// 2024 D&D half caster progression: Paladin, Ranger, Artificer (starts at level 1)
const HALF_CASTER_SLOTS: Record<number, Record<number, number>> = {
  1: { 1: 2 },
  2: { 1: 2 },
  3: { 1: 3 },
  4: { 1: 3 },
  5: { 1: 4, 2: 2 },
  6: { 1: 4, 2: 2 },
  7: { 1: 4, 2: 3 },
  8: { 1: 4, 2: 3 },
  9: { 1: 4, 2: 3, 3: 2 },
  10: { 1: 4, 2: 3, 3: 2 },
  11: { 1: 4, 2: 3, 3: 3 },
  12: { 1: 4, 2: 3, 3: 3 },
  13: { 1: 4, 2: 3, 3: 3, 4: 1 },
  14: { 1: 4, 2: 3, 3: 3, 4: 1 },
  15: { 1: 4, 2: 3, 3: 3, 4: 2 },
  16: { 1: 4, 2: 3, 3: 3, 4: 2 },
  17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
  20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
};

// 2024 D&D Warlock pact magic progression
function getWarlockPactSlots(level: number): Record<number, number> {
  const lvl = clamp(Math.floor(level || 1), 1, 20);
  let slotLevel = 1;
  let slotCount = 1;

  if (lvl === 1) {
    slotLevel = 1;
    slotCount = 1;
  } else if (lvl === 2) {
    slotLevel = 1;
    slotCount = 2;
  } else if (lvl <= 4) {
    slotLevel = 2;
    slotCount = 2;
  } else if (lvl <= 6) {
    slotLevel = 3;
    slotCount = 2;
  } else if (lvl <= 8) {
    slotLevel = 4;
    slotCount = 2;
  } else if (lvl <= 10) {
    slotLevel = 5;
    slotCount = 2;
  } else if (lvl <= 16) {
    slotLevel = 5;
    slotCount = 3;
  } else {
    slotLevel = 5;
    slotCount = 4;
  }

  return { [slotLevel]: slotCount };
}

const FULL_CASTERS = new Set(['wizard', 'sorcerer', 'cleric', 'druid', 'bard']);
const HALF_CASTERS = new Set(['paladin', 'ranger', 'artificer']);

export function getStandardSpellSlots(className: string, level: number): Record<number, number> {
  const norm = (className || '').trim().toLowerCase();
  const lvl = clamp(Math.floor(level || 1), 1, 20);

  if (norm === 'warlock') {
    return getWarlockPactSlots(lvl);
  }
  if (FULL_CASTERS.has(norm)) {
    return { ...(FULL_CASTER_SLOTS[lvl] || {}) };
  }
  if (HALF_CASTERS.has(norm)) {
    return { ...(HALF_CASTER_SLOTS[lvl] || {}) };
  }
  return {};
}

function isWarlockClass(character: Character): boolean {
  const cName = (character.className || '').toLowerCase();
  const rName = (character.role || '').toLowerCase();
  return cName.includes('warlock') || rName.includes('warlock');
}

export function calculateRestRecovery(
  character: Character,
  restType: 'short' | 'long',
  hitDiceSpent = 0,
): Character {
  const updated = { ...character };
  const maxHp = updated.maxHp ?? updated.hp;

  if (restType === 'short') {
    // 1. Recover pact slots if Warlock
    if (isWarlockClass(updated) && updated.spellSlots) {
      const resetSlots = { ...updated.spellSlots };
      for (const [lvlKey, slot] of Object.entries(resetSlots)) {
        resetSlots[Number(lvlKey)] = {
          max: slot.max,
          used: 0,
        };
      }
      updated.spellSlots = resetSlots;
    } else if (updated.spellSlots) {
      // Clamp used slots within bounds
      const clampedSlots = { ...updated.spellSlots };
      for (const [lvlKey, slot] of Object.entries(clampedSlots)) {
        clampedSlots[Number(lvlKey)] = {
          max: slot.max,
          used: clamp(slot.used, 0, slot.max),
        };
      }
      updated.spellSlots = clampedSlots;
    }

    // 2. Spend hit dice if requested
    if (hitDiceSpent > 0 && updated.hitDice && updated.hitDice.current > 0) {
      const available = updated.hitDice.current;
      const count = Math.min(available, hitDiceSpent);
      updated.hitDice = {
        ...updated.hitDice,
        current: available - count,
      };
    }

    // 3. Reset short rest tracked resources
    if (updated.resources) {
      updated.resources = updated.resources.map(res =>
        res.resetOn === 'short' ? { ...res, current: res.max } : res,
      );
    }

    // 4. Reset death saves if alive
    if (updated.hp > 0 && updated.deathSaves) {
      updated.deathSaves = { successes: 0, failures: 0 };
    }

    // 5. Clamp HP
    updated.hp = clamp(updated.hp, 0, maxHp);
    return updated;
  }

  // Long rest recovery
  // 1. Restore HP to max
  updated.hp = maxHp;

  // 2. Clear temp HP
  if (updated.tempHp !== undefined) {
    updated.tempHp = 0;
  }

  // 3. Clear exhaustion
  if (updated.exhaustion !== undefined) {
    updated.exhaustion = 0;
  }

  // 4. Reset death saves
  if (updated.deathSaves) {
    updated.deathSaves = { successes: 0, failures: 0 };
  }

  // 5. Restore all expended spell slots
  if (updated.spellSlots) {
    const refreshedSlots = { ...updated.spellSlots };
    for (const [lvlKey, slot] of Object.entries(refreshedSlots)) {
      refreshedSlots[Number(lvlKey)] = {
        max: slot.max,
        used: 0,
      };
    }
    updated.spellSlots = refreshedSlots;
  }

  // 6. Restore half maximum hit dice (minimum 1)
  if (updated.hitDice) {
    const hdMax = updated.hitDice.max ?? updated.level ?? 1;
    const restored = Math.max(1, Math.floor(hdMax / 2));
    const newCurrent = clamp((updated.hitDice.current ?? 0) + restored, 0, hdMax);
    updated.hitDice = {
      ...updated.hitDice,
      current: newCurrent,
      max: hdMax,
    };
  }

  // 7. Reset tracked resources marked for short or long rest
  if (updated.resources) {
    updated.resources = updated.resources.map(res =>
      res.resetOn === 'short' || res.resetOn === 'long'
        ? { ...res, current: res.max }
        : res,
    );
  }

  return updated;
}
