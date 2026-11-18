#!/usr/bin/env node
// scripts/build-name-prior.mjs <GUM conllu> [--exclude-doc-list file] [--out file] — native/adapters/text/name-prior/eng.json (NamePersonPrior@1).
// MEASURED: for every gold mention of UD English GUM TRAIN, its key words (its PROPN words; if none, its last word), lower-cased, counted [person, not person] by the mention's gold entity type. (CC BY-SA 4.0)
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)); const args = process.argv.slice(2); const file = args[0]; if (!file) { console.error("usage: node scripts/build-name-prior.mjs en_gum-ud-train.conllu [--exclude ids.txt] [--out file]"); process.exit(2); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const exclude = new Set(opt("--exclude") ? fs.readFileSync(opt("--exclude"), "utf8").split(/\s+/).filter(Boolean) : []);
const out = opt("--out") ?? path.join(HERE, "..", "native", "adapters", "text", "name-prior", "eng.json");
const text = fs.readFileSync(file, "utf8"); const sha = crypto.createHash("sha256").update(text).digest("hex");
const counts = new Map(); let docs = 0, mentions = 0, doc = null, sent = [], skip = false;
const bump = (w, person) => { const c = counts.get(w) ?? [0, 0]; c[person ? 0 : 1]++; counts.set(w, c); };
const flush = () => { if (!sent.length || skip) { sent = []; return; } const open = [];
  sent.forEach((t, i) => { const re = /\((\d+)-([^()]*?)(\))?(?=\(|$|\d)|(\d+)\)/g; let m; while ((m = re.exec(t.ent))) { if (m[1] !== undefined) { const typ = m[2].split("-")[0]; if (m[3]) emit(i, i, typ); else open.push({ s: i, typ }); } else if (open.length) { const o = open.pop(); emit(o.s, i, o.typ); } } });
  sent = []; };
const emit = (a, b, typ) => { const toks = sent.slice(a, b + 1); const key = toks.filter((t) => t.upos === "PROPN"); const ks = key.length ? key : [toks[toks.length - 1]]; mentions++; for (const t of ks) bump(t.form.toLowerCase(), typ === "person"); };
for (const line of text.split("\n")) {
  if (line.startsWith("# newdoc id")) { flush(); doc = line.split("=")[1].trim(); skip = exclude.has(doc); docs++; continue; }
  if (line.startsWith("#")) continue; if (!line.trim()) { flush(); continue; }
  const f = line.split("\t"); if (/[-.]/.test(f[0])) continue; const e = /Entity=([^|]*)/.exec(f[9] ?? ""); sent.push({ form: f[1], upos: f[3], ent: e ? e[1] : "" });
}
flush();
const obj = Object.fromEntries([...counts].sort((a, b) => a[0].localeCompare(b[0])));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ schema: "NamePersonPrior@1", language: "eng", provenance: { source: "UD_English-GUM train (gold entity types)", license: "CC BY-SA 4.0", sha256: sha, documents: docs, excludedDocuments: exclude.size, mentions, builtBy: "scripts/build-name-prior.mjs" }, words: obj }) + "\n");
console.log(`docs ${docs} (excluded ${exclude.size}), mentions ${mentions}, words ${counts.size} -> ${out}`);
