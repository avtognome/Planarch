import assert from 'node:assert/strict';

export function parseWikiGraph(pages) {
  const titleToId = new Map(pages.map(p => [p.title.toLowerCase().trim(), p.id]));
  const nodes = pages.map(p => ({
    id: p.id,
    title: p.title,
    category: p.category,
    tags: (p.tags || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
    degree: 0
  }));

  const edges = [];
  const edgeKeys = new Set();

  for (const page of pages) {
    // 1. Link matching [[Page Title]]
    const matches = page.body.matchAll(/\[\[([^\]]+)\]\]/g);
    for (const match of matches) {
      const targetTitle = match[1].trim().toLowerCase();
      if (targetTitle.startsWith('image:')) continue;
      const targetId = titleToId.get(targetTitle);
      if (targetId && targetId !== page.id) {
        const edgeKey = [page.id, targetId].sort().join('--');
        if (!edgeKeys.has(edgeKey)) {
          edgeKeys.add(edgeKey);
          edges.push({ source: page.id, target: targetId, type: 'wiki' });
        }
      }
    }
  }

  // 2. Shared tags
  for (let i = 0; i < pages.length; i++) {
    const pageA = nodes[i];
    for (let j = i + 1; j < pages.length; j++) {
      const pageB = nodes[j];
      const hasSharedTag = pageA.tags.some(t => pageB.tags.includes(t));
      if (hasSharedTag) {
        const edgeKey = [pageA.id, pageB.id].sort().join('--');
        if (!edgeKeys.has(edgeKey)) {
          edgeKeys.add(edgeKey);
          edges.push({ source: pageA.id, target: pageB.id, type: 'tag' });
        }
      }
    }
  }

  // Calculate degrees
  for (const edge of edges) {
    const nodeA = nodes.find(n => n.id === edge.source);
    const nodeB = nodes.find(n => n.id === edge.target);
    if (nodeA) nodeA.degree++;
    if (nodeB) nodeB.degree++;
  }

  return { nodes, edges };
}

// Test cases
const pages = [
  { id: '1', title: 'The Drowned Shore', category: 'Location', body: 'Near [[Tavern of Lost Souls]] and deep ocean.', tags: 'coast, ocean' },
  { id: '2', title: 'Tavern of Lost Souls', category: 'Location', body: 'A refuge for sailors.', tags: 'tavern, coast' },
  { id: '3', title: 'Captain Jack', category: 'Lore', body: 'Often visits [[The Drowned Shore]].', tags: 'sailor' },
  { id: '4', title: 'Hidden Ruin', category: 'Location', body: 'Nobody knows this place.', tags: 'ancient' }
];

const graph = parseWikiGraph(pages);

assert.equal(graph.nodes.length, 4);
// [[Tavern of Lost Souls]] creates edge 1--2
// [[The Drowned Shore]] in 3 creates edge 3--1
// Shared tag 'coast' creates edge 1--2 (already created, deduplicated)
assert.ok(graph.edges.some(e => (e.source === '1' && e.target === '2') || (e.source === '2' && e.target === '1')));
assert.ok(graph.edges.some(e => (e.source === '3' && e.target === '1') || (e.source === '1' && e.target === '3')));

const node1 = graph.nodes.find(n => n.id === '1');
assert.equal(node1.degree, 2);

const node4 = graph.nodes.find(n => n.id === '4');
assert.equal(node4.degree, 0);

console.log('PASS: Wiki graph correctly extracts nodes, title links, shared tags, and calculates degree');
