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
  const [customConditions, setCustomConditions] = useState<Record<string, string>>({});
  const [exhaustionLevels, setExhaustionLevels] = useState<Record<string, number>>({});
  const [dragging, setDragging] = useState('');
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [lastDelta, setLastDelta] = useState(0);
  const [sessionAmount, setSessionAmount] = useState('5');
  const [sessionMode, setSessionMode] = useState<'damage' | 'heal'>('damage');
  const [quickCustom, setQuickCustom] = useState('');
  const [quickExhaustion, setQuickExhaustion] = useState(1);
  const [quickDice, setQuickDice] = useState('1d20');
  const [sessionTray, setSessionTray] = useState<'conditions' | 'tools' | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [command, setCommand] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerFocus, setDrawerFocus] = useState('');
  const commandInput = useRef<HTMLInputElement>(null);
  const currentId = battle[turn]?.id;
  const current = battle[turn];

  const toggleSessionTray = (tray: 'conditions' | 'tools') => {
    window.dispatchEvent(new CustomEvent('planarch-youtube-mixer-close'));
    setSessionTray(value => value === tray ? null : tray);
  };
  const openAudioTray = () => {
    setSessionTray(null);
    window.dispatchEvent(new CustomEvent('planarch-youtube-mixer-open'));
  };

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
  const roll = (id: string) => {
    const target = battle.find(member => member.id === id);
    if (!target) return;
    pushHistory(`Rerolled ${target.name}'s initiative`);
    const value = 1 + Math.floor(Math.random() * 20) + target.modifier;
    setBattle(members => members.map(member => member.id === id ? { ...member, initiative: value } : member));
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
    else if (lower === 'mute ambience') window.dispatchEvent(new CustomEvent('planarch-audio-mute'));
    else if (['play ambience', 'pause ambience', 'toggle ambience'].includes(lower)) window.dispatchEvent(new CustomEvent('planarch-audio-toggle'));
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
    window.addEventListener('planarch-command-open', open);
    return () => window.removeEventListener('planarch-command-open', open);
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
      else if (event.key.toLowerCase() === 'd') { event.preventDefault(); setSessionMode('damage'); document.getElementById('session-amount')?.focus(); }
      else if (event.key.toLowerCase() === 'h') { event.preventDefault(); setSessionMode('heal'); document.getElementById('session-amount')?.focus(); }
      else if (event.key.toLowerCase() === 'c') { event.preventDefault(); toggleSessionTray('conditions'); }
      else if (event.key.toLowerCase() === 'r') rollExpression(quickDice);
      else if (event.code === 'Space') { event.preventDefault(); window.dispatchEvent(new CustomEvent('planarch-audio-toggle')); }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [battleActive, battle, turn, round, history, quickDice]);

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
  const row = ({ member, index }: { member: Combatant; index: number }) => <div key={member.id} draggable onDragStart={() => setDragging(member.id)} onDragOver={event => event.preventDefault()} onDrop={event => drop(event, member.id)} className={`combatant combatant-live ${index === turn && battleActive ? 'current' : ''} ${member.hp <= 0 ? 'defeated' : ''}`}>
    <div className="combat-order"><GripVertical size={16} aria-hidden="true" /><div className="initiative"><input aria-label={`Initiative for ${member.name}`} type="number" value={member.initiative} onChange={event => setBattle(members => members.map(item => item.id === member.id ? { ...item, initiative: +event.target.value } : item))} /><small>INIT</small></div><div className={`combat-avatar ${member.role.toLowerCase()}`}>{member.name.slice(0, 1)}</div></div>
    <div className="combat-identity"><strong>{member.name}</strong><small>{member.role}{member.cr ? ` · CR ${member.cr}` : ''}</small><div className="tags">{splitConditions(member.conditions).map(condition => <button key={condition} title={`Remove ${condition}`} onClick={() => removeMemberCondition(member, condition)}>{condition}<X size={9} /></button>)}{member.concentration && <button className="concentration" title="Clear concentration" onClick={() => setConcentration(member, '')}>◈ {member.concentration}<X size={9} /></button>}{member.turnState && <span className="turn-state">{member.turnState}</span>}</div></div>
    <div className="hp-inline" aria-label={`${member.name} hit point controls`}><button aria-label={`Damage 5 ${member.name}`} onClick={() => adjust(member.id, -5)}>−5</button><button aria-label={`Damage 1 ${member.name}`} onClick={() => adjust(member.id, -1)}>−1</button><label><span>HP</span><input aria-label={`Current HP for ${member.name}`} type="number" min={0} max={member.maxHp} value={hpDrafts[member.id] ?? String(member.hp)} onChange={event => setHpDrafts(values => ({ ...values, [member.id]: event.target.value }))} onBlur={() => commitHp(member)} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') clearHpDraft(member.id); }} /><small>/ {member.maxHp}</small></label><button aria-label={`Heal 1 ${member.name}`} onClick={() => adjust(member.id, 1)}>+1</button><button aria-label={`Heal 5 ${member.name}`} onClick={() => adjust(member.id, 5)}>+5</button>{lastDelta !== 0 && <button className="repeat-hp" aria-label={`Repeat ${Math.abs(lastDelta)} ${lastDelta < 0 ? 'damage' : 'healing'} for ${member.name}`} onClick={() => adjust(member.id, lastDelta)}><RotateCcw size={11} />{lastDelta > 0 ? '+' : '−'}{Math.abs(lastDelta)}</button>}<div className="hp-custom"><input aria-label={`Custom HP amount for ${member.name}`} type="number" min={0} placeholder="Any" value={amounts[member.id] || ''} onChange={event => setAmounts({ ...amounts, [member.id]: event.target.value })} /><button disabled={!amount(member.id)} aria-label={`Apply damage to ${member.name}`} onClick={() => adjust(member.id, -amount(member.id))}><Swords size={13} /></button><button disabled={!amount(member.id)} aria-label={`Apply healing to ${member.name}`} onClick={() => adjust(member.id, amount(member.id))}><HeartPulse size={13} /></button></div></div>
    <div className="combat-actions"><details className="condition-menu"><summary aria-label={`Manage conditions for ${member.name}`}>Conditions</summary><div className="condition-popover"><strong>Official conditions</strong><div>{DND_CONDITIONS.map(condition => <button key={condition} className={splitConditions(member.conditions).some(item => conditionName(item) === condition) ? 'selected' : ''} onClick={() => condition === 'Exhaustion' ? changeCondition(member, `Exhaustion ${exhaustionLevels[member.id] || 1}`) : changeCondition(member, condition)}>{condition}</button>)}</div><label>Exhaustion level<select aria-label={`Exhaustion level for ${member.name}`} value={exhaustionLevels[member.id] || 1} onChange={event => setExhaustionLevels(values => ({ ...values, [member.id]: Number(event.target.value) }))}>{[1, 2, 3, 4, 5, 6].map(level => <option key={level}>{level}</option>)}</select></label><label>Custom<input aria-label={`Custom condition for ${member.name}`} value={customConditions[member.id] || ''} onChange={event => setCustomConditions(values => ({ ...values, [member.id]: event.target.value }))} onKeyDown={event => { if (event.key === 'Enter') { changeCondition(member, event.currentTarget.value.trim()); setCustomConditions(values => ({ ...values, [member.id]: '' })); } }} placeholder="Add custom condition" /></label><button className="secondary" disabled={!customConditions[member.id]?.trim()} onClick={() => { changeCondition(member, customConditions[member.id]); setCustomConditions(values => ({ ...values, [member.id]: '' })); }}>Add custom</button></div></details><button className="icon-button" aria-label={`Move ${member.name} up`} disabled={index === 0} onClick={() => move(member.id, -1)}><ChevronUp size={14} /></button><button className="icon-button" aria-label={`Move ${member.name} down`} disabled={index === battle.length - 1} onClick={() => move(member.id, 1)}><ChevronDown size={14} /></button><button className="icon-button danger-text" aria-label={`Remove ${member.name} from encounter`} title="Remove from encounter" onClick={() => setBattle(members => members.filter(item => item.id !== member.id))}><Trash2 size={13} /></button><button className={`icon-button ${member.turnState === 'ready' ? 'selected' : ''}`} aria-label={`Ready action for ${member.name}`} title="Ready action" onClick={() => toggleReady(member.id)}><ShieldCheck size={14} /></button><button className="icon-button" aria-label={`Delay turn for ${member.name}`} title="Delay one place" disabled={index === battle.length - 1} onClick={() => delay(member.id)}><SkipForward size={14} /></button><button className="icon-button" aria-label={`Roll initiative for ${member.name}`} title="Roll only this combatant" onClick={() => roll(member.id)}><Dices size={14} /></button>{member.reference && <button className="icon-button" aria-label={`Open ${member.name} stat block`} onClick={() => { setDrawerFocus(member.reference!.id); setDrawerOpen(true); }}><BookOpen size={14} /></button>}{member.role === 'Monster' && <button className="icon-button" aria-label={`Duplicate ${member.name}`} title="Duplicate and roll newcomer" onClick={() => duplicate(member.id)}><CopyPlus size={14} /></button>}<button className="icon-button danger-text" aria-label={`Remove ${member.name} from combat`} onClick={() => remove(member.id)}><Trash2 size={14} /></button></div>
  </div>;

  return <>
    <div className="between encounter-title"><div><span className="eyebrow">{battleActive ? 'LIVE ENCOUNTER' : 'ENCOUNTER TRACKER'}</span><h3>{battleActive ? battleTitle : 'No encounter running'}</h3></div>{battleActive && <span className="round-medallion">ROUND <strong>{round}</strong></span>}</div>
    {battle.length ? <><div className="combat-list">{standing.map(row)}</div>{defeated.length > 0 && <details className="defeated-list"><summary><X size={13} />{defeated.length} defeated</summary><div className="combat-list">{defeated.map(row)}</div></details>}<div className="combat-footer"><div className="inline wrap"><button className="secondary small" onClick={onOpenEncounters}><Plus size={14} />Manage roster</button><small>Drag rows or use arrows to reorder. Every creature keeps its own turn.</small></div><div className="inline wrap"><button className="secondary" onClick={onEnd}>End encounter</button><button className="primary" disabled={!battleActive} onClick={nextTurn}>Next turn <SkipForward size={15} /></button></div></div></> : <div className="combat-empty"><Swords size={28} /><p>Start an encounter, then manage HP and initiative here without restarting the round.</p><button className="primary" onClick={onOpenEncounters}><Plus size={15} />Open encounters</button></div>}

    {battleActive && current && <div className={`session-control-dock ${sessionTray ? 'tray-open' : ''}`} aria-label="Session controls">
      {sessionTray === 'conditions' && <section className="session-dock-tray" aria-label="Current actor conditions">
        <header><div><span className="eyebrow">CURRENT ACTOR</span><strong>Conditions for {current.name}</strong></div><button className="icon-button" aria-label="Close condition tray" onClick={() => setSessionTray(null)}><X size={16} /></button></header>
        <div className="session-condition-grid">{DND_CONDITIONS.filter(condition => condition !== 'Exhaustion').map(condition => <button key={condition} aria-label={`Toggle ${condition} condition`} className={splitConditions(current.conditions).some(item => conditionName(item) === condition) ? 'selected' : ''} onClick={() => changeCondition(current, condition)}>{condition}</button>)}</div>
        <div className="session-condition-special"><label><span>Exhaustion level</span><select aria-label="Session exhaustion level" value={quickExhaustion} onChange={event => setQuickExhaustion(Number(event.target.value))}>{[1, 2, 3, 4, 5, 6].map(level => <option key={level}>{level}</option>)}</select></label><button aria-label="Apply exhaustion" onClick={() => changeCondition(current, `Exhaustion ${quickExhaustion}`)}>Apply exhaustion</button><label className="session-custom-condition"><span>Custom</span><input aria-label="Session custom condition" value={quickCustom} onChange={event => setQuickCustom(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && quickCustom.trim()) { changeCondition(current, quickCustom); setQuickCustom(''); } }} placeholder="Custom condition" /></label><button disabled={!quickCustom.trim()} onClick={() => { changeCondition(current, quickCustom); setQuickCustom(''); }}>Add current custom condition</button></div>
      </section>}
      {sessionTray === 'tools' && <section className="session-dock-tray session-tools-tray" aria-label="Session utilities">
        <header><div><span className="eyebrow">QUICK TOOLS</span><strong>Session utilities</strong></div><button className="icon-button" aria-label="Close tools tray" onClick={() => setSessionTray(null)}><X size={16} /></button></header>
        <div className="session-tools-layout"><div className="session-utilities"><button aria-label="Open command palette" onClick={() => setCommandOpen(true)}><Command size={15} /> Commands</button><button aria-label="Open quick compendium" onClick={() => { setDrawerFocus(''); setDrawerOpen(true); }}><BookOpen size={15} /> Compendium</button><button aria-label="Toggle ambience" onClick={() => window.dispatchEvent(new CustomEvent('planarch-audio-toggle'))}><Volume2 size={15} /> Ambience</button><button aria-label="Mute ambience" onClick={() => window.dispatchEvent(new CustomEvent('planarch-audio-mute'))}><VolumeX size={15} /> Mute</button><button disabled={!history.length} aria-label="Undo last action" onClick={undo}><RotateCcw size={15} /> Undo</button></div><div className="session-dice"><span>Quick roll</span><input aria-label="Session dice expression" value={quickDice} onChange={event => setQuickDice(event.target.value)} onKeyDown={event => event.key === 'Enter' && rollExpression(quickDice)} /><button onClick={() => rollExpression(quickDice)}><Dices size={14} /> Roll</button></div><div className="session-history"><span><History size={14} /> Recent actions</span>{history.length ? history.slice(0, 4).map((entry, index) => <button key={entry.id} disabled={index > 0} onClick={undo}>{entry.label}{index === 0 && <strong>Undo</strong>}</button>) : <small>No reversible actions yet.</small>}</div></div>
      </section>}
      <div className="session-dock-row">
        <div className="session-current"><span className="session-round-seal">{round}</span><div><small>ROUND {round} · CURRENT TURN</small><strong>{current.name}</strong><span>{current.hp} / {current.maxHp} HP{splitConditions(current.conditions).length ? ` · ${splitConditions(current.conditions).join(', ')}` : ''}</span></div></div>
        <div className="session-turn-controls"><button className="icon-button" aria-label="Previous turn" onClick={previousTurn}><SkipBack size={17} /></button><button className="primary" onClick={nextTurn}>Next turn <SkipForward size={15} /></button></div>
        <div className="session-hp"><input id="session-amount" className={`mode-${sessionMode}`} aria-label="Session HP amount" type="number" min={1} value={sessionAmount} onChange={event => setSessionAmount(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') adjust(current.id, (sessionMode === 'damage' ? -1 : 1) * Math.max(0, Number(sessionAmount) || 0)); }} /><button className={sessionMode === 'damage' ? 'selected damage' : 'damage'} aria-label={`Damage ${current.name}`} onClick={() => { setSessionMode('damage'); adjust(current.id, -Math.max(0, Number(sessionAmount) || 0)); }}><Swords size={13} /> Damage</button><button className={sessionMode === 'heal' ? 'selected heal' : 'heal'} aria-label={`Heal ${current.name}`} onClick={() => { setSessionMode('heal'); adjust(current.id, Math.max(0, Number(sessionAmount) || 0)); }}><HeartPulse size={13} /> Heal</button>{lastDelta !== 0 && <button className="session-repeat" aria-label="Repeat last HP action" title={`Repeat ${lastDelta > 0 ? 'healing' : 'damage'} ${Math.abs(lastDelta)}`} onClick={() => adjust(current.id, lastDelta)}><RotateCcw size={13} /><span>{lastDelta > 0 ? '+' : '−'}{Math.abs(lastDelta)}</span></button>}</div>
        <div className="session-dock-actions"><button className={sessionTray === 'conditions' ? 'selected' : ''} aria-label="Manage current conditions" onClick={() => toggleSessionTray('conditions')}><Plus size={14} /><span>{splitConditions(current.conditions).length ? `${splitConditions(current.conditions).length} conditions` : 'Condition'}</span></button><button aria-label="Open YouTube mixer" onClick={openAudioTray}><Volume2 size={15} /><span>YouTube mix</span></button><button className={sessionTray === 'tools' ? 'selected' : ''} aria-label="Open session tools" onClick={() => toggleSessionTray('tools')}><MoreHorizontal size={17} /><span>Tools</span></button></div>
      </div>
    </div>}

    {commandOpen && <div className="command-backdrop" onClick={() => setCommandOpen(false)}><div className="command-palette" role="dialog" aria-modal="true" aria-label="Session command palette" onClick={event => event.stopPropagation()}><div className="command-input"><Command size={17} /><input ref={commandInput} autoFocus aria-label="Session command" value={command} onChange={event => setCommand(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') executeCommand(); if (event.key === 'Escape') setCommandOpen(false); }} placeholder="Goblin -7, Mira +5, Orc poisoned, roll 2d6+3…" /><kbd>Enter</kbd></div><div className="command-results">{commandSuggestions.map(item => <button key={item.command} onClick={() => executeCommand(item.command)}><strong>{item.label}</strong><small>{item.command}</small></button>)}</div><footer>Commands also support “Mira concentration Bless” and any custom condition.</footer></div></div>}
    <CompendiumDrawer open={drawerOpen} focus={drawerFocus} onClose={() => setDrawerOpen(false)} />
  </>;
}
