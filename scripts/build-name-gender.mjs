#!/usr/bin/env node
// scripts/build-name-gender.mjs <GUM conllu> [--exclude ids.txt] [--out file] — native/adapters/text/name-gender/eng.json (NameGender@1).
// MEASURED: for every gold entity with a proper-noun mention, the gender its third-person singular personal pronouns carry (Masc / Fem; the majority; none or a tie: skipped); each proper-noun word of its mentions counts [masc, fem] once per mention. (CC BY-SA 4.0)
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)); const args = process.argv.slice(2); const file = args[0]; const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
if (!file) { console.error("usage: node scripts/build-name-gender.mjs en_gum-ud-train.conllu [--exclude ids.txt] [--out file]"); process.exit(2); }
const exclude = new Set(opt("--exclude") ? fs.readFileSync(opt("--exclude"), "utf8").split(/\s+/).filter(Boolean) : []); const out = opt("--out") ?? path.join(HERE, "..", "native", "adapters", "text", "name-gender", "eng.json");
const text = fs.readFileSync(file, "utf8"); const sha = crypto.createHash("sha256").update(text).digest("hex");
const words = new Map(); let docs = 0, ents = 0, used = 0, cur = null, skip = false, sentToks = []; let docMentions = [];
const finishDoc = () => { if (!docMentions.length || skip) { docMentions = []; return; } const byEnt = new Map(); for (const m of docMentions) { const e = byEnt.get(m.ent) ?? byEnt.set(m.ent, { pron: { Masc: 0, Fem: 0 }, names: [] }).get(m.ent); if (m.pron) { if (m.pron === "Masc") e.pron.Masc++; else if (m.pron === "Fem") e.pron.Fem++; } else if (m.names.length) e.names.push(...m.names); }
  for (const e of byEnt.values()) { if (!e.names.length) continue; ents++; if (e.pron.Masc === e.pron.Fem) continue; const g = e.pron.Masc > e.pron.Fem ? 0 : 1; used++; for (const w of e.names) { const c = words.get(w) ?? [0, 0]; c[g]++; words.set(w, c); } } docMentions = []; };
const flush = () => { if (!sentToks.length) return; if (skip) { sentToks = []; return; } const open = []; const re = /\((\d+)-([^()]*)(\))?|(\d+)\)/g;
  sentToks.forEach((t, i) => { let m; re.lastIndex = 0; while ((m = re.exec(t.ent))) { if (m[1] !== undefined) { if (m[3]) emit(i, i, m[1]); else open.push({ a: i, id: m[1] }); } else { for (let k = open.length - 1; k >= 0; k--) if (open[k].id === m[4]) { emit(open[k].a, i, open[k].id); open.splice(k, 1); break; } } } });
  sentToks = []; };
const emit = (a, b, id) => { const span = sentToks.slice(a, b + 1); const ids = new Set(span.map((t) => t.id)); const head = span.find((t) => !ids.has(t.head)) ?? span.at(-1); const names = span.filter((t) => t.upos === "PROPN").map((t) => t.form.toLowerCase());
  const pron = head.upos === "PRON" && /Person=3/.test(head.feats) && /Number=Sing/.test(head.feats) && /PronType=Prs/.test(head.feats) ? (/Gender=Masc/.test(head.feats) ? "Masc" : /Gender=Fem/.test(head.feats) ? "Fem" : null) : null; docMentions.push({ ent: id, names, pron }); };
for (const line of text.split("\n")) {
  if (line.startsWith("# newdoc id")) { flush(); finishDoc(); cur = line.split("=")[1].trim(); skip = exclude.has(cur); docs++; continue; }
  if (line.startsWith("#")) continue; if (!line.trim()) { flush(); continue; }
  const f = line.split("\t"); if (!/^\d+$/.test(f[0])) continue; const e = /Entity=([^|]*)/.exec(f[9] ?? ""); sentToks.push({ id: +f[0], form: f[1], upos: f[3], feats: f[5], head: +f[6], ent: e ? e[1] : "" });
}
flush(); finishDoc();
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ schema: "NameGender@1", language: "eng", provenance: { source: "UD_English-GUM train (gold entities; the gender of the entity's third-person singular personal pronouns)", license: "CC BY-SA 4.0", sha256: sha, documents: docs, excludedDocuments: exclude.size, entitiesWithNames: ents, entitiesWithPronounGender: used, builtBy: "scripts/build-name-gender.mjs" }, words: Object.fromEntries([...words].sort((a, b) => a[0].localeCompare(b[0]))) }) + "\n");
console.log(`docs ${docs} (excluded ${exclude.size}), named entities ${ents}, with a pronoun gender ${used}, words ${words.size} -> ${out}`);
