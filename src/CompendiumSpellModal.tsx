import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, Plus, Sparkles, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { type CompendiumRecord, type EntryIndex, plain, readRecord, readMeta } from './compendiumData';
import { getCloudCompendiumMeta, getCloudCompendiumRecord } from './supabaseCloud';
import { readHomebrew } from './homebrewData';
import { uid, type CharacterSpell } from './models';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Badge } from './components/ui/badge';

export interface CompendiumSpellModalProps {
  campaign?: string;
  defaultClass?: string;
  generation?: string;
  indexEntries?: EntryIndex[];
  homebrewRecords?: CompendiumRecord[];
  records?: CompendiumRecord[];
  loadRecord?: (id: string) => Promise<CompendiumRecord | null>;
  onImport: (spells: CharacterSpell[]) => void;
  onClose: () => void;
}

const SPELL_CLASSES = [
  'All',
  'Artificer',
  'Bard',
  'Cleric',
  'Druid',
  'Paladin',
  'Ranger',
  'Sorcerer',
  'Warlock',
  'Wizard',
];

const SCHOOL_MAP: Record<string, string> = {
  A: 'Abjuration',
  C: 'Conjuration',
  D: 'Divination',
  EN: 'Enchantment',
  EV: 'Evocation',
  I: 'Illusion',
  N: 'Necromancy',
  T: 'Transmutation',
};

const PAGE_SIZE = 40;

export function parseSpellLevelFromSummary(summary: string): number {
  const m = summary.match(/Level\s+(\d+)/i);
  if (m) return Math.max(0, Math.min(9, Number(m[1])));
  if (/cantrip/i.test(summary)) return 0;
  return 0;
}

export function compendiumRecordToCharacterSpell(
  record: CompendiumRecord,
  fallbackSummary = ''
): CharacterSpell {
  const f = record.fields || {};
  const rawLvl = plain(f.level);
  const level = rawLvl !== '' && !Number.isNaN(Number(rawLvl))
    ? Math.max(0, Math.min(9, Number(rawLvl)))
    : parseSpellLevelFromSummary(fallbackSummary);
  const rawSchool = plain(f.school);
  const school = SCHOOL_MAP[rawSchool.toUpperCase()] || rawSchool || undefined;
  const duration = plain(f.duration);
  const ritualStr = plain(f.ritual);
  const concentration = /concentration/i.test(duration);
  const ritual = /^y(es)?$/i.test(ritualStr) || /ritual/i.test(ritualStr) || /ritual/i.test(plain(f.time));

  return {
    id: uid(),
    name: record.name,
    level,
    school,
    concentration,
    ritual,
    prepared: level > 0,
  };
}

function matchDefaultClass(rawClass?: string): string {
  if (!rawClass) return 'All';
  const lower = rawClass.toLowerCase();
  for (const c of SPELL_CLASSES) {
    if (c !== 'All' && lower.includes(c.toLowerCase())) return c;
  }
  return 'All';
}

export function CompendiumSpellModal({
  campaign,
  defaultClass,
  generation: propGeneration,
  indexEntries: propIndexEntries,
  homebrewRecords: propHomebrew,
  records,
  loadRecord,
  onImport,
  onClose,
}: CompendiumSpellModalProps) {
  const [query, setQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>(() => matchDefaultClass(defaultClass));
  const [selectedLevel, setSelectedLevel] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'level-asc' | 'name-asc'>('level-asc');
  const [page, setPage] = useState(0);
  const [activeId, setActiveId] = useState<string>('');
  const [activeRecord, setActiveRecord] = useState<CompendiumRecord | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [loadedMetaIndex, setLoadedMetaIndex] = useState<EntryIndex[]>([]);
  const [loadedGeneration, setLoadedGeneration] = useState<string>(propGeneration || '');
  const [importedNotice, setImportedNotice] = useState<string>('');

  // Auto-load Compendium meta if not passed via props
  useEffect(() => {
    if ((propIndexEntries && propIndexEntries.length > 0) || (records && records.length > 0)) return;
    let cancelled = false;
    (async () => {
      try {
        const localMeta = await readMeta();
        if (!cancelled && localMeta) {
          setLoadedMetaIndex(localMeta.index || []);
          setLoadedGeneration(localMeta.generation);
          return;
        }
        const cloudMeta = await getCloudCompendiumMeta();
        if (!cancelled && cloudMeta) {
          setLoadedMetaIndex(cloudMeta.index || []);
          setLoadedGeneration(cloudMeta.generation);
        }
      } catch {
        // ignore in offline/test environments
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [propIndexEntries, records]);

  const effectiveHomebrew = useMemo(() => {
    if (propHomebrew) return propHomebrew;
    if (campaign) {
      try {
        return readHomebrew(campaign);
      } catch {
        return [];
      }
    }
    return [];
  }, [propHomebrew, campaign]);

  const spells = useMemo(() => {
    const hbSpells = (effectiveHomebrew || [])
      .filter(r => r.kind === 'spell')
      .map(r => {
        const lvl = Number(plain(r.fields?.level) || 0);
        const classes = plain(r.fields?.classes);
        const summary = `Level ${lvl} · ${classes} [Homebrew]`;
        return {
          id: r.id,
          name: r.name,
          level: Number.isNaN(lvl) ? 0 : lvl,
          classes,
          summary,
          search: `${r.name} ${summary}`.toLowerCase(),
          fallbackRecord: r,
        };
      });

    if (records && records.length > 0) {
      const recSpells = records
        .filter(r => r.kind === 'spell')
        .map(r => {
          const lvl = Number(plain(r.fields?.level) || 0);
          const classes = plain(r.fields?.classes);
          const summary = `Level ${lvl} · ${classes}`;
          return {
            id: r.id,
            name: r.name,
            level: Number.isNaN(lvl) ? 0 : lvl,
            classes,
            summary,
            search: `${r.name} ${summary}`.toLowerCase(),
            fallbackRecord: r,
          };
        });
      return [...hbSpells, ...recSpells];
    }

    const sourceIndex = propIndexEntries && propIndexEntries.length > 0 ? propIndexEntries : loadedMetaIndex;
    const idxSpells = (sourceIndex || [])
      .filter(e => e.kind === 'spell')
      .map(e => ({
        id: e.id,
        name: e.name,
        level: parseSpellLevelFromSummary(e.summary),
        classes: e.summary,
        summary: e.summary,
        search: e.search || `${e.name} ${e.summary}`.toLowerCase(),
        fallbackRecord: undefined as CompendiumRecord | undefined,
      }));

    return [...hbSpells, ...idxSpells];
  }, [effectiveHomebrew, records, propIndexEntries, loadedMetaIndex]);

  const filteredSpells = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const list = spells.filter(s => {
      if (words.length && !words.every(w => s.search.includes(w) || s.name.toLowerCase().includes(w))) {
        return false;
      }
      if (selectedClass !== 'All') {
        if (!s.search.includes(selectedClass.toLowerCase())) return false;
      }
      if (selectedLevel !== 'All') {
        if (s.level !== Number(selectedLevel)) return false;
      }
      return true;
    });

    return list.slice().sort((a, b) => {
      if (sortBy === 'level-asc') {
        if (a.level !== b.level) return a.level - b.level;
      }
      return a.name.localeCompare(b.name);
    });
  }, [spells, query, selectedClass, selectedLevel, sortBy]);

  useEffect(() => {
    setPage(0);
  }, [query, selectedClass, selectedLevel, sortBy]);

  useEffect(() => {
    if (filteredSpells.length > 0 && !filteredSpells.some(s => s.id === activeId)) {
      setActiveId(filteredSpells[0].id);
    } else if (filteredSpells.length === 0) {
      setActiveId('');
      setActiveRecord(null);
    }
  }, [filteredSpells, activeId]);

  useEffect(() => {
    if (!activeId) {
      setActiveRecord(null);
      return;
    }
    const entry = spells.find(s => s.id === activeId);
    if (entry?.fallbackRecord) {
      setActiveRecord(entry.fallbackRecord);
      return;
    }
    let cancelled = false;
    setLoadingRecord(true);
    const fetchRec = async () => {
      try {
        if (loadRecord) {
          const rec = await loadRecord(activeId);
          if (!cancelled) {
            setActiveRecord(rec);
            setLoadingRecord(false);
          }
          return;
        }
        const gen = propGeneration || loadedGeneration;
        if (gen) {
          const local = await readRecord(gen, activeId);
          if (!cancelled && local) {
            setActiveRecord(local);
            setLoadingRecord(false);
            return;
          }
        }
        const cloud = await getCloudCompendiumRecord(activeId);
        if (!cancelled) {
          setActiveRecord(cloud);
          setLoadingRecord(false);
        }
      } catch {
        if (!cancelled) setLoadingRecord(false);
      }
    };
    fetchRec();
    return () => {
      cancelled = true;
    };
  }, [activeId, spells, loadRecord, propGeneration, loadedGeneration]);

  const totalPages = Math.max(1, Math.ceil(filteredSpells.length / PAGE_SIZE));
  const pagedSpells = filteredSpells.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleImportOne = (entry: (typeof spells)[number]) => {
    const rec =
      (activeRecord && activeRecord.id === entry.id ? activeRecord : entry.fallbackRecord) ||
      ({
        id: entry.id,
        kind: 'spell',
        name: entry.name,
        edition: '2024',
        fields: { level: String(entry.level) },
      } as CompendiumRecord);
    const spell = compendiumRecordToCharacterSpell(rec, entry.summary);
    onImport([spell]);
    setImportedNotice(`Imported ${spell.name}`);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Import Spells from Compendium">
      <div className="modal-card comp-spell-modal">
        <div className="modal-header">
          <div className="inline" style={{ gap: '8px' }}>
            <Sparkles size={16} />
            <strong>Compendium Spells</strong>
            <Badge variant="secondary">{filteredSpells.length} spells</Badge>
          </div>
          <Button type="button" variant="ghost" size="sm" aria-label="Close spell compendium" onClick={onClose}>
            <X size={15} />
          </Button>
        </div>

        <div className="comp-spell-filters">
          <div className="comp-spell-search">
            <Search size={14} />
            <Input
              aria-label="Search compendium spells"
              placeholder="Search spells by name, school, or class..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>

          <select
            aria-label="Filter spells by class"
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
          >
            {SPELL_CLASSES.map(c => (
              <option key={c} value={c}>
                {c === 'All' ? 'All Classes' : c}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter spells by level"
            value={selectedLevel}
            onChange={e => setSelectedLevel(e.target.value)}
          >
            <option value="All">All Levels</option>
            <option value="0">Cantrip (0)</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(lvl => (
              <option key={lvl} value={String(lvl)}>
                Level {lvl}
              </option>
            ))}
          </select>

          <select
            aria-label="Sort compendium spells"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'level-asc' | 'name-asc')}
          >
            <option value="level-asc">Sort: Spell Level</option>
            <option value="name-asc">Sort: Name (A-Z)</option>
          </select>
        </div>

        {importedNotice && (
          <div className="comp-spell-notice">
            <Check size={13} /> {importedNotice}
          </div>
        )}

        <div className="comp-spell-body">
          <div className="comp-spell-list">
            {pagedSpells.length === 0 ? (
              <div className="char-empty-hint" style={{ padding: '16px' }}>
                No spells match the current filters.
              </div>
            ) : (
              pagedSpells.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className={`comp-spell-row ${activeId === s.id ? 'selected' : ''}`}
                  onClick={() => setActiveId(s.id)}
                >
                  <div className="comp-spell-row-main">
                    <strong>{s.name}</strong>
                    <span className="comp-spell-row-sub">
                      {s.level === 0 ? 'Cantrip' : `Lvl ${s.level}`} · {s.summary.replace(/^Level\s+\d+\s*·\s*/i, '')}
                    </span>
                  </div>
                  <Badge variant="outline">{s.level === 0 ? 'C' : `L${s.level}`}</Badge>
                </button>
              ))
            )}

            {totalPages > 1 && (
              <div className="comp-spell-pagination">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                >
                  <ChevronLeft size={13} />
                </Button>
                <span>
                  Page {page + 1} / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                >
                  <ChevronRight size={13} />
                </Button>
              </div>
            )}
          </div>

          <div className="comp-spell-preview">
            {loadingRecord ? (
              <p className="char-empty-hint">Loading spell details...</p>
            ) : activeRecord ? (
              <div className="comp-spell-detail">
                <div className="comp-spell-detail-head">
                  <div>
                    <h4>{activeRecord.name}</h4>
                    <span className="char-item-meta">
                      {Number(plain(activeRecord.fields?.level) || 0) === 0
                        ? 'Cantrip'
                        : `Level ${plain(activeRecord.fields?.level)}`}
                      {plain(activeRecord.fields?.school)
                        ? ` · ${SCHOOL_MAP[plain(activeRecord.fields?.school).toUpperCase()] || plain(activeRecord.fields?.school)}`
                        : ''}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="comp-spell-import-btn"
                    onClick={() => {
                      const entry = spells.find(s => s.id === activeRecord.id) || {
                        id: activeRecord.id,
                        name: activeRecord.name,
                        level: Number(plain(activeRecord.fields?.level) || 0),
                        classes: plain(activeRecord.fields?.classes),
                        summary: '',
                        search: '',
                        fallbackRecord: activeRecord,
                      };
                      handleImportOne(entry);
                    }}
                  >
                    <Plus size={13} /> Import Spell
                  </Button>
                </div>

                <div className="comp-spell-facts">
                  {plain(activeRecord.fields?.time) && (
                    <div>
                      <small>CASTING TIME</small>
                      <span>{plain(activeRecord.fields?.time)}</span>
                    </div>
                  )}
                  {plain(activeRecord.fields?.range) && (
                    <div>
                      <small>RANGE</small>
                      <span>{plain(activeRecord.fields?.range)}</span>
                    </div>
                  )}
                  {plain(activeRecord.fields?.components) && (
                    <div>
                      <small>COMPONENTS</small>
                      <span>{plain(activeRecord.fields?.components)}</span>
                    </div>
                  )}
                  {plain(activeRecord.fields?.duration) && (
                    <div>
                      <small>DURATION</small>
                      <span>{plain(activeRecord.fields?.duration)}</span>
                    </div>
                  )}
                </div>

                {plain(activeRecord.fields?.classes) && (
                  <div className="comp-spell-classes">
                    <small>CLASSES:</small> <span>{plain(activeRecord.fields?.classes)}</span>
                  </div>
                )}

                {plain(activeRecord.fields?.text) && (
                  <p className="comp-spell-text">{plain(activeRecord.fields?.text)}</p>
                )}
              </div>
            ) : activeId ? (
              <div className="comp-spell-detail">
                {(() => {
                  const entry = spells.find(s => s.id === activeId);
                  if (!entry) return null;
                  return (
                    <div className="comp-spell-detail-head">
                      <div>
                        <h4>{entry.name}</h4>
                        <span className="char-item-meta">{entry.summary}</span>
                      </div>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="comp-spell-import-btn"
                        onClick={() => handleImportOne(entry)}
                      >
                        <Plus size={13} /> Import Spell
                      </Button>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <p className="char-empty-hint">Select a spell to preview and import.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
