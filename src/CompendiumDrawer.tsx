import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Search, X, ChevronDown, ChevronRight, Shield, Heart, Zap } from 'lucide-react';
import { plain, readMeta, readRecord, type CompendiumRecord, type LibraryMeta, type FieldValue } from './compendiumData';
import { getCloudCompendiumMeta, getCloudCompendiumRecord } from './supabaseCloud';
import { MonsterStatBlock, ReferenceStatBlock } from './Compendium';
import { readHomebrew } from './homebrewData';

const labels: Record<string, string> = {
  monster: 'Monster', spell: 'Spell', item: 'Item', class: 'Class',
  race: 'Ancestry', feat: 'Feat', background: 'Background',
};

function DrawerInteractiveText({ text }: { text: string }) {
  const triggerRoll = (expr: string, label: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('archeron-dice-roll', { detail: { expression: expr, label } }));
    }
  };
  const regex = /(([+-]\d+)\s+to\s+hit)|(\b\d{1,2}d\d{1,3}(?:\s*[+-]\s*\d+)?\b)/gi;
  let lastIndex = 0, match;
  const parts: React.ReactNode[] = [];
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.substring(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      const atkMod = match[2], label = match[1], expr = `1d20${atkMod}`;
      parts.push(<button key={key++} type="button" className="dice-inline-btn attack-roll-btn" onClick={() => triggerRoll(expr, `Attack (${label})`)} title={`Roll attack: ${expr}`}>ATK {atkMod}</button>);
    } else if (match[3]) {
      const dmgExpr = match[3].replace(/\s+/g, ''), label = match[3];
      parts.push(<button key={key++} type="button" className="dice-inline-btn damage-roll-btn" onClick={() => triggerRoll(dmgExpr, `Damage (${label})`)} title={`Roll damage: ${dmgExpr}`}>DMG {label}</button>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.substring(lastIndex)}</span>);
  }
  return <>{parts}</>;
}

export default function CompendiumDrawer({ open, focus, campaign = '', onClose }: { open: boolean; focus?: string; campaign?: string; onClose: () => void }) {
  const [meta, setMeta] = useState<LibraryMeta | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('');
  const [record, setRecord] = useState<CompendiumRecord | null>(null);
  const [homebrewIndex, setHomebrewIndex] = useState<CompendiumRecord[]>([]);
  const triggerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    if (!triggerRef.current) triggerRef.current = document.activeElement as HTMLElement | null;
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') onCloseRef.current(); };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [open]);
  useEffect(() => {
    if (!open) triggerRef.current?.focus();
    else {
      const focus = () => document.querySelector<HTMLElement>('[role="dialog"][aria-label="Quick compendium"]')?.querySelector<HTMLElement>('input,button')?.focus();
      if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(focus);
      else focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setHomebrewIndex(readHomebrew(campaign));
    readMeta().then(async next => {
      if (next) {
        setMeta(next);
        setSelected(focus || next?.index[0]?.id || '');
        return;
      }
      const cloud = await getCloudCompendiumMeta().catch(() => null);
      setMeta(cloud);
      setSelected(focus || cloud?.index[0]?.id || '');
    }).catch(async () => {
      const cloud = await getCloudCompendiumMeta().catch(() => null);
      setMeta(cloud);
      setSelected(focus || cloud?.index[0]?.id || '');
    });
  }, [open, focus, campaign]);

  useEffect(() => {
    if (!open || !selected) { setRecord(null); return; }
    const homebrew = readHomebrew(campaign).find(item => item.id === selected);
    if (homebrew) { setRecord(homebrew); return; }
    let cancelled = false;
    const load = async () => {
      const local = meta ? await readRecord(meta.generation, selected).catch(() => null) : null;
      if (cancelled) return;
      if (local) { setRecord(local); return; }
      const cloud = await getCloudCompendiumRecord(selected).catch(() => null);
      if (!cancelled) setRecord(cloud);
    };
    void load();
    return () => { cancelled = true; };
  }, [open, meta, selected, campaign]);

  const homebrewIndexEntries = useMemo(() => homebrewIndex.map(item => ({ id: item.id, kind: item.kind, name: item.name, summary: String(item.fields.type || item.kind), search: `${item.name} ${Object.values(item.fields).join(' ')}`.toLowerCase() })), [homebrewIndex]) as LibraryMeta['index'];
  const matches = useMemo(() => {
    const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return [...homebrewIndexEntries, ...(meta?.index || [])].filter((entry, index, entries) => entries.findIndex(item => item.id === entry.id) === index && words.every(word => entry.search.includes(word))).slice(0, 80);
  }, [homebrewIndexEntries, meta, query]);

  if (!open) return null;
  return <div className="compendium-reference-backdrop" onClick={onClose}>
    <section className="compendium-reference-modal" role="dialog" aria-modal="true" aria-label="Quick compendium" onKeyDown={event => { if (event.key !== 'Tab') return; const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href],[tabindex]:not([tabindex="-1"])')).filter(element => !element.hasAttribute('disabled')); if (!items.length) return; const first = items[0], last = items[items.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }} onClick={event => event.stopPropagation()}>
      <header><div><span className="eyebrow">QUICK REFERENCE</span><h2>Compendium</h2></div><button autoFocus className="icon-button" aria-label="Close quick compendium" onClick={onClose}><X size={18} /></button></header>
      {!meta && !record ? <div className="drawer-empty"><BookOpen size={28} /><p>Load or sync a compendium from the Compendium page first.</p></div> : <>
        <div className="drawer-search"><Search size={15} /><input autoFocus aria-label="Search quick compendium" value={query} onChange={event => setQuery(event.target.value)} placeholder="Monster, spell, item…" /></div>
        <div className="drawer-layout">
          <nav>{matches.map(entry => <button key={entry.id} className={selected === entry.id ? 'selected' : ''} onClick={() => setSelected(entry.id)}><strong>{entry.name}</strong><small>{labels[entry.kind]} · {entry.summary}</small></button>)}</nav>
          <article className="drawer-record-article">{record ? <>
            <div className="drawer-record-header">
              <span className="eyebrow">{labels[record.kind]} · {record.edition}</span>
              <h2>{record.name}</h2>
            </div>
            {record.kind === 'monster' ? (
              <div className="drawer-monster-wrapper">
                <MonsterStatBlock record={record} collapsibleSections={true} />
              </div>
            ) : record.kind === 'spell' || record.kind === 'item' ? (
              <div className="drawer-reference-wrapper">
                <ReferenceStatBlock record={record} />
              </div>
            ) : (
              <div className="drawer-fields">
                {Object.entries(record.fields).filter(([key, value]) => key !== 'name' && plain(value)).map(([key, value]) => {
                  const title = key.replace(/([a-z])([A-Z])/g, '$1 $2');
                  const text = plain(value);
                  const isLong = text.length > 120 || text.includes('\n');
                  return isLong ? (
                    <details key={key} className="compendium-accordion" open>
                      <summary className="accordion-summary"><span>{title}</span></summary>
                      <div className="accordion-content">
                        <p><DrawerInteractiveText text={text} /></p>
                      </div>
                    </details>
                  ) : (
                    <section key={key} className="drawer-field-simple">
                      <h3>{title}</h3>
                      <p><DrawerInteractiveText text={text} /></p>
                    </section>
                  );
                })}
              </div>
            )}
          </> : <div className="drawer-empty"><BookOpen size={24} /><p>Select a reference entry.</p></div>}</article>
        </div>
      </>}
    </section>
  </div>;
}
