// tok.mjs — per-TOKEN ablation through the production reader, one ARM per process.  node tok.mjs <corpus> <arm> [--limit N]
// arms: real | company | deranged | null | shuffle.  Writes results/tok-<corpus>-<arm>.jsonl (resumable). See PREREG.md for the record definition.
import fs from "node:fs";
import path from "node:path";
import { loadCorpus, readProd, render, renderWindow, readerKinds, mulberry32, seedOf, HERE } from "./lib.mjs";
import { docStarts } from "./sample.mjs";
const [corpusName, arm, ...rest] = process.argv.slice(2);
const limit = rest.includes("--limit") ? Number(rest[rest.indexOf("--limit") + 1]) : Infinity;
const corpus = loadCorpus(corpusName), ds = docStarts(corpus);
const plan = JSON.parse(fs.readFileSync(path.join(HERE, "results", `plan-${corpusName}.json`), "utf8"));
const out = path.join(HERE, "results", `tok-${corpusName}-${arm}.jsonl`);
const done = new Set(fs.existsSync(out) ? fs.readFileSync(out, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).key) : []);
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordIn = (surface, w) => new RegExp(`(^|[^\\p{L}\\p{M}'’])${esc(w)}($|[^\\p{L}\\p{M}'’])`, "u").test(surface);
const permuteSent = (st, k) => { const rnd = mulberry32(seedOf("shuf", corpusName, k)), a = st.slice(); for (let j = a.length - 1; j > 0; j--) { const r = Math.floor(rnd() * (j + 1)); [a[j], a[r]] = [a[r], a[j]]; } return a; };
const windowOf = (u) => { const lo = Math.max(ds[u.s], u.s - corpus.M); return { lo, sents: corpus.sents.slice(lo, u.s + 1) }; };
const baseCache = new Map();
async function readArm(u, ablate) {
  const { lo, sents } = windowOf(u), target = corpus.sents[u.s][u.i];
  const sh = arm === "shuffle" ? sents.map((st, k) => permuteSent(st, lo + k)) : sents;
  const drop = ablate ? (t) => t === target : null;
  const text = renderWindow(sh, drop), texts = sh.map((st) => render(st, drop)).filter(Boolean);
  const r = await readProd(text, { language: corpus.language, arm: arm === "shuffle" ? "real" : arm });
  return { ...r, kinds: readerKinds(texts) };
}
function record(u, base, abl) {
  const w = u.w;
  let ownExists = 0, ownMentions = 0, ownDelta = 0, nOwn = 0, refChanged = 0, refAbs = 0, refBorn = 0, refLost = 0;
  const baseIds = new Set(base.referents.keys());
  for (const [id, r] of base.referents) {
    const a = abl.referents.get(id), own = r.surfaces.some((sf) => wordIn(sf.toLowerCase(), w));
    const d = a ? Math.abs(r.mentions - a.mentions) : r.mentions;
    if (own) { ownExists = 1; nOwn += 1; ownMentions = Math.max(ownMentions, r.mentions); ownDelta = Math.max(ownDelta, d); continue; }
    if (!a) { refLost += 1; refAbs += r.mentions; } else if (d) { refChanged += 1; refAbs += d; }
  }
  for (const id of abl.referents.keys()) if (!baseIds.has(id)) { refBorn += 1; refAbs += abl.referents.get(id).mentions; }
  let relLost = 0, relBorn = 0, relCollateral = 0; const lostL = new Map(), bornL = new Map();
  const keys = new Set([...base.relations.keys(), ...abl.relations.keys()]);
  for (const k of keys) {
    const b = base.relations.get(k) ?? 0, a = abl.relations.get(k) ?? 0, label = k.split("|")[0];
    const touches = k.split(/[^\p{L}\p{N}']+/u).includes(w);
    if (b > a) { relLost += b - a; lostL.set(label, (lostL.get(label) ?? 0) + b - a); if (!touches) relCollateral += b - a; }
    if (a > b) { relBorn += a - b; bornL.set(label, (bornL.get(label) ?? 0) + a - b); if (!touches) relCollateral += a - b; }
  }
  let relRebound = 0; for (const [l, n] of lostL) relRebound += Math.min(n, bornL.get(l) ?? 0);
  let kindFlips = 0; const ws = new Set([...base.kinds.keys(), ...abl.kinds.keys()]);
  for (const x of ws) if (x !== w && base.kinds.get(x) !== abl.kinds.get(x)) kindFlips += 1;
  const nonNull = (refChanged + refBorn + refLost + relLost + relBorn + ownDelta) > 0;
  return { ownExists, ownMentions, ownDelta, nOwn, refChanged, refAbs, refBorn, refLost, relLost, relBorn, relRebound, relCollateral, kindFlips, nKinds0: new Set(base.kinds.values()).size, nKinds1: new Set(abl.kinds.values()).size, nRef0: base.referents.size, nRel0: base.relations.size, nonNull };
}
const todo = plan.units.map((u, n) => ({ ...u, n })).filter((u) => !done.has(`${u.s}:${u.i}`)).slice(0, limit);
const t0 = Date.now();
for (const u of todo) {
  const bk = `${u.s}`;
  if (!baseCache.has(bk)) { if (baseCache.size > 4) baseCache.clear(); baseCache.set(bk, await readArm(u, false)); }
  const base = baseCache.get(bk), abl = await readArm(u, true);
  const lab = readerKinds(windowOf(u).sents.map((st) => render(st))).get(u.w) ?? "none";
  fs.appendFileSync(out, JSON.stringify({ key: `${u.s}:${u.i}`, arm, n: u.n, pair: u.pair, y: u.y, w: u.w, s: u.s, i: u.i, block: u.block, strat: u.strat, cbin: u.cbin, kindSig: lab, ctl: u.ctl ?? null, wc: u.wc ?? null, ...record(u, base, abl) }) + "\n");
  if (u.n % 20 === 0) console.error(`${corpusName}/${arm} ${u.n}/${plan.units.length} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
console.error(`${corpusName}/${arm} done ${todo.length} units in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
