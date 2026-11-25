// sheet-edits-test.mjs — do the pasted sheet's proposed placements make translations more alike than matched random edits would?
// Preregistered in PREREG-SHEET-EDITS-ON-PUD.md; frozen in FREEZE-SHEET-EDITS-ON-PUD.md before the one run.
// REUSED SPLIT: the same 21 PUD treebanks scored once already for the unedited table (../cross-language-cell-profile/RESULTS-...).
//
// The infrastructure (parse, profile, retrieval AUC, distractors) is a copy of ../cross-language-cell-profile/pud-cell-profile-test.mjs, which is
// frozen and not edited; the reproduction gate below refuses to run unless this copy regenerates that run's macro AUC for the unedited table.
//
//   node sheet-edits-test.mjs --selftest   synthetic data only
//   node sheet-edits-test.mjs              the one run
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { addressOfFeature, addressOfRelation, addressOfUpos } from "../../../native/kernel/universal-grammar.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.UD_ROOT ?? "/Users/mlacy/Downloads/workspace/ud-treebanks";
const SEED = 20261123, D_PRIMARY = 200, B_NULL = 200, B_BOOT = 1000, B_BOOT_GROUP = 300;
const REPRO_MACRO_A = 0.7641151264691259; // the first run's observed macro AUC for analysis A, unedited table
const OPS = ["NUL", "SIG", "INS", "SEG", "CON", "SYN", "DEF", "EVA", "REC"], GRAINS = ["Ground", "Figure", "Pattern"];
export const CELLS = OPS.flatMap((op) => GRAINS.map((g) => `${op}·${g}`));
const cellId = (cell) => CELLS.indexOf(cell);
const CHAN = { U: 0, R: 1, F: 2 };

// ── the sheet's proposals that change the kernel, one group per sheet row (SHEET-VS-KERNEL.md, 30 rows; 29 applicable) ──
// A group moves every category it names (exact keys, or every key starting with a prefix) to the sheet's cell. The values a row
// stands for were fixed when this file was written, from the row's wording: "local grid" = every spatial case; "necessity and ability"
// = Mood Nec and Pot; "comparison" = Degree Equ, Cmp, Sup; "T/V address" = Polite Form and Infm; "honorific systems" = Polite Elev and Humb.
// Not applied: "Relative clause, restrictive" (the test's categories fold acl:relcl into acl), and the sheet's rows with no UD form.
export const EDITS = [
  { group: "Adjective", cell: "DEF·Figure", keys: ["U:ADJ"] },
  { group: "Clusivity", cell: "SIG·Figure", keys: ["F:Clusivity=In", "F:Clusivity=Ex"] },
  { group: "Demonstrative", cell: "DEF·Figure", keys: ["F:PronType=Dem"] },
  { group: "Numeral and quantifier", cell: "SEG·Figure", keys: ["U:NUM"] },
  { group: "Interrogative word", cell: "SEG·Ground", keys: ["F:PronType=Int"] },
  { group: "Interjection", cell: "SIG·Ground", keys: ["U:INTJ"] },
  { group: "Number: collective", cell: "SYN·Figure", keys: ["F:Number=Coll"] },
  { group: "Case: partitive", cell: "SEG·Figure", keys: ["F:Case=Par"] },
  { group: "Case: abessive", cell: "NUL·Figure", keys: ["F:Case=Abe"] },
  { group: "Case: comitative", cell: "CON·Figure", keys: ["F:Case=Com"] },
  { group: "Case: local grid", cell: "SEG·Ground", keys: ["Ine", "Ade", "Sup", "Sub", "Ela", "Del", "Ill", "All", "Lat", "Add", "Sbe", "Sbl", "Spl", "Ter", "Per"].map((v) => `F:Case=${v}`) },
  { group: "Gender and noun class", cell: "SEG·Pattern", keys: ["Masc", "Fem", "Neut", "Com"].map((v) => `F:Gender=${v}`), prefix: ["F:NounClass="] },
  { group: "Classifier", cell: "SEG·Figure", keys: ["R:clf"] },
  { group: "Definiteness", cell: "DEF·Figure", keys: ["Def", "Ind", "Spec", "Cons", "Com"].map((v) => `F:Definite=${v}`) },
  { group: "Aspect: iterative", cell: "INS·Pattern", keys: ["F:Aspect=Iter"] },
  { group: "Modality: necessity and ability", cell: "EVA·Ground", keys: ["F:Mood=Nec", "F:Mood=Pot"] },
  { group: "Voice: antipassive", cell: "REC·Ground", keys: ["F:Voice=Antip"] },
  { group: "Voice: causative", cell: "CON·Figure", keys: ["F:Voice=Cau"] },
  { group: "Reflexive", cell: "REC·Figure", keys: ["F:Reflex=Yes"] },
  { group: "Evidentiality", cell: "EVA·Figure", keys: ["F:Evident=Fh", "F:Evident=Nfh"] },
  { group: "Auxiliary construction", cell: "SYN·Pattern", keys: ["R:aux"] },
  { group: "Negation: clausal", cell: "NUL·Ground", keys: ["F:Polarity=Neg"] },
  { group: "Equative and predicative", cell: "DEF·Figure", keys: ["R:cop"] },
  { group: "Coordination of clauses", cell: "CON·Ground", keys: ["R:conj"] },
  { group: "Counterfactual", cell: "EVA·Ground", keys: ["F:Mood=Cnd"] },
  { group: "Comparison", cell: "DEF·Figure", keys: ["Equ", "Cmp", "Sup"].map((v) => `F:Degree=${v}`) },
  { group: "T/V address", cell: "SIG·Figure", keys: ["F:Polite=Form", "F:Polite=Infm"] },
  { group: "Honorific systems", cell: "DEF·Pattern", keys: ["F:Polite=Elev", "F:Polite=Humb"] },
  { group: "Distributivity", cell: "SEG·Figure", keys: ["F:NumType=Dist"] },
];

// ── categories (identical construction to the first run) ────────────────────────────────────────────────────────────
const CAT = { ids: new Map(), keys: [], chan: [], cell: [], count: [] };
const catId = (key, chan, cell) => { let i = CAT.ids.get(key); if (i === undefined) { i = CAT.keys.length; CAT.ids.set(key, i); CAT.keys.push(key); CAT.chan.push(chan); CAT.cell.push(cell); CAT.count.push(0); } return i; };
const baseOf = (d) => String(d ?? "").split(":")[0];

export function parseSentences(text) {
  const sents = []; let id = null, m = new Map();
  const flush = () => { if (id !== null && m.size) sents.push({ id, cats: Int32Array.from(m.keys()), cnt: Int32Array.from(m.values()) }); id = null; m = new Map(); };
  const add = (chan, key, a) => { if (!a || a.form) return; const c = catId(key, CHAN[chan], cellId(a.cell)); m.set(c, (m.get(c) ?? 0) + 1); CAT.count[c]++; };
  for (const line of text.split("\n")) {
    if (line.startsWith("# sent_id")) { flush(); id = line.split("=")[1].trim(); continue; }
    if (line.startsWith("#")) continue;
    if (!line.trim()) { flush(); continue; }
    const f = line.split("\t"); if (f.length < 8 || !/^\d+$/.test(f[0])) continue;
    add("U", `U:${f[3]}`, addressOfUpos(f[3]));
    const rel = baseOf(f[7]); add("R", `R:${rel}`, addressOfRelation(rel));
    if (f[5] !== "_") for (const kv of f[5].split("|")) {
      const i = kv.indexOf("="); if (i < 1) continue;
      const name = kv.slice(0, i), dim = name.replace(/\[.*\]/, "");
      for (const v of kv.slice(i + 1).split(",")) add("F", `F:${dim}=${v}`, addressOfFeature(name, v));
    }
  }
  flush();
  return sents;
}

const mulberry32 = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const mean = (xs) => { let s = 0, n = 0; for (const x of xs) if (!Number.isNaN(x)) { s += x; n++; } return n ? s / n : NaN; };
const pct = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))))];

export function profiles(sents, cellOf, mask, dims = 27) {
  const n = sents.length, P = new Float64Array(n * dims), N = new Float64Array(n);
  for (let s = 0; s < n; s++) {
    const { cats, cnt } = sents[s];
    for (let k = 0; k < cats.length; k++) { const c = cats[k]; if (!mask[CAT.chan[c]]) continue; P[s * dims + cellOf[c]] += cnt[k]; }
    let ss = 0; for (let d = 0; d < dims; d++) { const v = P[s * dims + d]; ss += v * v; } N[s] = Math.sqrt(ss);
  }
  return { P, N };
}
export function queryAUCs(A, B, dist, D, dims = 27) {
  const n = A.N.length, out = new Float32Array(n).fill(NaN);
  const cos = (i, j) => { let s = 0; const pi = i * dims, pj = j * dims; for (let d = 0; d < dims; d++) s += A.P[pi + d] * B.P[pj + d]; return s / (A.N[i] * B.N[j]); };
  for (let i = 0; i < n; i++) {
    if (A.N[i] === 0 || B.N[i] === 0) continue;
    const sT = cos(i, i); let less = 0, tie = 0, valid = 0;
    for (let k = 0; k < D; k++) { const j = dist[i * D + k]; if (B.N[j] === 0) continue; valid++; const s = cos(i, j); if (s < sT) less++; else if (s === sT) tie++; }
    if (valid) out[i] = (less + 0.5 * tie) / valid;
  }
  return out;
}
const makeDist = (n, D, rand) => { const d = new Int32Array(n * D); for (let i = 0; i < n; i++) for (let k = 0; k < D; k++) { let j = Math.floor(rand() * (n - 1)); if (j >= i) j++; d[i * D + k] = j; } return d; };

/** The kernel's table with the given edit groups applied; `moved` lists only categories whose cell actually changes. */
export function applyEdits(real, edits) {
  const t = Uint8Array.from(real), moved = [];
  for (const e of edits) {
    const target = cellId(e.cell);
    for (let c = 0; c < t.length; c++) {
      const key = CAT.keys[c];
      if ((e.keys ?? []).includes(key) || (e.prefix ?? []).some((p) => key.startsWith(p))) { if (t[c] !== target) { moved.push({ group: e.group, cat: c, key, from: real[c], to: target }); t[c] = target; } }
    }
  }
  return { table: t, moved };
}

/** Random edits matched to `moved` one for one: a category of the same channel and frequency tercile (never an edited one), sent to a random other cell. */
export function matchedRandomTable(real, moved, pools, tercileOf, rand) {
  const t = Uint8Array.from(real), edited = new Set(moved.map((m) => m.cat)), used = new Set(); let fallbacks = 0;
  for (const m of moved) {
    const key = `${CAT.chan[m.cat]}|${tercileOf[m.cat]}`; let pool = pools.get(key).filter((c) => !edited.has(c) && !used.has(c));
    if (!pool.length) { fallbacks++; pool = [...pools.entries()].filter(([k]) => k.startsWith(`${CAT.chan[m.cat]}|`)).flatMap(([, v]) => v).filter((c) => !edited.has(c) && !used.has(c)); }
    const c = pool[Math.floor(rand() * pool.length)]; used.add(c);
    let cell; do { cell = Math.floor(rand() * 27); } while (cell === real[c]);
    t[c] = cell;
  }
  return { table: t, fallbacks };
}

function selftest() {
  let bad = 0; const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) { bad++; console.error(`FAIL ${m}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`); } else console.log(`ok   ${m}`); };
  const text = "# sent_id = s1\n1\tthe\tthe\tDET\t_\tDefinite=Def\t2\tdet\t_\t_\n2\tbig\tbig\tADJ\t_\tDegree=Cmp\t3\tamod\t_\t_\n3\tdog\tdog\tNOUN\t_\tNumber=Sing\t4\tnsubj\t_\t_\n4\tleft\tleave\tVERB\t_\tTense=Past\t0\troot\t_\t_\n";
  const ss = parseSentences(text); CAT.chan = Int8Array.from(CAT.chan);
  const real = Uint8Array.from(CAT.cell);
  const { table, moved } = applyEdits(real, EDITS);
  const cellOfKey = (k) => CELLS[table[CAT.ids.get(k)]];
  eq(cellOfKey("U:ADJ"), "DEF·Figure", "the adjective group moves ADJ to DEF·Figure");
  eq(cellOfKey("F:Definite=Def"), "DEF·Figure", "definiteness moves");
  eq(cellOfKey("F:Degree=Cmp"), "DEF·Figure", "comparison moves");
  eq(CELLS[table[CAT.ids.get("U:NOUN")]], CELLS[real[CAT.ids.get("U:NOUN")]], "an unedited category keeps the kernel's cell");
  eq(moved.every((m) => m.from !== m.to), true, "moved lists only real changes");
  eq(ss.length, 1, "one sentence parsed");
  // matched random edits keep the number of moved categories, never touch an edited one, and stay in the channel
  const ter = new Uint8Array(CAT.keys.length); const pools = new Map(); CAT.keys.forEach((_, c) => { const k = `${CAT.chan[c]}|0`; if (!pools.has(k)) pools.set(k, []); pools.get(k).push(c); });
  const r = matchedRandomTable(real, [{ cat: CAT.ids.get("U:ADJ") }], pools, ter, mulberry32(3));
  eq([...r.table].filter((v, i) => v !== real[i]).length, 1, "one moved category -> one random edit");
  eq(r.table[CAT.ids.get("U:ADJ")], real[CAT.ids.get("U:ADJ")], "the edited category itself is not drawn");
  if (bad) { console.error(`${bad} self-test failure(s)`); process.exit(1); }
  console.log("selftest passed");
}

function run() {
  const langs = new Map();
  for (const d of fs.readdirSync(ROOT).filter((x) => /^UD_.+-PUD$/.test(x)).sort()) {
    const files = fs.readdirSync(path.join(ROOT, d)).filter((f) => f.endsWith(".conllu")); if (!files.length) continue;
    langs.set(d.replace(/^UD_|-PUD$/g, ""), files.flatMap((f) => parseSentences(fs.readFileSync(path.join(ROOT, d, f), "utf8"))));
  }
  const en = langs.get("English"), ids = en.map((s) => s.id), others = [...langs.keys()].filter((l) => l !== "English"), n = ids.length;
  const aligned = new Map([["English", en]]);
  for (const l of others) { const by = new Map(langs.get(l).map((s) => [s.id, s])); aligned.set(l, ids.map((i) => by.get(i) ?? { id: i, cats: new Int32Array(0), cnt: new Int32Array(0) })); }
  CAT.chan = Int8Array.from(CAT.chan); const real = Uint8Array.from(CAT.cell);
  const dist = new Map(others.map((l, k) => [l, makeDist(n, D_PRIMARY, mulberry32(SEED + 100 + k))]));
  const MASK = { A: [true, true, true], B: [false, false, true] };
  const evalTable = (table, mask) => { const E = profiles(en, table, mask), per = {}; for (const l of others) per[l] = queryAUCs(E, profiles(aligned.get(l), table, mask), dist.get(l), D_PRIMARY); return { per, macro: mean(others.map((l) => mean(per[l]))) }; };

  const baseA = evalTable(real, MASK.A), baseB = evalTable(real, MASK.B);
  if (Math.abs(baseA.macro - REPRO_MACRO_A) > 1e-9) throw new Error(`reproduction gate failed: unedited macro AUC ${baseA.macro} != ${REPRO_MACRO_A}; nothing else was run`);

  const { table: edited, moved } = applyEdits(real, EDITS);
  const obsA = evalTable(edited, MASK.A), obsB = evalTable(edited, MASK.B);
  const dA = obsA.macro - baseA.macro, dB = obsB.macro - baseB.macro;

  // paired sentence bootstrap of the difference
  const pairedCI = (base, obs, B, seed) => {
    const r = mulberry32(seed), diffs = []; const idx = {}; for (const l of others) { idx[l] = []; for (let i = 0; i < n; i++) if (!Number.isNaN(base.per[l][i]) && !Number.isNaN(obs.per[l][i])) idx[l].push(i); }
    for (let b = 0; b < B; b++) { const ms = []; for (const l of others) { const v = idx[l]; if (!v.length) continue; let s = 0; for (let k = 0; k < v.length; k++) { const i = v[Math.floor(r() * v.length)]; s += obs.per[l][i] - base.per[l][i]; } ms.push(s / v.length); } diffs.push(mean(ms)); }
    diffs.sort((a, b) => a - b); return [pct(diffs, 0.025), pct(diffs, 0.975)];
  };

  // matched-random-edit null: same number of moved categories, same channels and frequency terciles
  const tercileOf = new Uint8Array(CAT.keys.length), pools = new Map();
  for (const ch of [0, 1, 2]) { const ids2 = CAT.keys.map((_, c) => c).filter((c) => CAT.chan[c] === ch).sort((a, b) => CAT.count[a] - CAT.count[b]); ids2.forEach((c, i) => { tercileOf[c] = Math.floor((3 * i) / ids2.length); }); }
  CAT.keys.forEach((_, c) => { const k = `${CAT.chan[c]}|${tercileOf[c]}`; if (!pools.has(k)) pools.set(k, []); pools.get(k).push(c); });
  const rand = mulberry32(SEED + 500), nullA = [], nullB = []; let fallbacks = 0;
  for (let b = 0; b < B_NULL; b++) { const r = matchedRandomTable(real, moved, pools, tercileOf, rand); fallbacks += r.fallbacks; nullA.push(evalTable(r.table, MASK.A).macro - baseA.macro); nullB.push(evalTable(r.table, MASK.B).macro - baseB.macro); }
  nullA.sort((a, b) => a - b); nullB.sort((a, b) => a - b);
  const nullStats = (v) => ({ n: v.length, mean: mean(v), p025: pct(v, 0.025), p975: pct(v, 0.975), min: v[0], max: v[v.length - 1] });

  // one group at a time (descriptive)
  const groups = EDITS.map((e, k) => {
    const { table, moved: mv } = applyEdits(real, [e]);
    const a = evalTable(table, MASK.A), bb = evalTable(table, MASK.B);
    const tokens = mv.reduce((s, m) => s + CAT.count[m.cat], 0);
    return { group: e.group, to: e.cell, categoriesMoved: mv.map((m) => `${m.key} (${CELLS[m.from]}→${CELLS[m.to]})`), placementsMoved: tokens, deltaA: a.macro - baseA.macro, deltaB: bb.macro - baseB.macro, deltaA_CI95: mv.length ? pairedCI(baseA, a, B_BOOT_GROUP, SEED + 20 + k) : null };
  });

  const res = {
    seed: SEED, reusedSplit: true, languages: [...langs.keys()].length, sentences: n,
    baseline: { A: baseA.macro, B: baseB.macro }, edited: { A: obsA.macro, B: obsB.macro },
    categoriesMoved: moved.length, placementsMoved: moved.reduce((s, m) => s + CAT.count[m.cat], 0), editedCategoriesAbsentFromPUD: EDITS.flatMap((e) => (e.keys ?? []).filter((k) => !CAT.ids.has(k))),
    A: { delta: dA, pairedBootstrapCI95: pairedCI(baseA, obsA, B_BOOT, SEED + 9), matchedRandomNull: nullStats(nullA), pOneSided: (1 + nullA.filter((v) => v >= dA).length) / (B_NULL + 1) },
    B: { delta: dB, pairedBootstrapCI95: pairedCI(baseB, obsB, B_BOOT, SEED + 10), matchedRandomNull: nullStats(nullB), pOneSided: (1 + nullB.filter((v) => v >= dB).length) / (B_NULL + 1) },
    nullFallbacks: fallbacks, groups,
  };
  res.verdict = (dA > res.A.matchedRandomNull.p975 && res.A.pairedBootstrapCI95[0] > 0) ? "SUPPORTED" : "NOT SUPPORTED";
  res.direction = dA < res.A.matchedRandomNull.p025 ? "worse than matched random edits" : dA > 0 ? "above zero" : "at or below zero";
  fs.writeFileSync(path.join(HERE, "RESULTS-SHEET-EDITS-ON-PUD.json"), JSON.stringify(res, null, 1));
  console.log(JSON.stringify({ verdict: res.verdict, direction: res.direction, baselineA: res.baseline.A, editedA: res.edited.A, A: res.A, B: { delta: res.B.delta, ci: res.B.pairedBootstrapCI95, null: res.B.matchedRandomNull, p: res.B.pOneSided }, categoriesMoved: res.categoriesMoved, placementsMoved: res.placementsMoved, absent: res.editedCategoriesAbsentFromPUD.length, fallbacks }, null, 1));
}

if (process.argv.includes("--selftest")) selftest();
else if (import.meta.url === pathToFileURL(process.argv[1]).href) run();
