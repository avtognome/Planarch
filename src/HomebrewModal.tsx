import React, { useState, useMemo } from 'react';
import { X, Plus, Trash2, Swords, BookOpen, Sparkles, Shield, Heart, Zap, Dices } from 'lucide-react';
import type { CompendiumRecord, Kind } from './compendiumData';
import { MonsterStatBlock, ReferenceStatBlock } from './Compendium';
import { saveHomebrew } from './homebrewData';
import { uid } from './models';

interface HomebrewModalProps {
  open: boolean;
  onClose: () => void;
  campaign: string;
  onSaved?: (record: CompendiumRecord) => void;
  notify?: (msg: string) => void;
  initialRecord?: CompendiumRecord | null;
}

interface ActionItem {
  id: string;
  name: string;
  text: string;
}

export default function HomebrewModal({
  open,
  onClose,
  campaign,
  onSaved,
  notify,
  initialRecord
}: HomebrewModalProps) {
  if (!open) return null;

  const [kind, setKind] = useState<Kind>(initialRecord?.kind || 'monster');
  const [name, setName] = useState(initialRecord?.name || '');
  const [size, setSize] = useState((initialRecord?.fields?.size as string) || 'M');
  const [type, setType] = useState((initialRecord?.fields?.type as string) || 'beast');
  const [alignment, setAlignment] = useState((initialRecord?.fields?.alignment as string) || 'unaligned');
  const [ac, setAc] = useState((initialRecord?.fields?.ac as string) || '12');
  const [hp, setHp] = useState((initialRecord?.fields?.hp as string) || '22 (4d8+4)');
  const [speed, setSpeed] = useState((initialRecord?.fields?.speed as string) || '30 ft.');

  const [str, setStr] = useState(Number(initialRecord?.fields?.str) || 12);
  const [dex, setDex] = useState(Number(initialRecord?.fields?.dex) || 14);
  const [con, setCon] = useState(Number(initialRecord?.fields?.con) || 13);
  const [intScore, setIntScore] = useState(Number(initialRecord?.fields?.int) || 6);
  const [wis, setWis] = useState(Number(initialRecord?.fields?.wis) || 12);
  const [cha, setCha] = useState(Number(initialRecord?.fields?.cha) || 8);

  const [saves, setSaves] = useState((initialRecord?.fields?.save as string) || '');
  const [skills, setSkills] = useState((initialRecord?.fields?.skill as string) || '');
  const [resist, setResist] = useState((initialRecord?.fields?.resist as string) || '');
  const [immune, setImmune] = useState((initialRecord?.fields?.immune as string) || '');
  const [senses, setSenses] = useState((initialRecord?.fields?.senses as string) || 'darkvision 60 ft.');
  const [languages, setLanguages] = useState((initialRecord?.fields?.languages as string) || '—');
  const [cr, setCr] = useState((initialRecord?.fields?.cr as string) || '1/2');

  const [traits, setTraits] = useState<ActionItem[]>(() => {
    if (initialRecord?.fields?.trait && Array.isArray(initialRecord.fields.trait)) {
      return (initialRecord.fields.trait as Array<{ name?: string; text?: string }>).map(t => ({
        id: uid(),
        name: t.name || '',
        text: t.text || ''
      }));
    }
    return [{ id: uid(), name: 'Keen Hearing and Smell', text: 'Has advantage on Perception checks that rely on hearing or smell.' }];
  });

  const [actions, setActions] = useState<ActionItem[]>(() => {
    if (initialRecord?.fields?.action && Array.isArray(initialRecord.fields.action)) {
      return (initialRecord.fields.action as Array<{ name?: string; text?: string }>).map(a => ({
        id: uid(),
        name: a.name || '',
        text: a.text || ''
      }));
    }
    return [
      { id: uid(), name: 'Bite', text: '+4 to hit, reach 5 ft., one target. Hit: 1d6+2 piercing damage.' }
    ];
  });

  // For Spells & Items
  const [description, setDescription] = useState((initialRecord?.fields?.text as string) || (initialRecord?.fields?.description as string) || '');
  const [spellLevel, setSpellLevel] = useState((initialRecord?.fields?.level as string) || '1');
  const [spellSchool, setSpellSchool] = useState((initialRecord?.fields?.school as string) || 'Evocation');
  const [castingTime, setCastingTime] = useState((initialRecord?.fields?.time as string) || '1 action');
  const [spellRange, setSpellRange] = useState((initialRecord?.fields?.range as string) || '60 feet');
  const [spellComponents, setSpellComponents] = useState((initialRecord?.fields?.components as string) || 'V, S');
  const [spellDuration, setSpellDuration] = useState((initialRecord?.fields?.duration as string) || 'Instantaneous');
  const [spellClasses, setSpellClasses] = useState((initialRecord?.fields?.classes as string) || 'Wizard, Sorcerer');

  const [itemType, setItemType] = useState((initialRecord?.fields?.type as string) || 'Wondrous item');
  const [itemRarity, setItemRarity] = useState((initialRecord?.fields?.detail as string) || 'Rare');

  const calcMod = (val: number) => {
    const mod = Math.floor((val - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const previewRecord: CompendiumRecord = useMemo(() => {
    const recId = initialRecord?.id || 'homebrew-preview';
    if (kind === 'monster') {
      return {
        id: recId,
        kind: 'monster',
        name: name.trim() || 'Unnamed Monster',
        edition: 'Homebrew',
        fields: {
          size,
          type,
          alignment,
          ac,
          hp,
          speed,
          str,
          dex,
          con,
          int: intScore,
          wis,
          cha,
          save: saves,
          skill: skills,
          resist,
          immune,
          senses,
          languages,
          cr,
          trait: traits.map(t => ({ name: t.name, text: t.text })),
          action: actions.map(a => ({ name: a.name, text: a.text })),
          description
        }
      };
    }
    if (kind === 'spell') {
      return {
        id: recId,
        kind: 'spell',
        name: name.trim() || 'Unnamed Spell',
        edition: 'Homebrew',
        fields: {
          level: spellLevel,
          school: spellSchool,
          time: castingTime,
          range: spellRange,
          components: spellComponents,
          duration: spellDuration,
          classes: spellClasses,
          text: description
        }
      };
    }
    return {
      id: recId,
      kind: 'item',
      name: name.trim() || 'Unnamed Item',
      edition: 'Homebrew',
      fields: {
        type: itemType,
        detail: itemRarity,
        text: description
      }
    };
  }, [
    initialRecord, kind, name, size, type, alignment, ac, hp, speed,
    str, dex, con, intScore, wis, cha, saves, skills, resist, immune, senses, languages, cr,
    traits, actions, description, spellLevel, spellSchool, castingTime, spellRange, spellComponents, spellDuration, spellClasses,
    itemType, itemRarity
  ]);

  const handleSave = () => {
    if (!name.trim()) {
      notify?.('Please provide a name for your homebrew');
      return;
    }
    const finalRecord: CompendiumRecord = {
      ...previewRecord,
      id: initialRecord?.id || uid()
    };
    saveHomebrew(campaign, finalRecord);
    notify?.(`"${finalRecord.name}" saved to Homebrew and Wiki`);
    onSaved?.(finalRecord);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal homebrew-modal" role="dialog" aria-modal="true" aria-label="Add Homebrew" onClick={e => e.stopPropagation()}>
        <div className="homebrew-modal-header between">
          <div className="inline" style={{ gap: '8px' }}>
            <Sparkles size={20} className="brand-sparkle" />
            <h2>{initialRecord ? 'Edit Homebrew' : 'Create Homebrew'}</h2>
            <span className="badge subtle">Campaign: {campaign}</span>
          </div>
          <button className="modal-close icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="homebrew-modal-body">
          {/* Left Panel: Form */}
          <div className="homebrew-form-panel">
            <div className="homebrew-category-bar inline" style={{ gap: '8px', marginBottom: '14px' }}>
              <label>CATEGORY</label>
              {(['monster', 'spell', 'item'] as const).map(k => (
                <button
                  key={k}
                  type="button"
                  className={kind === k ? 'primary' : 'secondary'}
                  onClick={() => setKind(k)}
                  style={{ textTransform: 'capitalize', fontSize: '11px', padding: '5px 12px' }}
                >
                  {k === 'monster' ? 'Monster / NPC' : k}
                </button>
              ))}
            </div>

            <label className="homebrew-field">
              <span>Name *</span>
              <input
                aria-label="Homebrew name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Void Stalker, Sunblade of Dawn"
                autoFocus
              />
            </label>

            {kind === 'monster' ? (
              <>
                <div className="homebrew-grid-3">
                  <label className="homebrew-field">
                    <span>Size</span>
                    <select aria-label="Size" value={size} onChange={e => setSize(e.target.value)}>
                      {['T', 'S', 'M', 'L', 'H', 'G'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                  <label className="homebrew-field">
                    <span>Type</span>
                    <input aria-label="Type" value={type} onChange={e => setType(e.target.value)} placeholder="aberration, beast, etc." />
                  </label>
                  <label className="homebrew-field">
                    <span>Alignment</span>
                    <input aria-label="Alignment" value={alignment} onChange={e => setAlignment(e.target.value)} placeholder="neutral evil" />
                  </label>
                </div>

                <div className="homebrew-grid-3">
                  <label className="homebrew-field">
                    <span>Armor Class</span>
                    <input aria-label="Armor class" value={ac} onChange={e => setAc(e.target.value)} placeholder="16 (natural armor)" />
                  </label>
                  <label className="homebrew-field">
                    <span>Hit Points</span>
                    <input aria-label="Hit points" value={hp} onChange={e => setHp(e.target.value)} placeholder="45 (6d8+18)" />
                  </label>
                  <label className="homebrew-field">
                    <span>Speed</span>
                    <input aria-label="Speed" value={speed} onChange={e => setSpeed(e.target.value)} placeholder="30 ft., fly 60 ft." />
                  </label>
                </div>

                <div className="homebrew-abilities-grid">
                  {[
                    ['STR', str, setStr],
                    ['DEX', dex, setDex],
                    ['CON', con, setCon],
                    ['INT', intScore, setIntScore],
                    ['WIS', wis, setWis],
                    ['CHA', cha, setCha]
                  ].map(([label, val, setter]) => (
                    <div key={label as string} className="ability-input-box">
                      <strong>{label as string}</strong>
                      <input
                        type="number"
                        aria-label={`Ability ${label}`}
                        value={val as number}
                        onChange={e => (setter as (n: number) => void)(+e.target.value || 10)}
                      />
                      <small>{calcMod(val as number)}</small>
                    </div>
                  ))}
                </div>

                <div className="homebrew-grid-2">
                  <label className="homebrew-field">
                    <span>Saving Throws</span>
                    <input aria-label="Saving throws" value={saves} onChange={e => setSaves(e.target.value)} placeholder="Dex +6, Con +5" />
                  </label>
                  <label className="homebrew-field">
                    <span>Skills</span>
                    <input aria-label="Skills" value={skills} onChange={e => setSkills(e.target.value)} placeholder="Stealth +7, Perception +4" />
                  </label>
                </div>

                <div className="homebrew-grid-3">
                  <label className="homebrew-field">
                    <span>Senses</span>
                    <input aria-label="Senses" value={senses} onChange={e => setSenses(e.target.value)} placeholder="darkvision 60 ft." />
                  </label>
                  <label className="homebrew-field">
                    <span>Languages</span>
                    <input aria-label="Languages" value={languages} onChange={e => setLanguages(e.target.value)} placeholder="Common, Draconic" />
                  </label>
                  <label className="homebrew-field">
                    <span>Challenge (CR)</span>
                    <input aria-label="Challenge rating" value={cr} onChange={e => setCr(e.target.value)} placeholder="3" />
                  </label>
                </div>

                {/* Traits */}
                <div className="homebrew-section-editor">
                  <div className="between">
                    <h4>Traits</h4>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setTraits([...traits, { id: uid(), name: 'New Trait', text: '' }])}
                    >
                      <Plus size={13} /> Add Trait
                    </button>
                  </div>
                  {traits.map((t, idx) => (
                    <div key={t.id} className="action-row">
                      <div className="inline" style={{ gap: '6px' }}>
                        <input
                          aria-label={`Trait name ${idx}`}
                          value={t.name}
                          onChange={e => setTraits(traits.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))}
                          placeholder="Trait name"
                          style={{ width: '160px' }}
                        />
                        <button
                          type="button"
                          className="icon-button danger-text"
                          aria-label={`Remove trait ${idx}`}
                          onClick={() => setTraits(traits.filter((_, i) => i !== idx))}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <textarea
                        aria-label={`Trait text ${idx}`}
                        value={t.text}
                        rows={2}
                        onChange={e => setTraits(traits.map((item, i) => i === idx ? { ...item, text: e.target.value } : item))}
                        placeholder="Description (supports clickable dice expressions e.g. 1d6+2)"
                      />
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="homebrew-section-editor">
                  <div className="between">
                    <h4>Actions</h4>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setActions([...actions, { id: uid(), name: 'Attack', text: '+5 to hit, reach 5 ft. Hit: 1d8+3 slashing damage.' }])}
                    >
                      <Plus size={13} /> Add Action
                    </button>
                  </div>
                  {actions.map((a, idx) => (
                    <div key={a.id} className="action-row">
                      <div className="inline" style={{ gap: '6px' }}>
                        <input
                          aria-label={`Action name ${idx}`}
                          value={a.name}
                          onChange={e => setActions(actions.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))}
                          placeholder="Action name"
                          style={{ width: '160px' }}
                        />
                        <button
                          type="button"
                          className="icon-button danger-text"
                          aria-label={`Remove action ${idx}`}
                          onClick={() => setActions(actions.filter((_, i) => i !== idx))}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <textarea
                        aria-label={`Action text ${idx}`}
                        value={a.text}
                        rows={2}
                        onChange={e => setActions(actions.map((item, i) => i === idx ? { ...item, text: e.target.value } : item))}
                        placeholder="e.g. +6 to hit, reach 5 ft., Hit: 2d6+4 slashing damage"
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : kind === 'spell' ? (
              <>
                <div className="homebrew-grid-3">
                  <label className="homebrew-field">
                    <span>Spell Level</span>
                    <input aria-label="Spell level" value={spellLevel} onChange={e => setSpellLevel(e.target.value)} placeholder="0 for cantrip, 1-9" />
                  </label>
                  <label className="homebrew-field">
                    <span>School</span>
                    <input aria-label="Spell school" value={spellSchool} onChange={e => setSpellSchool(e.target.value)} placeholder="Evocation" />
                  </label>
                  <label className="homebrew-field">
                    <span>Casting Time</span>
                    <input aria-label="Casting time" value={castingTime} onChange={e => setCastingTime(e.target.value)} placeholder="1 action" />
                  </label>
                </div>
                <div className="homebrew-grid-3">
                  <label className="homebrew-field">
                    <span>Range</span>
                    <input aria-label="Spell range" value={spellRange} onChange={e => setSpellRange(e.target.value)} placeholder="60 feet" />
                  </label>
                  <label className="homebrew-field">
                    <span>Components</span>
                    <input aria-label="Spell components" value={spellComponents} onChange={e => setSpellComponents(e.target.value)} placeholder="V, S, M (a pinch of sulfur)" />
                  </label>
                  <label className="homebrew-field">
                    <span>Duration</span>
                    <input aria-label="Spell duration" value={spellDuration} onChange={e => setSpellDuration(e.target.value)} placeholder="Concentration, up to 1 minute" />
                  </label>
                </div>
                <label className="homebrew-field">
                  <span>Classes</span>
                  <input aria-label="Spell classes" value={spellClasses} onChange={e => setSpellClasses(e.target.value)} placeholder="Wizard, Sorcerer, Warlock" />
                </label>
                <label className="homebrew-field">
                  <span>Description</span>
                  <textarea
                    aria-label="Spell description"
                    value={description}
                    rows={6}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe spell effects, saving throws, damage formulas (e.g. 8d6 fire damage)..."
                  />
                </label>
              </>
            ) : (
              <>
                <div className="homebrew-grid-2">
                  <label className="homebrew-field">
                    <span>Item Type</span>
                    <input aria-label="Item type" value={itemType} onChange={e => setItemType(e.target.value)} placeholder="Wondrous item, Weapon (longsword), Armor" />
                  </label>
                  <label className="homebrew-field">
                    <span>Rarity / Details</span>
                    <input aria-label="Item rarity" value={itemRarity} onChange={e => setItemRarity(e.target.value)} placeholder="Rare (requires attunement)" />
                  </label>
                </div>
                <label className="homebrew-field">
                  <span>Description</span>
                  <textarea
                    aria-label="Item description"
                    value={description}
                    rows={8}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe item properties, activation, damage bonuses..."
                  />
                </label>
              </>
            )}
          </div>

          {/* Right Panel: Live Interactive Preview */}
          <div className="homebrew-preview-panel">
            <div className="preview-heading between">
              <span className="eyebrow"><Dices size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> LIVE INTERACTIVE PREVIEW</span>
              <small>Click any roll to test dice</small>
            </div>
            <div className="homebrew-preview-card">
              <div className="editor-title">
                <span className="eyebrow">{kind.toUpperCase()} · HOMEBREW</span>
                <BookOpen size={16} />
              </div>
              <h2 style={{ fontSize: '20px', margin: '4px 0 10px' }}>{previewRecord.name}</h2>
              {kind === 'monster' ? (
                <MonsterStatBlock record={previewRecord} />
              ) : (
                <ReferenceStatBlock record={previewRecord} />
              )}
            </div>
          </div>
        </div>

        <div className="homebrew-modal-footer between">
          <small>Autosyncs to Campaign Wiki upon saving</small>
          <div className="inline" style={{ gap: '10px' }}>
            <button type="button" className="secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="primary" aria-label="Save homebrew" onClick={handleSave}>
              <Plus size={15} /> Save Homebrew
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
