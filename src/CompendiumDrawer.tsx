import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Search, X } from 'lucide-react';
import { plain, readMeta, readRecord, type CompendiumRecord, type LibraryMeta } from './compendiumData';

const labels: Record<string, string> = {
  monster: 'Monster', spell: 'Spell', item: 'Item', class: 'Class',
  race: 'Ancestry', feat: 'Feat', background: 'Background',
};

export default function CompendiumDrawer({ open, focus, onClose }: { open: boolean; focus?: string; onClose: () => void }) {
  const [meta, setMeta] = useState<LibraryMeta | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('');
  const [record, setRecord] = useState<CompendiumRecord | null>(null);

  useEffect(() => {
    if (!open) return;
    readMeta().then(next => {
      setMeta(next);
      setSelected(focus || next?.index[0]?.id || '');
    }).catch(() => setMeta(null));
  }, [open, focus]);

  useEffect(() => {
    if (!open || !meta || !selected) { setRecord(null); return; }
    let cancelled = false;
    readRecord(meta.generation, selected).then(next => { if (!cancelled) setRecord(next); }).catch(() => setRecord(null));
    return () => { cancelled = true; };
  }, [open, meta, selected]);

  const matches = useMemo(() => {
    const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return (meta?.index || []).filter(entry => words.every(word => entry.search.includes(word))).slice(0, 80);
  }, [meta, query]);

  if (!open) return null;
  return <div className="compendium-drawer-backdrop" onClick={onClose}>
    <aside className="compendium-drawer" role="dialog" aria-modal="true" aria-label="Quick compendium" onClick={event => event.stopPropagation()}>
      <header><div><span className="eyebrow">QUICK REFERENCE</span><h2>Compendium</h2></div><button className="icon-button" aria-label="Close quick compendium" onClick={onClose}><X size={18} /></button></header>
      {!meta ? <div className="drawer-empty"><BookOpen size={28} /><p>Load the included compendium from the Compendium page first.</p></div> : <>
        <div className="drawer-search"><Search size={15} /><input autoFocus aria-label="Search quick compendium" value={query} onChange={event => setQuery(event.target.value)} placeholder="Monster, spell, item…" /></div>
        <div className="drawer-layout">
          <nav>{matches.map(entry => <button key={entry.id} className={selected === entry.id ? 'selected' : ''} onClick={() => setSelected(entry.id)}><strong>{entry.name}</strong><small>{labels[entry.kind]} · {entry.summary}</small></button>)}</nav>
          <article>{record ? <><span className="eyebrow">{labels[record.kind]} · {record.edition}</span><h2>{record.name}</h2><div className="drawer-fields">{Object.entries(record.fields).filter(([key, value]) => key !== 'name' && plain(value)).map(([key, value]) => <section key={key}><h3>{key.replace(/([a-z])([A-Z])/g, '$1 $2')}</h3><p>{plain(value)}</p></section>)}</div></> : <div className="drawer-empty"><BookOpen size={24} /><p>Select a reference entry.</p></div>}</article>
        </div>
      </>}
    </aside>
  </div>;
}
