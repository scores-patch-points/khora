// IDENT-0 scorer. Reads pairs.json and reads/*.json (WeftEntry@4 from native/reading.js::readDocument), builds the world for janus same()
// from the reader's own edges, runs the pre-registered configurations, writes results.json. Nothing here is fitted to the pairs.
//   JANUS_DIR=<scratch folder with same.mjs, fold-depth.mjs> node eval/ident0/score.mjs [--out results.json] [--seeds 20]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const JD = process.env.JANUS_DIR; if (!JD) throw new Error('JANUS_DIR');
const { same, makeWorld, worldFold, estimateNull, diffMaps } = await import(pathToFileURL(path.join(JD, 'same.mjs')).href);
const argv = process.argv.slice(2); const arg = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const OUT = arg('--out', path.join(here, 'results.json')); const SEEDS = +arg('--seeds', 20); const READS = arg('--reads', path.join(here, 'reads')); const PAIRS = arg('--pairs', path.join(here, 'pairs.json'));

const norm = (s) => s.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const WB = (s) => new RegExp(`(?<![\\p{L}\\p{N}])${esc(s)}(?![\\p{L}\\p{N}])`, 'giu');
function rng32(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---- world from the entry's own edges (mapping M1): node = lowercase NFC end string; link = an edge (undirected, deduplicated, no self loop)
function edgeList(entry) {
  const set = new Set(), links = [];
  for (const e of entry.edges ?? []) {
    if (typeof e.end1 !== 'string' || typeof e.end2 !== 'string') continue;
    const a = norm(e.end1), b = norm(e.end2); if (!a || !b || a === b) continue;
    const k = a < b ? `${a}\u0001${b}` : `${b}\u0001${a}`; if (set.has(k)) continue; set.add(k); links.push([a, b]);
  }
  return links;
}
const uniWorld = (links, extraNodes = []) => { const ids = new Set(links.flat()); for (const n of extraNodes) ids.add(n); return makeWorld([...ids].sort().map((id) => ({ id, kind: 'term', attrs: { t: id } })), links.map(([a, b]) => ({ a, b }))); };
function biWorld(links) {   // bipartite incidence: N:x (kind name, no attrs) -- T:y (kind term, attr t=y) for every edge x-y, both directions
  const ids = new Set(links.flat()); const nodes = [], L = [];
  for (const id of ids) { nodes.push({ id: 'N:' + id, kind: 'name', attrs: {} }); nodes.push({ id: 'T:' + id, kind: 'term', attrs: { t: id } }); }
  for (const [a, b] of links) { L.push({ a: 'N:' + a, b: 'T:' + b }); L.push({ a: 'N:' + b, b: 'T:' + a }); }
  return makeWorld(nodes, L);
}
// ---- mapping M2: M1 plus a node for each pair form that is not an edge end, linked to every edge-end string that occurs in a sentence where the form occurs
function m2Links(entry, links, missing) {
  const ends = [...new Set(links.flat())].filter((s) => s.length >= 2); const add = []; const sentences = entry.sentences ?? [];
  const endRes = new Map(ends.map((s) => [s, WB(s)]));
  for (const f of missing) {
    const fre = WB(f); const linked = new Set();
    for (const s of sentences) {
      const txt = s.text.normalize('NFC'); fre.lastIndex = 0; if (!fre.test(txt)) continue;
      const rest = txt.replace(WB(f), ' ').toLowerCase();
      for (const [e, re] of endRes) { re.lastIndex = 0; if (re.test(rest)) linked.add(e); }
    }
    for (const e of linked) add.push([norm(f), e]);
  }
  return add;
}
// NOTE (found on the synthetic toy, before any real pair was scored): kindCentroid takes the first of equally frequent values as the kind's 'average', and every node's t is unique,
// so the alphabetically first node (insertion order is sorted) is the kind average: its own Delta and lambda are 0. Pairs that contain it are flagged `firstNode`.
// ---- the lens W: attrs [t] (the node's own string; neighbours' strings are what a fold carries); frame: the article's own edges; tolerance: earned (below)
const LENS_A = { name: 'ident0-A', attrs: ['t'], giver: null };
const LENS_B = { name: 'ident0-B', attrs: ['t'], giver: null };
function earnedTolerance(world, lens, fn, seed = 7, draws = 300) {  // 5th percentile of diffMaps(U(x),U(y)) over random node pairs of this world
  const ids = [...world.nodes.keys()]; if (ids.length < 4) return 0; const r = rng32(seed), ds = [];
  for (let i = 0; i < draws; i++) { const x = ids[Math.floor(r() * ids.length)], y = ids[Math.floor(r() * ids.length)]; if (x === y) continue;
    ds.push(diffMaps(worldFold(x, world, { lens, null: fn }).descriptor, worldFold(y, world, { lens, null: fn }).descriptor)); }
  ds.sort((a, b) => a - b); return ds.length ? ds[Math.floor(ds.length * 0.05)] : 0;
}
function shuffled(links, seed) {  // degree-preserving stub re-pairing, as fold-depth.mjs's own null
  const r = rng32(seed), stubs = links.flat();
  for (let i = stubs.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [stubs[i], stubs[j]] = [stubs[j], stubs[i]]; }
  const set = new Set(), out = [];
  for (let i = 0; i + 1 < stubs.length; i += 2) { const a = stubs[i], b = stubs[i + 1]; if (a === b) continue; const k = a < b ? `${a}\u0001${b}` : `${b}\u0001${a}`; if (set.has(k)) continue; set.add(k); out.push([a, b]); }
  return out;
}
function sizeAround(links, id) {  // edges within two hops: every distinct edge touching a node at distance <= 1 from id; and degree
  const nb = new Set(); for (const [a, b] of links) { if (a === id) nb.add(b); else if (b === id) nb.add(a); }
  let n = 0; for (const [a, b] of links) if (a === id || b === id || nb.has(a) || nb.has(b)) n++;
  return { degree: nb.size, twoHopEdges: nb.size ? n : 0 };
}
const compact = (r) => ({ verdict: r.verdict, formula: r.formula ?? null, U: r.U?.close ?? null, D: r.D ? { a: r.D.a, b: r.D.b, null: r.D.null } : null, cos: r.L?.cos ?? null, ground: r.ground ?? null, fold: r.fold ? { conclusion: r.fold.conclusion ?? null, gap: r.fold.gap ?? null, p: r.fold.p ?? null, depth: r.fold.depth ?? null, radius: r.fold.radius ?? null } : null, reason: r.reason ?? null });

function runA(links, pairs, { extraNodes = [], tolerance = null } = {}) {  // configuration A on a unipartite world; returns verdict records per pair
  const world = uniWorld(links, extraNodes); const fn = estimateNull(world, LENS_A); const tol = tolerance ?? earnedTolerance(world, LENS_A, fn);
  return { tol, fn, nodes: world.nodes.size, links: links.length, rec: pairs.map((p) => { const a = norm(p.a), b = norm(p.b);
    if (!world.nodes.has(a) || !world.nodes.has(b)) return { verdict: 'unmapped', missing: [!world.nodes.has(a) && p.a, !world.nodes.has(b) && p.b].filter(Boolean) };
    return compact(same(a, b, world, { lens: LENS_A, foldNull: fn, tolerance: tol })); }) };
}
function runB(links, pairs) {   // configuration B: bipartite, fold 'dmd', tolerance 0
  const world = biWorld(links); const fn = estimateNull(world, LENS_B);
  return pairs.map((p) => { const a = 'N:' + norm(p.a), b = 'N:' + norm(p.b); if (!world.nodes.has(a) || !world.nodes.has(b)) return { verdict: 'unmapped' };
    const r = compact(same(a, b, world, { lens: LENS_B, foldNull: fn, tolerance: 0, fold: 'dmd' }));
    r.uLevel = r.verdict === 'unsupported' ? 'unsupported' : r.verdict === 'refused' ? 'refused' : r.fold?.conclusion === 'close' ? 'supported' : 'different'; return r; });
}
// ---- baselines
const containsRule = (a, b) => { const x = norm(a), y = norm(b); return x.includes(y) || y.includes(x) ? 'same' : 'different'; };
function beingsOf(entry, f) { const n = norm(f), out = new Set(); (entry.cast ?? []).forEach((c, i) => { if ([c.surface, ...(c.allSurfaces ?? [])].some((s) => typeof s === 'string' && norm(s) === n)) out.add(i); }); return out; }
function castRule(entry, a, b) { const A = beingsOf(entry, a), B = beingsOf(entry, b); if (!A.size || !B.size) return 'unseen'; return [...A].some((i) => B.has(i)) ? 'same' : 'different'; }

// ---- main
const pairsFile = JSON.parse(fs.readFileSync(PAIRS, 'utf8'));
const all = [...pairsFile.pos.map((p) => ({ ...p, cls: 'pos' })), ...pairsFile.neg.map((p) => ({ ...p, cls: 'neg' }))];
const arts = [...new Set(all.map((p) => `${p.ex}__${p.doc}`))].sort();
const rows = [], articleStats = [], shuf = Array.from({ length: SEEDS }, () => []);
const readEntry = (key, mode) => JSON.parse(fs.readFileSync(path.join(READS, `${key}__${mode}.json`), 'utf8'));
for (const key of arts) {
  const ps = all.filter((p) => `${p.ex}__${p.doc}` === key); const entryOff = readEntry(key, 'off'), entryOn = readEntry(key, 'on');
  const linksOff = edgeList(entryOff), linksOn = edgeList(entryOn);
  const A1 = runA(linksOff, ps), A1on = runA(linksOn, ps);
  const missing = [...new Set(ps.flatMap((p) => [p.a, p.b]).filter((f) => !new Set(linksOff.flat()).has(norm(f))))];
  const extra = m2Links(entryOff, linksOff, missing); const A2 = runA([...linksOff, ...extra], ps, { extraNodes: missing.map(norm) });
  const B1 = runB(linksOff, ps);
  const S = Array.from({ length: SEEDS }, (_, s) => runA(shuffled(linksOff, 1000 + s), ps).rec);
  const sizes = ps.map((p) => ({ a: sizeAround(linksOff, norm(p.a)), b: sizeAround(linksOff, norm(p.b)) }));
  const deg = new Map(); for (const [a, b] of linksOff) { deg.set(a, (deg.get(a) ?? 0) + 1); deg.set(b, (deg.get(b) ?? 0) + 1); }
  articleStats.push({ key, nodes: deg.size, edges: linksOff.length, maxDegree: Math.max(0, ...deg.values()), hubShare: deg.size ? Math.max(0, ...deg.values()) / deg.size : 0, nodesOn: new Set(linksOn.flat()).size, edgesOn: linksOn.length, tolA: A1.tol, foldNullA: A1.fn, pairs: ps.length, unmappedM1: ps.filter((_, i) => A1.rec[i].verdict === 'unmapped').length });
  ps.forEach((p, i) => { rows.push({ key, ...p, baseString: containsRule(p.a, p.b), baseCastOn: castRule(entryOn, p.a, p.b), baseCastOff: castRule(entryOff, p.a, p.b),
    firstNode: [norm(p.a), norm(p.b)].includes([...new Set(linksOff.flat())].sort()[0]), A1: A1.rec[i], A1on: A1on.rec[i], A2: A2.rec[i], B1: B1[i], size: Math.min(sizes[i].a.twoHopEdges, sizes[i].b.twoHopEdges), sizeA: sizes[i].a, sizeB: sizes[i].b, shuf: S.map((r) => ({ v: r[i].verdict, u: r[i].U })) }); });
  console.error('scored', key, ps.length);
}
fs.writeFileSync(OUT, JSON.stringify({ schema: 'IdentResults@1', seeds: SEEDS, articleStats, rows }));
console.error('wrote', OUT, rows.length);
