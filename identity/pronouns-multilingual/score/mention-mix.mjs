// mention-mix.mjs <corefud.conllu> — what kinds of mentions the fixed giver (the official CorefUD scorer) counts: chains of 2+ mentions (singletons are ignored by the primary metric), by the head's class.
// THE REFERENT RULE: every run of the giver shows this beside the score, so a headline number can never again hide that most counted mentions are kinds the read does not make referents.
import fs from "node:fs"; import path from "node:path"; import { pathToFileURL, fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)); const { parseCorefUD } = await import(pathToFileURL(path.join(HERE, "../fra/lib-corefud.mjs")).href);
const docs = parseCorefUD(process.argv[2]); const ents = new Map(); for (const d of docs) for (const s of d.sents) for (const m of s.mentions) (ents.get(d.id + m.ent) ?? ents.set(d.id + m.ent, []).get(d.id + m.ent)).push(m);
const cnt = { named: 0, third_person_pronoun: 0, speaker_addressee: 0, nominal: 0, other: 0 }; let n = 0;
for (const ms of ents.values()) { if (ms.length < 2) continue; for (const m of ms) { n++; const u = m.goldHead.upos, f = m.goldHead.feats ?? ""; if (u === "PROPN") cnt.named++; else if (u === "PRON") (/Person=3/.test(f) ? cnt.third_person_pronoun++ : cnt.speaker_addressee++); else if (u === "NOUN") cnt.nominal++; else cnt.other++; } }
console.log(`mentions in chains of 2+ (what the scorer counts): ${n}`); for (const [k, v] of Object.entries(cnt)) console.log(k.padEnd(22), String(v).padStart(5), (100 * v / Math.max(1, n)).toFixed(1) + "%");
