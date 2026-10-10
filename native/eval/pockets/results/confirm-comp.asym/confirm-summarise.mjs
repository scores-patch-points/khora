// results/confirm-comp.asym/confirm-summarise.mjs — NEW FILE written after the header was hashed. Reads pockets/*.json (computed by confirm.mjs), the registered PREREG and the atlas matrix; applies the registered rules
// mechanically; prints a verdict and writes confirm-result.json. No rule is chosen here: every rule is PREREG.rules / PREREG.adversaries.
import fs from "node:fs";
import path from "node:path";

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
function ranks(xs) { const ix = xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]), r = new Array(xs.length); for (let i = 0; i < ix.length;) { let j = i; while (j + 1 < ix.length && ix[j + 1][0] === ix[i][0]) j++; const a = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[ix[k][1]] = a; i = j + 1; } return r; }
function spearman(a, b) { const ra = ranks(a), rb = ranks(b), ma = mean(ra), mb = mean(rb); let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < ra.length; i++) { sab += (ra[i] - ma) * (rb[i] - mb); saa += (ra[i] - ma) ** 2; sbb += (rb[i] - mb) ** 2; } return sab / Math.sqrt(saa * sbb); }
function eta2(vals, groups) { const m = mean(vals), by = new Map(); vals.forEach((v, i) => { const g = groups[i]; if (!by.has(g)) by.set(g, []); by.get(g).push(v); }); let ssb = 0, sst = 0; for (const xs of by.values()) ssb += xs.length * (mean(xs) - m) ** 2; for (const v of vals) sst += (v - m) ** 2; return { eta2: sst > 0 ? ssb / sst : null, levels: by.size, n: vals.length }; }
const isEn = (l) => /^(en|eng)(-|$)/.test(l);
const inR = (v, r) => v != null && v >= r[0] && v <= r[1];

export async function modeSummarise({ PREREG, HERE, POCKETS, statusOf }) {
  const OUT = path.join(HERE, "pockets"), R = PREREG.rules, rows = [];
  for (const s of PREREG.siblings) {
    const f = path.join(OUT, `${s.id}.json`);
    if (!fs.existsSync(f)) { rows.push({ ...s, computed: false }); continue; }
    const j = JSON.parse(fs.readFileSync(f, "utf8")), hd = j.halves.discover, hc = j.halves.confirm;
    rows.push({ id: s.id, role: s.role, kind: s.kind, register: s.register, language: s.language, tokens: s.tokens, halfTokens: s.halfTokens, thin: s.thin, claimExpect: s.claimExpect, blindExpect: s.blindExpect, vRange: s.vRange, computed: true,
      status: j.status.asym, vD: hd.asym.v, vC: hc.asym.v, zD: hd.asym.z, zC: hc.asym.z, nullMeanD: hd.asym.nullMean, nullMeanC: hc.asym.nullMean, nullSdD: hd.asym.nullSd, nullSdC: hc.asym.nullSd,
      plug: { status: j.status.plug, zD: hd.plug.z, zC: hc.plug.z, vD: hd.plug.v, vC: hc.plug.v }, deep: { status: j.status.deep, zD: hd.deep.z, zC: hc.deep.z, vD: hd.deep.v, vC: hc.deep.v },
      deepPlug: { status: j.status.deepPlug, zD: hd.deepPlug.z, zC: hc.deepPlug.z },
      fnBefore: hd.fnBefore ? { status: j.status.fnBefore, zD: hd.fnBefore.z, zC: hc.fnBefore.z, vD: hd.fnBefore.v, vC: hc.fnBefore.v } : null,
      selfCheckMaxDiff: j.selfCheckMaxDiff, vInRange: inR(hd.asym.v, s.vRange) && inR(hc.asym.v, s.vRange) });
  }
  const done = rows.filter((r) => r.computed), by = (role) => done.filter((r) => r.role === role), scoredStatus = (r) => ["PRESENT+", "PRESENT-", "ABSENT"].includes(r.status);
  // ---- headline verdict (PREREG.rules) ----
  const head = [...by("headline-A"), ...by("headline-B")], scored = head.filter(scoredStatus);
  const match = (r) => r.status === r.claimExpect, matchesA = scored.filter((r) => r.role === "headline-A" && match(r)), scoredA = scored.filter((r) => r.role === "headline-A"), scoredB = scored.filter((r) => r.role === "headline-B"), matchesB = scoredB.filter(match);
  const revA = scoredA.filter((r) => r.status === "PRESENT-").length, nMatch = scored.filter(match).length;
  let verdict;
  if (scored.length && nMatch === scored.length && scoredA.length >= 4 && scoredB.length >= 1) verdict = "REPLICATES";
  else if (!scored.length || nMatch / scored.length < 0.5 || matchesA.length === 0 || (scoredA.length && revA / scoredA.length > 1 / 3)) verdict = "FAILS";
  else verdict = "PARTIAL";
  if (scored.length < 4) verdict = verdict === "FAILS" ? "FAILS" : "PARTIAL";
  // ---- blind score ----
  const blind = [];
  for (const r of done.filter((x) => !x.thin)) {
    let h = null;
    if (r.blindExpect === "PRESENT+") h = r.status === "PRESENT+" ? true : scoredStatus(r) ? false : null;
    else if (r.blindExpect === "ABSENT-or-AMBIGUOUS") h = ["ABSENT", "AMBIGUOUS"].includes(r.status);
    else if (r.blindExpect === "ABSENT") h = r.status === "ABSENT";
    if (h !== null) blind.push({ id: r.id, role: r.role, blindExpect: r.blindExpect, status: r.status, holds: h });
  }
  // ---- secondary groups ----
  const code = ["asym-cd-js", "asym-cd-ts", "asym-cd-py"].map((id) => done.find((r) => r.id === id)), codePlus = code.filter((r) => r?.status === "PRESENT+").length;
  const nar = by("secondary-narrative"), narPlus = nar.filter((r) => r.status === "PRESENT+").length, narMinus = nar.filter((r) => r.status === "PRESENT-").length;
  const ud = by("secondary-treebank"), udP = ud.filter((r) => r.status === "PRESENT+").length, udM = ud.filter((r) => r.status === "PRESENT-").length, udN = udP + udM;
  const ctl = by("control"), ctlBad = ctl.filter((r) => r.status.startsWith("PRESENT"));
  const consts = done.filter((r) => scoredStatus(r) && !["control", "power-check", "secondary-treebank"].includes(r.role));
  const result = {
    prereg: { file: "confirm.mjs", sha256: fs.readFileSync(path.join(HERE, "prereg.sha256"), "utf8").split(/\s+/)[0], protocolSha256: PREREG.protocolSha256 },
    verdict, verdictBasis: { headlineScored: scored.length, headlineMatch: nMatch, scoredA: scoredA.length, matchA: matchesA.length, scoredB: scoredB.length, matchB: matchesB.length, reversedA: revA, unscoredHeadline: head.filter((r) => !scoredStatus(r)).map((r) => `${r.id}:${r.status}`) },
    blindScore: { scoredPredictions: blind.length, hold: blind.filter((b) => b.holds).length, rows: blind },
    groups: { code: { plusOfThree: codePlus, ruleHolds: codePlus >= 2, rows: code.map((r) => r && `${r.id}:${r.status}`) }, narrative: { plus: narPlus, minus: narMinus, ruleHolds: narPlus <= 2 && narMinus <= 2, rows: nar.map((r) => `${r.id}:${r.status}`) },
      treebank: { presentPlus: udP, presentMinus: udM, informative: udN >= 4, ruleHolds: udN >= 4 ? Math.max(udP, udM) / udN <= 0.75 : null, absent: ud.filter((r) => r.status === "ABSENT").length, ambiguous: ud.filter((r) => r.status === "AMBIGUOUS").length, n: ud.length } },
    instrument: { controls: ctl.map((r) => ({ id: r.id, status: r.status, zD: r.zD, zC: r.zC })), anyControlPresent: ctlBad.length > 0, variantSelfCheckMaxDiff: Math.max(...done.map((r) => r.selfCheckMaxDiff)) },
    constants: { scored: consts.length, bothHalvesInRange: consts.filter((r) => r.vInRange).length, rows: consts.map((r) => ({ id: r.id, vD: r.vD, vC: r.vC, vRange: r.vRange, in: r.vInRange })) },
    rows,
  };
  await (await import("./confirm-adversaries.mjs")).addAdversaries(result, { PREREG, HERE, POCKETS, done, scoredStatus, spearman, eta2, isEn });
  fs.writeFileSync(path.join(HERE, "confirm-result.json"), JSON.stringify(result, null, 1));
  const f = (x, d = 1) => (x == null ? "  n/a" : x.toFixed(d));
  console.log("id".padEnd(24), "role".padEnd(19), "tok".padStart(7), "status".padEnd(9), "zD".padStart(7), "zC".padStart(7), "vD".padStart(8), "vC".padStart(8), "plug".padEnd(9), "deep".padEnd(9), "fnBefore");
  for (const r of done) console.log(r.id.padEnd(24), r.role.padEnd(19), String(r.tokens).padStart(7), r.status.padEnd(9), f(r.zD).padStart(7), f(r.zC).padStart(7), f(r.vD, 4).padStart(8), f(r.vC, 4).padStart(8), r.plug.status.padEnd(9), r.deep.status.padEnd(9), r.fnBefore?.status ?? "-");
  console.log(JSON.stringify({ verdict, verdictBasis: result.verdictBasis, blindScore: { n: blind.length, hold: result.blindScore.hold }, groups: result.groups, instrument: result.instrument, constants: { scored: consts.length, inRange: result.constants.bothHalvesInRange } }, null, 1));
  console.log(JSON.stringify(result.adversaries, null, 1));
}
