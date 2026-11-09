import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState, type Dispatch, type DragEvent, type SetStateAction } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Command, CopyPlus, Dices, GripVertical, HeartPulse, History, MoreHorizontal, Plus, RotateCcw, ShieldCheck, SkipBack, SkipForward, Swords, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import { uid, type Combatant } from './models';
import { conditionName, DND_CONDITIONS, removeCondition, setCondition, splitConditions } from './conditions';
import CompendiumDrawer from './CompendiumDrawer';

type Props = {
  battle: Combatant[];
  setBattle: Dispatch<SetStateAction<Combatant[]>>;
  battleTitle: string;
  battleActive: boolean;
  round: number;
  setRound: Dispatch<SetStateAction<number>>;
  turn: number;
  setTurn: Dispatch<SetStateAction<number>>;
  onReference: (id: string) => void;
  onOpenEncounters: () => void;
  onEnd: () => void;
  notify: (message: string) => void;
};

type Snapshot = { id: string; label: string; battle: Combatant[]; round: number; turn: number };

export default function CombatTracker({ battle, setBattle, battleTitle, battleActive, round, setRound, turn, setTurn, onOpenEncounters, onEnd, notify }: Props) {
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [hpDrafts, setHpDrafts] = useState<Record<string, string>>({});
  const [initDrafts, setInitDrafts] = useState<Record<string, string>>({});
  const [customConditions, setCustomConditions] = useState<Record<string, string>>({});
  const [exhaustionLevels, setExhaustionLevels] = useState<Record<string, number>>({});
  const [dragging, setDragging] = useState('');
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [lastDelta, setLastDelta] = useState(0);
  const [commandOpen, setCommandOpen] = useState(false);
  const [command, setCommand] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerFocus, setDrawerFocus] = useState('');
  const commandInput = useRef<HTMLInputElement>(null);
  const currentId = battle[turn]?.id;
  const current = battle[turn];

  const pushHistory = (label: string) => setHistory(items => [{ id: uid(), label, battle: battle.map(member => ({ ...member })), round, turn }, ...items].slice(0, 12));
  const undo = () => {
    const latest = history[0];
    if (!latest) return;
    setBattle(latest.battle);
    setRound(latest.round);
    setTurn(latest.turn);
    setHistory(items => items.slice(1));
    notify(`Undid: ${latest.label}`);
  };

  const amount = (id: string) => Math.max(0, Number(amounts[id]) || 0);
  const setOrder = (next: Combatant[], keepId = currentId) => {
    setBattle(next);
    const nextTurn = next.findIndex(member => member.id === keepId);
    setTurn(nextTurn >= 0 ? nextTurn : Math.min(turn, Math.max(0, next.length - 1)));
  };
  const clearHpDraft = (id: string) => setHpDrafts(values => {
    if (!(id in values)) return values;
    const next = { ...values };
    delete next[id];
    return next;
  });
  const clearInitDraft = (id: string) => setInitDrafts(values => {
    if (!(id in values)) return values;
    const next = { ...values };
    delete next[id];
    return next;
  });
  const adjust = (id: string, delta: number) => {
    const target = battle.find(member => member.id === id);
    if (!target || !delta) return;
    pushHistory(`${target.name} ${delta < 0 ? `took ${Math.abs(delta)} damage` : `healed ${delta} HP`}`);
    clearHpDraft(id);
    setLastDelta(delta);
    setBattle(members => members.map(member => member.id === id ? { ...member, hp: Math.min(member.maxHp, Math.max(0, member.hp + delta)) } : member));
    if (delta < 0 && target.concentration) notify(`${target.name} took ${Math.abs(delta)} damage · concentration check DC ${Math.max(10, Math.floor(Math.abs(delta) / 2))}`);
  };
  const commitHp = (member: Combatant) => {
    const draft = hpDrafts[member.id];
    if (draft === undefined) return;
    if (draft.trim() === '') { clearHpDraft(member.id); return; }
    const next = Math.min(member.maxHp, Math.max(0, Number(draft) || 0));
    adjust(member.id, next - member.hp);
  };
  const move = (id: string, direction: number) => {
    const from = battle.findIndex(member => member.id === id), to = Math.max(0, Math.min(battle.length - 1, from + direction));
    if (from < 0 || from === to) return;
    pushHistory(`Reordered ${battle[from].name}`);
    const next = [...battle], picked = next.splice(from, 1)[0];
    next.splice(to, 0, picked);
    setOrder(next);
  };
  const drop = (event: DragEvent, id: string) => {
    event.preventDefault();
    const from = battle.findIndex(member => member.id === dragging), to = battle.findIndex(member => member.id === id);
    if (from < 0 || to < 0 || from === to) return;
    pushHistory(`Reordered ${battle[from].name}`);
    const next = [...battle], picked = next.splice(from, 1)[0];
    next.splice(to, 0, picked);
    setOrder(next);
    setDragging('');
  };
  const remove = (id: string) => {
    const target = battle.find(member => member.id === id);
    pushHistory(`Removed ${target?.name || 'combatant'}`);
    setOrder(battle.filter(member => member.id !== id));
    notify(`${target?.name || 'Combatant'} removed from the active encounter`);
  };
  const duplicate = (id: string) => {
    const target = battle.find(member => member.id === id);
    if (!target) return;
    pushHistory(`Duplicated ${target.name}`);
    const base = target.name.replace(/\s+\d+$/, '');
    const siblings = battle.filter(member => member.name.replace(/\s+\d+$/, '') === base);
    const suffixes = siblings.map(member => Number(member.name.match(/\s+(\d+)$/)?.[1]) || 1);
    const newName = `${base} ${Math.max(...suffixes) + 1}`;
    const next = battle.map(member => member.id === id && !/\s+\d+$/.test(member.name) ? { ...member, name: `${base} 1` } : member);
    const source = next.find(member => member.id === id)!;
    const copy: Combatant = { ...source, id: uid(), name: newName, hp: source.maxHp, initiative: 1 + Math.floor(Math.random() * 20) + source.modifier, turnState: undefined };
    const index = next.findIndex(member => member.id === id);
    next.splice(index + 1, 0, copy);
    setOrder(next);
    notify(`${copy.name} joined with initiative ${copy.initiative}`);
  };
  const commitInitiative = (member: Combatant) => {
    const draft = initDrafts[member.id];
    if (draft === undefined) return;
    clearInitDraft(member.id);
    if (draft.trim() === '') return;
    const nextVal = Number(draft);
    if (!Number.isFinite(nextVal)) return;
    changeInitiative(member.id, nextVal);
  };
  const changeInitiative = (id: string, value: number) => {
    clearInitDraft(id);
    const updated = battle.map(member => member.id === id ? { ...member, initiative: value } : member);
    const sorted = [...updated].sort((a, b) => b.initiative - a.initiative);
    setOrder(sorted);
  };
  const roll = (id: string) => {
    const target = battle.find(member => member.id === id);
    if (!target) return;
    pushHistory(`Rerolled ${target.name}'s initiative`);
    const value = 1 + Math.floor(Math.random() * 20) + target.modifier;
    changeInitiative(id, value);
    notify(`${target.name} rolled ${value} initiative`);
  };
  const toggleReady = (id: string) => {
    const target = battle.find(member => member.id === id);
    pushHistory(`${target?.name || 'Combatant'} changed ready state`);
    setBattle(members => members.map(member => member.id === id ? { ...member, turnState: member.turnState === 'ready' ? undefined : 'ready' } : member));
  };
  const delay = (id: string) => {
    const index = battle.findIndex(member => member.id === id);
    if (index < 0 || index === battle.length - 1) return;
    pushHistory(`${battle[index].name} delayed`);
    const next = battle.map(member => member.id === id ? { ...member, turnState: 'delayed' as const } : member), picked = next.splice(index, 1)[0];
    next.splice(index + 1, 0, picked);
    setBattle(next);
    setTurn(index);
    notify(`${picked.name} delayed their turn`);
  };
  const nextTurn = () => {
    if (!battle.some(member => member.hp > 0)) return;
    pushHistory('Advanced the turn');
    let next = turn, wrapped = false;
    for (let i = 0; i < battle.length; i++) {
      next = (next + 1) % battle.length;
      if (next === 0) wrapped = true;
      if (battle[next]?.hp > 0) break;
    }
    setTurn(next);
    if (wrapped) setRound(value => value + 1);
    setBattle(members => members.map((member, index) => index === next ? { ...member, turnState: undefined } : member));
  };
  const previousTurn = () => {
    if (!battle.some(member => member.hp > 0)) return;
    pushHistory('Moved to the previous turn');
    let previous = turn, wrapped = false;
    for (let i = 0; i < battle.length; i++) {
      previous = (previous - 1 + battle.length) % battle.length;
      if (previous === battle.length - 1) wrapped = true;
      if (battle[previous]?.hp > 0) break;
    }
    setTurn(previous);
    if (wrapped) setRound(value => Math.max(1, value - 1));
  };
  const changeCondition = (member: Combatant, condition: string) => {
    if (!condition.trim()) return;
    const currentConditions = splitConditions(member.conditions);
    const exists = currentConditions.some(entry => conditionName(entry).toLowerCase() === conditionName(condition).toLowerCase());
    pushHistory(`${exists ? 'Removed' : 'Added'} ${condition} ${exists ? 'from' : 'to'} ${member.name}`);
    setBattle(members => members.map(entry => entry.id === member.id ? { ...entry, conditions: exists ? currentConditions.filter(item => conditionName(item).toLowerCase() !== conditionName(condition).toLowerCase()).join(', ') : setCondition(entry.conditions, condition) } : entry));
  };
  const removeMemberCondition = (member: Combatant, condition: string) => {
    pushHistory(`Removed ${condition} from ${member.name}`);
    setBattle(members => members.map(entry => entry.id === member.id ? { ...entry, conditions: removeCondition(entry.conditions, condition) } : entry));
  };
  const setConcentration = (member: Combatant, spell: string) => {
    pushHistory(`${member.name} concentration changed`);
    setBattle(members => members.map(entry => entry.id === member.id ? { ...entry, concentration: spell } : entry));
  };
  const rollExpression = (expression: string) => {
    const match = expression.trim().match(/^(\d{1,2})d(4|6|8|10|12|20|100)([+-]\d+)?$/i);
    if (!match) { notify('Use dice notation, such as 2d6+3'); return; }
    const rolls = Array.from({ length: Number(match[1]) }, () => 1 + Math.floor(Math.random() * Number(match[2])));
    const result = rolls.reduce((total, value) => total + value, 0) + Number(match[3] || 0);
    notify(`${expression}: ${rolls.join(' + ')}${match[3] || ''} = ${result}`);
  };
  const findMember = (name: string) => {
    const normalized = name.trim().toLowerCase();
    return battle.find(member => member.name.toLowerCase() === normalized) || battle.find(member => member.name.toLowerCase().startsWith(normalized));
  };
  const executeCommand = (raw = command) => {
    const value = raw.trim();
    const lower = value.toLowerCase();
    if (!value) return;
    if (['next', 'next turn', 'n'].includes(lower)) nextTurn();
    else if (['previous', 'previous turn', 'prev', 'p'].includes(lower)) previousTurn();
    else if (['undo', 'ctrl z'].includes(lower)) undo();
    else if (lower === 'compendium' || lower === 'open compendium') setDrawerOpen(true);
    else if (lower === 'mute ambience') window.dispatchEvent(new CustomEvent('archeron-audio-mute'));
    else if (['play ambience', 'pause ambience', 'toggle ambience'].includes(lower)) window.dispatchEvent(new CustomEvent('archeron-audio-toggle'));
    else if (lower.startsWith('roll ')) rollExpression(value.slice(5));
    else {
      const hpMatch = value.match(/^(.+?)\s+([+-])(\d+)$/);
      const concentrationMatch = value.match(/^(.+?)\s+concentration\s+(.+)$/i);
      const conditionMatch = value.match(/^(.+?)\s+(?:condition\s+)?(.+)$/i);
      if (hpMatch) {
        const member = findMember(hpMatch[1]);
        if (member) adjust(member.id, (hpMatch[2] === '-' ? -1 : 1) * Number(hpMatch[3]));
        else notify(`No combatant matches “${hpMatch[1]}”`);
      } else if (concentrationMatch) {
        const member = findMember(concentrationMatch[1]);
        if (member) setConcentration(member, concentrationMatch[2]);
        else notify(`No combatant matches “${concentrationMatch[1]}”`);
      } else if (conditionMatch) {
        const member = findMember(conditionMatch[1]);
        const official = DND_CONDITIONS.find(item => item.toLowerCase() === conditionMatch[2].toLowerCase());
        if (member) changeCondition(member, official || conditionMatch[2]);
        else notify('Try “Goblin -7”, “Mira +5”, or “Orc poisoned”.');
      } else notify('Try “Goblin -7”, “roll 2d6+3”, “next turn”, or “compendium”.');
    }
    setCommand('');
    setCommandOpen(false);
  };

  useEffect(() => {
    const open = () => { setCommandOpen(true); setTimeout(() => commandInput.current?.focus(), 0); };
    window.addEventListener('archeron-command-open', open);
    window.addEventListener('planarch-command-open', open);
    return () => {
      window.removeEventListener('archeron-command-open', open);
      window.removeEventListener('planarch-command-open', open);
    };
  }, []);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (!battleActive || document.querySelector('[role="dialog"]')) return;
      const target = event.target as HTMLElement | null;
      const typing = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !typing) { event.preventDefault(); undo(); return; }
      if (typing) return;
      if (event.key.toLowerCase() === 'n') nextTurn();
      else if (event.key.toLowerCase() === 'p') previousTurn();
      else if (event.code === 'Space') { event.preventDefault(); window.dispatchEvent(new CustomEvent('archeron-audio-toggle')); }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [battleActive, battle, turn, round, history]);

  const commandSuggestions = useMemo(() => [
    { label: 'Next turn', command: 'next turn' },
    { label: 'Previous turn', command: 'previous turn' },
    { label: `Damage ${current?.name || 'current combatant'} by 5`, command: current ? `${current.name} -5` : '' },
    { label: `Heal ${current?.name || 'current combatant'} by 5`, command: current ? `${current.name} +5` : '' },
    { label: 'Roll 2d6+3', command: 'roll 2d6+3' },
    { label: 'Open quick compendium', command: 'compendium' },
    { label: 'Mute ambience', command: 'mute ambience' },
  ].filter(item => item.command && `${item.label} ${item.command}`.toLowerCase().includes(command.toLowerCase())), [command, current]);

  const indexed = battle.map((member, index) => ({ member, index }));
  const standing = indexed.filter(({ member }) => member.hp > 0), defeated = indexed.filter(({ member }) => member.hp <= 0);
  const row = ({ member, index }: { member: Combatant; index: number }) => {
    const isCurrent = index === turn && battleActive;
    const hpPct = Math.max(0, Math.min(100, Math.round((member.hp / (member.maxHp || 1)) * 100)));
    const hpColor = hpPct > 50 ? '#22c55e' : hpPct > 20 ? '#f59e0b' : '#ef4444';

    return <motion.div layout transition={{ type: 'spring', damping: 28, stiffness: 380 }} key={member.id} draggable onDragStart={() => setDragging(member.id)} onDragOver={event => event.preventDefault()} onDrop={event => drop(event, member.id)} className={`combatant combatant-live ${isCurrent ? 'current' : ''} ${member.hp <= 0 ? 'defeated' : ''}`}>
      <div className="combat-order">
        <GripVertical size={16} aria-hidden="true" />
        <div className="initiative">
          <input aria-label={`Initiative for ${member.name}`} type="number" value={initDrafts[member.id] ?? String(member.initiative)} onChange={event => setInitDrafts(values => ({ ...values, [member.id]: event.target.value }))} onBlur={() => commitInitiative(member)} onKeyDown={event => { if (event.key === 'Enter') { commitInitiative(member); event.currentTarget.blur(); } if (event.key === 'Escape') clearInitDraft(member.id); }} />
          <small>INIT</small>
        </div>
        <div className={`combat-avatar ${member.role.toLowerCase()}`}>{member.name.slice(0, 1)}</div>
      </div>

      <div className="combat-identity">
        <div className="combat-name-row">
          <strong>{member.name}</strong>
          {isCurrent && <span className="active-turn-badge">TURN</span>}
        </div>
        <small>{member.role}{member.cr ? ` · CR ${member.cr}` : ''}</small>
        <div className="tags">
          {splitConditions(member.conditions).map(condition => <button key={condition} title={`Remove ${condition}`} onClick={() => removeMemberCondition(member, condition)}>{condition}<X size={9} /></button>)}
          {member.concentration && <button className="concentration" title="Clear concentration" onClick={() => setConcentration(member, '')}>◈ {member.concentration}<X size={9} /></button>}
          {member.turnState && <span className="turn-state">{member.turnState}</span>}
        </div>
      </div>

      <div className="hp-inline streamlined" aria-label={`${member.name} hit point controls`}>
        <div className="hp-meter-box">
          <div className="hp-bar-track">
            <div className="hp-bar-fill" style={{ width: `${hpPct}%`, background: hpColor }} />
          </div>
          <label className="hp-label">
            <span className="hp-tag">HP</span>
            <input aria-label={`Current HP for ${member.name}`} type="number" min={0} max={member.maxHp} value={hpDrafts[member.id] ?? String(member.hp)} onChange={event => setHpDrafts(values => ({ ...values, [member.id]: event.target.value }))} onBlur={() => commitHp(member)} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') clearHpDraft(member.id); }} />
            <small>/ {member.maxHp}</small>
          </label>
        </div>

        <div className="hp-quick-adjust">
          <button className="adjust-btn dmg" disabled={!amount(member.id)} aria-label={`Apply damage to ${member.name}`} title={`Damage ${member.name}`} onClick={() => adjust(member.id, -amount(member.id))}>−</button>
          <input aria-label={`Custom HP amount for ${member.name}`} type="number" min={0} placeholder="Amt" value={amounts[member.id] || ''} onChange={event => setAmounts({ ...amounts, [member.id]: event.target.value })} onKeyDown={event => { if (event.key === 'Enter' && amount(member.id)) { adjust(member.id, -amount(member.id)); } }} />
          <button className="adjust-btn heal" disabled={!amount(member.id)} aria-label={`Apply healing to ${member.name}`} title={`Heal ${member.name}`} onClick={() => adjust(member.id, amount(member.id))}>+</button>
          {lastDelta !== 0 && <button className="repeat-hp" aria-label={`Repeat ${Math.abs(lastDelta)} ${lastDelta < 0 ? 'damage' : 'healing'} for ${member.name}`} title={`Repeat ${lastDelta > 0 ? '+' : '−'}${Math.abs(lastDelta)}`} onClick={() => adjust(member.id, lastDelta)}><RotateCcw size={11} /><span>{lastDelta > 0 ? '+' : '−'}{Math.abs(lastDelta)}</span></button>}
        </div>
      </div>

      <div className="combat-actions">
        <details className="condition-menu">
          <summary aria-label={`Manage conditions for ${member.name}`}>Conditions</summary>
          <div className="condition-popover">
            <strong>Official conditions</strong>
            <div>{DND_CONDITIONS.map(condition => <button key={condition} className={splitConditions(member.conditions).some(item => conditionName(item) === condition) ? 'selected' : ''} onClick={() => condition === 'Exhaustion' ? changeCondition(member, `Exhaustion ${exhaustionLevels[member.id] || 1}`) : changeCondition(member, condition)}>{condition}</button>)}</div>
            <label>Exhaustion level<select aria-label={`Exhaustion level for ${member.name}`} value={exhaustionLevels[member.id] || 1} onChange={event => setExhaustionLevels(values => ({ ...values, [member.id]: Number(event.target.value) }))}>{[1, 2, 3, 4, 5, 6].map(level => <option key={level}>{level}</option>)}</select></label>
            <label>Custom<input aria-label={`Custom condition for ${member.name}`} value={customConditions[member.id] || ''} onChange={event => setCustomConditions(values => ({ ...values, [member.id]: event.target.value }))} onKeyDown={event => { if (event.key === 'Enter') { changeCondition(member, event.currentTarget.value.trim()); setCustomConditions(values => ({ ...values, [member.id]: '' })); } }} placeholder="Add custom condition" /></label>
            <button className="secondary" disabled={!customConditions[member.id]?.trim()} onClick={() => { changeCondition(member, customConditions[member.id]); setCustomConditions(values => ({ ...values, [member.id]: '' })); }}>Add custom</button>
          </div>
        </details>
        <div className="row-order-actions">
          <button className="icon-button" aria-label={`Move ${member.name} up`} disabled={index === 0} onClick={() => move(member.id, -1)} title="Move up"><ChevronUp size={14} /></button>
          <button className="icon-button" aria-label={`Move ${member.name} down`} disabled={index === battle.length - 1} onClick={() => move(member.id, 1)} title="Move down"><ChevronDown size={14} /></button>
          <button className={`icon-button ${member.turnState === 'ready' ? 'selected' : ''}`} aria-label={`Ready action for ${member.name}`} title="Ready action" onClick={() => toggleReady(member.id)}><ShieldCheck size={14} /></button>
          <button className="icon-button" aria-label={`Delay turn for ${member.name}`} title="Delay one place" disabled={index === battle.length - 1} onClick={() => delay(member.id)}><SkipForward size={14} /></button>
          <button className="icon-button" aria-label={`Roll initiative for ${member.name}`} title="Roll only this combatant" onClick={() => roll(member.id)}><Dices size={14} /></button>
          {member.reference && <button className="icon-button" aria-label={`Open ${member.name} stat block`} onClick={() => { setDrawerFocus(member.reference!.id); setDrawerOpen(true); }}><BookOpen size={14} /></button>}
          {member.role === 'Monster' && <button className="icon-button" aria-label={`Duplicate ${member.name}`} title="Duplicate and roll newcomer" onClick={() => duplicate(member.id)}><CopyPlus size={14} /></button>}
          <button className="icon-button danger-text" aria-label={`Remove ${member.name} from combat`} onClick={() => remove(member.id)} title="Remove"><Trash2 size={14} /></button>
        </div>
      </div>
    </motion.div>;
  };

  return <>
    <div className="between encounter-title"><div><span className="eyebrow">{battleActive ? 'LIVE ENCOUNTER' : 'ENCOUNTER TRACKER'}</span><h3>{battleActive ? battleTitle : 'No encounter running'}</h3></div>{battleActive && <span className="round-medallion">ROUND <strong>{round}</strong></span>}</div>
    {battle.length ? <><motion.div layout className="combat-list">{standing.map(row)}</motion.div>{defeated.length > 0 && <details className="defeated-list"><summary><X size={13} />{defeated.length} defeated</summary><div className="combat-list">{defeated.map(row)}</div></details>}<div className="combat-footer"><button className="secondary small" onClick={onOpenEncounters}><Plus size={14} />Manage roster</button><div className="inline"><button className="secondary" onClick={onEnd}>End encounter</button><button className="primary" disabled={!battleActive} onClick={nextTurn}>Next turn <SkipForward size={15} /></button></div></div></> : <div className="combat-empty"><Swords size={28} /><p>Start an encounter, then manage HP and initiative here without restarting the round.</p><button className="primary" onClick={onOpenEncounters}><Plus size={15} />Open encounters</button></div>}

    {commandOpen && <div className="command-backdrop" onClick={() => setCommandOpen(false)}><div className="command-palette" role="dialog" aria-modal="true" aria-label="Session command palette" onClick={event => event.stopPropagation()}><div className="command-input"><Command size={17} /><input ref={commandInput} autoFocus aria-label="Session command" value={command} onChange={event => setCommand(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') executeCommand(); if (event.key === 'Escape') setCommandOpen(false); }} placeholder="Goblin -7, Mira +5, Orc poisoned, roll 2d6+3…" /><kbd>Enter</kbd></div><div className="command-results">{commandSuggestions.map(item => <button key={item.command} onClick={() => executeCommand(item.command)}><strong>{item.label}</strong><small>{item.command}</small></button>)}</div><footer>Commands also support “Mira concentration Bless” and any custom condition.</footer></div></div>}
    <CompendiumDrawer open={drawerOpen} focus={drawerFocus} onClose={() => setDrawerOpen(false)} />
  </>;
}
