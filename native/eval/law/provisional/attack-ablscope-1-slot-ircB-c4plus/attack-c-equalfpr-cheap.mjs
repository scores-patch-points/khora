// attack-c-equalfpr-cheap.mjs -- CHEAP-OBSERVABLE RIVALS AS FLAGS AT THE SAME FALSE-ALARM RATE as S_ENTRY >= 1, on rule "ablscope-1-slot-ircB-c4plus" (post-hoc follow-up to attack-ac-followup.mjs).
//   node attack-c-equalfpr-cheap.mjs      (same stored reads; writes results/attack-c-equalfpr-cheap.json)
// ═══ PRE-REGISTRATION (the sha256 of everything above the END marker goes into the output) ═══
// WRITTEN after attacks A, B, C and the follow-up were run; BEFORE any statistic of this file. DISCLOSURE: in the day-adjusted natural population (follow-up F1, names vs natural unlabelled, cells day x stratum) the AUC of S_ENTRY is 0.726 while document frequency (lower = name) is 0.736 and the
//   frequency bin (lower = name) 0.725, i.e. UNMATCHED a cheap form-frequency observable reproduces the rule's AUC within 0.03. The rule only claims the matched comparison, but a reader may use it unmatched. This file compares OPERATING POINTS: at the weighted natural false-alarm rate of S_ENTRY >= 1 (per stratum, natural rows
//   reweighted to the day x stratum composition of the names, as in F1), the sensitivity of the best one-sided threshold of each cheap observable.
// DECISION: a cheap observable REPRODUCES the flag if its sensitivity at equal FPR >= sensitivity of S_ENTRY >= 1 minus 0.05 (pooled over strata, weighted by names). Directions as found in F1 (document frequency, frequency bin, in-message index, message length: lower = name; burst, character length: higher = name; log local count: lower = name).
//   If none reproduces it, the unmatched-AUC coincidence is not an operating-point rival; if one does, the rule falls to that observable in unmatched use.
// BLIND PREDICTION: none reproduces it: 0.85 (cheap observables at 0.6% FPR have sensitivity <= 0.15).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { HERE, CONF, ST4, loadTokens, readMaps, round, sEntry, blockOf } from "./lib-a.mjs";
const { tokens: confTokens } = loadTokens(), reads = readMaps([path.join(CONF, "data", "read"), path.join(HERE, "data", "read-a2")]);
const a2 = JSON.parse(fs.readFileSync(path.join(HERE, "data", "design-a2.json"), "utf8")).tokens.flatMap((t) => { const rec = reads.get(`${t.doc}|${t.cond}`)?.get(`${t.s}:${t.i}`); return rec ? [{ ...t, S: sEntry(rec.counts), block: blockOf(t) }] : []; });
const ENG = ["E_CORE", "E_SRV", "E_REUSE"], rowMap = new Map(), add = (t) => { const k = `${t.doc}|${t.s}:${t.i}`; if (!rowMap.has(k)) rowMap.set(k, t); };
for (const t of confTokens) if (ENG.includes(t.arm) && t.cond === "real" && t.grp === "B" && ST4.includes(t.stratum)) add(t);
for (const t of a2) if (t.grp === "B" && ST4.includes(t.stratum)) add(t);
const rows = [...rowMap.values()], pos = rows.filter((r) => r.y === 1), nat = rows.filter((r) => r.y === 0 && r.kind === "nat"), cell = (r) => `${r.doc}|${r.stratum}`;
const OBS = { docfreq: (r) => -Math.log(r.docCount), fbin: (r) => -r.fbin, idx: (r) => -r.i, logsl: (r) => -Math.log(r.sl), logc: (r) => -Math.log(r.c), burst: (r) => Math.log((r.last16 + 0.5) / (r.rate * 16 + 0.5)), len: (r) => r.len, rinit: (r) => r.rinit };
const cp = new Map(), cn = new Map(); for (const r of pos) (cp.get(cell(r)) ?? cp.set(cell(r), []).get(cell(r))).push(r); for (const r of nat) (cn.get(cell(r)) ?? cn.set(cell(r), []).get(cell(r))).push(r);
const out = { rule: "ablscope-1-slot-ircB-c4plus", perObservable: {} };
for (const [name, f] of Object.entries(OBS)) { let tpR = 0, tpS = 0, np = 0; const per = {};
  for (const st of ST4) { const P_ = [], N_ = []; for (const [c, ps] of cp) { if (!c.endsWith(`|${st}`)) continue; const ns = cn.get(c); if (!ns) continue; P_.push(...ps); for (const r of ns) N_.push({ r, w: ps.length / ns.length }); }
    if (!P_.length) continue; const W = N_.reduce((a, x) => a + x.w, 0), fpr = (g) => N_.filter((x) => g(x.r)).reduce((a, x) => a + x.w, 0) / W, fS = fpr((r) => r.S >= 1), tS = P_.filter((r) => r.S >= 1).length / P_.length;
    const ths = [...new Set([...P_, ...N_.map((x) => x.r)].map(f))].sort((a, b) => b - a); let best = null; for (const th of ths) { if (fpr((r) => f(r) >= th) <= fS) best = th; else break; }   // lowest threshold whose FPR stays <= FPR of S_ENTRY
    const tR = best == null ? 0 : P_.filter((r) => f(r) >= best).length / P_.length; per[st] = { names: P_.length, fprS: round(fS, 4), sensS: round(tS), sensRival: round(tR), fprRival: best == null ? 0 : round(fpr((r) => f(r) >= best), 4) }; tpR += tR * P_.length; tpS += tS * P_.length; np += P_.length; }
  out.perObservable[name] = { perStratum: per, pooledSensRival: round(tpR / np), pooledSensS: round(tpS / np), reproduces: tpR / np >= tpS / np - 0.05 }; }
out.cheapReproducing = Object.entries(out.perObservable).filter(([k, v]) => k !== "rinit" && v.reproduces).map(([k]) => k);
out.headerSha256 = createHash("sha256").update(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]).digest("hex");
fs.writeFileSync(path.join(HERE, "results", "attack-c-equalfpr-cheap.json"), JSON.stringify(out, null, 1)); console.log(JSON.stringify({ cheapReproducing: out.cheapReproducing, pooled: Object.fromEntries(Object.entries(out.perObservable).map(([k, v]) => [k, [v.pooledSensRival, v.pooledSensS]])), hdr: out.headerSha256.slice(0, 12) }));
