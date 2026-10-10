// c2-summary.mjs : read the per-language C2 results written by c2-names.mjs and print one table plus the cross-language
// pre-registered predictions (P1..P9, D1..D3 and E1..E6 of c2-names.mjs's header), reported as held / not held. Reads files only.
// Amendment A6-A9 (2026-10-06): also prints the V2 pass rule beside the original V1, the hand baselines, the frequency-matched
// T2 control, the khora-lexer arm (segmentation-leak cost) and the claims the card may make.
//   node eval/coding-competence/c2-summary.mjs [--split dev]
import fs from "node:fs";
import path from "node:path";
import { OUT_DIR, LANGUAGES } from "./c2-lib.mjs";

const split = process.argv.includes("--split") ? process.argv[process.argv.indexOf("--split") + 1] : "dev";
const rows = [];
for (const lang of LANGUAGES) {
  const p = path.join(OUT_DIR, `c2-names-${lang}-${split}.json`);
  if (!fs.existsSync(p)) { rows.push({ lang, missing: true }); continue; }
  rows.push({ lang, r: JSON.parse(fs.readFileSync(p, "utf8")) });
}
const f = (x, d = 3) => (x == null ? "  -  " : Number(x).toFixed(d));
const pad = (s, n) => String(s).padEnd(n);
console.log(`C2 NAMES (${split})  language | units core | F1: S1 S0 recipes nameOnly S1N | controls: noPrior deranged dTable shuffled | refusal prec (base) T1 T2 | pass (V2, amendment A6; V1 in the A6 table)`);
for (const { lang, r, missing } of rows) {
  if (missing) { console.log(`${pad(lang, 11)} (no result file)`); continue; }
  const d = r.details ?? {};
  const a = d.arms ?? {};
  const g = (arm) => a[arm]?.admit?.f1;
  console.log([
    pad(lang, 11), pad(d.units?.U ?? r.n, 7), pad(d.units?.core ?? "", 5),
    "| ", f(g("S1")), f(g("S0")), f(g("recipes")), f(g("nameOnly")), f(g("S1N")),
    "| ", f(g("noPrior")), f(g("deranged")), f(g("derangedTable")), f(g("shuffled")),
    "| ", f(a.S1?.refuse?.precision, 4), `(${f(d.units?.baseRateNonNames, 4)})`, f(d.refusalTiers?.keyword?.precision, 4), f(d.refusalTiers?.settled?.precision, 4),
    "| ", String(r.pass),
  ].join(" "));
}
// AMENDMENT A5 diagnostics (post hoc; never in the pass rule)
const withDiag = rows.filter((x) => x.r?.details?.diagnosticsA5);
if (withDiag.length) {
  console.log("\nA5 DIAGNOSTICS (post hoc)  language | T1-only refused n | T2-only: n precision (base) margin p5 coverage | kwAdmitRest F1 (S1 minus it, p5) | recall by kind");
  for (const { lang, r } of withDiag) {
    const g = r.details.diagnosticsA5, t2 = g.T2only, t1 = g.T1only;
    const rk = Object.entries(r.details.s1?.recallByKind ?? {}).map(([k, v]) => `${k}:${f(v, 2)}`).join(" ");
    console.log([pad(lang, 11), pad(t1.n, 6), "| ", pad(t2.n, 6), f(t2.precision, 4), `(${f(t2.baseRate, 4)})`, f(t2.margin, 4), f(t2.marginP5, 4), f(t2.coverage, 3), t2.measurable ? "" : "[< MIN_REFUSED: typed gap]", "| ", f(g.kwAdmitRest.admit.f1), `(${f(g.kwAdmitRest.f1DeltaS1P5)})`, "| ", rk].join(" "));
  }
}

// AMENDMENT A6-A9 tables
const withV2 = rows.filter((x) => x.r?.details?.passRule?.rule);
if (withV2.length) {
  console.log("\nA6 CONTROLS AND PASS RULE V2  language | F1: S1 recipes declKw ablated freqT2 | strongest control (margin) | passV1 -> pass(V2) | A2 B2 C2 D");
  for (const { lang, r } of withV2) {
    const d = r.details, a = d.arms, g = (arm) => a[arm]?.admit?.f1, pr = d.passRule;
    const ok = (x) => (x?.ok === true ? "ok" : x?.ok === false ? "FAIL" : "n/a");
    console.log([pad(lang, 11), "| ", f(g("S1")), f(g("recipes")), f(g("declKw")), f(g("ablated")), f(g("freqT2")), "| ", `${d.strongestControl} ${f(r.control)} (${f(r.margin, 4)})`, "| ", `${String(d.passV1)} -> ${String(r.pass)}`, "| ",
      pad(pr.A2_refusalT2.measurable ? ok(pr.A2_refusalT2) : "unmeasured", 10), pad(pr.B2_admission.measurable ? ok(pr.B2_admission) : "unmeasured", 10), ok(pr.C2_licence), ok(pr.D_handBaselines)].join(" "));
    for (const reason of pr.reasons) console.log(`${pad("", 13)}- ${reason}`);
  }
  console.log("\nA6 FREQUENCY-MATCHED T2 CONTROL  language | K (settled) | T2-only n precision | freq-matched n precision | p5 of precision difference | F1(S1) - F1(freqT2) p5");
  for (const { lang, r } of withV2) {
    const c = r.details.freqControl;
    if (!c?.available) { console.log(`${pad(lang, 11)} typed gap: ${c?.gap ?? c?.error ?? "unavailable"}`); continue; }
    console.log([pad(lang, 11), "| ", pad(c.K, 4), "| ", pad(c.T2only.n, 6), f(c.T2only.precision, 4), "| ", pad(c.freqT2only.n, 6), f(c.freqT2only.precision, 4), "| ", f(c.precisionDeltaBootstrap?.p5, 4), "| ", f(c.admission?.f1DeltaBootstrap?.p5, 4), `(overlap with settled ${c.overlapWithSettled}/${c.K})`].join(" "));
  }
  console.log("\nA7 SEGMENTATION  language | F1 S1 (gold segmentation) | F1 S1_lex (khora lexer) | leak cost | ratio (>= 0.9 needed) | gold units unmatched | extras (admitted/refused) | lexer causality licence | foreign-lexer control F1 (A10) | whitespace-split F1 (A11)");
  for (const { lang, r } of withV2) {
    const s = r.details.segmentation?.khoraLexer;
    if (!s || s.gap) { console.log(`${pad(lang, 11)} typed gap: ${s?.gap}`); continue; }
    console.log([pad(lang, 11), "| ", f(r.details.arms.S1.admit.f1), f(s.f1), "| ", f(s.leakCost, 4), "| ", f(s.ratio, 4), "| ", `${s.segmentation.unmatchedGold} (core ${s.segmentation.unmatchedGoldCore})`, "| ", `${s.segmentation.extras} (${s.segmentation.extrasAdmitted}/${s.segmentation.extrasRefused})`, "| ", `${s.causalityLicence.ok ? "holds" : "FAILS"} ${s.causalityLicence.checked} checks, ${s.causalityLicence.mismatchCount} mismatches`, "| ", s.foreignLexerControl?.gap ? "gap" : `${f(s.foreignLexerControl?.f1)} (${s.foreignLexerControl?.licenceMoves ? "collapses" : "DOES NOT collapse"})`, "| ", `${f(s.wsBaselineDiagnostic?.f1)} (${s.wsBaselineDiagnostic?.moves ? "collapses" : "does not collapse"})`].join(" "));
  }
  console.log("\nCLAIMS the card may make");
  for (const { lang, r } of withV2) console.log(`${pad(lang, 11)} causalEndToEnd: ${r.details.claims.causalEndToEnd.slice(0, 70)} | learnedPriorsHelp: ${r.details.claims.learnedPriorsHelp.slice(0, 90)}`);
}

// cross-language predictions
const have = rows.filter((x) => x.r);
const held = (id) => have.map((x) => ({ lang: x.lang, ...(x.r.details?.predictions?.[id] ?? {}) })).filter((x) => x.held != null);
console.log("\nPREDICTIONS (pre-registered in c2-names.mjs header)");
for (const id of ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "D1", "D2", "D3", "E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8"]) {
  const hs = held(id);
  if (!hs.length) { console.log(`${id}: no measurable language`); continue; }
  const n = hs.filter((x) => x.held).length;
  let verdict = `${n}/${hs.length} held`;
  if (id === "P5") verdict += n >= 4 ? "  => HELD (>= 4 of 6)" : "  => NOT HELD (< 4 of 6)";
  if (id === "D1") verdict += n >= 5 ? "  => HELD (>= 5 of 6)" : "  => NOT HELD (< 5 of 6)";
  if (id === "P8") verdict += n >= 4 ? "  => HELD (>= 4 of 6, on rule V1)" : "  => NOT HELD (< 4 of 6, on rule V1)";
  if (id === "E3") verdict += n >= 5 ? "  => HELD (>= 5 of 6)" : "  => NOT HELD (< 5 of 6)";
  if (id === "E5") verdict += n >= 5 ? "  => HELD (ratio in >= 5 of 6 and licence)" : "  => NOT HELD (< 5 of 6)";
  if (id === "E6") { const v2 = have.filter((x) => x.r.pass === true).length; verdict += `  | V2 pass count ${v2}/${have.length} (predicted <= 3): ${v2 <= 3 ? "held" : "NOT HELD"}`; }
  console.log(`${id}: ${verdict}   [${hs.map((x) => `${x.lang}:${x.held ? "yes" : "NO"}`).join(" ")}]`);
}
const byLang = Object.fromEntries(have.map((x) => [x.lang, x.r.details?.arms?.S1?.admit?.f1]));
if (byLang.python != null) {
  const lower = ["javascript", "c", "java"].filter((l) => byLang[l] != null).map((l) => `${l}:${byLang[l] < byLang.python ? "lower" : "NOT LOWER"}`);
  console.log(`P2 (cross-language part): javascript/c/java each lower than python's: ${lower.join(" ")}`);
}
const jsT1 = have.find((x) => x.lang === "javascript")?.r.details?.refusalTiers?.keyword?.precision;
const pyT1 = have.find((x) => x.lang === "python")?.r.details?.refusalTiers?.keyword?.precision;
if (jsT1 != null && pyT1 != null) console.log(`P6 (cross-language part): javascript T1 precision ${f(jsT1, 4)} vs python ${f(pyT1, 4)}: ${jsT1 < pyT1 ? "lower (as predicted)" : "NOT lower"}`);
const aud = have.map((x) => ({ lang: x.lang, a: x.r.details?.engineAudit })).filter((x) => x.a);
if (aud.length) {
  console.log("\nENGINE AUDIT (distinct T1 keyword-prior words the language's own engine accepts as a declaration name)");
  for (const { lang, a } of aud) console.log(`${pad(lang, 11)} ${a.available === false ? `unavailable: ${a.reason}` : `accepted ${a.acceptedAsFunctionName?.length ?? "-"} of ${a.tested ?? "-"} as function-form; member-form ${a.acceptedAsMemberName?.length ?? "-"}; ${(a.acceptedAsFunctionName ?? []).slice(0, 14).join(" ")}`}`);
}
