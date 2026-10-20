import fs from 'node:fs';
import assert from 'node:assert/strict';
const file=process.argv[2];if(!file)throw Error('Pass the original XML path.');
const {parseCompendium}=await import('../.sites-runtime/test-modules/compendiumParser.js');
const records=parseCompendium(fs.readFileSync(file,'utf8'));
const manifest=JSON.parse(fs.readFileSync('public/compendium/manifest.json','utf8'));
assert.equal(records.length,26393);assert.equal(records.length,manifest.count);
const map=new Map(records.map(r=>[r.id,r]));assert.equal(map.size,records.length);
const counts={};for(const r of records)counts[r.kind]=(counts[r.kind]||0)+1;
assert.deepEqual(counts,manifest.counts);
let checked=0;for(const file of manifest.chunks){for(const r of JSON.parse(fs.readFileSync('public/compendium/'+file,'utf8'))){assert.equal(map.get(r.id)?.name,r.name);assert.equal(map.get(r.id)?.edition,r.edition);for(const key of Object.keys(r.fields))assert.ok(key in map.get(r.id).fields);checked++}}
assert.equal(checked,26393);console.log('PASS complete supplied XML: 26,393 records, all categories, stable IDs, edition labels and top-level fields match the bundled library');
