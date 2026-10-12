// earn-mind.mjs — THE FIRST EARNED ROW OF THE MIND (Mímir's expansion law:
// only a measured consequence promotes; GL-EN-22: effect >= 0.15 AND
// selection-aware p <= 0.05).
//
// The earning event is held-out RECOGNITION (step35's mechanism, step36's
// omnilingual form): the retained mind learned on the English UDHR frontier
// (47 referent points) with the German forms bound by article-grid PMI; it
// then reads the GERMAN FUTURE (clauses the learner never saw in either
// language) and claims the retained English points. If the recognition clears
// the bar, the row is remembered into khora/native/memory/mind.jsonl as
// standing "earned" with byte citations into the German UDHR — every citation
// verified against the real bytes before it is recorded.
//
//   node native/eval/the-fold/scene/earn-mind.mjs

import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMind, remember, verifyCitations } from "../../../kernel/mimir.js";
import { normForm, recognizerNominations } from "../../../kernel/prior-recognizer.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCENE = path.join(HERE);
const MIND_OUT = "/Users/mlacy/Documents/3.0/khora/native/memory/mind.jsonl";
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(SCENE, p), "utf8"));
const eng = readJson("eot-udhr-eng.json");
const deu = readJson("eot-udhr-deu_1996.json");
const engRefs = (eng.referents ?? []).map((r) => ({ hash: r.hash, name: r.name ?? null }));
const deuName = new Map((deu.referents ?? []).map((r) => [r.hash, r.name ?? ""]));
const deuNames = [...new Set((deu.referents ?? []).map((r) => r.name ?? "").filter(Boolean))];

// paragraph grid WITH BYTE OFFSETS (blocks keep their offset into the real file)
const blocksWithOffsets = (text) => {
  const out = []; let last = 0, m;
  const re = /\n\s*\n/g;
  const push = (raw, cs) => { const t = raw.trim(); if (!t) return; const lead = raw.length - raw.trimStart().length; out.push({ text: t, at: Buffer.byteLength(text.slice(0, cs + lead), "utf8") }); };
  while ((m = re.exec(text))) { push(text.slice(last, m.index), last); last = m.index + m[0].length; }
  push(text.slice(last), last);
  return out;
};
const headerKept = (p) => !/Language:|Adopted:|Publisher:|Universal Declaration of Human Rights|Erklärung der Menschenrechte/i.test(p);
const engText = fs.readFileSync(path.join(SCENE, "udhr-src", "udhr-eng.txt"), "utf8");
const deuText = fs.readFileSync(path.join(SCENE, "udhr-src", "udhr-deu_1996.txt"), "utf8");
const deuBytes = Buffer.from(deuText, "utf8");

const articleGrid = (blocks, langs) => {
  const re = new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${langs.join("|")})\\s*([0-9]+)`, "iu");
  const out = []; let article = 0, i = 0;
  for (const b of blocks) {
    if (!headerKept(b.text)) continue;
    const h = re.exec(b.text);
    if (h) { article = Number(h[h.length - 1]); i = 0; continue; }
    if (article > 0) out.push({ a: article, i: i++, text: b.text, at: b.at });
  }
  return out;
};
const engGrid = articleGrid(blocksWithOffsets(engText), ["Article"]);
const deuGrid = articleGrid(blocksWithOffsets(deuText), ["Artikel", "Art"]);
const deuByKey = new Map(deuGrid.map((g) => [`${g.a}:${g.i}`, g]));
const aligned = engGrid.filter((e) => deuByKey.has(`${e.a}:${e.i}`)).map((e) => ({ e, d: deuByKey.get(`${e.a}:${e.i}`) }));
const FRONT = Math.floor(0.6 * aligned.length);
const frontierPairs = aligned.slice(0, FRONT + 1);

const inText = (t, n) => t.toLowerCase().includes(n.toLowerCase());
const learner = engRefs.filter((r) => r.name && frontierPairs.some((p) => inText(p.e.text, r.name)));
const caps = (para) => [...new Set(String(para).match(/\b[A-ZÄÖÜÅÉÈÊĦА-ЯЁ][a-zäöüåéèêğışа-яё]*/g) ?? [])].filter((w) => w.length > 2);

// the mind (this time via the real store: remembered candidates, earned row)
let mind = createMind({ meta: { handle: "Mimir", event: "first-earned-row" } });

// binding: German forms -> retained English points, PMI over the aligned frontier
const pairs = [];
for (const { e, d } of frontierPairs) {
  const engHere = learner.filter((r) => r.name && inText(e.text, r.name)).map((r) => r.hash);
  const forms = [...new Set([...deuNames, ...caps(d.text)])].filter((n) => inText(d.text, n));
  if (engHere.length && forms.length) pairs.push({ e: engHere, g: forms });
}
const M = pairs.length;
const Pg = new Map(), Pp = new Map(), Pgp = new Map();
for (const { e, g } of pairs) for (const x of g) { Pg.set(x, (Pg.get(x) ?? 0) + 1); for (const p of e) { Pp.set(p, (Pp.get(p) ?? 0) + 1); Pgp.set(`${x}\u0000${p}`, (Pgp.get(`${x}\u0000${p}`) ?? 0) + 1); } }
const pmi = (g, p) => { const n = Pgp.get(`${g}\u0000${p}`) ?? 0; if (!n) return 0; const a = n / M, b = (Pg.get(g) ?? 0) / M, c = (Pp.get(p) ?? 0) / M; return Math.log(a / (b * c)); };
const formsByPoint = new Map(learner.map((r) => [r.hash, new Set([r.name])]));
for (const g of Pg.keys()) {
  const cs = learner.map((r) => r.hash).map((p) => [p, pmi(g, p)]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (!cs.length) continue;
  const [best, v] = cs[0]; const second = cs[1]?.[1] ?? 0;
  if (v >= 0.3 && v - second >= 0.1) formsByPoint.get(best)?.add(g);
}
const rawEntries = [...formsByPoint].filter(([, f]) => f.size).map(([hash, forms]) => ({
  referent: hash, standing: "candidate", terrain: "Kind", basis: "nominated",
  recognizer: { mode: "surface", forms: [...forms] },
}));
console.log(`retained mind: ${rawEntries.length} referent entries (candidates, then the measurement decides)`);

// THE EARNING EVENT: recognition on the German future
const futurePairs = aligned.slice(FRONT + 1);
const goldOf = (pair) => new Set(learner.filter((r) => r.name && inText(pair.e.text, r.name)).map((r) => r.hash));
const score = (prior) => {
  let gt = 0, cl = 0, hit = 0, used = 0;
  const hitCites = [];
  for (const pair of futurePairs) {
    const g = [...goldOf(pair)];
    if (!g.length) continue;
    used += 1; gt += g.length;
    if (prior) {
      const noms = recognizerNominations(prior, { material: { text: pair.d.text }, anchor: `aligned:${pair.e.a}:${pair.e.i}`, at: pair.e.a });
      const claimed = new Set(noms.flatMap((n) => n.candidate.distinctions.map((d) => d.referent)));
      cl += claimed.size;
      for (const h of g) if (claimed.has(h)) hitCites.push({ source: path.join(SCENE, "udhr-src", "udhr-deu_1996.txt"), byte: pair.d.at, length: Buffer.byteLength(pair.d.text, "utf8") });
      hit += g.filter((h) => claimed.has(h)).length;
    }
  }
  return { used, goldTotal: gt, claimedTotal: cl, hit, recall: gt ? hit / gt : 0, attribution: cl ? hit / cl : null, hitCites };
};
const deranged = (k) => {
  const perm = rawEntries.map((_, j) => j);
  let s = (k * 0x9E3779B9) >>> 0;
  const r = () => { s = (s + 0x6D2B79F5) >>> 0; let q = s; q = Math.imul(q ^ (q >>> 15), q | 1); q ^= q + Math.imul(q ^ (q >>> 7), q | 61); return ((q ^ (q >>> 14)) >>> 0) / 4294967296; };
  for (let j = perm.length - 1; j > 0; j--) { const t = Math.floor(r() * (j + 1)); const tmp = perm[j]; perm[j] = perm[t]; perm[t] = tmp; }
  if (perm.length >= 2 && perm.every((v, j) => v === j)) { const tmp = perm[0]; perm[0] = perm[1]; perm[1] = tmp; }
  return { schema: "EOReceivedPrior@1", entries: perm.map((srcIdx, eIdx) => ({ ...rawEntries[eIdx], referent: rawEntries[srcIdx].referent })) };
};
const prior = { schema: "EOReceivedPrior@1", giver: "udhr-eng frontier + udhr-deu forms", entries: rawEntries };
const retained = score(prior);
const blank = score(null);
const nulls = [];
for (let t = 0; t < 199; t++) nulls.push(score(deranged(t + 1)));
const pRecog = nulls.filter((s) => (s.attribution ?? 0) >= (retained.attribution ?? 0)).length + 1;
const effect = retained.attribution ?? 0;
const pValue = pRecog / 200;
console.log(`recognition on the German future: attribution=${effect.toFixed(3)} (null med ${([...nulls.map((s) => s.attribution ?? 0)].sort((a, b) => a - b)[99]).toFixed(3)}) · p=${pValue.toFixed(4)} · blank=${blank.attribution ?? "null"}`);
console.log(`GL-EN-22 bar (effect >= 0.15 AND p <= 0.05): ${effect >= 0.15 && pValue <= 0.05 ? "CLEARED" : "NOT CLEARED"}`);

if (effect >= 0.15 && pValue <= 0.05) {
  const cites = [...new Map(retained.hitCites.map((c) => [`${c.source}#${c.byte}`, c])).values()].slice(0, 8).map((c) => ({ source: c.source, byte: c.byte, length: c.length, sha256: sha256(deuBytes.subarray(c.byte, c.byte + c.length)) }));
  mind = remember(mind, {
    id: "mind:earned:omnilingual-recognition:deu",
    kind: "kind",
    claim: {
      pattern: "retained referents, activated omnilingually",
      languages: "eng -> deu (article-grid PMI binding)",
      referents: rawEntries.length,
      attribution: +effect.toFixed(3),
      pValue: +pValue.toFixed(4),
    },
    giver: "kernel/prior-recognizer + kernel/mimir",
    cites,
    standing: "earned",
    basis: "held-out recognition on the German future (step35/36 mechanism): the retained mind claims the retained English points where their bound German forms appear",
    falsifying: "a future clause where the retained point is claimed but the aligned English gold does not record the being; or a surface-reassignment null draw with attribution >= the earned row",
    measurement: { method: "held_out_recognition", effect: +effect.toFixed(4), pValue: +pValue.toFixed(4) },
    meta: { battery: "terrain-arena-step36-omnilingual.mjs", nullDraws: 199 },
  });
  const report = verifyCitations(mind, { read: (s) => fs.readFileSync(s), digest: sha256 });
  console.log(`citations: ${report.checked} checked · ${report.failed} failed`);
  if (!report.ok) { console.error(report.findings.filter((f) => !f.ok).slice(0, 4)); process.exit(1); }
  const existing = fs.existsSync(MIND_OUT) ? fs.readFileSync(MIND_OUT, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l)) : [];
  const have = new Set(existing.map((r) => r.id));
  const fresh = mind.rows.filter((r) => !have.has(r.id));
  fs.appendFileSync(MIND_OUT, fresh.map((r) => JSON.stringify(r)).join("\n") + (fresh.length ? "\n" : ""));
  console.log(`THE FIRST EARNED ROW: appended ${fresh.length} row(s) -> ${MIND_OUT} (total ${existing.length + fresh.length}) — the mind now contains an EARNED taking`);
} else {
  console.log("bar not cleared: the row stays candidate; nothing earned, nothing recorded");
}