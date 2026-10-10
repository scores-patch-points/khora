// eval/law/provisional/ablation-scope/rinit-plain.mjs — the PLAIN count behind the two ablation rules, on fresh channels, other languages and other novels. No reader, no ablation.
//
//   node rinit-plain.mjs --out results/rinit-plain.json [--B 1000] [--n 40]
//
// ═══ PRE-REGISTRATION (written before this script was first run; the observable was nominated post hoc by rival-scope.mjs, so this is a hold-out for a post-hoc idea) ═══
// OBSERVABLE (fixed, direction fixed here). R_INIT(token) = among the occurrences of the token's form inside the reader's window [s-M, s] (M=256 messages for IRC, 128 sentences for novels; the evaluated occurrence included),
// the share that open their message / sentence. No capital, no list, no reader, no ablation. Orientation: HIGHER = name, in both position groups (group A = the evaluated token itself opens its message, group B = it does not).
// WHY. In the IRC confirmation (8 fresh days) the frozen ablation scores were beaten or equalled by this count inside their frozen scopes: IRC B c4_6..c16p R_INIT 0.931 [0.905, 0.958] vs S_ENTRY 0.821; IRC A c2..c4_6 R_INIT 0.812
// vs -c.dSelf 0.813 (results/rival-scope.json, post hoc). On Middlemarch A/B (results/rivals-company.json): 0.80 / 0.65. The user's two beliefs make this the natural next test: a name has a specific shape, perhaps by language family,
// and is known by its company. R_INIT is a statement about positional company.
// DATA (all unseen by any ablation analysis of this lens; the English IRC days are the 8 confirmation days, kept as the baseline). IRC channel-days: ubuntu/kubuntu English (8 confirmation days + kubuntu/2007-03-15 unused by any
//   registered test), ubuntu-de (2011-07-15), ubuntu-es (2010-11-15, 2011-03-15), ubuntu-it (2010-11-15, 2011-03-15, 2012-03-15, 2013-03-15, 2013-07-15, 2014-03-15): gold = the nicknames that spoke >= 3 messages that day (speaker field,
//   evaluation only). Novels: Great Expectations, Little Women (Gutenberg; gold = forms capitalised in >= 95% of >= 8 non-initial occurrences, evaluation only). Matching v3, strata c2..c16p, groups A and B, <= n pairs per cell per document.
// TESTS. For each (corpus group, position group): stratified AUC of R_INIT over c2..c16p (pair-weighted), cluster bootstrap (document x quartile; 20 blocks for a single document) 95% interval, within-pair permutation q95,
//   pooled controls (R_LOGC, R_POS, R_IPOS, R_FB, R_LEN, R_SL) each in [0.45, 0.55] (else VOID), AUC per stratum, AUC pooled over c4_6..c16p.
// HOLDS (a corpus group, position group): not VOID, AUC >= 0.62, lower bound > 0.55, above the permutation q95, >= 60 pairs. Scope claim = the list of corpus groups where it holds.
// BLIND PREDICTIONS (belief). H1 English fresh (baseline): B >= 0.85 and A >= 0.78 (0.85). H2 German, Spanish and Italian IRC: B >= 0.80 (0.60) and A >= 0.75 (0.55): the vocative slot is a chat convention, not an English one.
// H3 novels (Great Expectations, Little Women): B in [0.55, 0.72] (0.55), A >= 0.75 (0.5). H4 the fresh kubuntu day agrees with the confirmation days within 0.08 (0.75).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

// ═══ AMENDMENT A1 (after the first run of this script, whose results/rinit-plain.json is kept as rinit-plain.first.json) ═══════════════════════════════════════════════════════════════
// The first run had pooled controls out of band for most non-English groups (form-frequency bin AUC 0.38-0.44: the matched negatives are more frequent over the day than the names; small days, few pairs). They are VOID by the
// registered rule. The amendment ADDS a strict-caliper analysis to every group (pairs with identical form-frequency bin, identical length, |ln message-length ratio| <= 0.25): AUC, interval, controls on that subset, and a
// verdict computed on it with the same thresholds. It changes no registered quantity.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { loadIrcDay, IRC_ROOT } from "./lib-data.mjs";
import { loadBookCaps } from "./lib-book2.mjs";
import { indexAndCandidates, pairsForCellV3 } from "./lib-pairs.mjs";
import { controlScores, CONTROLS } from "./features.mjs";
import { aucPairs, stratAuc, bootStrat, permStrat, round } from "./stats.mjs";
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const OUTF = opt("--out", "results/rinit-plain.json"), B = Number(opt("--B", 1000)), NPER = Number(opt("--n", 40));
const BK = "/Users/mlacy/Documents/3.0/ethos/01-literature-books/gitenberg";
const GROUPS = {
  "en-irc-confirmation": ["kubuntu/2006-03-15", "ubuntu/2006-03-15", "ubuntu/2007-07-15", "ubuntu/2009-03-15", "ubuntu/2011-03-15", "ubuntu/2011-07-15", "ubuntu/2012-03-15", "ubuntu/2013-07-15"].map((d) => ["irc", d]),
  "en-irc-fresh": [["irc", "kubuntu/2007-03-15"]],
  "de-irc": [["irc", "ubuntu-de/2011-07-15"]],
  "es-irc": ["ubuntu-es/2010-11-15", "ubuntu-es/2011-03-15"].map((d) => ["irc", d]),
  "it-irc": ["ubuntu-it/2010-11-15", "ubuntu-it/2011-03-15", "ubuntu-it/2012-03-15", "ubuntu-it/2013-03-15", "ubuntu-it/2013-07-15", "ubuntu-it/2014-03-15"].map((d) => ["irc", d]),
  "great-expectations": [["book", `${BK}/pg1400_Great-Expectations.txt`]],
  "little-women": [["book", `${BK}/pg514_Little-Women.txt`]],
};
const STR = ["c2", "c3", "c4_6", "c7_15", "c16p"];
const ent = (m) => { let t = 0; for (const v of m.values()) t += v; let h = 0; for (const v of m.values()) h -= (v / t) * Math.log(v / t); return h; };
function member(r, doc, occ, M) {
  const list = (occ.get(r.w) ?? []).filter(([s]) => s >= r.s - M && s <= r.s); let init = 0; for (const [s, i] of list) if (i === 0) init += 1;
  return { ...controlScores(r), R_INIT: init / list.length, isNull: false };
}
async function main() {
  const t0 = Date.now(), out = { B, nPerCell: NPER, groups: {} };
  for (const [gname, docs] of Object.entries(GROUPS)) {
    const pairs = [];
    for (const [kind, ref] of docs) {
      const doc = kind === "irc" ? loadIrcDay(path.join(IRC_ROOT, `${ref}.txt`), ref) : loadBookCaps(ref, path.basename(ref));
      const M = kind === "irc" ? 256 : 128, cand = indexAndCandidates(doc, M), occ = new Map(); doc.stream.forEach((sent, s) => sent.forEach((w, i) => { (occ.get(w) ?? occ.set(w, []).get(w)).push([s, i]); }));
      const nDocs = docs.length, K = nDocs <= 2 ? 20 : 4;
      for (const grp of ["A", "B"]) for (const st of STR) {
        const r = pairsForCellV3(cand, doc, M, { grp, stratum: st, n: NPER, seedTag: "rinit" });
        for (const p of r.pairs) pairs.push({ grp, stratum: st, doc: doc.name, block: `${doc.name}|q${Math.min(K - 1, Math.floor((K * p.pos.s) / cand.nMsg))}`, p: member(p.pos, doc, occ, M), n: member(p.neg, doc, occ, M) });
      }
      console.error(`${gname}: ${doc.name} done, pairs so far ${pairs.length}, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
    const res = {};
    for (const grp of ["A", "B"]) {
      const by = Object.fromEntries(STR.map((st) => [st, pairs.filter((x) => x.grp === grp && x.stratum === st)])), n = Object.values(by).flat().length;
      if (n < 20) { res[grp] = { n, skipped: "too few pairs" }; continue; }
      const f = (m) => m.R_INIT, b = bootStrat(by, f, { B, seed: 11 }), pm = permStrat(by, f, { B, seed: 12 });
      const ctl = Object.fromEntries(CONTROLS.map((c) => [c, round(stratAuc(by, (m) => m[c]))]));
      const hi = Object.fromEntries(["c4_6", "c7_15", "c16p"].map((s) => [s, by[s]])), bh = Object.values(hi).flat().length >= 20 ? bootStrat(hi, f, { B, seed: 13 }) : null;
      const inBand = Object.values(ctl).every((v) => v >= 0.45 && v <= 0.55);
      res[grp] = { pairs: n, auc: b.point, ci: [b.lo, b.hi], permQ95: pm.q95, controls: ctl, controlsInBand: inBand, perStratum: Object.fromEntries(STR.map((st) => [st, by[st].length >= 8 ? [round(aucPairs(by[st], f)), by[st].length] : null])), aucC4plus: bh ? [bh.point, bh.lo, bh.hi, Object.values(hi).flat().length] : null,
        holds: inBand && b.point >= 0.62 && b.lo > 0.55 && b.point > pm.q95 && n >= 60, verdict: !inBand ? "VOID" : (b.point >= 0.62 && b.lo > 0.55 && b.point > pm.q95 && n >= 60) ? "HOLDS" : "DOES NOT HOLD" };
    }
    for (const grp of ["A", "B"]) {   // A1: strict-caliper subset (identical form-frequency bin, identical length, |ln message-length ratio| <= 0.25)
      if (!res[grp] || res[grp].skipped) continue;
      const cal = Object.fromEntries(STR.map((st) => [st, pairs.filter((x) => x.grp === grp && x.stratum === st && x.p.R_FB === x.n.R_FB && x.p.R_LEN === x.n.R_LEN && Math.abs(x.p.R_SL - x.n.R_SL) <= 0.25)])), nc = Object.values(cal).flat().length;
      if (nc < 20) { res[grp].caliper = { pairs: nc, skipped: "too few" }; continue; }
      const f = (m) => m.R_INIT, b = bootStrat(cal, f, { B, seed: 21 }), pm = permStrat(cal, f, { B, seed: 22 }), ctl = Object.fromEntries(CONTROLS.map((c) => [c, round(stratAuc(cal, (m) => m[c]))])), inBand = Object.values(ctl).every((v) => v >= 0.45 && v <= 0.55);
      res[grp].caliper = { pairs: nc, auc: b.point, ci: [b.lo, b.hi], permQ95: pm.q95, controls: ctl, controlsInBand: inBand, verdict: !inBand ? "VOID" : (b.point >= 0.62 && b.lo > 0.55 && b.point > pm.q95 && nc >= 60) ? "HOLDS" : "DOES NOT HOLD" };
    }
    out.groups[gname] = res; console.error(`${gname}: A ${JSON.stringify(res.A?.auc)} ${res.A?.verdict}  B ${JSON.stringify(res.B?.auc)} ${res.B?.verdict}`);
  }
  out.headerSha256 = createHash("sha256").update(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]).digest("hex");
  out.seconds = round((Date.now() - t0) / 1000, 1);
  fs.writeFileSync(OUTF, JSON.stringify(out, null, 1)); console.log(JSON.stringify({ file: OUTF, headerSha256: out.headerSha256 }));
}
await main();
