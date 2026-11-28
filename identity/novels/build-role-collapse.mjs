// build-role-collapse.mjs <en_gum-ud-train.conllu> — PREREG-ROUND32-SUPERPOSITION.md. The counts the role-collapse rung reads: every GUM train
// document read twice (plain, and SHIFTED: every gold NOUN token's first letter upper-cased, gold offsets unchanged) through the canonical door in
// `roleCollapse: "features"` mode (features reported, nothing collapsed). Each cast row NOT bound by a pronoun (the population the posterior
// decides) is labelled by gold: name if a mention span overlaps a gold mention headed PROPN; other if it overlaps one headed NOUN and none
// headed PROPN; else unused. Writes native/priors-shipped/role-collapse-eng.json. Train only; neither held-out split is read.
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { pathToFileURL, fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)); const KH = path.resolve(HERE, "..", ".."); const imp = (p) => import(pathToFileURL(path.join(KH, p)).href);
const { parseGum } = await imp("eval/referents/pronoun-golden.mjs"); const { readToWeft } = await imp("native/the-fold/read-process.mjs"); const { FEATURES } = await imp("native/adapters/text/role-collapse.js");
const file = process.argv[2]; if (!file) { console.error("usage: build-role-collapse.mjs <en_gum-ud-train.conllu>"); process.exit(2); }
const sha256 = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const overlap = (a, b, c, d) => Math.min(b, d) - Math.max(a, c) > 0;
const upFirst = (text, at) => text.slice(0, at) + text[at].toUpperCase() + text.slice(at + 1);
const prior = { name: 0, other: 0 }; const likelihood = Object.fromEntries(FEATURES.map((f) => [f, {}])); let docs = 0, rowsUsed = 0, rowsBound = 0, rowsUnlabelled = 0;
for (const doc of parseGum(file)) {
  for (const shift of [false, true]) {
    const sents = doc.sents.map((s) => { let t = s.text; if (shift) for (const tk of s.tokens) if (tk.upos === "NOUN" && tk.end > tk.start) t = upFirst(t, tk.start); return t; });
    const text = sents.join(" "); const offs = []; let o = 0; for (const t of sents) { offs.push(o); o += t.length + 1; }
    const ms = []; doc.sents.forEach((s, si) => s.mentions.forEach((m) => ms.push({ a: offs[si] + m.c0, b: offs[si] + m.c1, upos: m.goldHead.upos })));
    const w = readToWeft(text, { address: "gum:" + doc.id, language: "eng", readerOptions: { roleCollapse: "features" } });
    const rep = new Map((w.roleCollapseReport?.rows ?? []).map((r) => [r.ref, r]));
    for (const row of w.cast ?? []) {
      const r = rep.get(row.ref); if (!r) continue;
      if (r.act === "binding") { rowsBound++; continue; }
      const on = ms.filter((m) => (row.mentionSpans ?? []).some(([a, b]) => overlap(a, b, m.a, m.b)));
      const label = on.some((m) => m.upos === "PROPN") ? "name" : on.some((m) => m.upos === "NOUN") ? "other" : null;
      if (!label) { rowsUnlabelled++; continue; }
      prior[label]++; rowsUsed++;
      for (const f of FEATURES) { const v = r.features[f]; const c = (likelihood[f][v] ??= { name: 0, other: 0 }); c[label]++; }
    }
    docs++;
  }
}
const out = { schema: "RoleCollapse@1", language: "eng", says: "for a cast row no pronoun binds: how often each feature value comes with a gold name versus a gold common noun",
  ground: "UD_English-GUM train (en_gum-ud-train.conllu), each document plain and with every gold NOUN capitalized", sha256, documents: docs, rows: rowsUsed, rowsBound, rowsUnlabelled,
  features: FEATURES, smoothing: "Laplace +1 per value (applied at read time, adapters/text/role-collapse.js)", builder: "identity/novels/build-role-collapse.mjs",
  licence: "GUM: CC BY 4.0 (the text); only counts are kept here", prior, likelihood };
const dest = path.join(KH, "native", "priors-shipped", "role-collapse-eng.json"); fs.writeFileSync(dest, JSON.stringify(out, null, 1) + "\n");
console.log(JSON.stringify({ dest, documents: docs, rows: rowsUsed, rowsBound, rowsUnlabelled, prior, likelihood }));
