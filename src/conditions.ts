export const DND_CONDITIONS = [
  'Blinded',
  'Charmed',
  'Deafened',
  'Exhaustion',
  'Frightened',
  'Grappled',
  'Incapacitated',
  'Invisible',
  'Paralyzed',
  'Petrified',
  'Poisoned',
  'Prone',
  'Restrained',
  'Stunned',
  'Unconscious',
] as const;

export type DndCondition = typeof DND_CONDITIONS[number];

export function splitConditions(value: string) {
  return value.split(',').map(condition => condition.trim()).filter(Boolean);
}

export function conditionName(value: string) {
  return value.replace(/\s+\d+$/, '');
}

export function setCondition(value: string, condition: string) {
  const name = conditionName(condition).toLowerCase();
  const remaining = splitConditions(value).filter(entry => conditionName(entry).toLowerCase() !== name);
  return [...remaining, condition].join(', ');
}

export function removeCondition(value: string, condition: string) {
  return splitConditions(value).filter(entry => entry !== condition).join(', ');
}
