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
  X,
  RotateCcw,
  User,
  Award,
  Coins,
  FileText,
  Search,
  ArrowUpCircle,
  Pin,
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
  type CharacterCurrency,
  type CharacterNoteEntry,
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
import { CompendiumSpellModal } from './CompendiumSpellModal';
import { Card } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import { Badge } from './components/ui/badge';

export interface CharacterSheetProps {
  character: Character;
  onUpdate: (patch: Partial<Character>) => void;
  notify?: (message: string) => void;
  campaign?: string;
}

const ABILITIES: Array<{ key: AbilityName; label: string }> = [
  { key: 'str', label: 'STR' },
  { key: 'dex', label: 'DEX' },
  { key: 'con', label: 'CON' },
  { key: 'int', label: 'INT' },
  { key: 'wis', label: 'WIS' },
  { key: 'cha', label: 'CHA' },
];

function inferSpellcastingAbility(className?: string): AbilityName {
  const c = (className || '').toLowerCase();
  if (c.includes('cleric') || c.includes('druid') || c.includes('ranger') || c.includes('monk')) return 'wis';
  if (c.includes('bard') || c.includes('paladin') || c.includes('sorcerer') || c.includes('warlock')) return 'cha';
  return 'int';
}

export function CharacterSheet({ character, onUpdate, notify, campaign }: CharacterSheetProps) {
  // Collapsible sections state (9 sections matching screenshot layout + Spellbook)
  const [sections, setSections] = useState({
    character: true,
    combat: true,
    resources: true,
    abilities: true,
    skills: true,
    inventory: true,
    spells: true,
    proficiencies: true,
    notes: true,
  });
  const [loreOpen, setLoreOpen] = useState(false);
  const [compendiumSpellsOpen, setCompendiumSpellsOpen] = useState(false);
  const [showAcNote, setShowAcNote] = useState(Boolean(character.acNote));
  const [showExtraSpeed, setShowExtraSpeed] = useState(Boolean(character.extraSpeeds));
  const [showDefenseInput, setShowDefenseInput] = useState(true);
  const [showFeatInput, setShowFeatInput] = useState(false);
  const [newFeat, setNewFeat] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [invSearch, setInvSearch] = useState('');
  const [noteSearch, setNoteSearch] = useState('');
  const [noteSortBy, setNoteSortBy] = useState<'date' | 'title'>('date');
  const [noteSortDesc, setNoteSortDesc] = useState(true);

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

  const importCompendiumSpells = (incoming: CharacterSpell[]) => {
    const existingNames = new Set(spells.map(s => s.name.toLowerCase()));
    const fresh = incoming.filter(s => !existingNames.has(s.name.toLowerCase()));
    if (fresh.length > 0) {
      onUpdate({ spells: [...spells, ...fresh] });
      notify?.(`Imported ${fresh.map(s => s.name).join(', ')}`);
    } else {
      notify?.('Spell already in spellbook');
    }
  };

  // Spellcasting stats (Attack & DC)
  const spellAbil: AbilityName =
    character.spellcastingAbility || inferSpellcastingAbility(character.className || character.role);
  const spellAbilMod = getModifier(stats[spellAbil] ?? 10);
  const spellAttackBonus = profBonus + spellAbilMod;
  const spellSaveDc = 8 + profBonus + spellAbilMod;
  const cycleSpellAbility = () => {
    const order: AbilityName[] = ['int', 'wis', 'cha'];
    const idx = order.indexOf(spellAbil);
    const next = order[(idx + 1) % order.length];
    onUpdate({ spellcastingAbility: next });
  };

  // Feats
  const feats: string[] = character.feats || [];
  const addFeat = () => {
    if (newFeat.trim() && !feats.includes(newFeat.trim())) {
      onUpdate({ feats: [...feats, newFeat.trim()] });
      setNewFeat('');
      setShowFeatInput(false);
    }
  };
  const removeFeat = (feat: string) => {
    onUpdate({ feats: feats.filter(f => f !== feat) });
  };

  // Currency
  const currency: CharacterCurrency = character.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
  const updateCurrency = (coin: keyof CharacterCurrency, val: number) => {
    onUpdate({
      currency: {
        ...currency,
        [coin]: Math.max(0, val),
      },
    });
  };
  const totalGp = Number(
    (currency.cp / 100 + currency.sp / 10 + currency.ep / 2 + currency.gp + currency.pp * 10).toFixed(2)
  );

  // Notes section
  const characterNotes: CharacterNoteEntry[] = character.characterNotes || [];
  const addNoteEntry = () => {
    const entry: CharacterNoteEntry = {
      id: uid(),
      title: 'General',
      body: '',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      pinned: false,
    };
    onUpdate({ characterNotes: [entry, ...characterNotes] });
  };
  const updateNoteEntry = (id: string, patch: Partial<CharacterNoteEntry>) => {
    onUpdate({
      characterNotes: characterNotes.map(n => (n.id === id ? { ...n, ...patch } : n)),
    });
  };
  const removeNoteEntry = (id: string) => {
    onUpdate({ characterNotes: characterNotes.filter(n => n.id !== id) });
  };

  const hpPercent = Math.max(0, Math.min(100, Math.round((currentHp / Math.max(1, maxHp)) * 100)));
  const inspirationVal = character.inspirationCount ?? (character.inspiration ? 1 : 0);
  const changeInspiration = (delta: number) => {
    const next = clamp(inspirationVal + delta, 0, 10);
    onUpdate({ inspirationCount: next, inspiration: next > 0 });
  };

  return (
    <div className="char-sheet" role="region" aria-label="Interactive character sheet">
      {/* 1. CHARACTER & CHARACTER LORE */}
      <Card className="char-section">
        <button
          type="button"
          className="char-section-toggle"
          aria-expanded={sections.character}
          onClick={() => toggleSection('character')}
        >
          <span className="char-section-title">
            <User size={15} className="char-section-icon" />
            Character
            {sections.character ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        </button>

        <AnimatePresence initial={false}>
          {sections.character && (
            <motion.div
              className="char-section-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="char-identity-card">
                <div className="char-portrait-box">
                  {character.portrait ? (
                    <img src={character.portrait} alt={character.name} className="char-portrait-img" />
                  ) : (
                    <div className="char-portrait-placeholder">
                      <User size={28} />
                      <span>Add Portrait</span>
                    </div>
                  )}
                </div>

                <div className="char-identity-body">
                  <div className="char-identity-top">
                    <div className="char-title-line">
                      <input
                        className="char-name-input"
                        aria-label="Character name"
                        value={character.name || ''}
                        onChange={e => onUpdate({ name: e.target.value })}
                        placeholder="Character Name"
                      />
                      <span className="char-level-inline">
                        Character Level <strong>{level}</strong>
                      </span>
                    </div>

                    <div className="char-header-controls">
                      <button
                        type="button"
                        className="char-level-btn"
                        aria-label="Decrease level"
                        onClick={() => changeLevel(-1)}
                        disabled={level <= 1}
                        title="Decrease level"
                      >
                        -
                      </button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="char-action-pill"
                        onClick={() => setLoreOpen(!loreOpen)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="char-action-pill"
                        aria-label="Increase level"
                        onClick={() => changeLevel(1)}
                        disabled={level >= 20}
                      >
                        <ArrowUpCircle size={13} /> Level Up
                      </Button>
                    </div>
                  </div>

                  <div className="char-class-pill-row">
                    <div className="char-class-badge">
                      <input
                        className="char-class-badge-input"
                        aria-label="Character class"
                        value={character.className || character.role || ''}
                        onChange={e =>
                          onUpdate({ className: e.target.value, role: e.target.value })
                        }
                        placeholder="Class"
                      />
                      <span className="char-class-lvl-tag">Lvl {level}</span>
                    </div>
                  </div>

                  <div className="char-identity-fields-grid">
                    <div className="char-field-group">
                      <label className="char-field-label">Race / Species</label>
                      <Input
                        className="char-dark-field"
                        aria-label="Character species"
                        value={character.species || ''}
                        onChange={e => onUpdate({ species: e.target.value })}
                        placeholder="None"
                      />
                    </div>
                    <div className="char-field-group">
                      <label className="char-field-label">Subclass / Tradition</label>
                      <Input
                        className="char-dark-field"
                        aria-label="Character subclass"
                        value={character.subclass || ''}
                        onChange={e => onUpdate({ subclass: e.target.value })}
                        placeholder="None"
                      />
                    </div>
                  </div>

                  <div className="char-speed-footer">
                    <div className="char-speed-left">
                      <span className="char-speed-label">Walking Speed</span>
                      <input
                        type="number"
                        className="char-speed-inline-input"
                        aria-label="Speed"
                        value={speed}
                        onChange={e => onUpdate({ speed: Math.max(0, +e.target.value) })}
                      />
                      <strong className="char-speed-unit">ft</strong>
                      {showExtraSpeed && (
                        <Input
                          className="char-extra-speed-input"
                          aria-label="Additional movement speeds"
                          value={character.extraSpeeds || ''}
                          onChange={e => onUpdate({ extraSpeeds: e.target.value })}
                          placeholder="Fly 30 ft, Swim 30 ft..."
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      className="char-text-action"
                      onClick={() => setShowExtraSpeed(!showExtraSpeed)}
                    >
                      + Add Speed
                    </button>
                  </div>
                </div>
              </div>

              {/* Collapsible Character Lore sub-panel */}
              <div className="char-lore-card">
                <button
                  type="button"
                  className="char-lore-toggle"
                  aria-expanded={loreOpen}
                  onClick={() => setLoreOpen(!loreOpen)}
                >
                  <span className="char-section-title">
                    <Sparkles size={14} className="char-section-icon" />
                    Character Lore
                    {loreOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>
                </button>
                {loreOpen && (
                  <div className="char-lore-body">
                    <div className="char-identity-fields-grid">
                      <div className="char-field-group">
                        <label className="char-field-label">Background</label>
                        <Input
                          className="char-dark-field"
                          aria-label="Character background"
                          value={character.background || ''}
                          onChange={e => onUpdate({ background: e.target.value })}
                          placeholder="None"
                        />
                      </div>
                      <div className="char-field-group">
                        <label className="char-field-label">Alignment</label>
                        <Input
                          className="char-dark-field"
                          aria-label="Character alignment"
                          value={character.alignment || ''}
                          onChange={e => onUpdate({ alignment: e.target.value })}
                          placeholder="Neutral"
                        />
                      </div>
                    </div>
                    <div className="char-identity-fields-grid">
                      <div className="char-field-group">
                        <label className="char-field-label">Personality & Motivation</label>
                        <Input
                          className="char-dark-field"
                          aria-label="Character personality"
                          value={character.personality || ''}
                          onChange={e => onUpdate({ personality: e.target.value })}
                          placeholder="Traits, ideals, bonds..."
                        />
                      </div>
                      <div className="char-field-group">
                        <label className="char-field-label">Relationships</label>
                        <Input
                          className="char-dark-field"
                          aria-label="Character relationships"
                          value={character.relationships || ''}
                          onChange={e => onUpdate({ relationships: e.target.value })}
                          placeholder="Allies, rivals, patrons..."
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* 2. COMBAT STATS */}
      <Card className="char-section">
        <button
          type="button"
          className="char-section-toggle"
          aria-expanded={sections.combat}
          onClick={() => toggleSection('combat')}
        >
          <span className="char-section-title">
            <Shield size={15} className="char-section-icon" />
            Combat Stats
            {sections.combat ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
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
              {/* Top 3-column combat row: Hit Points | AC | Spellcasting + Initiative */}
              <div className="char-combat-top-grid">
                {/* Col 1: Hit Points Card */}
                <div className="char-stat-card char-hp-card">
                  <div className="char-hp-main-col">
                    <div className="char-card-head-inline">
                      <Heart size={13} className="char-hp-icon" />
                      <span className="char-hp-title">Hit Points</span>
                    </div>

                    <div className="char-hp-boxes-row">
                      <div className="char-hp-subbox char-hp-curmax-box">
                        <div className="char-hp-block">
                          <span className="char-stat-label">Current</span>
                          <Input
                            type="number"
                            className="char-hp-input"
                            aria-label="Current HP"
                            value={currentHp}
                            onChange={e => onUpdate({ hp: Math.max(0, +e.target.value) })}
                          />
                        </div>
                        <span className="char-hp-divider">/</span>
                        <div className="char-hp-block">
                          <span className="char-stat-label">Max</span>
                          <Input
                            type="number"
                            className="char-hp-input char-hp-max-input"
                            aria-label="Max HP"
                            value={maxHp}
                            onChange={e => onUpdate({ maxHp: Math.max(1, +e.target.value) })}
                          />
                        </div>
                      </div>

                      <div className="char-hp-subbox char-temp-hp">
                        <span className="char-stat-label">Temp</span>
                        <Input
                          type="number"
                          className="char-hp-input"
                          aria-label="Temp HP"
                          value={tempHp}
                          onChange={e => onUpdate({ tempHp: Math.max(0, +e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="char-hp-bar-track" aria-label="HP progress">
                      <div className="char-hp-bar-fill" style={{ width: `${hpPercent}%` }} />
                    </div>
                  </div>

                  {/* Right vertical Damage / Delta / Heal stack */}
                  <div className="char-hp-actions">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="char-damage-btn"
                      onClick={applyDamage}
                    >
                      Damage
                    </Button>
                    <Input
                      type="number"
                      className="char-hp-delta-input"
                      aria-label="Damage or heal amount"
                      placeholder="0"
                      value={hpDelta}
                      onChange={e => setHpDelta(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="char-heal-btn"
                      onClick={applyHeal}
                    >
                      Heal
                    </Button>
                  </div>
                </div>

                {/* Col 2: AC Card */}
                <div className="char-stat-card char-ac-card">
                  <div className="char-card-header">
                    <span className="char-stat-label">
                      <Shield size={12} style={{ display: 'inline', marginRight: 4 }} />
                      AC
                    </span>
                    <button
                      type="button"
                      className="char-text-action"
                      onClick={() => setShowAcNote(!showAcNote)}
                    >
                      + Note
                    </button>
                  </div>
                  <div className="char-ac-body">
                    <input
                      type="number"
                      className="char-num-hero char-ac-hero"
                      aria-label="Armor Class"
                      value={ac}
                      onChange={e => onUpdate({ ac: Math.max(0, +e.target.value) })}
                    />
                    <span className="char-ac-subtitle">Armor Class</span>
                    {showAcNote && (
                      <Input
                        className="char-dark-field"
                        aria-label="AC note"
                        value={character.acNote || ''}
                        onChange={e => onUpdate({ acNote: e.target.value })}
                        placeholder="Mage Armor, Shield +2..."
                      />
                    )}
                  </div>
                </div>

                {/* Col 3: Spellcasting + Initiative Stack */}
                <div className="char-combat-right-stack">
                  <div className="char-stat-card char-spellcasting-card">
                    <div className="char-card-header">
                      <span className="char-stat-label">
                        <Sparkles size={12} style={{ display: 'inline', marginRight: 4 }} />
                        Spellcasting
                      </span>
                      <button
                        type="button"
                        className="char-abil-pill-btn"
                        aria-label="Cycle spellcasting ability"
                        onClick={cycleSpellAbility}
                      >
                        {spellAbil.toUpperCase()}
                      </button>
                    </div>
                    <div className="char-spellcasting-split">
                      <div className="char-spellcasting-col">
                        <strong className="char-spellcasting-val">
                          {spellAttackBonus >= 0 ? `+${spellAttackBonus}` : spellAttackBonus}
                        </strong>
                        <span className="char-spellcasting-sub">Spell Attack</span>
                      </div>
                      <div className="char-spellcasting-divider" />
                      <div className="char-spellcasting-col">
                        <strong className="char-spellcasting-val">{spellSaveDc}</strong>
                        <span className="char-spellcasting-sub">Spell DC</span>
                      </div>
                    </div>
                  </div>

                  <div className="char-stat-card char-initiative-bar">
                    <span className="char-stat-label">
                      <Zap size={12} style={{ display: 'inline', marginRight: 4 }} />
                      Initiative
                    </span>
                    <input
                      type="number"
                      className="char-init-inline-input"
                      aria-label="Initiative modifier"
                      value={initiative}
                      onChange={e => onUpdate({ initiative: +e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Middle 3-segment strip: Hit Dice & Recovery | Inspiration | Death Saves */}
              <div className="char-combat-mid-strip">
                <div className="char-mid-segment char-recovery-card">
                  <div className="char-hit-dice-row">
                    <span className="char-stat-label">Hit Dice</span>
                    <div className="char-stepper-pill">
                      <button
                        type="button"
                        aria-label="Decrease hit dice"
                        onClick={() =>
                          onUpdate({
                            hitDice: {
                              current: Math.max(0, (character.hitDice?.current ?? level) - 1),
                              max: character.hitDice?.max ?? level,
                              die: character.hitDice?.die || 'd8',
                            },
                          })
                        }
                      >
                        -
                      </button>
                      <Input
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
                      <Input
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
                      <Input
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
                      <button
                        type="button"
                        aria-label="Increase hit dice"
                        onClick={() =>
                          onUpdate({
                            hitDice: {
                              current: Math.min(
                                character.hitDice?.max ?? level,
                                (character.hitDice?.current ?? level) + 1
                              ),
                              max: character.hitDice?.max ?? level,
                              die: character.hitDice?.die || 'd8',
                            },
                          })
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="char-rest-actions">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="secondary small char-rest-btn"
                      onClick={() => handleRest('short')}
                    >
                      <RotateCcw size={11} />
                      Short rest
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="secondary small char-rest-btn"
                      onClick={() => handleRest('long')}
                    >
                      <RotateCcw size={11} />
                      Long rest
                    </Button>
                  </div>
                </div>

                <div className="char-mid-segment char-inspiration-seg">
                  <span className="char-stat-label">
                    <Sparkles size={12} style={{ display: 'inline', marginRight: 4 }} />
                    Inspiration
                  </span>
                  <div className="char-stepper-pill">
                    <button
                      type="button"
                      aria-label="Decrease inspiration"
                      onClick={() => changeInspiration(-1)}
                    >
                      -
                    </button>
                    <span className="char-stepper-val">{inspirationVal}</span>
                    <button
                      type="button"
                      aria-label="Increase inspiration"
                      onClick={() => changeInspiration(1)}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="char-mid-segment char-death-saves-seg">
                  <span className="char-stat-label">Death Saves</span>
                  <div className="char-death-saves-inline">
                    <div className="char-save-row">
                      <span className="char-save-tag succ-text">Succ</span>
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
                      <span className="char-save-tag fail-text">Fail</span>
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
              </div>

              {/* Conditions row with Exhaustion stepper */}
              <div className="char-subrow-block char-conditions-group">
                <div className="char-card-header">
                  <span className="char-stat-label">
                    <Zap size={12} style={{ display: 'inline', marginRight: 4 }} />
                    Conditions:
                  </span>
                  <button
                    type="button"
                    className="char-text-action"
                    aria-label="Add condition"
                    onClick={() => setShowConditionPicker(!showConditionPicker)}
                  >
                    + Add
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
                  <div className="char-exhaustion-pill">
                    <span>Exhaustion</span>
                    <div className="char-stepper-pill">
                      <button
                        type="button"
                        aria-label="Decrease exhaustion"
                        onClick={() =>
                          onUpdate({
                            exhaustion: clamp((character.exhaustion ?? 0) - 1, 0, 6),
                          })
                        }
                      >
                        -
                      </button>
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
                      <button
                        type="button"
                        aria-label="Increase exhaustion"
                        onClick={() =>
                          onUpdate({
                            exhaustion: clamp((character.exhaustion ?? 0) + 1, 0, 6),
                          })
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {conditions.map(c => (
                    <Badge key={c} variant="destructive" className="char-chip">
                      {c}
                      <button
                        type="button"
                        aria-label={`Remove condition ${c}`}
                        onClick={() => removeCondition(c)}
                      >
                        <X size={10} />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Resistance & Immunities row */}
              <div className="char-subrow-block char-defenses-group">
                <div className="char-card-header">
                  <span className="char-stat-label">
                    <Shield size={12} style={{ display: 'inline', marginRight: 4 }} />
                    Resistance & Immunities:
                  </span>
                  <button
                    type="button"
                    className="char-text-action"
                    onClick={() => setShowDefenseInput(!showDefenseInput)}
                  >
                    + Add
                  </button>
                </div>
                <div className="char-chips-wrap">
                  {defenses.length === 0 ? (
                    <span className="char-empty-hint">None recorded</span>
                  ) : (
                    defenses.map(d => (
                      <Badge key={d} variant="secondary" className="char-chip">
                        {d}
                        <button
                          type="button"
                          aria-label={`Remove defense ${d}`}
                          onClick={() => removeDefense(d)}
                        >
                          <X size={10} />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
                {showDefenseInput && (
                  <div className="char-inline-add">
                    <Input
                      className="char-add-input"
                      aria-label="New defense or resistance"
                      placeholder="e.g. Fire resistance, Poison immunity"
                      value={newDefense}
                      onChange={e => setNewDefense(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addDefense()}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="secondary small"
                      onClick={addDefense}
                    >
                      <Plus size={12} /> Add
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* 3. FEATURES & TRACKED RESOURCES */}
      <Card className="char-section">
        <div className="char-section-header-bar">
          <button
            type="button"
            className="char-section-toggle"
            aria-expanded={sections.resources}
            onClick={() => toggleSection('resources')}
          >
            <span className="char-section-title">
              <Sparkles size={15} className="char-section-icon" />
              Features & Tracked Resources
              {sections.resources ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </button>
          <div className="char-section-header-actions">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="char-action-pill"
              onClick={() => {
                if (!sections.resources) toggleSection('resources');
                addResource();
              }}
            >
              <Plus size={12} /> Add Resource
            </Button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {sections.resources && (
            <motion.div
              className="char-section-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
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

              <div className="char-add-resource-form">
                <Input
                  className="char-add-input"
                  aria-label="Resource name"
                  placeholder="e.g. Ki Points, Superiority Dice, Wild Shape"
                  value={newResName}
                  onChange={e => setNewResName(e.target.value)}
                />
                <Input
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
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="secondary small"
                  onClick={addResource}
                >
                  <Plus size={12} /> Add Resource
                </Button>
              </div>

              <div className="char-features-notes">
                <span className="char-field-label">Features & Freeform Notes:</span>
                <Textarea
                  rows={3}
                  className="char-dark-textarea"
                  aria-label="Feature notes"
                  value={character.notes || ''}
                  onChange={e => onUpdate({ notes: e.target.value })}
                  placeholder="Type or paste features, special items, math notes (e.g. Blackstones: 49 + 162 + 28), death ward status, etc..."
                />
              </div>

              <div className="char-subrow-block char-feats-group">
                <div className="char-card-header">
                  <span className="char-stat-label">
                    <Award size={12} style={{ display: 'inline', marginRight: 4 }} />
                    Feats:
                  </span>
                  <button
                    type="button"
                    className="char-text-action"
                    onClick={() => setShowFeatInput(!showFeatInput)}
                  >
                    + Add
                  </button>
                </div>
                <div className="char-chips-wrap">
                  {feats.length === 0 ? (
                    <span className="char-empty-hint">No feats recorded.</span>
                  ) : (
                    feats.map(f => (
                      <Badge key={f} variant="secondary" className="char-chip">
                        {f}
                        <button
                          type="button"
                          aria-label={`Remove feat ${f}`}
                          onClick={() => removeFeat(f)}
                        >
                          <X size={10} />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
                {showFeatInput && (
                  <div className="char-inline-add">
                    <Input
                      className="char-add-input"
                      aria-label="New feat"
                      placeholder="e.g. War Caster, Alert, Lucky"
                      value={newFeat}
                      onChange={e => setNewFeat(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addFeat()}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={addFeat}
                    >
                      <Plus size={12} /> Add Feat
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* 4. ABILITY SCORES & SAVING THROWS */}
      <Card className="char-section">
        <div className="char-section-header-bar">
          <button
            type="button"
            className="char-section-toggle"
            aria-expanded={sections.abilities}
            onClick={() => toggleSection('abilities')}
          >
            <span className="char-section-title">
              <Zap size={15} className="char-section-icon" />
              Ability Scores & Saving Throws
              {sections.abilities ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </button>
          <div className="char-section-header-actions">
            <span className="char-prof-pill">
              Proficiency <strong>+{profBonus}</strong>
            </span>
          </div>
        </div>

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
                    <div
                      key={key}
                      className={`char-ability-box ${isProf ? 'save-proficient' : ''}`}
                    >
                      {isProf && <span className="char-save-prof-dot" aria-hidden="true" />}
                      <span className="char-ability-label">{label}</span>
                      <div className="char-score-row">
                        <input
                          type="number"
                          className="char-score-input"
                          aria-label={`${label} score`}
                          value={score}
                          onChange={e => setStatScore(key, +e.target.value)}
                        />
                      </div>
                      <div className="char-mod-hero">{modStr}</div>
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
      </Card>

      {/* 5. SKILLS & SENSES */}
      <Card className="char-section">
        <div className="char-section-header-bar">
          <button
            type="button"
            className="char-section-toggle"
            aria-expanded={sections.skills}
            onClick={() => toggleSection('skills')}
          >
            <span className="char-section-title">
              <Eye size={15} className="char-section-icon" />
              Skills & Senses
              {sections.skills ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </button>
          <div className="char-section-header-actions">
            <div className="char-header-search">
              <Search size={13} />
              <Input
                className="char-header-search-input"
                aria-label="Filter skills"
                placeholder="Filter skills..."
                value={skillFilter}
                onChange={e => setSkillFilter(e.target.value)}
              />
            </div>
          </div>
        </div>

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
                  <span className="char-passive-label">Passive Perception</span>
                  <span className="char-passive-val">{passivePerception}</span>
                </div>
                <div className="char-passive-box">
                  <span className="char-passive-label">Passive Investigation</span>
                  <span className="char-passive-val">{passiveInvestigation}</span>
                </div>
                <div className="char-passive-box">
                  <span className="char-passive-label">Passive Insight</span>
                  <span className="char-passive-val">{passiveInsight}</span>
                </div>
                <div className="char-passive-box">
                  <span className="char-passive-label">Darkvision (ft)</span>
                  <input
                    type="number"
                    className="char-darkvision-input"
                    aria-label="Darkvision feet"
                    value={character.darkvision ?? 60}
                    onChange={e => onUpdate({ darkvision: Math.max(0, +e.target.value) })}
                  />
                </div>
              </div>

              <div className="char-skills-columns">
                {[
                  ['str', 'dex', 'int'] as AbilityName[],
                  ['wis', 'cha'] as AbilityName[],
                ].map((groupCol, colIdx) => (
                  <div key={colIdx} className="char-skills-col">
                    {groupCol.map(abilKey => {
                      const groupSkills = SKILL_DEFINITIONS.filter(
                        s =>
                          s.ability === abilKey &&
                          (!skillFilter.trim() ||
                            s.name.toLowerCase().includes(skillFilter.trim().toLowerCase()) ||
                            s.ability.toLowerCase().includes(skillFilter.trim().toLowerCase()))
                      );
                      if (groupSkills.length === 0) return null;
                      return (
                        <div key={abilKey} className="char-skill-ability-group">
                          <div className="char-skill-group-header">{abilKey.toUpperCase()}</div>
                          {groupSkills.map(skill => {
                            const isProf = skillProfs.has(skill.id);
                            const isExp = skillExpertise.has(skill.id);
                            const abMod = getModifier(stats[skill.ability] ?? 10);
                            const bonus =
                              abMod + (isExp ? profBonus * 2 : isProf ? profBonus : 0);
                            const bonusStr = bonus >= 0 ? `+${bonus}` : `${bonus}`;

                            return (
                              <div
                                key={skill.id}
                                className={`char-skill-row ${isProf || isExp ? 'proficient' : ''}`}
                              >
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
                                <span className="char-skill-name">{skill.name}</span>
                                <span className="char-skill-ability">
                                  {skill.ability.toUpperCase()}
                                </span>
                                <span className="char-skill-bonus">{bonusStr}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* 6. ITEMS & INVENTORY */}
      <Card className="char-section">
        <div className="char-section-header-bar">
          <button
            type="button"
            className="char-section-toggle"
            aria-expanded={sections.inventory}
            onClick={() => toggleSection('inventory')}
          >
            <span className="char-section-title">
              <Shield size={15} className="char-section-icon" />
              Items & Inventory
              {sections.inventory ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </button>
          <div className="char-section-header-actions">
            <Badge variant="default" className="char-attunement-counter">
              Attune: {attunedCount} / 3
            </Badge>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {sections.inventory && (
            <motion.div
              className="char-section-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="char-inv-search-bar">
                <Search size={14} />
                <Input
                  className="char-dark-field"
                  aria-label="Search inventory"
                  placeholder="Search inventory..."
                  value={invSearch}
                  onChange={e => setInvSearch(e.target.value)}
                />
              </div>

              {/* Currency 5-box bar */}
              <div className="char-currency-block">
                <div className="char-card-header">
                  <span className="char-stat-label">
                    <Coins size={12} style={{ display: 'inline', marginRight: 4 }} />
                    Currency
                  </span>
                  <span className="char-currency-total">Total: {totalGp} gp</span>
                </div>
                <div className="char-currency-grid">
                  {(
                    [
                      { key: 'cp', label: 'CP', aria: 'Copper pieces' },
                      { key: 'sp', label: 'SP', aria: 'Silver pieces' },
                      { key: 'ep', label: 'EP', aria: 'Electrum pieces' },
                      { key: 'gp', label: 'GP', aria: 'Gold pieces' },
                      { key: 'pp', label: 'PP', aria: 'Platinum pieces' },
                    ] as const
                  ).map(coin => (
                    <div key={coin.key} className="char-currency-box">
                      <span className="char-coin-label">{coin.label}</span>
                      <input
                        type="number"
                        min={0}
                        className="char-coin-input"
                        aria-label={coin.aria}
                        value={currency[coin.key]}
                        onChange={e => updateCurrency(coin.key, +e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="char-inventory-list">
                {inventory.filter(
                  item =>
                    !invSearch.trim() ||
                    item.name.toLowerCase().includes(invSearch.trim().toLowerCase())
                ).length === 0 ? (
                  <div className="char-empty-box">No items in inventory.</div>
                ) : (
                  inventory
                    .filter(
                      item =>
                        !invSearch.trim() ||
                        item.name.toLowerCase().includes(invSearch.trim().toLowerCase())
                    )
                    .map(item => (
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
                    ))
                )}
              </div>

              {/* Add item form */}
              <div className="char-add-item-form">
                <Input
                  className="char-add-input"
                  aria-label="Item name"
                  placeholder="Item name (e.g. Cloak of Protection, Health Potion)"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                />
                <Input
                  type="number"
                  min={1}
                  className="char-mini-num"
                  aria-label="Item quantity"
                  placeholder="Qty"
                  value={newItemQty}
                  onChange={e => setNewItemQty(Math.max(1, +e.target.value))}
                />
                <Input
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
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="secondary small"
                  onClick={addItem}
                >
                  <Plus size={12} /> Add Item
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* 7. SPELLBOOK & SPELL SLOTS */}
      <Card className="char-section">
        <div className="char-section-header-bar">
          <button
            type="button"
            className="char-section-toggle"
            aria-expanded={sections.spells}
            onClick={() => toggleSection('spells')}
          >
            <span className="char-section-title">
              <Sparkles size={15} className="char-section-icon" />
              Spellbook & Spell Slots
              {sections.spells ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </button>
          <div className="char-section-header-actions">
            <Badge variant="default" className="char-prepared-counter">
              Prepared: {preparedCount}
            </Badge>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="char-action-pill"
              aria-label="Import spells from Compendium"
              onClick={() => setCompendiumSpellsOpen(true)}
            >
              <BookOpen size={12} /> + Import Spells
            </Button>
          </div>
        </div>

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
                          <Input
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
                          <Input
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
                        <Badge variant="outline" className="char-spell-tag">Ritual</Badge>
                      )}
                      {spell.concentration && (
                        <Badge variant="outline" className="char-spell-tag">Conc</Badge>
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
                <Input
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
                <Input
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
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="secondary small"
                  onClick={addSpell}
                >
                  <Plus size={12} /> Add Spell
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* 8. PROFICIENCIES & TRAINING (2x2 Grid: Armor, Weapons, Tools, Languages) */}
      <Card className="char-section">
        <button
          type="button"
          className="char-section-toggle"
          aria-expanded={sections.proficiencies}
          onClick={() => toggleSection('proficiencies')}
        >
          <span className="char-section-title">
            <BookOpen size={15} className="char-section-icon" />
            Proficiencies & Training
            {sections.proficiencies ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
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
              <div className="char-prof-grid-2x2">
                <div className="char-training-card">
                  <span className="char-stat-label">Armor</span>
                  <Input
                    className="char-dark-field"
                    aria-label="Armor proficiencies"
                    value={character.armorProficiencies ?? character.proficiencies ?? ''}
                    onChange={e =>
                      onUpdate({
                        armorProficiencies: e.target.value,
                        proficiencies: e.target.value,
                      })
                    }
                    placeholder="None"
                  />
                </div>
                <div className="char-training-card">
                  <span className="char-stat-label">Weapons</span>
                  <Input
                    className="char-dark-field"
                    aria-label="Weapon proficiencies"
                    value={character.weaponProficiencies ?? ''}
                    onChange={e => onUpdate({ weaponProficiencies: e.target.value })}
                    placeholder="None"
                  />
                </div>
                <div className="char-training-card">
                  <span className="char-stat-label">Tools</span>
                  <Input
                    className="char-dark-field"
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
                    placeholder="None"
                  />
                </div>
                <div className="char-training-card">
                  <span className="char-stat-label">Languages</span>
                  <div className="char-chips-wrap" style={{ marginBottom: 6 }}>
                    {(character.languages && character.languages.length > 0
                      ? character.languages
                      : ['Common']
                    ).map(lang => (
                      <Badge key={lang} variant="secondary" className="char-chip">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                  <Input
                    className="char-dark-field"
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
      </Card>

      {/* 9. NOTES */}
      <Card className="char-section">
        <button
          type="button"
          className="char-section-toggle"
          aria-expanded={sections.notes}
          onClick={() => toggleSection('notes')}
        >
          <span className="char-section-title">
            <FileText size={15} className="char-section-icon" />
            Notes
            {sections.notes ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        </button>

        <AnimatePresence initial={false}>
          {sections.notes && (
            <motion.div
              className="char-section-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="char-notes-toolbar">
                <div className="char-notes-search">
                  <Search size={13} />
                  <Input
                    className="char-dark-field"
                    aria-label="Search character notes"
                    placeholder="Search notes..."
                    value={noteSearch}
                    onChange={e => setNoteSearch(e.target.value)}
                  />
                </div>
                <div className="char-notes-controls">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="char-action-pill"
                    onClick={() => setNoteSortDesc(!noteSortDesc)}
                  >
                    {noteSortDesc ? '↓' : '↑'}
                  </Button>
                  <select
                    aria-label="Sort notes by"
                    value={noteSortBy}
                    onChange={e => setNoteSortBy(e.target.value as 'date' | 'title')}
                  >
                    <option value="date">Date</option>
                    <option value="title">Title</option>
                  </select>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="char-new-note-btn"
                    aria-label="Add character note"
                    onClick={addNoteEntry}
                  >
                    <Plus size={13} /> New Note
                  </Button>
                </div>
              </div>

              <div className="char-notes-list">
                {characterNotes
                  .filter(
                    n =>
                      !noteSearch.trim() ||
                      n.title.toLowerCase().includes(noteSearch.trim().toLowerCase()) ||
                      n.body.toLowerCase().includes(noteSearch.trim().toLowerCase())
                  )
                  .slice()
                  .sort((a, b) => {
                    if (a.pinned && !b.pinned) return -1;
                    if (!a.pinned && b.pinned) return 1;
                    const cmp =
                      noteSortBy === 'title'
                        ? a.title.localeCompare(b.title)
                        : a.date.localeCompare(b.date);
                    return noteSortDesc ? -cmp : cmp;
                  })
                  .map(note => (
                    <div key={note.id} className="char-note-card">
                      <div className="char-note-head">
                        <Input
                          className="char-note-title-input"
                          aria-label="Note title"
                          value={note.title}
                          onChange={e => updateNoteEntry(note.id, { title: e.target.value })}
                        />
                        <div className="char-note-meta">
                          <button
                            type="button"
                            className={`icon-button ${note.pinned ? 'active' : ''}`}
                            aria-label="Pin note"
                            onClick={() => updateNoteEntry(note.id, { pinned: !note.pinned })}
                          >
                            <Pin size={12} />
                          </button>
                          <span className="char-note-date">{note.date}</span>
                          <button
                            type="button"
                            className="icon-button danger-text"
                            aria-label="Delete note"
                            onClick={() => removeNoteEntry(note.id)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <Textarea
                        rows={2}
                        className="char-dark-textarea"
                        aria-label="Note body"
                        placeholder="Write note..."
                        value={note.body}
                        onChange={e => updateNoteEntry(note.id, { body: e.target.value })}
                      />
                    </div>
                  ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {compendiumSpellsOpen && (
        <CompendiumSpellModal
          campaign={campaign}
          defaultClass={character.className || character.role}
          onImport={importCompendiumSpells}
          onClose={() => setCompendiumSpellsOpen(false)}
        />
      )}
    </div>
  );
}
