// attack-A.mjs -- ATTACK A (LEAKAGE AND CONFOUNDS) on rule ablscope-2-company-ircA-c2to6.   node attack-A.mjs --stage compute|analyse   (never pass "run" to name-company.mjs; this file does not import it)
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written BEFORE the first run of this file) ═══
// DISCLOSURE. I have read the confirmer's header, lib-dself.mjs, confirm.en.json (all AUCs), the scoper's lib-data/lib-pairs/features/stats, and impact.mjs windowOf/ablate/windowCompanyModel/companyStructureImpact.
//   I ran design-counts*.mjs / design-fresh.mjs (COUNTS only, no score): confirmer primary pairs 350, |dc| in {0:287, 1:63}; exact-c 287, exact-c+fbin 164, exact-c+fbin+len 70, exact+len+|dln sl|<=.35: 38; strict re-matching (my matcher) gives 304 pairs for
//   exact c + exact fbin (len free, |dln sl|<=.5) and 79 for exact c+fbin+len (|dln sl|<=.7) on the 23 confirmer days; 26 fresh English days (unused by the confirmer and by every earlier test) hold 77 eligible positives.
//   I have NOT computed c.dSelf, R_INIT, or any AUC of mine on any of this. I HAVE seen the confirmer's reported numbers (primary 0.834, R_INIT 0.880, caliper 0.881 on 30 pairs).
// WHAT IS ATTACKED. (L1) the instrument reads something other than the lowercased word forms of the window (speaker field, capitals, list, UPOS, hidden floor); (L2) the matching leaves a confound that, made exact, removes the effect.
// TESTS. L1a: independent re-implementation of c.dSelf from RAW irc text (own parser: lowercase letter/digit/apostrophe tokens of the text after the "<nick> " prefix; own descriptor and l2; no import of impact.mjs) on 120 confirmer members
//   (seeded sample): PASS (no hidden channel) if max |own - stored| <= 1e-6 on >= 100 members.  L1b: static scan of the instrument code path (lib-dself.mjs, impact.mjs windowCompanyModel..companyStructureImpact, lib-pairs.mjs) for the tokens
//   speaker|nick|upos|propn|toUpperCase|isUpper|[A-Z] character classes|wordlist: report every hit (descriptive).  L2a: confirmer pairs filtered to exact c / exact c+fbin / exact c+fbin+len / confirmer caliper: stratified AUC of -dSelf with cluster bootstrap (B=1000).
//   L2b: STRICT RE-MATCHING by my own matcher (lib-strict.mjs: exact c, exact fbin, |ln message-length ratio|<=0.5, len free = S_FB; exact c+fbin+len, <=0.7 = S_FBLEN) on the 23 confirmer days; 150 pairs/cell/day cap; bootstrap B=1000, label-swap perm B=1000.
//   L2c: the same two strict sets on the 26 fresh days (descriptive).  Controls (R_LOGC, R_POS, R_IPOS, R_FB, R_LEN, R_SL) must pool in [0.45,0.55] or the subset is VOID.
// VERDICT RULES (thresholds fixed now). SURVIVES the strict re-matching iff S_FB has >= 100 pairs with AUC(-dSelf) >= 0.65, bootstrap lower bound > 0.58, controls in band, AND S_FBLEN (if >= 60 pairs) AUC >= 0.65 with lower bound > 0.55.
//   FALLS-in-this-respect iff S_FB AUC < 0.58 or its interval includes 0.5. NARROWS iff in between. L1 LEAKS iff L1a max diff > 1e-6 (an input the description does not name) -- L1b is descriptive only.
// BLIND PREDICTIONS. P1 L1a max diff <= 1e-6 (0.92). P2 every L2a rung >= 0.80 (0.75). P3 S_FB AUC in [0.78, 0.90] and controls in band (0.65). P4 R_INIT >= -dSelf on every rung (0.80). P5 fresh-day strict sets have < 25 pairs, uninformative (0.9).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HERE, CONF, RES, headerSha, readJsonl, NEG, groupBy, strat, boot, perm, perStratum, caliperOf, controlAucs, inBand, round, quantile, rngFor, aucPN } from "./lib-atk.mjs";
import { loadIrcDay, indexAndCandidates, pairsStrict, memberLite, IRC_ROOT } from "./lib-strict.mjs";
import { occOf } from "./lib-atk.mjs";
import { seedFor } from "../../impact.mjs";
const SHA = headerSha(fileURLToPath(import.meta.url)), args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const STAGE = opt("--stage", "analyse"), B = Number(opt("--B", 1000)), M = 256, STR = ["c2", "c3", "c4_6"];
const D = JSON.parse(fs.readFileSync(path.join(RES, "days-attack.json"), "utf8"));
const ROWS = path.join(RES, "rows.A-strict.jsonl"), OUT = path.join(RES, "attack-A.json");
const VARIANTS = { S_FB: { exactLen: false, dmMax: 0.5 }, S_FBLEN: { exactLen: true, dmMax: 0.7 } };

// ── compute: strict re-matched pairs with the closed-form instrument ────────────────────────────────────────────────────────────────────────────────────────────────────
function compute() {
  const t0 = Date.now(); fs.writeFileSync(ROWS, "");
  for (const [set, names] of [["conf", D.confEn], ["fresh", D.freshEn]]) for (const n of names) {
    const doc = loadIrcDay(path.join(IRC_ROOT, `${n}.txt`), n), cand = indexAndCandidates(doc, M), occ = occOf(doc), lines = [];
    for (const [vn, vo] of Object.entries(VARIANTS)) for (const st of STR) {
      const ps = pairsStrict(cand, doc, { stratum: st, n: 150, tag: "A", ...vo });
      ps.forEach((p, k) => { const block = `${n}|q${Math.min(3, Math.floor((4 * p.pos.s) / cand.nMsg))}`;
        lines.push(JSON.stringify({ id: `${n}#${vn}${st}#${k}`, set, variant: vn, doc: n, grp: "A", stratum: st, block, p: memberLite(doc, occ, p.pos, M), n: memberLite(doc, occ, p.neg, M) })); });
    }
    fs.appendFileSync(ROWS, lines.map((l) => l + "\n").join(""));
    console.error(`${set} ${n}: ${lines.length} pair-rows, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
}
// ── L1a: independent re-implementation of c.dSelf from RAW irc text ─────────────────────────────────────────────────────────────────────────────────────────────────────
function ownDSelf() {
  const rows = readJsonl(path.join(CONF, "rows.en.jsonl")).filter((r) => r.grp === "A"), rnd = rngFor(seedFor("atk-A", "L1a"));
  const members = rows.flatMap((r) => [r.p, r.n].map((m) => ({ doc: r.doc, m }))); for (let k = members.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [members[k], members[j]] = [members[j], members[k]]; }
  const cache = new Map(), parse = (doc) => { if (cache.has(doc)) return cache.get(doc); const msgs = [];
    for (const line of fs.readFileSync(path.join(IRC_ROOT, `${doc}.txt`), "utf8").split("\n")) { const mt = /^<([^>]+)>\s?(.*)$/.exec(line); if (!mt) continue;
      const toks = (mt[2].match(/[\p{L}\p{M}\p{N}'’]+/gu) ?? []).map((w) => w.replace(/^['’]+|['’]+$/g, "")).filter((w) => w && !/^\p{N}+$/u.test(w)).map((w) => w.normalize("NFC").toLowerCase()); if (toks.length) msgs.push(toks); }
    cache.set(doc, msgs); return msgs; };
  const desc = (sents, w) => { let n = 0, ini = 0, fin = 0; const L = new Map(), R = new Map(), V = new Set();
    for (const s of sents) s.forEach((x, i) => { V.add(x); if (x !== w) return; n++; if (i === 0) ini++; if (i === s.length - 1) fin++; const l = i > 0 ? s[i - 1] : "^", r = i + 1 < s.length ? s[i + 1] : "$"; L.set(l, (L.get(l) ?? 0) + 1); R.set(r, (R.get(r) ?? 0) + 1); });
    return { n, ini, fin, L, R }; };
  return { sample: 120, parse, desc, members: members.slice(0, 120) };
}
function l1a() {
  const { parse, desc, members } = ownDSelf(); let mx = 0, ok = 0, bad = [];
  const ent = (m, V) => { let t = 0; for (const v of m.values()) t += v; let h = 0; for (const v of m.values()) h -= (v / t) * Math.log(v / t); return h / Math.log(V + 1); };
  const vec = (sents, w) => { const d = desc(sents, w), V = Math.max(2, new Set(sents.flat()).size), c = d.n; return [Math.log(1 + c), c ? d.L.size / c : 0, c ? d.R.size / c : 0, c ? ent(d.L, V) : 0, c ? ent(d.R, V) : 0, c ? d.ini / c : 0, c ? d.fin / c : 0]; };
  for (const { doc, m } of members) {
    const msgs = parse(doc), lo = Math.max(0, m.s - M), sents = msgs.slice(lo, m.s + 1), self = m.s - lo, w = sents[self][m.i];
    if (w !== m.w) { bad.push([doc, m.s, m.i, "token mismatch"]); continue; }
    const after = sents.map((a) => a.slice()); after[self].splice(m.i, 1);
    const a = vec(sents, w), b = vec(after, w), l2 = Math.sqrt(a.reduce((t, x, k) => t + (x - b[k]) ** 2, 0)), own = l2 === 0 ? 0 : Math.log2(1 + l2);
    const d = Math.abs(own - m.dSelf); mx = Math.max(mx, d); if (d <= 1e-6) ok++; else bad.push([doc, m.s, m.i, round(own, 8), round(m.dSelf, 8)]);
  }
  return { sample: members.length, within1e6: ok, maxAbsDiff: mx, mismatches: bad.slice(0, 8), pass: ok >= 100 && mx <= 1e-6 };
}
// ── L1b: static scan of the instrument code path ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function l1b() {
  const R = path.join(HERE, "..", ".."), files = { "confirm/lib-dself.mjs": path.join(HERE, "..", "confirm-ablscope-2-company-ircA-c2to6", "lib-dself.mjs"), "ablation-scope/lib-pairs.mjs": path.join(HERE, "..", "ablation-scope", "lib-pairs.mjs"), "ablation-scope/lib-data.mjs(loadIrcDay)": path.join(HERE, "..", "ablation-scope", "lib-data.mjs") };
  const imp = fs.readFileSync(path.join(R, "impact.mjs"), "utf8").split("\n"), a = imp.findIndex((l) => l.startsWith("export function windowCompanyModel")), z = imp.findIndex((l) => l.startsWith("// ─── the perturbation"));
  const src = { ...Object.fromEntries(Object.entries(files).map(([k, f]) => [k, fs.readFileSync(f, "utf8").split("\n")])), "impact.mjs windowCompanyModel..ablate": imp.slice(a, z) };
  const pat = /speaker|nick|upos|propn|toUpperCase|isUpper|\\p\{Lu\}|\[A-Z\]|wordlist|stoplist|function[_ ]?words/i, hits = {};
  for (const [k, ls] of Object.entries(src)) { hits[k] = []; ls.forEach((l, n) => { if (pat.test(l)) hits[k].push(`${n + 1}: ${l.trim().slice(0, 150)}`); }); }
  return hits;
}
// ── L2: ladders ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const evalSet = (pairs, seed) => { const f = (ps) => strat(ps, NEG), fi = (ps) => strat(ps, (m) => m.R_INIT), bt = boot(pairs, f, { B, seed }), bi = boot(pairs, fi, { B, seed: seed + 1 }), ctl = controlAucs(pairs);
  return { pairs: pairs.length, aucNegDSelf: bt.point, ci: [bt.lo, bt.hi], aucRInit: bi.point, ciRInit: [bi.lo, bi.hi], perStratum: perStratum(pairs, NEG), controls: ctl, controlsInBand: inBand(ctl), days: new Set(pairs.map((x) => x.doc)).size }; };
function ladders() {
  const conf = readJsonl(path.join(CONF, "rows.en.jsonl")).filter((r) => r.grp === "A" && STR.includes(r.stratum)), d = (r, k) => r.p[k] - r.n[k];
  const rungs = { all350: () => true, exactC: (r) => r.p.c === r.n.c, exactC_FB: (r) => r.p.c === r.n.c && r.p.R_FB === r.n.R_FB, exactC_FB_LEN: (r) => r.p.c === r.n.c && r.p.R_FB === r.n.R_FB && r.p.R_LEN === r.n.R_LEN,
    confirmerCaliper: null }, out = {}; let sd = 11;
  for (const [k, f] of Object.entries(rungs)) { const ps = f ? conf.filter(f) : caliperOf(conf); out[k] = ps.length >= 20 ? evalSet(ps, sd++) : { pairs: ps.length }; }
  return out;
}
function analyse() {
  const t0 = Date.now(), res = { ruleId: "ablscope-2-company-ircA-c2to6", attack: "A leakage and confounds", headerSha256: SHA, B, M };
  res.L1a_independentInstrument = l1a(); res.L1b_staticScan = l1b(); res.L2a_confirmerLadders = ladders();
  const rows = readJsonl(ROWS), strict = {};
  for (const set of ["conf", "fresh"]) for (const vn of Object.keys(VARIANTS)) {
    const ps = rows.filter((r) => r.set === set && r.variant === vn);
    if (ps.length < 8) { strict[`${set}.${vn}`] = { pairs: ps.length }; continue; }
    const e = evalSet(ps, 31 + ps.length), pm = perm(ps, (q) => strat(q, NEG), { B, seed: 5 }); e.permQ95 = pm.q95; e.permP = pm.p;
    const ri = ps.filter((x) => x.p.R_INIT === x.n.R_INIT); e.tiesOnRInit = { pairs: ri.length, aucNegDSelf: ri.length >= 8 ? round(strat(ri, NEG)) : null };
    const dc = ps.map((x) => Math.abs(x.p.c - x.n.c)); e.maxAbsDc = Math.max(...dc); e.exactCShare = round(dc.filter((v) => v === 0).length / dc.length);
    strict[`${set}.${vn}`] = e;
  }
  res.L2bc_strictRematch = strict;
  const sf = strict["conf.S_FB"], sl = strict["conf.S_FBLEN"], conds = [];
  const pass1 = sf.pairs >= 100 && sf.aucNegDSelf >= 0.65 && sf.ci[0] > 0.58 && sf.controlsInBand, pass2 = sl.pairs < 60 || (sl.aucNegDSelf >= 0.65 && sl.ci[0] > 0.55);
  res.verdictA = { survivesStrictRematch: pass1 && pass2, S_FB: { pass: pass1 }, S_FBLEN: { pass: pass2, nOrSkipped: sl.pairs }, falls: sf.aucNegDSelf < 0.58 || sf.ci[0] <= 0.5, leaks: !res.L1a_independentInstrument.pass };
  res.analyseSeconds = round((Date.now() - t0) / 1000, 1);
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res.verdictA), JSON.stringify(res.L1a_independentInstrument));
}
if (STAGE === "compute" || STAGE === "both") compute();
if (STAGE === "analyse" || STAGE === "both") analyse();
