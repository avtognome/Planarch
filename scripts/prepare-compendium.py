"""Normalize a supplied compendium XML into bounded lazy-import chunks."""
from pathlib import Path
from collections import Counter
import sys,json,xml.etree.ElementTree as ET
source=Path(sys.argv[1]);out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
allowed={'monster','spell','item','class','race','feat','background'}
def value(e):
 if not len(e) and not e.attrib:return e.text or ''
 d={'@_'+k:v for k,v in e.attrib.items()}
 if e.text and e.text.strip():d['#text']=e.text
 for c in e:
  v=value(c)
  if c.tag in d:
   if not isinstance(d[c.tag],list):d[c.tag]=[d[c.tag]]
   d[c.tag].append(v)
  else:d[c.tag]=v
 return d
chunks=[];batch=[];counts=Counter();index=0
for _,e in ET.iterparse(source,events=['end']):
 if e.tag not in allowed:continue
 # Direct record elements have a name; nested rules might share a tag.
 if e.find('name') is None:continue
 fields=value(e);name=e.findtext('name') or 'Unnamed entry'
 record={'id':f'{e.tag}:{counts[e.tag]}','kind':e.tag,'name':name,'edition':'5.5e' if '[5.5e]' in name else 'Legacy' if '(Legacy)' in name else 'Unspecified','fields':fields}
 batch.append(record);counts[e.tag]+=1;index+=1;e.clear()
 if len(batch)==250:
  filename=f'chunk-{len(chunks):03d}.json';(out/filename).write_text(json.dumps(batch,ensure_ascii=False,separators=(',',':')));chunks.append(filename);batch=[]
if batch:
 filename=f'chunk-{len(chunks):03d}.json';(out/filename).write_text(json.dumps(batch,ensure_ascii=False,separators=(',',':')));chunks.append(filename)
manifest={'version':1,'name':source.name,'count':index,'counts':dict(counts),'chunks':chunks}
(out/'manifest.json').write_text(json.dumps(manifest,separators=(',',':')))
print(json.dumps({'records':index,'counts':dict(counts),'chunks':len(chunks),'bytes':sum(p.stat().st_size for p in out.glob('*.json'))}))
