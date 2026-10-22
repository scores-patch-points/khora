// learn-coref.mjs — train the learned coreference ranker (native/organs/coref-learned.js) on gold-labelled sets and test it on a held-out one.
// Each set: its sentences.json, gold.json and the dump of its pages (dump-mentions.mjs). A gold mention is aligned to the system's mention as
// score-coref.mjs aligns it; the right candidates are the entities whose name is a name the gold gives that entity.
//   node eval/meaning/atoms/learn-coref.mjs --train a,b --test c [--model out.json] [--out system.json] [--rules]   (a set: <dir>:<dump.json>)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const { resolveLearned, trainRanker } = await import(path.join(HERE, "../../../native/organs/coref-learned.js"));
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
const norm = (s) => String(s ?? "").normalize("NFC").toLowerCase().replace(/^(the|el|la|los|las|le|les|l'|l’|der|die|das|den|dem)\s+/u, "").replace(/[“”"'’(),.]/g, "").trim();
const sameName = (a, b) => { a = norm(a); b = norm(b); if (!a || !b) return false; if (a === b || a.includes(b) || b.includes(a)) return true; const la = a.split(/\s+/).at(-1), lb = b.split(/\s+/).at(-1); return la.length > 2 && la === lb; };

function loadSet(spec) {
  const [dir, dump] = spec.split(":");
  const S = JSON.parse(fs.readFileSync(path.join(dir, "sentences.json"), "utf8")), gold = JSON.parse(fs.readFileSync(path.join(dir, "gold.json"), "utf8"));
  const D = JSON.parse(fs.readFileSync(dump, "utf8"));
  const titleOf = new Map(S.map((s) => [s.sid, s.title])), gs = new Map(gold.sentences.map((g) => [g.sid, g]));
  const cluster = new Map();
  for (const g of gold.sentences) for (const m of g.mentions ?? []) if (m.text && !/^(pronoun|dropped)$/.test(m.how)) { const k = `${titleOf.get(g.sid)}\t${m.entity}`; (cluster.get(k) ?? cluster.set(k, new Set()).get(k)).add(m.text); }
  for (const [t, es] of Object.entries(gold.entities)) for (const e of es) { const k = `${t}\t${e.id}`; (cluster.get(k) ?? cluster.set(k, new Set()).get(k)).add(e.name); }
  for (const p of D.pages) { p.goldRaw = p.asked.map(({ sid, si }) => ({ si, gms: gs.get(sid)?.mentions ?? [] })); p.cluster = (e) => [...(cluster.get(`${p.title}\t${e}`) ?? [])]; align(p); }
  return { dir, S, D };
}
// per page: (si, mention index) → the gold entity's names; the gold mentions no system mention meets, returned
const meets = (gm, x) => (gm.how === "dropped" ? x.how === "dropped" && (!gm.at || norm(x.at) === norm(gm.at) || norm(gm.at).includes(norm(x.at)) || norm(x.at).includes(norm(gm.at))) : norm(x.text) === norm(gm.text));
const near = (gm, x) => gm.how !== "dropped" && !!x.text && (norm(x.text).includes(norm(gm.text)) || norm(gm.text).includes(norm(x.text)));
function align(p) {
  p.gold = new Map(); const unmet = [];
  for (const { si, gms } of p.goldRaw) {
    const ms = p.sentences[si]?.mentions ?? [], used = new Set();
    for (const gm of gms) {
      let c = ms.map((x, i) => [x, i]).filter(([x, i]) => !used.has(i) && meets(gm, x));
      if (!c.length) c = ms.map((x, i) => [x, i]).filter(([x, i]) => !used.has(i) && near(gm, x));
      if (!c.length) { unmet.push({ si, gm }); continue; }
      used.add(c[0][1]); p.gold.set(`${si}\t${c[0][1]}`, p.cluster(gm.entity));
    }
  }
  return unmet;
}
// the right candidates for a mention: an entity named as the gold names it; a new entity when the mention's own words are such a name
const rightOf = (p) => { const idx = new Map(); p.sentences.forEach((s, si) => s.mentions.forEach((m, i) => idx.set(m, `${si}\t${i}`)));
  return (m, cands) => {
    const names = p.gold.get(`${m.si}\t${p.sentences[m.si].mentions.findIndex((x) => x.start === m.start && x.end === m.end && x.how === m.how && x.at === m.at)}`);
    if (!names) return null;
    return cands.filter((c) => (c.isNew ? !/^(pronoun|dropped|we)$/.test(m.how) && names.some((n) => sameName(m.text, n)) : !!c.e.name && names.some((n) => sameName(c.e.name, n))));
  }; };

const train = (arg("train", "") || "").split(",").filter(Boolean).map(loadSet), test = loadSet(arg("test"));
// the detector: on the training pages, a parse candidate the rules did not take is a mention when it meets a gold mention the rules missed
const { candidatesOf, trainDetector, addDetected } = await import(path.join(HERE, "../../../native/organs/coref-learned.js")), { PACKS } = await import(path.join(HERE, "../../../native/adapters/text/grammar-packs.js"));
const proDrop = (p) => !!PACKS[p.lang]?.proDrop;
let detector = null;
if (!process.argv.includes("--rules") && !process.argv.includes("--no-detect")) {
  const ex = [];
  for (const p of train.flatMap((s) => s.D.pages)) {
    const unmet = align(p), asked = new Set(p.asked.map((a) => a.si));
    p.sentences.forEach((s, si) => {
      if (!asked.has(si) || !s.rows) return;
      const taken = (c) => s.mentions.some((m) => c.kind === "dropped" ? m.hid === c.hid : (m.ids ?? []).some((i) => c.ids.includes(i)));
      for (const c of candidatesOf(s.rows, { lang: p.lang, proDrop: proDrop(p) })) {
        if (taken(c)) continue;
        const x = { how: c.kind, text: c.start == null ? "" : s.text.slice(c.start, c.end), at: c.at };
        ex.push([c.feats, unmet.some((u) => u.si === si && (u.gm.how === "dropped") === (c.kind === "dropped") && (meets(u.gm, x) || near(u.gm, x)))]);
      }
    });
  }
  detector = trainDetector(ex, { epochs: 10 });
  console.error(`detector: ${ex.length} candidates, ${ex.filter((e) => e[1]).length} positive`);
  for (const set of [...train, test]) set.D.pages = set.D.pages.map((p) => { const q = addDetected(p, detector, { proDrop: proDrop(p) }); align(q); return q; });
}
// the ranker trained from several shuffles and its weights averaged: one shuffle's luck moves C1 by ±3 points on 100 sentences
function bag(pages) {
  const k = +arg("seeds", 5), ms = Array.from({ length: k }, (_, i) => trainRanker(pages, rightOf, { epochs: +arg("epochs", 10), seed: +arg("seed", 1) + i, drop: arg("drop", null) }));
  const w = {}; for (const m of ms) for (const [x, v] of Object.entries(m.w)) w[x] = (w[x] ?? 0) + v / k;
  for (const x of Object.keys(w)) w[x] = +w[x].toFixed(5);
  return { schema: "CorefRanker@1", seeds: k, drop: arg("drop", null), updates: ms.reduce((a, m) => a + m.updates, 0), w, detector };
}
let model = null;
if (!process.argv.includes("--rules")) {
  model = arg("load") ? JSON.parse(fs.readFileSync(arg("load"), "utf8")) : bag(train.flatMap((s) => s.D.pages));
  if (arg("model")) fs.writeFileSync(arg("model"), JSON.stringify(model));
}
// the test set read, written as the system's mentions for score-coref.mjs
const result = { schema: "SystemAtoms@1", sentences: [] };
for (const p of test.D.pages) {
  const R = model ? resolveLearned(p, model) : { sentences: p.sentences.map((s) => ({ mentions: s.mentions.map((m) => ({ ...m, entityName: p.entities.find((e) => e.id === m.entity)?.name ?? null })) })) };
  for (const { sid, si } of p.asked) result.sentences.push({ sid, mentions: R.sentences[si].mentions.map((m) => ({ text: m.text, at: m.at, how: m.how, entity: m.entity, entityName: m.entityName })) });
}
fs.writeFileSync(arg("out", "/dev/stdout"), JSON.stringify(result));
if (model) console.error(`model: ${Object.keys(model.w).length} weights, ${model.updates} labelled decisions`);
