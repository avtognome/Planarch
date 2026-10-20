import {XMLParser,XMLValidator} from 'fast-xml-parser';
import {kinds,type CompendiumRecord,type FieldValue} from './compendiumData';
export function parseCompendium(xml:string):CompendiumRecord[]{
 if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Compendium XML must not contain document types or entity declarations.');
 const valid=XMLValidator.validate(xml);if(valid!==true)throw Error(`Invalid XML: ${valid.err.msg}`);
 const parsed=new XMLParser({ignoreAttributes:false,parseTagValue:false,parseAttributeValue:false,trimValues:false,textNodeName:'#text'}).parse(xml);
 if(!parsed.compendium||typeof parsed.compendium!=='object')throw Error('Expected a <compendium> root element.');
 const records:CompendiumRecord[]=[];
 for(const kind of kinds){const raw=parsed.compendium[kind];if(!raw)continue;let kindIndex=0;for(const fields of Array.isArray(raw)?raw:[raw]){if(!fields||typeof fields.name!=='string'||!fields.name.trim())continue;const name=fields.name;records.push({id:`${kind}:${kindIndex++}`,kind,name,edition:name.includes('[5.5e]')?'5.5e':name.includes('(Legacy)')?'Legacy':'Unspecified',fields:fields as Record<string,FieldValue>})}}
 if(!records.length)throw Error('No supported compendium entries were found.');return records;
}
