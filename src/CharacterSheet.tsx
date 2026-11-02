import React, { useState } from 'react';
import {
  Shield,
  Heart,
  Zap,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Sparkles,
  BookOpen,
  Eye,
  Check,
  X,
  RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  type Character,
  type AbilityName,
  type SkillName,
  type TrackedResource,
  type InventoryItem,
  type CharacterSpell,
  type SpellSlots,
  uid,
} from './models';
import {
  clamp,
  getModifier,
  getProficiencyBonus,
  getPassiveScore,
  calculateRestRecovery,
  SKILL_DEFINITIONS,
} from './characterRules';
import { DND_CONDITIONS } from './conditions';

export interface CharacterSheetProps {
  character: Character;
  onUpdate: (patch: Partial<Character>) => void;
  notify?: (message: string) => void;
}

const ABILITIES: Array<{ key: AbilityName; label: string }> = [
  { key: 'str', label: 'STR' },
  { key: 'dex', label: 'DEX' },
  { key: 'con', label: 'CON' },
  { key: 'int', label: 'INT' },
  { key: 'wis', label: 'WIS' },
  { key: 'cha', label: 'CHA' },
];

export function CharacterSheet({ character, onUpdate, notify }: CharacterSheetProps) {
  // Collapsible sections state (all default open)
  const [sections, setSections] = useState({
    combat: true,
    abilities: true,
    skills: true,
    proficiencies: true,
    resources: true,
    inventory: true,
    spells: true,
  });

  const toggleSection = (key: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Header helpers
  const level = character.level ?? 1;
  const profBonus = getProficiencyBonus(level);
  const stats = character.stats || {};
  const currentHp = character.hp ?? 10;
  const maxHp = character.maxHp ?? currentHp;
  const tempHp = character.tempHp ?? 0;
  const ac = character.ac ?? 10;
  const dexMod = getModifier(stats.dex ?? 10);
  const initiative = character.initiative ?? dexMod;
  const speed = character.speed ?? 30;

  // Damage/heal input state
  const [hpDelta, setHpDelta] = useState<string>('');

  const applyDamage = () => {
    const amount = parseInt(hpDelta, 10);
    if (isNaN(amount) || amount <= 0) return;
    let nextTemp = tempHp;
    let nextHp = currentHp;
    if (nextTemp > 0) {
      if (amount <= nextTemp) {
        nextTemp -= amount;
      } else {
        const remaining = amount - nextTemp;
        nextTemp = 0;
        nextHp = Math.max(0, nextHp - remaining);
      }
    } else {
      nextHp = Math.max(0, nextHp - amount);
    }
    onUpdate({ hp: nextHp, tempHp: nextTemp });
    setHpDelta('');
    notify?.(`Took ${amount} damage`);
  };

  const applyHeal = () => {
    const amount = parseInt(hpDelta, 10);
    if (isNaN(amount) || amount <= 0) return;
    const nextHp = clamp(currentHp + amount, 0, maxHp);
    onUpdate({ hp: nextHp });
    setHpDelta('');
    notify?.(`Healed ${amount} HP`);
  };

  // Death saves
  const deathSaves = character.deathSaves || { successes: 0, failures: 0 };
  const toggleDeathSave = (type: 'successes' | 'failures', index: number) => {
    const cur = deathSaves[type];
    const nextVal = index < cur ? index : index + 1;
    onUpdate({
      deathSaves: {
        ...deathSaves,
        [type]: clamp(nextVal, 0, 3),
      },
    });
  };

  // Level up / down
  const changeLevel = (delta: number) => {
    const next = clamp(level + delta, 1, 20);
    onUpdate({ level: next });
    notify?.(`Level set to ${next}`);
  };

  // Short and long rest
  const handleRest = (type: 'short' | 'long') => {
    const updated = calculateRestRecovery(character, type);
    onUpdate(updated);
    notify?.(`${type === 'short' ? 'Short' : 'Long'} rest completed`);
  };

  // Conditions
  const conditions = character.conditions || [];
  const [showConditionPicker, setShowConditionPicker] = useState(false);
  const addCondition = (cond: string) => {
    if (!conditions.includes(cond)) {
      onUpdate({ conditions: [...conditions, cond] });
    }
    setShowConditionPicker(false);
  };
  const removeCondition = (cond: string) => {
    onUpdate({ conditions: conditions.filter(c => c !== cond) });
  };

  // Defenses
  const defenses = character.defenses || [];
  const [newDefense, setNewDefense] = useState('');
  const addDefense = () => {
    if (newDefense.trim() && !defenses.includes(newDefense.trim())) {
      onUpdate({ defenses: [...defenses, newDefense.trim()] });
      setNewDefense('');
    }
  };
  const removeDefense = (d: string) => {
    onUpdate({ defenses: defenses.filter(item => item !== d) });
  };

  // Ability scores & saving throws
  const saveProfs = new Set(character.savingThrowProficiencies || []);
  const toggleSaveProf = (ability: AbilityName) => {
    const next = new Set(saveProfs);
    if (next.has(ability)) next.delete(ability);
    else next.add(ability);
    onUpdate({ savingThrowProficiencies: Array.from(next) });
  };

  const setStatScore = (ability: AbilityName, val: number) => {
    onUpdate({
      stats: {
        ...stats,
        [ability]: clamp(val, 1, 30),
      },
    });
  };

  // Skills
  const skillProfs = new Set(character.skillProficiencies || []);
  const skillExpertise = new Set(character.skillExpertise || []);
  const toggleSkillProf = (skillId: SkillName) => {
    const nextProfs = new Set(skillProfs);
    if (nextProfs.has(skillId)) {
      nextProfs.delete(skillId);
    } else {
      nextProfs.add(skillId);
    }
    onUpdate({ skillProficiencies: Array.from(nextProfs) });
  };

  const toggleSkillExpertise = (skillId: SkillName) => {
    const nextExp = new Set(skillExpertise);
    if (nextExp.has(skillId)) {
      nextExp.delete(skillId);
    } else {
      nextExp.add(skillId);
    }
    onUpdate({ skillExpertise: Array.from(nextExp) });
  };

  // Passives
  const wisMod = getModifier(stats.wis ?? 10);
  const intMod = getModifier(stats.int ?? 10);
  const passivePerception =
    character.passivePerception ??
    getPassiveScore(wisMod, skillProfs.has('perception'), profBonus);
  const passiveInvestigation = getPassiveScore(
    intMod,
    skillProfs.has('investigation'),
    profBonus,
  );
  const passiveInsight = getPassiveScore(
    wisMod,
    skillProfs.has('insight'),
    profBonus,
  );

  // Tracked Resources
  const resources: TrackedResource[] = character.resources || [];
  const [newResName, setNewResName] = useState('');
  const [newResMax, setNewResMax] = useState(3);
  const [newResReset, setNewResReset] = useState<'short' | 'long' | 'none'>('long');

  const addResource = () => {
    if (!newResName.trim()) return;
    const item: TrackedResource = {
      id: uid(),
      name: newResName.trim(),
      current: newResMax,
      max: newResMax,
      resetOn: newResReset,
    };
    onUpdate({ resources: [...resources, item] });
    setNewResName('');
  };

  const updateResource = (id: string, patch: Partial<TrackedResource>) => {
    onUpdate({
      resources: resources.map(r => (r.id === id ? { ...r, ...patch } : r)),
    });
  };

  const removeResource = (id: string) => {
    onUpdate({ resources: resources.filter(r => r.id !== id) });
  };

  // Inventory & Attunement
  const inventory: InventoryItem[] = character.inventory || [];
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemWeight, setNewItemWeight] = useState(0);
  const [newItemAttuned, setNewItemAttuned] = useState(false);

  const attunedCount = inventory.filter(i => i.attuned).length;

  const addItem = () => {
    if (!newItemName.trim()) return;
    const item: InventoryItem = {
      id: uid(),
      name: newItemName.trim(),
      qty: Math.max(1, newItemQty),
      weight: Math.max(0, newItemWeight),
      attuned: newItemAttuned,
    };
    onUpdate({ inventory: [...inventory, item] });
    setNewItemName('');
    setNewItemQty(1);
    setNewItemWeight(0);
    setNewItemAttuned(false);
  };

  const updateItem = (id: string, patch: Partial<InventoryItem>) => {
    onUpdate({
      inventory: inventory.map(item =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    });
  };

  const removeItem = (id: string) => {
    onUpdate({ inventory: inventory.filter(item => item.id !== id) });
  };

  // Spells & Spell Slots
  const spells: CharacterSpell[] = character.spells || [];
  const spellSlots: SpellSlots = character.spellSlots || {};
  const [newSpellName, setNewSpellName] = useState('');
  const [newSpellLevel, setNewSpellLevel] = useState<number>(1);
  const [newSpellSchool, setNewSpellSchool] = useState('');
  const [newSpellRitual, setNewSpellRitual] = useState(false);
  const [newSpellConcentration, setNewSpellConcentration] = useState(false);
  const [newSpellPrepared, setNewSpellPrepared] = useState(false);

  const addSpell = () => {
    if (!newSpellName.trim()) return;
    const spell: CharacterSpell = {
      id: uid(),
      name: newSpellName.trim(),
      level: newSpellLevel,
      school: newSpellSchool.trim() || undefined,
      ritual: newSpellRitual,
      concentration: newSpellConcentration,
      prepared: newSpellPrepared,
    };
    onUpdate({ spells: [...spells, spell] });
    setNewSpellName('');
    setNewSpellSchool('');
    setNewSpellRitual(false);
    setNewSpellConcentration(false);
    setNewSpellPrepared(false);
  };

  const updateSpell = (id: string, patch: Partial<CharacterSpell>) => {
    onUpdate({
      spells: spells.map(s => (s.id === id ? { ...s, ...patch } : s)),
    });
  };

  const removeSpell = (id: string) => {
    onUpdate({ spells: spells.filter(s => s.id !== id) });
  };

  const updateSpellSlot = (
    lvl: number,
    field: 'max' | 'used',
    val: number,
  ) => {
    const cur = spellSlots[lvl] || { max: 0, used: 0 };
    const nextSlot = {
      ...cur,
      [field]: Math.max(0, val),
    };
    onUpdate({
      spellSlots: {
        ...spellSlots,
        [lvl]: nextSlot,
      },
    });
  };

  const preparedCount = spells.filter(s => s.level > 0 && s.prepared).length;

  return (
    <div className="char-sheet" role="region" aria-label="Interactive character sheet">
      {/* HEADER */}
      <header className="char-sheet-header">
        <div className="char-header-top">
          <div className="char-name-block">
            <input
              className="char-name-input"
              aria-label="Character name"
              value={character.name || ''}
              onChange={e => onUpdate({ name: e.target.value })}
              placeholder="Character Name"
            />
            <div className="char-details-row">
              <input
                className="char-detail-input"
                aria-label="Character class"
                value={character.className || character.role || ''}
                onChange={e =>
                  onUpdate({ className: e.target.value, role: e.target.value })
                }
                placeholder="Class & Subclass"
              />
              <span className="char-detail-sep">/</span>
              <input
                className="char-detail-input"
                aria-label="Character species"
                value={character.species || ''}
                onChange={e => onUpdate({ species: e.target.value })}
                placeholder="Species"
              />
              <span className="char-detail-sep">/</span>
              <input
                className="char-detail-input"
                aria-label="Character background"
                value={character.background || ''}
                onChange={e => onUpdate({ background: e.target.value })}
                placeholder="Background"
              />
            </div>
          </div>

          <div className="char-header-controls">
            <div className="char-level-badge">
              <span className="char-level-label">LEVEL</span>
              <div className="char-level-spinner">
                <button
                  type="button"
                  className="char-level-btn"
                  aria-label="Decrease level"
                  onClick={() => changeLevel(-1)}
                  disabled={level <= 1}
                >
                  -
                </button>
                <span className="char-level-num">{level}</span>
                <button
                  type="button"
                  className="char-level-btn"
                  aria-label="Increase level"
                  onClick={() => changeLevel(1)}
                  disabled={level >= 20}
                >
                  +
                </button>
              </div>
            </div>

            <div className="char-pb-badge">
              <span className="char-pb-label">PROF</span>
              <span className="char-pb-val">+{profBonus}</span>
            </div>

            <div className="char-rest-actions">
              <button
                type="button"
                className="secondary small char-rest-btn"
                onClick={() => handleRest('short')}
              >
                <RotateCcw size={12} />
                Short rest
              </button>
              <button
                type="button"
                className="secondary small char-rest-btn"
                onClick={() => handleRest('long')}
              >
                <RotateCcw size={12} />
                Long rest
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 1. COMBAT STATS */}
      <section className="char-section">
        <button
          type="button"
          className="char-section-toggle"
          aria-expanded={sections.combat}
          onClick={() => toggleSection('combat')}
        >
          <span className="char-section-title">
            <Shield size={16} />
            1. Combat Stats
          </span>
          {sections.combat ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <AnimatePresence initial={false}>
          {sections.combat && (
            <motion.div
              className="char-section-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="char-combat-grid">
                {/* HP Tracker Box */}
                <div className="char-stat-card char-hp-card">
                  <div className="char-hp-readout">
                    <div className="char-hp-block">
                      <span className="char-stat-label">CURRENT HP</span>
                      <input
                        type="number"
                        className="char-hp-input"
                        aria-label="Current HP"
                        value={currentHp}
                        onChange={e => onUpdate({ hp: Math.max(0, +e.target.value) })}
                      />
                    </div>
                    <span className="char-hp-divider">/</span>
                    <div className="char-hp-block">
                      <span className="char-stat-label">MAX HP</span>
                      <input
                        type="number"
                        className="char-hp-input"
                        aria-label="Max HP"
                        value={maxHp}
                        onChange={e => onUpdate({ maxHp: Math.max(1, +e.target.value) })}
                      />
                    </div>
                    <div className="char-hp-block char-temp-hp">
                      <span className="char-stat-label">TEMP HP</span>
                      <input
                        type="number"
                        className="char-hp-input"
                        aria-label="Temp HP"
                        value={tempHp}
                        onChange={e => onUpdate({ tempHp: Math.max(0, +e.target.value) })}
                      />
                    </div>
                  </div>

                  {/* Damage / Heal Quick Bar */}
                  <div className="char-hp-actions">
                    <input
                      type="number"
                      className="char-hp-delta-input"
                      aria-label="Damage or heal amount"
                      placeholder="Amount"
                      value={hpDelta}
                      onChange={e => setHpDelta(e.target.value)}
                    />
                    <button
                      type="button"
                      className="char-damage-btn"
                      onClick={applyDamage}
                    >
                      Damage
                    </button>
                    <button
                      type="button"
                      className="char-heal-btn"
                      onClick={applyHeal}
                    >
                      Heal
                    </button>
                  </div>
                </div>

                {/* Core combat numbers: AC, Init, Speed */}
                <div className="char-core-trio">
                  <div className="char-stat-card">
                    <span className="char-stat-label">ARMOR CLASS</span>
                    <input
                      type="number"
                      className="char-num-hero"
                      aria-label="Armor Class"
                      value={ac}
                      onChange={e => onUpdate({ ac: Math.max(0, +e.target.value) })}
                    />
                  </div>
                  <div className="char-stat-card">
                    <span className="char-stat-label">INITIATIVE</span>
                    <input
                      type="number"
                      className="char-num-hero"
                      aria-label="Initiative modifier"
                      value={initiative}
                      onChange={e => onUpdate({ initiative: +e.target.value })}
                    />
                  </div>
                  <div className="char-stat-card">
                    <span className="char-stat-label">SPEED</span>
                    <div className="char-speed-val">
                      <input
                        type="number"
                        className="char-num-hero"
                        aria-label="Speed"
                        value={speed}
                        onChange={e => onUpdate({ speed: Math.max(0, +e.target.value) })}
                      />
                      <small>ft</small>
                    </div>
                  </div>
                </div>

                {/* Hit Dice & Death Saves & Inspiration */}
                <div className="char-combat-secondary">
                  <div className="char-stat-card">
                    <span className="char-stat-label">HIT DICE</span>
                    <div className="char-hit-dice-row">
                      <input
                        type="number"
                        className="char-mini-num"
                        aria-label="Hit dice current"
                        value={character.hitDice?.current ?? level}
                        onChange={e =>
                          onUpdate({
                            hitDice: {
                              current: Math.max(0, +e.target.value),
                              max: character.hitDice?.max ?? level,
                              die: character.hitDice?.die || 'd8',
                            },
                          })
                        }
                      />
                      <span>/</span>
                      <input
                        type="number"
                        className="char-mini-num"
                        aria-label="Hit dice max"
                        value={character.hitDice?.max ?? level}
                        onChange={e =>
                          onUpdate({
                            hitDice: {
                              current: character.hitDice?.current ?? level,
                              max: Math.max(1, +e.target.value),
                              die: character.hitDice?.die || 'd8',
                            },
                          })
                        }
                      />
                      <input
                        className="char-die-type"
                        aria-label="Hit die type"
                        value={character.hitDice?.die || 'd8'}
                        onChange={e =>
                          onUpdate({
                            hitDice: {
                              current: character.hitDice?.current ?? level,
                              max: character.hitDice?.max ?? level,
                              die: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Death Saves */}
                  <div className="char-stat-card">
                    <span className="char-stat-label">DEATH SAVES</span>
                    <div className="char-death-saves">
                      <div className="char-save-row">
                        <span className="char-save-tag">SUCC</span>
                        <div className="char-pips">
                          {[0, 1, 2].map(i => (
                            <button
                              key={`succ-${i}`}
                              type="button"
                              className={`char-pip succ ${i < deathSaves.successes ? 'active' : ''}`}
                              aria-label={`Death save success ${i + 1}`}
                              onClick={() => toggleDeathSave('successes', i)}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="char-save-row">
                        <span className="char-save-tag">FAIL</span>
                        <div className="char-pips">
                          {[0, 1, 2].map(i => (
                            <button
                              key={`fail-${i}`}
                              type="button"
                              className={`char-pip fail ${i < deathSaves.failures ? 'active' : ''}`}
                              aria-label={`Death save failure ${i + 1}`}
                              onClick={() => toggleDeathSave('failures', i)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Inspiration & Exhaustion */}
                  <div className="char-stat-card char-insp-exh">
                    <label className="char-checkbox-label">
                      <input
                        type="checkbox"
                        checked={!!character.inspiration}
                        onChange={e => onUpdate({ inspiration: e.target.checked })}
                      />
                      <Sparkles size={14} />
                      <span>Heroic Inspiration</span>
                    </label>

                    <div className="char-exhaustion-row">
                      <span className="char-stat-label">EXHAUSTION</span>
                      <input
                        type="number"
                        min={0}
                        max={6}
                        className="char-mini-num"
                        aria-label="Exhaustion level"
                        value={character.exhaustion ?? 0}
                        onChange={e =>
                          onUpdate({
                            exhaustion: clamp(+e.target.value, 0, 6),
                          })
                        }
                      />
                      <small className="char-exh-hint">
                        -{(character.exhaustion ?? 0) * 2} to d20 rolls
                      </small>
                    </div>
                  </div>
                </div>

                {/* Conditions & Defenses */}
                <div className="char-combat-tertiary">
                  {/* Conditions */}
                  <div className="char-stat-card">
                    <div className="char-card-header">
                      <span className="char-stat-label">CONDITIONS</span>
                      <button
                        type="button"
                        className="secondary small"
                        onClick={() => setShowConditionPicker(!showConditionPicker)}
                      >
                        <Plus size={12} /> Add Condition
                      </button>
                    </div>
                    {showConditionPicker && (
                      <div className="char-condition-picker">
                        {DND_CONDITIONS.map(c => (
                          <button
                            key={c}
                            type="button"
                            className="char-condition-opt"
                            onClick={() => addCondition(c)}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="char-chips-wrap">
                      {conditions.length === 0 ? (
                        <span className="char-empty-hint">None</span>
                      ) : (
                        conditions.map(c => (
                          <span key={c} className="char-chip">
                            {c}
                            <button
                              type="button"
                              aria-label={`Remove condition ${c}`}
                              onClick={() => removeCondition(c)}
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Defenses / Resistances */}
                  <div className="char-stat-card">
                    <span className="char-stat-label">DEFENSES & RESISTANCES</span>
                    <div className="char-chips-wrap">
                      {defenses.map(d => (
                        <span key={d} className="char-chip">
                          {d}
                          <button
                            type="button"
                            aria-label={`Remove defense ${d}`}
                            onClick={() => removeDefense(d)}
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="char-inline-add">
                      <input
                        className="char-add-input"
                        aria-label="New defense or resistance"
                        placeholder="e.g. Fire resistance, Poison immunity"
                        value={newDefense}
                        onChange={e => setNewDefense(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addDefense()}
                      />
                      <button
                        type="button"
                        className="secondary small"
                        onClick={addDefense}
                      >
                        <Plus size={12} /> Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* 2. ABILITY SCORES & SAVING THROWS */}
      <section className="char-section">
        <button
          type="button"
          className="char-section-toggle"
          aria-expanded={sections.abilities}
          onClick={() => toggleSection('abilities')}
        >
          <span className="char-section-title">
            <Zap size={16} />
            2. Ability Scores & Saving Throws
          </span>
          {sections.abilities ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <AnimatePresence initial={false}>
          {sections.abilities && (
            <motion.div
              className="char-section-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="char-abilities-grid">
                {ABILITIES.map(({ key, label }) => {
                  const score = stats[key] ?? 10;
                  const mod = getModifier(score);
                  const isProf = saveProfs.has(key);
                  const saveVal = mod + (isProf ? profBonus : 0);
                  const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
                  const saveStr = saveVal >= 0 ? `+${saveVal}` : `${saveVal}`;

                  return (
                    <div key={key} className="char-ability-box">
                      <span className="char-ability-label">{label}</span>
                      <div className="char-mod-hero">{modStr}</div>
                      <div className="char-score-row">
                        <input
                          type="number"
                          className="char-score-input"
                          aria-label={`${label} score`}
                          value={score}
                          onChange={e => setStatScore(key, +e.target.value)}
                        />
                      </div>
                      <div className="char-save-block">
                        <label className="char-save-check">
                          <input
                            type="checkbox"
                            aria-label={`${label} save proficiency`}
                            checked={isProf}
                            onChange={() => toggleSaveProf(key)}
                          />
                          <span className="char-save-val">Save {saveStr}</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* 3. SKILLS & SENSES */}
      <section className="char-section">
        <button
          type="button"
          className="char-section-toggle"
          aria-expanded={sections.skills}
          onClick={() => toggleSection('skills')}
        >
          <span className="char-section-title">
            <Eye size={16} />
            3. Skills & Senses
          </span>
          {sections.skills ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <AnimatePresence initial={false}>
          {sections.skills && (
            <motion.div
              className="char-section-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="char-passives-banner">
                <div className="char-passive-box">
                  <span className="char-passive-val">{passivePerception}</span>
                  <span className="char-passive-label">Passive Perception</span>
                </div>
                <div className="char-passive-box">
                  <span className="char-passive-val">{passiveInvestigation}</span>
                  <span className="char-passive-label">Passive Investigation</span>
                </div>
                <div className="char-passive-box">
                  <span className="char-passive-val">{passiveInsight}</span>
                  <span className="char-passive-label">Passive Insight</span>
                </div>
                <div className="char-passive-box">
                  <span className="char-passive-val">60 ft</span>
                  <span className="char-passive-label">Darkvision</span>
                </div>
              </div>

              <div className="char-skills-list">
                {SKILL_DEFINITIONS.map(skill => {
                  const isProf = skillProfs.has(skill.id);
                  const isExp = skillExpertise.has(skill.id);
                  const abMod = getModifier(stats[skill.ability] ?? 10);
                  const bonus =
                    abMod + (isExp ? profBonus * 2 : isProf ? profBonus : 0);
                  const bonusStr = bonus >= 0 ? `+${bonus}` : `${bonus}`;

                  return (
                    <div key={skill.id} className="char-skill-row">
                      <div className="char-skill-checks">
                        <input
                          type="checkbox"
                          aria-label={`${skill.name} proficiency`}
                          checked={isProf}
                          onChange={() => toggleSkillProf(skill.id)}
                          title="Proficient"
                        />
                        <button
                          type="button"
                          className={`char-expertise-btn ${isExp ? 'active' : ''}`}
                          aria-label={`${skill.name} expertise`}
                          onClick={() => toggleSkillExpertise(skill.id)}
                          title="Expertise"
                        >
                          E
                        </button>
                      </div>
                      <span className="char-skill-ability">
                        {skill.ability.toUpperCase()}
                      </span>
                      <span className="char-skill-name">{skill.name}</span>
                      <span className="char-skill-bonus">{bonusStr}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* 4. PROFICIENCIES & TRAINING */}
      <section className="char-section">
        <button
          type="button"
          className="char-section-toggle"
          aria-expanded={sections.proficiencies}
          onClick={() => toggleSection('proficiencies')}
        >
          <span className="char-section-title">
            <BookOpen size={16} />
            4. Proficiencies & Training
          </span>
          {sections.proficiencies ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <AnimatePresence initial={false}>
          {sections.proficiencies && (
            <motion.div
              className="char-section-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="char-training-grid">
                <div className="char-training-card">
                  <span className="char-stat-label">ARMOR & WEAPONS</span>
                  <textarea
                    rows={2}
                    className="char-training-input"
                    aria-label="Armor and weapon proficiencies"
                    value={character.proficiencies || ''}
                    onChange={e => onUpdate({ proficiencies: e.target.value })}
                    placeholder="Light armor, medium armor, shields, simple weapons, martial weapons..."
                  />
                </div>
                <div className="char-training-card">
                  <span className="char-stat-label">TOOLS & KITS</span>
                  <textarea
                    rows={2}
                    className="char-training-input"
                    aria-label="Tool proficiencies"
                    value={character.training?.tools?.join(', ') || ''}
                    onChange={e =>
                      onUpdate({
                        training: {
                          ...character.training,
                          tools: e.target.value
                            .split(',')
                            .map(s => s.trim())
                            .filter(Boolean),
                        },
                      })
                    }
                    placeholder="Thieves' tools, Herbalism kit, Alchemist's supplies..."
                  />
                </div>
                <div className="char-training-card">
                  <span className="char-stat-label">LANGUAGES</span>
                  <textarea
                    rows={2}
                    className="char-training-input"
                    aria-label="Languages"
                    value={(character.languages || []).join(', ')}
                    onChange={e =>
                      onUpdate({
                        languages: e.target.value
                          .split(',')
                          .map(s => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="Common, Elvish, Dwarvish..."
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* 5. FEATURES & TRACKED RESOURCES */}
      <section className="char-section">
        <button
          type="button"
          className="char-section-toggle"
          aria-expanded={sections.resources}
          onClick={() => toggleSection('resources')}
        >
          <span className="char-section-title">
            <Sparkles size={16} />
            5. Features & Tracked Resources
          </span>
          {sections.resources ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <AnimatePresence initial={false}>
          {sections.resources && (
            <motion.div
              className="char-section-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {/* Resources list */}
              <div className="char-resources-list">
                {resources.map(res => (
                  <div key={res.id} className="char-resource-card">
                    <div className="char-resource-info">
                      <strong>{res.name}</strong>
                      <span className="char-res-reset">Reset: {res.resetOn}</span>
                    </div>
                    <div className="char-res-controls">
                      <button
                        type="button"
                        className="char-res-btn"
                        aria-label={`Decrease ${res.name}`}
                        onClick={() =>
                          updateResource(res.id, {
                            current: Math.max(0, res.current - 1),
                          })
                        }
                      >
                        -
                      </button>
                      <span className="char-res-val">
                        {res.current} / {res.max}
                      </span>
                      <button
                        type="button"
                        className="char-res-btn"
                        aria-label={`Increase ${res.name}`}
                        onClick={() =>
                          updateResource(res.id, {
                            current: Math.min(res.max, res.current + 1),
                          })
                        }
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="icon-button danger-text"
                        aria-label={`Delete resource ${res.name}`}
                        onClick={() => removeResource(res.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add resource form */}
              <div className="char-add-resource-form">
                <input
                  className="char-add-input"
                  aria-label="Resource name"
                  placeholder="e.g. Ki Points, Superiority Dice, Wild Shape"
                  value={newResName}
                  onChange={e => setNewResName(e.target.value)}
                />
                <input
                  type="number"
                  min={1}
                  className="char-mini-num"
                  aria-label="Resource maximum"
                  value={newResMax}
                  onChange={e => setNewResMax(Math.max(1, +e.target.value))}
                />
                <select
                  aria-label="Resource reset trigger"
                  value={newResReset}
                  onChange={e =>
                    setNewResReset(e.target.value as 'short' | 'long' | 'none')
                  }
                >
                  <option value="long">Long rest</option>
                  <option value="short">Short rest</option>
                  <option value="none">Manual only</option>
                </select>
                <button
                  type="button"
                  className="secondary small"
                  onClick={addResource}
                >
                  <Plus size={12} /> Add Resource
                </button>
              </div>

              {/* Freeform feature notes */}
              <div className="char-features-notes">
                <span className="char-stat-label">CLASS & SPECIES FEATURES</span>
                <textarea
                  rows={4}
                  className="char-training-input"
                  aria-label="Feature notes"
                  value={character.notes || ''}
                  onChange={e => onUpdate({ notes: e.target.value })}
                  placeholder="Action Surge, Sneak Attack, Dark One's Blessing…"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* 6. ITEMS & INVENTORY */}
      <section className="char-section">
        <button
          type="button"
          className="char-section-toggle"
          aria-expanded={sections.inventory}
          onClick={() => toggleSection('inventory')}
        >
          <span className="char-section-title">
            <Shield size={16} />
            6. Items & Inventory
          </span>
          <div className="char-attunement-counter">
            Attunement: {attunedCount} / 3
          </div>
          {sections.inventory ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <AnimatePresence initial={false}>
          {sections.inventory && (
            <motion.div
              className="char-section-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="char-inventory-list">
                {inventory.map(item => (
                  <div key={item.id} className="char-item-row">
                    <div className="char-item-info">
                      <strong>{item.name}</strong>
                      <span className="char-item-meta">
                        Qty: {item.qty} · {item.weight} lbs
                      </span>
                    </div>
                    <div className="char-item-actions">
                      <label className="char-attune-check">
                        <input
                          type="checkbox"
                          aria-label={`Attune ${item.name}`}
                          checked={item.attuned}
                          onChange={e =>
                            updateItem(item.id, { attuned: e.target.checked })
                          }
                        />
                        <span>Attuned</span>
                      </label>
                      <button
                        type="button"
                        className="icon-button danger-text"
                        aria-label={`Remove item ${item.name}`}
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add item form */}
              <div className="char-add-item-form">
                <input
                  className="char-add-input"
                  aria-label="Item name"
                  placeholder="Item name (e.g. Cloak of Protection, Health Potion)"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                />
                <input
                  type="number"
                  min={1}
                  className="char-mini-num"
                  aria-label="Item quantity"
                  placeholder="Qty"
                  value={newItemQty}
                  onChange={e => setNewItemQty(Math.max(1, +e.target.value))}
                />
                <input
                  type="number"
                  min={0}
                  className="char-mini-num"
                  aria-label="Item weight"
                  placeholder="lbs"
                  value={newItemWeight}
                  onChange={e => setNewItemWeight(Math.max(0, +e.target.value))}
                />
                <label className="char-attune-check">
                  <input
                    type="checkbox"
                    aria-label="Requires attunement"
                    checked={newItemAttuned}
                    onChange={e => setNewItemAttuned(e.target.checked)}
                  />
                  <span>Attuned</span>
                </label>
                <button
                  type="button"
                  className="secondary small"
                  onClick={addItem}
                >
                  <Plus size={12} /> Add Item
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* 7. SPELLBOOK & SPELL SLOTS */}
      <section className="char-section">
        <button
          type="button"
          className="char-section-toggle"
          aria-expanded={sections.spells}
          onClick={() => toggleSection('spells')}
        >
          <span className="char-section-title">
            <Sparkles size={16} />
            7. Spellbook & Spell Slots
          </span>
          <div className="char-prepared-counter">
            Prepared: {preparedCount}
          </div>
          {sections.spells ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <AnimatePresence initial={false}>
          {sections.spells && (
            <motion.div
              className="char-section-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {/* Spell slots tracker (levels 1-9) */}
              <div className="char-slots-grid">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(lvl => {
                  const slot = spellSlots[lvl] || { max: 0, used: 0 };
                  return (
                    <div key={lvl} className="char-slot-card">
                      <span className="char-slot-lvl">LVL {lvl}</span>
                      <div className="char-slot-counts">
                        <div className="char-slot-field">
                          <small>USED</small>
                          <input
                            type="number"
                            min={0}
                            className="char-mini-num"
                            aria-label={`Level ${lvl} spell slots used`}
                            value={slot.used}
                            onChange={e =>
                              updateSpellSlot(lvl, 'used', +e.target.value)
                            }
                          />
                        </div>
                        <span className="char-slot-sep">/</span>
                        <div className="char-slot-field">
                          <small>MAX</small>
                          <input
                            type="number"
                            min={0}
                            className="char-mini-num"
                            aria-label={`Level ${lvl} spell slots max`}
                            value={slot.max}
                            onChange={e =>
                              updateSpellSlot(lvl, 'max', +e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Spells list */}
              <div className="char-spells-list">
                {spells.map(spell => (
                  <div key={spell.id} className="char-spell-row">
                    <div className="char-spell-prep">
                      {spell.level > 0 ? (
                        <input
                          type="checkbox"
                          aria-label={`Prepare ${spell.name}`}
                          checked={spell.prepared}
                          onChange={e =>
                            updateSpell(spell.id, { prepared: e.target.checked })
                          }
                          title="Prepared"
                        />
                      ) : (
                        <span className="char-cantrip-badge">C</span>
                      )}
                    </div>
                    <div className="char-spell-info">
                      <strong className="char-spell-name">{spell.name}</strong>
                      <span className="char-spell-meta">
                        {spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`}
                        {spell.school ? ` · ${spell.school}` : ''}
                      </span>
                    </div>
                    <div className="char-spell-tags">
                      {spell.ritual && (
                        <span className="char-spell-tag">Ritual</span>
                      )}
                      {spell.concentration && (
                        <span className="char-spell-tag">Conc</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="icon-button danger-text"
                      aria-label={`Remove spell ${spell.name}`}
                      onClick={() => removeSpell(spell.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add spell form */}
              <div className="char-add-spell-form">
                <input
                  className="char-add-input"
                  aria-label="Spell name"
                  placeholder="Spell name (e.g. Shield, Fireball, Misty Step)"
                  value={newSpellName}
                  onChange={e => setNewSpellName(e.target.value)}
                />
                <select
                  aria-label="Spell level"
                  value={newSpellLevel}
                  onChange={e => setNewSpellLevel(+e.target.value)}
                >
                  <option value={0}>Cantrip (0)</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(l => (
                    <option key={l} value={l}>
                      Level {l}
                    </option>
                  ))}
                </select>
                <input
                  className="char-add-input char-school-input"
                  aria-label="Spell school"
                  placeholder="School (e.g. Evocation)"
                  value={newSpellSchool}
                  onChange={e => setNewSpellSchool(e.target.value)}
                />
                <div className="char-spell-checkboxes">
                  <label className="char-mini-check">
                    <input
                      type="checkbox"
                      aria-label="Spell is ritual"
                      checked={newSpellRitual}
                      onChange={e => setNewSpellRitual(e.target.checked)}
                    />
                    <span>Ritual</span>
                  </label>
                  <label className="char-mini-check">
                    <input
                      type="checkbox"
                      aria-label="Spell requires concentration"
                      checked={newSpellConcentration}
                      onChange={e => setNewSpellConcentration(e.target.checked)}
                    />
                    <span>Conc</span>
                  </label>
                  <label className="char-mini-check">
                    <input
                      type="checkbox"
                      aria-label="Spell prepared"
                      checked={newSpellPrepared}
                      onChange={e => setNewSpellPrepared(e.target.checked)}
                    />
                    <span>Prepared</span>
                  </label>
                </div>
                <button
                  type="button"
                  className="secondary small"
                  onClick={addSpell}
                >
                  <Plus size={12} /> Add Spell
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}
