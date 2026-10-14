#!/usr/bin/env node
// eval/callimachus/identity-grown-r11.mjs — the eleventh registration, amendment 1 (size-matched twin), as pre-registered in GRAIN-R11-PREREG.md.
//   node native/eval/callimachus/identity-grown-r11.mjs --pinned <permanent-dst> --grown <permanent-dst-grown> --out <results.json>
// COMMITTED BEFORE IT IS RUN, and not edited after. Reads the two record directories' pinned layers; writes only --out. No model.
// Nodes and mentions as identity-aliases-r8.mjs (capitalisedRuns with clause boundaries, edge determiners/possessives stripped,
// features = the sentence's other runs w: + the record's earned relation verbs v:), over the UNION of the pinned pages and the grown pages.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makePinax } from "../../organs/pinax.js";
import { readCorpus, capitalisedRuns } from "../../organs/callimachus.js";
import { makeIdentityInduction } from "../../kernel/identity-induction.js";
import { splitSentences } from "../../adapters/text/spans.js";

const here = dirname(fileURLToPath(import.meta.url));
const arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? resolve(process.argv[i + 1]) : null; };
const PINNED = arg("--pinned"), GROWN = arg("--grown"), OUT = arg("--out");
if (!PINNED || !GROWN || !OUT) { console.error("usage: --pinned <dir> --grown <dir> --out <results.json>"); process.exit(2); }
const sha = (b) => createHash("sha256").update(b).digest("hex");
const webJs = readFileSync(join(here, "../../organs/web.js"));
const EXTRACTOR = { name: "web.js#extractReadable", sha256: sha(webJs) };

const records = [], pageList = [];
for (const [dir, tag] of [[PINNED, "pinned"], [GROWN, "grown"]]) {
  const prior = JSON.parse(readFileSync(join(dir, "record.json"), "utf8"));
  for (const s of prior.sources) {
    const raw = readFileSync(join(dir, "layers", `${s.id}.raw`));
    const text = readFileSync(join(dir, "layers", `${s.id}.txt`), "utf8");
    const rec = await makePinax({ url: s.url, finalUrl: s.final_url, retrievedAt: s.retrieved_at, fetch: s.fetch, raw: new Uint8Array(raw), text, extractor: EXTRACTOR });
    rec.declared = s.declared;
    records.push(rec); pageList.push({ set: tag, url: s.url, chars: text.length });
  }
}
const record = readCorpus(records, { question: "Should the United States make daylight saving time permanent, as the Sunshine Protection Act proposes?", referentMatch: "contains" });
const verbs = new Set((record.vocab ?? []).map((v) => String(v).toLowerCase()));

const OPTS = { draws: 199, alpha: 0.05, seed: 20261014, minOccurrences: 3, resolution: 1, maxHop: 1, smooth: 1, minFeatureCount: 1 };
const DET = new Set(["the", "a", "an"]);
const clean = (t) => t.replace(/^[("'“‘\[]+|[)"'”’\],.;:!?]+$/g, "").replace(/['’]s$/i, "");
const keyOf = (run) => { const t = run.map(clean).filter(Boolean); while (t.length > 1 && DET.has(t[0].toLowerCase())) t.shift(); return t.join(" "); };
const mentions = new Map();
for (const r of records) {
  const text = new TextDecoder().decode(r.layers.text);
  for (const sent of splitSentences(text)) {
    const st = sent.text ?? "";
    const runs = capitalisedRuns(st).map(keyOf).filter((k) => k.length > 1);
    const vs = (st.match(/[\p{Ll}'’-]+/gu) ?? []).map((w) => w.toLowerCase()).filter((w) => verbs.has(w));
    runs.forEach((k, i) => {
      const feats = [...new Set(runs.filter((_, j) => j !== i && runs[j] !== k))].map((o) => ({ f: `w:${o}`, hop: 1 })).concat([...new Set(vs)].map((v) => ({ f: `v:${v}`, hop: 1 })));
      if (!mentions.has(k)) mentions.set(k, []);
      mentions.get(k).push(feats);
    });
  }
}
const BASES = ["Senate", "House", "Standard Time", "Congress"];
const MIN_PAIR = 24;
const nodes = new Map();
for (const [k, occ] of mentions) if (BASES.includes(k) || (occ.length >= MIN_PAIR && BASES.some((b) => k.split(/\s+/).includes(b) || k.includes(b)))) nodes.set(k, occ);
const namesNode = (f) => (f.startsWith("w:") ? f.slice(2) : null);
const isBound = (v) => v === "BOUND" || v === "bound";
const view = (r) => ({ verdict: r.verdict, reason: r.reason ?? null, read: r.read ?? null, tests: r.tests ? { worlds: r.tests.worlds?.match ?? null, weightA: r.tests.weight?.a?.carries ?? null, weightB: r.tests.weight?.b?.carries ?? null, consequenceAligned: r.tests.consequence?.aligned ?? null, settled: r.tests.bound?.settled ?? null } : null });
const results = { prereg: "native/eval/callimachus/GRAIN-R11-PREREG.md", declared: OPTS, pages: pageList, counts: Object.fromEntries([...nodes].map(([k, v]) => [k, v.length])), pairs: [], twins: [], predictions: {} };
const mulberry = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const occ = nodes.get("Senate"), H = 27;
const rows = [];
for (let s = 1; s <= 19; s++) {
  const rnd = mulberry(1000 + s);
  const idx = occ.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const twin = idx.slice(0, 2 * H).sort((x, y) => x - y), rest = new Set(idx.slice(2 * H));
  const rec = new Map([...nodes].filter(([k]) => k !== "Senate"));
  rec.set("Senate", occ.filter((_, i) => rest.has(i)));
  rec.set("Senate#a", twin.filter((_, i) => i % 2 === 0).map((i) => occ[i]));
  rec.set("Senate#b", twin.filter((_, i) => i % 2 === 1).map((i) => occ[i]));
  const r = makeIdentityInduction(rec, { ...OPTS, namesNode: () => null }).judge("Senate#a", "Senate#b");
  rows.push({ seed: 1000 + s, ...view(r) });
}
const boundN = rows.filter((r) => isBound(r.verdict)).length;
const out = { prereg: "native/eval/callimachus/GRAIN-R11-PREREG.md#amendment-1", declared: OPTS, halves: H, rows, predictions: { J1: { bound: boundN, of: 19, holds: boundN <= 6 } } };
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ bound: boundN, of: 19, J1: out.predictions.J1, failing: rows.filter((r) => !isBound(r.verdict)).map((r) => [r.reason, r.tests?.weightA, r.tests?.weightB, r.tests?.consequenceAligned].join("/")) }, null, 1));
