import type { CompendiumRecord, FieldValue } from './compendiumData';
import { plain } from './compendiumData';
import { type WikiPage, uid } from './models';
import { writeSavedValue } from './storage';

export function readHomebrew(campaign: string): CompendiumRecord[] {
  if (!campaign) return [];
  try {
    const raw = localStorage.getItem(`wf-homebrew:${campaign}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function abilityMod(score: FieldValue | undefined): string {
  const n = Number(score);
  if (!Number.isFinite(n)) return '+0';
  const mod = Math.floor((n - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function recordToWikiMarkdown(record: CompendiumRecord): string {
  const f = record.fields;
  const lines: string[] = [];

  if (record.kind === 'monster') {
    const size = plain(f.size) || 'Medium';
    const type = plain(f.type) || 'creature';
    const align = plain(f.alignment) || 'unaligned';
    lines.push(`*${size} ${type}, ${align}*`, '');
    lines.push('---', '');
    lines.push(`**Armor Class** ${plain(f.ac) || '10'}`);
    lines.push(`**Hit Points** ${plain(f.hp) || '10'}`);
    lines.push(`**Speed** ${plain(f.speed) || '30 ft.'}`);
    lines.push('', '---', '');
    lines.push('| STR | DEX | CON | INT | WIS | CHA |');
    lines.push('| :---: | :---: | :---: | :---: | :---: | :---: |');
    lines.push(`| ${plain(f.str) || 10} (${abilityMod(f.str)}) | ${plain(f.dex) || 10} (${abilityMod(f.dex)}) | ${plain(f.con) || 10} (${abilityMod(f.con)}) | ${plain(f.int) || 10} (${abilityMod(f.int)}) | ${plain(f.wis) || 10} (${abilityMod(f.wis)}) | ${plain(f.cha) || 10} (${abilityMod(f.cha)}) |`);
    lines.push('', '---', '');

    if (plain(f.save)) lines.push(`**Saving Throws** ${plain(f.save)}`);
    if (plain(f.skill)) lines.push(`**Skills** ${plain(f.skill)}`);
    if (plain(f.resist)) lines.push(`**Damage Resistances** ${plain(f.resist)}`);
    if (plain(f.immune)) lines.push(`**Damage Immunities** ${plain(f.immune)}`);
    if (plain(f.conditionImmune)) lines.push(`**Condition Immunities** ${plain(f.conditionImmune)}`);
    if (plain(f.senses)) lines.push(`**Senses** ${plain(f.senses)}`);
    if (plain(f.languages)) lines.push(`**Languages** ${plain(f.languages)}`);
    if (plain(f.cr)) lines.push(`**Challenge** ${plain(f.cr)}`);
    lines.push('');

    const appendEntries = (title: string, value: FieldValue | undefined) => {
      if (!value) return;
      const arr = Array.isArray(value) ? value : [value];
      if (!arr.length) return;
      lines.push(`### ${title}`, '');
      for (const item of arr) {
        if (typeof item === 'object' && item !== null) {
          const obj = item as Record<string, FieldValue>;
          const name = plain(obj.name);
          const text = plain(obj.text || obj['#text']);
          if (name) lines.push(`**${name}.** ${text}`);
          else if (text) lines.push(text);
        } else {
          lines.push(plain(item));
        }
        lines.push('');
      }
    };

    appendEntries('Traits', f.trait);
    appendEntries('Actions', f.action);
    appendEntries('Reactions', f.reaction);
    appendEntries('Legendary Actions', f.legendary);

    if (plain(f.description)) {
      lines.push('### Description', '', plain(f.description), '');
    }
  } else if (record.kind === 'spell') {
    lines.push(`*${plain(f.level) === '0' ? 'Cantrip' : `Level ${plain(f.level)}`} ${plain(f.school)}*`, '');
    lines.push(`- **Casting Time:** ${plain(f.time) || '1 action'}`);
    lines.push(`- **Range:** ${plain(f.range) || 'Touch'}`);
    lines.push(`- **Components:** ${plain(f.components) || 'V, S'}`);
    lines.push(`- **Duration:** ${plain(f.duration) || 'Instantaneous'}`);
    if (plain(f.classes)) lines.push(`- **Classes:** ${plain(f.classes)}`);
    lines.push('', '---', '', plain(f.text || f.description), '');
  } else if (record.kind === 'item') {
    lines.push(`*${[plain(f.type), plain(f.detail)].filter(Boolean).join(', ') || 'Item'}*`, '');
    if (plain(f.weight)) lines.push(`- **Weight:** ${plain(f.weight)} lb.`);
    if (plain(f.value)) lines.push(`- **Value:** ${plain(f.value)} gp`);
    if (plain(f.dmg1)) lines.push(`- **Damage:** ${plain(f.dmg1)} ${plain(f.dmgType)}`);
    if (plain(f.ac)) lines.push(`- **AC:** ${plain(f.ac)}`);
    if (plain(f.property)) lines.push(`- **Properties:** ${plain(f.property)}`);
    lines.push('', '---', '', plain(f.text || f.description), '');
  } else {
    lines.push(`*${record.kind.toUpperCase()} · Homebrew*`, '', plain(f.text || f.description), '');
  }

  return lines.join('\n');
}

export function saveHomebrew(campaign: string, record: CompendiumRecord): { homebrew: CompendiumRecord[]; wikiPage: WikiPage } {
  if (!campaign) throw new Error('Campaign is required');

  // 1. Save or update Homebrew record
  const current = readHomebrew(campaign);
  const existsIndex = current.findIndex(r => r.id === record.id || r.name.toLowerCase() === record.name.toLowerCase());
  let updatedHomebrew: CompendiumRecord[];
  if (existsIndex >= 0) {
    updatedHomebrew = [...current];
    updatedHomebrew[existsIndex] = record;
  } else {
    updatedHomebrew = [...current, record];
  }
  const hbKey = `wf-homebrew:${campaign}`;
  writeSavedValue(hbKey, updatedHomebrew);

  // 2. Sync to Campaign Wiki
  const wikiKey = `wf-wiki:${campaign}`;
  let wikiPages: WikiPage[] = [];
  try {
    const raw = localStorage.getItem(wikiKey);
    wikiPages = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(wikiPages)) wikiPages = [];
  } catch {
    wikiPages = [];
  }

  const wikiTitle = record.name;
  const existingWikiIndex = wikiPages.findIndex(p => p.title.toLowerCase() === wikiTitle.toLowerCase());
  const now = new Date().toISOString();
  const wikiBody = recordToWikiMarkdown(record);

  let updatedPage: WikiPage;
  if (existingWikiIndex >= 0) {
    updatedPage = {
      ...wikiPages[existingWikiIndex],
      title: wikiTitle,
      category: 'Homebrew',
      body: wikiBody,
      tags: `homebrew, ${record.kind}`,
      updated: now
    };
    wikiPages[existingWikiIndex] = updatedPage;
  } else {
    updatedPage = {
      id: uid(),
      title: wikiTitle,
      category: 'Homebrew',
      body: wikiBody,
      tags: `homebrew, ${record.kind}`,
      updated: now,
      images: []
    };
    wikiPages.push(updatedPage);
  }

  writeSavedValue(wikiKey, wikiPages);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('archeron-homebrew-changed', { detail: { campaign, record } }));
    window.dispatchEvent(new CustomEvent('planarch-homebrew-changed', { detail: { campaign, record } }));
  }

  return { homebrew: updatedHomebrew, wikiPage: updatedPage };
}

export function deleteHomebrew(campaign: string, recordId: string): CompendiumRecord[] {
  if (!campaign) return [];
  const current = readHomebrew(campaign);
  const target = current.find(r => r.id === recordId);
  const next = current.filter(r => r.id !== recordId);
  writeSavedValue(`wf-homebrew:${campaign}`, next);

  if (target) {
    const wikiKey = `wf-wiki:${campaign}`;
    try {
      const raw = localStorage.getItem(wikiKey);
      if (raw) {
        const pages: WikiPage[] = JSON.parse(raw);
        if (Array.isArray(pages)) {
          const remaining = pages.filter(p => p.title.toLowerCase() !== target.name.toLowerCase());
          writeSavedValue(wikiKey, remaining);
        }
      }
    } catch {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('archeron-homebrew-changed', { detail: { campaign } }));
    window.dispatchEvent(new CustomEvent('planarch-homebrew-changed', { detail: { campaign } }));
  }

  return next;
}
