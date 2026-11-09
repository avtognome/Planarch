globalThis.document = globalThis.document || { documentElement: { scrollLeft: 0, scrollTop: 0 }, body: { scrollLeft: 0, scrollTop: 0 } };
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import ts from 'typescript';

const out = path.resolve('.sites-runtime/cloud-tests');
fs.mkdirSync(out, { recursive: true });
for (const filename of ['cloudBlob.ts']) {
  let code = ts.transpileModule(fs.readFileSync('src/' + filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
  }).outputText;
  fs.writeFileSync(path.join(out, filename.replace('.ts', '.js')), code);
}

const { packCloudBlob, unpackCloudBlob, PART_BYTES } = await import(pathToFileURL(path.join(out, 'cloudBlob.js')).href);

// Generate synthetic compendium records
const kinds = ['monster', 'spell', 'item', 'class', 'race', 'feat', 'background'];
const records = Array.from({ length: 1400 }, (_, i) => ({
  id: `${kinds[i % kinds.length]}:${i}`,
  kind: kinds[i % kinds.length],
  name: `Synthetic Entry ${i} ${i % 2 === 0 ? '(Legacy)' : '[5.5e]'}`,
  edition: i % 2 === 0 ? 'Legacy' : '5.5e',
  fields: {
    description: `Detailed lore description text for entry ${i}. `.repeat(20),
    level: String(i % 10),
    type: 'synthetic'
  }
}));

const source = { name: 'synthetic-sourcebook.json', count: records.length, records };
const original = new Blob([JSON.stringify(source)], { type: 'application/json' });
const packed = await packCloudBlob(original), parts = [];
for (let i = 0; i < packed.blob.size; i += PART_BYTES) parts.push(packed.blob.slice(i, i + PART_BYTES));
assert.ok(parts.every(p => p.size <= PART_BYTES));

const manifest = {
  format: 'archeron-blob-v1',
  encoding: packed.encoding,
  type: original.type,
  size: original.size,
  packedSize: packed.blob.size,
  parts: parts.map((_, i) => 'part-' + i)
};

const result = JSON.parse(await (await unpackCloudBlob(manifest, parts)).text());
assert.equal(result.records.length, records.length);
assert.equal(result.name, source.name);
assert.deepEqual(result.records[0], records[0]);
assert.deepEqual(result.records.at(-1), records.at(-1));

console.log(JSON.stringify({
  result: 'PASS synthetic compendium cloud-file round-trip',
  records: result.records.length,
  originalBytes: original.size,
  uploadedBytes: packed.blob.size,
  parts: parts.length,
  maxPartBytes: Math.max(...parts.map(p => p.size))
}));
