// grain-rank-test.mjs — does GRAIN BY CLAUSE RANK agree with GRAIN BY FEATURE?
// Preregistered in PREREG-GRAIN-BY-CLAUSE-RANK.md; frozen in FREEZE-GRAIN-BY-CLAUSE-RANK.md before the one run.
//
// The proposal under test (Talmy on complex sentences, Hopper on foreground and background): a clause's rank sets the
// grain of what it carries — a main clause is Figure, an adjunct (background) clause is Ground. The repo today gives a
// grammatical feature value its grain from a table (kernel/cube.js CELL_OF_GRAMMAR, measured on Ancient Greek;
// kernel/universal-grammar.js, declared for the rest). This script asks whether the two grains agree on text neither
// table was built from, beyond what chance and the part of speech already explain.
//
//   node grain-rank-test.mjs --selftest   synthetic sentences only; touches no corpus
//   node grain-rank-test.mjs              the one run over CorefUD 1.3 dev
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { addressOfFeature } from "../../../native/kernel/universal-grammar.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = process.env.COREFUD_DATA ?? "/Users/mlacy/Downloads/workspace/corefud/CorefUD-1.3-public/data";
// The measured table was tallied on UD Ancient Greek PROIEL, so that treebank is not held out.
const EXCLUDE = Object.freeze({ "CorefUD_Ancient_Greek-PROIEL": "the measured grammar table (cube.js CELL_OF_GRAMMAR) was tallied on this treebank" });
const SEED = 20261123, B_BOOT = 1000, B_NULL = 200;

// ── clause rank, declared in the prereg ─────────────────────────────────────────────────────────────────────────────
const MAIN_REL = new Set(["root", "parataxis"]);        // the story line (a loosely joined clause is a main clause)
const ADJUNCT_REL = new Set(["advcl", "acl"]);          // background: adverbial clauses, relative and other clausal modifiers
const ARGUMENT_REL = new Set(["ccomp", "xcomp", "csubj"]); // a clause serving as an argument: neither Figure nor Ground in the sources
const baseOf = (d) => String(d ?? "").split(":")[0];

/** The rank of the clause a token belongs to: the nearest ancestor-or-self whose relation is clausal. conj and every
 *  non-clausal relation pass to the head (coordination shares its conjunct's rank). */
export function clauseRankOf(byId, row) {
  let n = row;
  for (let depth = 0; depth < 60 && n; depth++) {
    const b = baseOf(n.deprel);
    if (n.head === 0 || b === "root" || MAIN_REL.has(b)) return "main";
    if (ADJUNCT_REL.has(b)) return "adjunct";
    if (ARGUMENT_REL.has(b)) return "argument";
    n = byId.get(n.head);
  }
  return "unresolved";
}

/** Cohen's kappa of a 2x2 [n00,n01,n10,n11]; NaN when a margin is empty (chance agreement undefined). */
export function kappa(n00, n01, n10, n11) {
  const n = n00 + n01 + n10 + n11;
  const r0 = n00 + n01, r1 = n10 + n11, c0 = n00 + n10, c1 = n01 + n11;
  if (!n || !r0 || !r1 || !c0 || !c1) return NaN;
  const po = (n00 + n11) / n, pe = (r0 * c0 + r1 * c1) / (n * n);
  return (po - pe) / (1 - pe);
}
const agreement = (n00, n01, n10, n11) => {
  const n = n00 + n01 + n10 + n11; if (!n) return { po: NaN, pe: NaN };
  const r0 = n00 + n01, r1 = n10 + n11, c0 = n00 + n10, c1 = n01 + n11;
  return { po: (n00 + n11) / n, pe: (r0 * c0 + r1 * c1) / (n * n) };
};

const mulberry32 = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const pct = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))))];

function* sentencesOf(file) {
  let rows = [];
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (line.startsWith("#")) continue;
    if (!line.trim()) { if (rows.length) { yield rows; rows = []; } continue; }
    const f = line.split("\t");
    if (f.length < 8 || !/^\d+$/.test(f[0])) continue; // skip multiword ranges and empty nodes
    rows.push({ id: +f[0], form: f[1], upos: f[3], feats: f[5], head: +f[6], deprel: f[7] });
  }
  if (rows.length) yield rows;
}

const placeCache = new Map();
const place = (name, value) => { const k = `${name}=${value}`; if (!placeCache.has(k)) placeCache.set(k, addressOfFeature(name, value)); return placeCache.get(k); };
const GRAIN_CODE = { Figure: 0, Ground: 1, Pattern: 2 };
const RANK_CODE = { main: 0, adjunct: 1, argument: 2 };

// ── selftest: synthetic sentences, no corpus ────────────────────────────────────────────────────────────────────────
function selftest() {
  let bad = 0; const eq = (a, b, m) => { if (a !== b) { bad++; console.error(`FAIL ${m}: ${a} !== ${b}`); } else console.log(`ok   ${m}`); };
  const R = (id, head, deprel) => ({ id, head, deprel });
  const rk = (rows, id) => clauseRankOf(new Map(rows.map((r) => [r.id, r])), rows.find((r) => r.id === id));
  const s1 = [R(1, 2, "nsubj"), R(2, 0, "root"), R(3, 5, "mark"), R(4, 5, "nsubj"), R(5, 2, "advcl")]; // She left because it rained
  eq(rk(s1, 1), "main", "subject of the main clause"); eq(rk(s1, 2), "main", "root"); eq(rk(s1, 5), "adjunct", "advcl head");
  eq(rk(s1, 3), "adjunct", "subordinator of an advcl"); eq(rk(s1, 4), "adjunct", "subject of an advcl");
  const s2 = [R(1, 2, "nsubj"), R(2, 0, "root"), R(3, 2, "cc"), R(4, 2, "conj")]; // He came and went
  eq(rk(s2, 4), "main", "conj of the root shares the main rank");
  const s3 = [R(1, 2, "nsubj"), R(2, 0, "root"), R(3, 4, "mark"), R(4, 2, "ccomp"), R(5, 4, "nsubj"), R(6, 4, "advcl"), R(7, 6, "nsubj")]; // He said that she left because ...
  eq(rk(s3, 4), "argument", "ccomp head"); eq(rk(s3, 5), "argument", "subject of a ccomp"); eq(rk(s3, 6), "adjunct", "advcl inside a ccomp is the nearest clause"); eq(rk(s3, 7), "adjunct", "subject of that advcl");
  const s4 = [R(1, 2, "acl:relcl"), R(2, 3, "obj"), R(3, 0, "root")]; // relative clause on an object
  eq(rk(s4, 1), "adjunct", "relative clause (acl:relcl)"); eq(rk(s4, 2), "main", "the modified noun is in the main clause");
  const s5 = [R(1, 2, "dep"), R(2, 1, "dep")]; eq(rk(s5, 1), "unresolved", "a head cycle is unresolved, never guessed");
  eq(rk([R(1, 0, "parataxis")], 1), "main", "parataxis is a main clause");
  eq(kappa(25, 25, 25, 25).toFixed(3), "0.000", "kappa of independence"); eq(kappa(50, 0, 0, 50).toFixed(3), "1.000", "kappa of identity"); eq(Number.isNaN(kappa(10, 0, 5, 0)), true, "kappa undefined on an empty margin");
  if (bad) { console.error(`${bad} self-test failure(s)`); process.exit(1); }
  console.log("selftest passed");
}

// ── the one run ─────────────────────────────────────────────────────────────────────────────────────────────────────
function run() {
  const rand = mulberry32(SEED);
  const uposCode = new Map(); const code = (u) => { if (!uposCode.has(u)) uposCode.set(u, uposCode.size); return uposCode.get(u); };
  const langs = [];
  const unplaced = new Map(), byValue = new Map(); // pooled descriptive tables
  const stats = { unresolvedTokens: 0, tokens: 0, formFeatures: 0 };

  for (const dir of fs.readdirSync(DATA).filter((d) => d.startsWith("CorefUD_")).sort()) {
    if (EXCLUDE[dir]) { langs.push({ name: dir, excluded: EXCLUDE[dir] }); continue; }
    const files = fs.readdirSync(path.join(DATA, dir)).filter((f) => f.endsWith("-dev.conllu"));
    if (!files.length) { langs.push({ name: dir, excluded: "no dev file" }); continue; }
    const L = { name: dir, nSent: 0, nTok: 0, sid: [], r: [], f: [], u: [], m: [] }; // per instance: sentence, rank, feature grain, upos, measured?
    for (const file of files) for (const rows of sentencesOf(path.join(DATA, dir, file))) {
      const byId = new Map(rows.map((r) => [r.id, r])); const sid = L.nSent++;
      for (const row of rows) {
        L.nTok++; stats.tokens++;
        if (!row.feats || row.feats === "_") continue;
        const rank = clauseRankOf(byId, row);
        if (rank === "unresolved") { stats.unresolvedTokens++; continue; }
        for (const kv of row.feats.split("|")) {
          const i = kv.indexOf("="); if (i < 1) continue;
          const name = kv.slice(0, i);
          for (const v of kv.slice(i + 1).split(",")) {
            const a = place(name, v);
            if (!a) { const k = `${name}=${v}`; unplaced.set(k, (unplaced.get(k) ?? 0) + 1); continue; }
            if (a.form) { stats.formFeatures++; continue; }
            const dv = `${name.replace(/\[.*\]/, "")}=${v}`;
            if (!byValue.has(dv)) byValue.set(dv, { cell: a.cell, basis: a.basis, main: 0, adjunct: 0, argument: 0 });
            byValue.get(dv)[rank]++;
            L.sid.push(sid); L.r.push(RANK_CODE[rank]); L.f.push(GRAIN_CODE[a.grain]); L.u.push(code(row.upos)); L.m.push(a.basis === "measured" ? 1 : 0);
          }
        }
      }
    }
    langs.push(L);
  }

  // Analyses: which instances, and how a rank becomes a grain (main -> Figure 0, adjunct -> Ground 1; an argument clause only in the sensitivity).
  const ANALYSES = {
    primary: { what: "measured table values with a Ground or Figure grain; main and adjunct clauses", keep: (m, f, r) => m === 1 && f < 2 && r < 2, rg: (r) => r },
    secondary: { what: "every placed value (measured and declared) with a Ground or Figure grain; main and adjunct clauses", keep: (m, f, r) => f < 2 && r < 2, rg: (r) => r },
    sensitivity: { what: "primary, with argument clauses counted as Figure", keep: (m, f, r) => m === 1 && f < 2, rg: (r) => (r === 1 ? 1 : 0) },
  };
  const used = langs.filter((l) => !l.excluded);

  const perSentence = (L, an) => {
    const c = new Int32Array(4 * L.nSent);
    for (let i = 0; i < L.sid.length; i++) if (an.keep(L.m[i], L.f[i], L.r[i])) c[4 * L.sid[i] + 2 * an.rg(L.r[i]) + L.f[i]]++;
    return c;
  };
  const totals = (c) => { const t = [0, 0, 0, 0]; for (let i = 0; i < c.length; i += 4) { t[0] += c[i]; t[1] += c[i + 1]; t[2] += c[i + 2]; t[3] += c[i + 3]; } return t; };

  const out = { seed: SEED, B_BOOT, B_NULL, stats, unplacedTop: [...unplaced].sort((a, b) => b[1] - a[1]).slice(0, 15), excluded: langs.filter((l) => l.excluded).map((l) => ({ name: l.name, why: l.excluded })), analyses: {} };

  for (const [key, an] of Object.entries(ANALYSES)) {
    const per = used.map((L) => ({ L, c: perSentence(L, an) })).map((x) => ({ ...x, t: totals(x.c) }));
    const rows = per.map((x) => ({ language: x.L.name, instances: x.t.reduce((a, b) => a + b, 0), counts: x.t, kappa: kappa(...x.t), ...agreement(...x.t) }));
    const defined = per.filter((x) => !Number.isNaN(kappa(...x.t)));
    const macro = mean(defined.map((x) => kappa(...x.t)));
    const pooled = totals(Int32Array.from(per.flatMap((x) => x.t)));
    // sentence bootstrap, per language, macro over the languages defined in the observed data
    const boots = [];
    for (let b = 0; b < B_BOOT; b++) {
      const ks = [];
      for (const x of defined) {
        const n = x.L.nSent, t = [0, 0, 0, 0];
        for (let s = 0; s < n; s++) { const j = 4 * Math.floor(rand() * n); t[0] += x.c[j]; t[1] += x.c[j + 1]; t[2] += x.c[j + 2]; t[3] += x.c[j + 3]; }
        const k = kappa(...t); if (!Number.isNaN(k)) ks.push(k);
      }
      boots.push(mean(ks));
    }
    boots.sort((a, b) => a - b);
    const res = { what: an.what, languagesUsed: defined.length, languagesUndefined: per.length - defined.length, macroKappa: macro, macroKappaCI95: [pct(boots, 0.025), pct(boots, 0.975)], pooledKappa: kappa(...pooled), pooledCounts: pooled, macroPo: mean(defined.map((x) => agreement(...x.t).po)), macroPe: mean(defined.map((x) => agreement(...x.t).pe)), positiveLanguages: defined.filter((x) => kappa(...x.t) > 0).length, perLanguage: rows };

    if (key === "primary") {
      // stratified null: shuffle the feature grain within (language, part of speech), keep each instance's clause rank
      const prep = defined.map((x) => {
        const idx = []; for (let i = 0; i < x.L.sid.length; i++) if (an.keep(x.L.m[i], x.L.f[i], x.L.r[i])) idx.push(i);
        const groups = new Map(); for (const i of idx) { const u = x.L.u[i]; if (!groups.has(u)) groups.set(u, []); groups.get(u).push(i); }
        return [...groups.values()].map((g) => ({ rg: Uint8Array.from(g.map((i) => an.rg(x.L.r[i]))), fg: Uint8Array.from(g.map((i) => x.L.f[i])) }));
      });
      const nullMacro = [];
      for (let b = 0; b < B_NULL; b++) {
        const ks = [];
        for (const groups of prep) {
          const t = [0, 0, 0, 0];
          for (const g of groups) {
            const fg = g.fg; for (let i = fg.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const tmp = fg[i]; fg[i] = fg[j]; fg[j] = tmp; }
            for (let i = 0; i < fg.length; i++) t[2 * g.rg[i] + fg[i]]++;
          }
          const k = kappa(...t); if (!Number.isNaN(k)) ks.push(k);
        }
        nullMacro.push(mean(ks));
      }
      nullMacro.sort((a, b) => a - b);
      res.nullStratifiedByPos = { mean: mean(nullMacro), p975: pct(nullMacro, 0.975), p025: pct(nullMacro, 0.025), pValue: (1 + nullMacro.filter((v) => v >= macro).length) / (B_NULL + 1) };
      res.verdict = (res.macroKappaCI95[0] > 0 && macro > res.nullStratifiedByPos.p975) ? "SUPPORTED" : "NOT SUPPORTED";
    }
    out.analyses[key] = res;
  }

  // Ceiling: what share of placed instances the two-way rule can never reach (Pattern grain), measured table and all.
  const share = (pred) => { let all = 0, pat = 0; for (const L of used) for (let i = 0; i < L.f.length; i++) if (pred(L.m[i])) { all++; if (L.f[i] === 2) pat++; } return { instances: all, patternShare: all ? pat / all : NaN }; };
  out.patternShare = { measured: share((m) => m === 1), all: share(() => true) };
  out.byValue = [...byValue].map(([k, v]) => ({ value: k, ...v, share_adjunct_of_main_or_adjunct: v.main + v.adjunct ? v.adjunct / (v.main + v.adjunct) : NaN })).sort((a, b) => (b.main + b.adjunct + b.argument) - (a.main + a.adjunct + a.argument));
  fs.writeFileSync(path.join(HERE, "RESULTS-GRAIN-BY-CLAUSE-RANK.json"), JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ verdict: out.analyses.primary.verdict, primary: { macroKappa: out.analyses.primary.macroKappa, ci: out.analyses.primary.macroKappaCI95, null: out.analyses.primary.nullStratifiedByPos, languages: out.analyses.primary.languagesUsed, positive: out.analyses.primary.positiveLanguages }, secondary: { macroKappa: out.analyses.secondary.macroKappa, ci: out.analyses.secondary.macroKappaCI95 }, sensitivity: { macroKappa: out.analyses.sensitivity.macroKappa, ci: out.analyses.sensitivity.macroKappaCI95 }, patternShare: out.patternShare }, null, 1));
}

if (process.argv.includes("--selftest")) selftest();
else if (import.meta.url === pathToFileURL(process.argv[1]).href) run();
