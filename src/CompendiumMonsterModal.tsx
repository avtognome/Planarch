import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, Plus, BookOpen, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { type CompendiumRecord, type EntryIndex, monsterToCombatant, plain, readRecord } from './compendiumData';
import { uid, type Combatant } from './models';

export interface CompendiumMonsterModalProps {
  generation?: string;
  indexEntries?: EntryIndex[];
  records?: CompendiumRecord[]; // backwards compatibility
  loadRecord?: (id: string) => Promise<CompendiumRecord | null>;
  onAdd: (combatants: Combatant[]) => void;
  onClose: () => void;
}

const PAGE_SIZE = 40;

export function CompendiumMonsterModal({
  generation,
  indexEntries,
  records,
  loadRecord,
  onAdd,
  onClose
}: CompendiumMonsterModalProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCr, setSelectedCr] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [page, setPage] = useState(0);
  const [activeId, setActiveId] = useState<string>('');
  const [activeRecord, setActiveRecord] = useState<CompendiumRecord | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedNotice, setAddedNotice] = useState<string>('');

  // Debounce query to prevent typing lag
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(0);
    }, 120);
    return () => clearTimeout(timer);
  }, [query]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [selectedCr, selectedType]);

  // Standardize lightweight monster entries
  const monsters: { id: string; name: string; summary: string; search: string; fallbackRecord?: CompendiumRecord }[] = useMemo(() => {
    if (indexEntries && indexEntries.length > 0) {
      return indexEntries.filter(e => e.kind === 'monster');
    }
    if (records && records.length > 0) {
      return records.filter(r => r.kind === 'monster').map(r => ({
        id: r.id,
        name: r.name,
        summary: `${plain(r.fields.type)} · CR ${plain(r.fields.cr) || '—'} · HP ${plain(r.fields.hp).split(' ')[0] || '—'} · AC ${plain(r.fields.ac) || '—'}`,
        search: `${r.name} ${plain(r.fields.type)} ${plain(r.fields.cr)}`.toLowerCase(),
        fallbackRecord: r
      }));
    }
    return [];
  }, [indexEntries, records]);

  // Monster types from summary/search
  const monsterTypes = useMemo(() => {
    return ['Aberration', 'Beast', 'Celestial', 'Construct', 'Dragon', 'Elemental', 'Fey', 'Fiend', 'Giant', 'Humanoid', 'Monstrosity', 'Ooze', 'Plant', 'Undead'];
  }, []);

  // Filter monsters quickly
  const filteredMonsters = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const words = q ? q.split(/\s+/).filter(Boolean) : [];

    return monsters.filter(m => {
      if (words.length && !words.every(w => m.search.includes(w) || m.name.toLowerCase().includes(w))) {
        return false;
      }

      if (selectedType !== 'All') {
        if (!m.search.includes(selectedType.toLowerCase())) return false;
      }

      if (selectedCr !== 'All') {
        const numCr = extractCrFromSummary(m.summary);
        if (selectedCr === '0-1' && !(numCr >= 0 && numCr <= 1)) return false;
        if (selectedCr === '2-4' && !(numCr >= 2 && numCr <= 4)) return false;
        if (selectedCr === '5-10' && !(numCr >= 5 && numCr <= 10)) return false;
        if (selectedCr === '11+' && !(numCr >= 11)) return false;
      }

      return true;
    });
  }, [monsters, debouncedQuery, selectedCr, selectedType]);

  // Set default active ID
  useEffect(() => {
    if (!activeId && filteredMonsters[0]) {
      setActiveId(filteredMonsters[0].id);
    }
  }, [filteredMonsters, activeId]);

  // Fetch full record for active preview
  useEffect(() => {
    if (!activeId) {
      setActiveRecord(null);
      return;
    }
    const monsterItem = monsters.find(m => m.id === activeId);
    if (monsterItem?.fallbackRecord) {
      setActiveRecord(monsterItem.fallbackRecord);
      return;
    }

    let cancelled = false;
    setLoadingRecord(true);

    const fetcher = loadRecord
      ? loadRecord(activeId)
      : generation
        ? readRecord(generation, activeId)
        : Promise.resolve(null);

    fetcher.then(res => {
      if (!cancelled) {
        setActiveRecord(res);
        setLoadingRecord(false);
      }
    }).catch(() => {
      if (!cancelled) setLoadingRecord(false);
    });

    return () => {
      cancelled = true;
    };
  }, [activeId, generation, loadRecord, monsters]);

  const handleAdd = async (m: { id: string; name: string; fallbackRecord?: CompendiumRecord }, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const qty = Math.max(1, Math.min(20, quantities[m.id] || 1));

    // Get full record for combatant conversion
    let fullRecord = m.fallbackRecord || activeRecord;
    if (!fullRecord || fullRecord.id !== m.id) {
      if (loadRecord) {
        fullRecord = await loadRecord(m.id);
      } else if (generation) {
        fullRecord = await readRecord(generation, m.id);
      }
    }

    if (!fullRecord) return;

    const newCombatants: Combatant[] = [];
    for (let i = 1; i <= qty; i++) {
      const combatant = monsterToCombatant(fullRecord, uid());
      if (qty > 1) {
        combatant.name = `${fullRecord.name} ${i}`;
      }
      newCombatants.push(combatant);
    }

    onAdd(newCombatants);
    setAddedNotice(`Added ${qty} × ${fullRecord.name}`);
    setTimeout(() => setAddedNotice(''), 2500);
  };

  const paginatedMonsters = useMemo(() => {
    return filteredMonsters.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  }, [filteredMonsters, page]);

  const totalPages = Math.ceil(filteredMonsters.length / PAGE_SIZE) || 1;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal compendium-picker-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Add monsters from compendium"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '880px', width: '95vw', height: '82vh', display: 'flex', flexDirection: 'column', padding: '18px 22px' }}
      >
        {/* Header */}
        <div className="between" style={{ marginBottom: '14px', flexShrink: 0 }}>
          <div className="inline" style={{ gap: '8px' }}>
            <BookOpen size={18} style={{ color: 'var(--accent)' }} />
            <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 700 }}>Add Monsters from Compendium</h2>
            {addedNotice && (
              <span className="badge" style={{ background: 'var(--panel-alt)', borderColor: 'var(--accent)', color: 'var(--accent)', fontSize: '11px', animation: 'fadeIn .2s' }}>
                <Check size={12} style={{ marginRight: '4px' }} />
                {addedNotice}
              </span>
            )}
          </div>
          <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="inline wrap" style={{ gap: '10px', marginBottom: '14px', flexShrink: 0 }}>
          <div className="tool-search" style={{ flex: 1, minWidth: '180px' }}>
            <Search size={15} />
            <input
              aria-label="Search compendium monsters"
              placeholder="Search by monster name or trait…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          <select
            aria-label="Filter by CR"
            value={selectedCr}
            onChange={e => setSelectedCr(e.target.value)}
            style={{ width: 'auto', minWidth: '110px', fontSize: '11px', padding: '8px 12px' }}
          >
            <option value="All">All CRs</option>
            <option value="0-1">CR 0 – 1</option>
            <option value="2-4">CR 2 – 4</option>
            <option value="5-10">CR 5 – 10</option>
            <option value="11+">CR 11+</option>
          </select>

          <select
            aria-label="Filter by Type"
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            style={{ width: 'auto', minWidth: '120px', fontSize: '11px', padding: '8px 12px' }}
          >
            <option value="All">All Types</option>
            {monsterTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* 2-Column Split View */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(260px, 1fr)', gap: '16px', flex: 1, minHeight: 0 }}>
          {/* Monster List with Pagination */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div
              className="compendium-picker-list"
              style={{
                flex: 1,
                overflowY: 'auto',
                border: '1px solid var(--line)',
                borderRadius: '8px',
                background: 'var(--panel-alt)',
                padding: '6px'
              }}
            >
              {filteredMonsters.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)', fontSize: '12px' }}>
                  No monsters match your search or filter criteria.
                </div>
              ) : (
                paginatedMonsters.map(m => {
                  const isSelected = activeId === m.id;
                  const qty = quantities[m.id] || 1;

                  return (
                    <div
                      key={m.id}
                      className="compendium-picker-card"
                      onClick={() => setActiveId(m.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '9px 12px',
                        borderRadius: '6px',
                        marginBottom: '4px',
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: isSelected ? 'var(--accent)' : 'transparent',
                        background: isSelected ? 'var(--panel-elevated)' : 'var(--panel)',
                        transition: 'all .12s ease'
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1, marginRight: '10px' }}>
                        <strong style={{ display: 'block', fontSize: '12.5px', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.name}
                        </strong>
                        <span style={{ fontSize: '10px', color: 'var(--muted)', display: 'block', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.summary}
                        </span>
                      </div>

                      {/* Quantity & Add Action */}
                      <div className="inline" style={{ gap: '6px' }} onClick={e => e.stopPropagation()}>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          aria-label={`Quantity for ${m.name}`}
                          value={qty}
                          onChange={e => {
                            const val = parseInt(e.target.value, 10);
                            setQuantities({ ...quantities, [m.id]: isNaN(val) ? 1 : val });
                          }}
                          style={{ width: '42px', padding: '4px 6px', textAlign: 'center', fontSize: '11px', height: '28px', borderRadius: '5px' }}
                        />
                        <button
                          className="primary"
                          aria-label={`Add ${m.name} to encounter`}
                          title={`Add ${qty} × ${m.name} to encounter`}
                          onClick={e => handleAdd(m, e)}
                          style={{ height: '28px', padding: '0 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px', borderRadius: '5px' }}
                        >
                          <Plus size={13} />
                          Add
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* List Pagination controls */}
            {filteredMonsters.length > PAGE_SIZE && (
              <div className="index-pagination" style={{ marginTop: '8px', padding: '4px 0' }}>
                <button className="icon-button" aria-label="Previous page" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  <ChevronLeft size={16} />
                </button>
                <small>{page + 1} / {totalPages} ({filteredMonsters.length} monsters)</small>
                <button className="icon-button" aria-label="Next page" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Quick Preview Panel */}
          <div
            className="compendium-picker-preview"
            style={{
              overflowY: 'auto',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              background: 'var(--panel)',
              padding: '16px'
            }}
          >
            {loadingRecord ? (
              <div style={{ padding: '40px 10px', textAlign: 'center', color: 'var(--muted)', fontSize: '12px' }}>
                Loading monster details…
              </div>
            ) : activeRecord ? (
              <div>
                <div className="between" style={{ marginBottom: '8px' }}>
                  <span className="eyebrow" style={{ color: 'var(--accent)', fontSize: '9px', fontWeight: 700 }}>
                    {plain(activeRecord.fields.type).toUpperCase() || 'MONSTER'}
                  </span>
                  <span className="badge subtle" style={{ fontSize: '10px' }}>
                    CR {plain(activeRecord.fields.cr) || '—'}
                  </span>
                </div>

                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text)' }}>
                  {activeRecord.name}
                </h3>
                <small style={{ color: 'var(--muted)', fontStyle: 'italic', display: 'block', marginBottom: '12px' }}>
                  {plain(activeRecord.fields.size)} {plain(activeRecord.fields.type)}, {plain(activeRecord.fields.alignment)}
                </small>

                <div className="monster-rule" style={{ margin: '8px 0 12px' }} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px', fontSize: '12px' }}>
                  <div style={{ background: 'var(--panel-alt)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    <div style={{ color: 'var(--muted)', fontSize: '9px', fontWeight: 600 }}>ARMOR CLASS</div>
                    <strong style={{ color: 'var(--text)' }}>{plain(activeRecord.fields.ac) || '10'}</strong>
                  </div>
                  <div style={{ background: 'var(--panel-alt)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    <div style={{ color: 'var(--muted)', fontSize: '9px', fontWeight: 600 }}>HIT POINTS</div>
                    <strong style={{ color: 'var(--text)' }}>{plain(activeRecord.fields.hp) || '—'}</strong>
                  </div>
                  <div style={{ background: 'var(--panel-alt)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    <div style={{ color: 'var(--muted)', fontSize: '9px', fontWeight: 600 }}>SPEED</div>
                    <strong style={{ color: 'var(--text)' }}>{plain(activeRecord.fields.speed) || '30 ft.'}</strong>
                  </div>
                  <div style={{ background: 'var(--panel-alt)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    <div style={{ color: 'var(--muted)', fontSize: '9px', fontWeight: 600 }}>INITIATIVE MOD</div>
                    <strong style={{ color: 'var(--text)' }}>
                      {Math.floor(((Number(plain(activeRecord.fields.dex).match(/^\s*(\d+)/)?.[1]) || 10) - 10) / 2) >= 0 ? '+' : ''}
                      {Math.floor(((Number(plain(activeRecord.fields.dex).match(/^\s*(\d+)/)?.[1]) || 10) - 10) / 2)}
                    </strong>
                  </div>
                </div>

                {plain(activeRecord.fields.text) && (
                  <div>
                    <strong style={{ fontSize: '11px', color: 'var(--accent)', display: 'block', marginBottom: '4px' }}>TRAITS / ACTIONS</strong>
                    <p style={{ fontSize: '11.5px', lineHeight: '1.6', color: 'var(--text)', whiteSpace: 'pre-line', margin: 0 }}>
                      {plain(activeRecord.fields.text)}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '40px 10px', textAlign: 'center', color: 'var(--muted)', fontSize: '12px' }}>
                Select a monster to view details
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="between" style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--line)', flexShrink: 0 }}>
          <small style={{ color: 'var(--muted)' }}>
            Showing {filteredMonsters.length} monster(s) in compendium
          </small>
          <button className="secondary" onClick={onClose} style={{ padding: '6px 14px', fontSize: '11px' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function extractCrFromSummary(summary: string): number {
  const m = summary.match(/CR\s+([0-9/]+)/i);
  if (!m) return 0;
  const val = m[1];
  if (val.includes('/')) {
    const [num, den] = val.split('/').map(Number);
    return num / (den || 1);
  }
  return Number(val) || 0;
}
