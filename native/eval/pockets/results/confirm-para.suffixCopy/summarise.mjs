// summarise.mjs — applies the FROZEN pass rule of confirm.mjs (header PREREG-BEGIN..PREREG-END) to siblings/*.json (10 draws) and writes confirm-result.json.
//   node summarise.mjs [--dir siblings] [--out confirm-result.json]      siblings100/ is summarised the same way as a robustness check (status table only, verdict is NOT taken from it).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { headerIntact } from "./confirm.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const DIR = path.resolve(HERE, opt("--dir", "siblings")), OUT = path.resolve(HERE, opt("--out", "confirm-result.json"));
const SF = "para.suffixCopy";

// class table = the frozen header (P1-P6, E1-E2)
const CODE = ["sfx-cd-py314", "sfx-cd-rb26", "sfx-cd-chdr", "sfx-cd-npmjs"];
const PROSE = ["sfx-en-poe-works2", "sfx-en-chopin-awakening", "sfx-en-zola-mouret", "sfx-en-waikna", "sfx-en-about-london"], PROSE_X = ["sfx-en-hesse-siddhartha", "sfx-en-warren-forces"];
const CHILD = ["sfx-en-aesop-stickney", "sfx-en-pooh"];
const UDP = { eng: [0.003, 0.070], hrv: [0.0012, 0.025], slv: [0.0006, 0.014], heb: [0.0014, 0.031], urd: [0.005, 0.092], slk: [0.0005, 0.016] }, UDA = ["fas", "ind", "jpn", "kor"];
const CLS = {}; for (const i of CODE) CLS[i] = "code"; for (const i of PROSE) CLS[i] = "prose"; for (const i of PROSE_X) CLS[i] = "prose-exploratory"; for (const i of CHILD) CLS[i] = "children-exploratory";
for (const s of Object.keys(UDP)) CLS[`sfx-ud-${s}`] = "ud-present"; for (const s of UDA) CLS[`sfx-ud-${s}`] = "ud-absent";
const RANGE = (id) => (CLS[id] === "code" ? [0.010, 0.140] : CLS[id] === "prose" ? [0.0008, 0.030] : CLS[id] === "ud-present" ? UDP[id.slice(7)] : null);

/** PROTOCOL cell status from the two halves' z (10 draws): PRESENT+/PRESENT- both |z| >= 4 same sign; ABSENT both |z| < 2; else AMBIGUOUS (undefined z included). */
export function status(zd, zc) {
  if (zd == null || zc == null) return "AMBIGUOUS(z undefined)";
  if (zd >= 4 && zc >= 4) return "PRESENT+";
  if (zd <= -4 && zc <= -4) return "PRESENT-";
  if (Math.abs(zd) < 2 && Math.abs(zc) < 2) return "ABSENT";
  return "AMBIGUOUS";
}
const med = (xs) => { const s = xs.slice().sort((a, b) => a - b), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const inR = (x, r) => x != null && r && x >= r[0] && x <= r[1];

export function load(dir) {
  const rows = [];
  for (const id of Object.keys(CLS)) {
    const f = path.join(dir, `${id}.json`); if (!fs.existsSync(f)) { rows.push({ id, cls: CLS[id], missing: true }); continue; }
    const r = JSON.parse(fs.readFileSync(f, "utf8")), D = r.halves.discover, C = r.halves.confirm, d = D.cells[SF], c = C.cells[SF], st = status(d.z, c.z), rg = RANGE(id);
    const pred = CLS[id] === "ud-absent" ? "ABSENT" : CLS[id] === "children-exploratory" ? "not required" : "PRESENT+";
    const verdictSib = pred === "ABSENT" ? (st === "ABSENT" ? "match" : st.startsWith("PRESENT") ? "contradicted" : "inconclusive") : pred === "PRESENT+" ? (st === "PRESENT+" ? "match" : st === "PRESENT-" || st === "ABSENT" ? "contradicted" : "inconclusive") : "n/a";
    rows.push({ id, cls: CLS[id], tokens: r.meta.tokens, units: r.meta.units, docs: r.meta.docs, draws: r.draws, status: st, predicted: pred, sibling: verdictSib,
      v: [d.v, c.v], nullMean: [d.nullMean, c.nullMean], nullSd: [d.nullSd, c.nullSd], z: [d.z, c.z], pairs: [D.counts.pairs, C.counts.pairs], events: [D.counts.suffixEvents, C.counts.suffixEvents],
      vRecountOk: D.counts.vRecount === d.v && C.counts.vRecount === c.v, range: rg, rangeOk: rg ? inR(d.v, rg) && inR(c.v, rg) : null, excessPositive: d.v > d.nullMean && c.v > c.nullMean });
  }
  return rows;
}

/** the frozen pass rule H1..H6 and the REPLICATES / PARTIAL / FAILS mapping (header lines "PASS RULE (frozen)"). */
export function evaluate(rows) {
  const by = (c) => rows.filter((r) => r.cls === c && !r.missing), cnt = (rs, s) => rs.filter((r) => r.status === s).length;
  const code = by("code"), prose = by("prose"), udp = by("ud-present"), uda = by("ud-absent"), px = by("prose-exploratory"), ch = by("children-exploratory"), all = rows.filter((r) => !r.missing);
  const H = {};
  H.H1 = { rule: "code: PRESENT+ in 4 of 4, v in [0.010, 0.140] in both halves", n: code.length, presentPlus: cnt(code, "PRESENT+"), rangesOk: code.every((r) => r.rangeOk), holds: code.length === 4 && cnt(code, "PRESENT+") === 4 && code.every((r) => r.rangeOk) };
  H.H2 = { rule: "prose (5 confirmatory): >= 4 PRESENT+, none PRESENT- or ABSENT, v in [0.0008, 0.030] where PRESENT+", n: prose.length, presentPlus: cnt(prose, "PRESENT+"), contradicted: prose.filter((r) => r.sibling === "contradicted").map((r) => r.id),
    rangesOk: prose.filter((r) => r.status === "PRESENT+").every((r) => r.rangeOk), holds: prose.length === 5 && cnt(prose, "PRESENT+") >= 4 && !prose.some((r) => r.sibling === "contradicted") && prose.filter((r) => r.status === "PRESENT+").every((r) => r.rangeOk) };
  H.H3 = { rule: "UD present-side (6): >= 4 PRESENT+, none PRESENT- or ABSENT, per-stem v range where PRESENT+", n: udp.length, presentPlus: cnt(udp, "PRESENT+"), contradicted: udp.filter((r) => r.sibling === "contradicted").map((r) => r.id),
    rangesOk: udp.filter((r) => r.status === "PRESENT+").every((r) => r.rangeOk), holds: udp.length === 6 && cnt(udp, "PRESENT+") >= 4 && !udp.some((r) => r.sibling === "contradicted") && udp.filter((r) => r.status === "PRESENT+").every((r) => r.rangeOk) };
  H.H4 = { rule: "UD absent-side (4): none PRESENT+ or PRESENT-, >= 2 ABSENT", n: uda.length, absent: cnt(uda, "ABSENT"), presentPlus: uda.filter((r) => r.status === "PRESENT+").map((r) => r.id), presentMinus: uda.filter((r) => r.status === "PRESENT-").map((r) => r.id),
    holds: uda.length === 4 && !uda.some((r) => r.status.startsWith("PRESENT")) && cnt(uda, "ABSENT") >= 2 };
  H.H5 = { rule: "no PRESENT- among all 23", presentMinus: all.filter((r) => r.status === "PRESENT-").map((r) => r.id), holds: all.length === 23 && !all.some((r) => r.status === "PRESENT-") };
  const flat = (rs) => rs.flatMap((r) => r.v), P6 = { code: [med(flat(code)), [0.020, 0.070]], prose: [med(flat(prose)), [0.002, 0.012]], udPresent: [med(flat(udp)), [0.003, 0.025]] };
  H.H6 = { rule: "median v: code [0.020, 0.070]; prose [0.002, 0.012]; UD present-side [0.003, 0.025]", medians: Object.fromEntries(Object.entries(P6).map(([k, [m, r]]) => [k, { median: m, range: r, ok: inR(m, r) }])), holds: Object.values(P6).every(([m, r]) => inR(m, r)) };
  const presentSide = [...code, ...prose, ...udp], pp = cnt(presentSide, "PRESENT+"), minus = all.filter((r) => r.status === "PRESENT-").length;
  const fails = cnt(code, "PRESENT+") <= 2 || pp <= 7 || minus >= 2, replicates = Object.values(H).every((h) => h.holds);
  const E = { E1_children: { rule: "PRESENT+ in at most 1 of 2, never PRESENT-, v > 0 both halves", presentPlus: cnt(ch, "PRESENT+"), presentMinus: cnt(ch, "PRESENT-"), vPositive: ch.every((r) => r.v[0] > 0 && r.v[1] > 0),
      holds: cnt(ch, "PRESENT+") <= 1 && cnt(ch, "PRESENT-") === 0 && ch.every((r) => r.v[0] > 0 && r.v[1] > 0) }, E2_smallProse: { rule: "not PRESENT-", statuses: px.map((r) => `${r.id}: ${r.status}`), holds: !px.some((r) => r.status === "PRESENT-") } };
  return { H, E, presentSideCount: { n: presentSide.length, presentPlus: pp }, verdict: replicates ? "REPLICATES" : fails ? "FAILS" : "PARTIAL", heldRules: Object.entries(H).filter(([, h]) => h.holds).map(([k]) => k), failedRules: Object.entries(H).filter(([, h]) => !h.holds).map(([k]) => k) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const h = headerIntact(); if (!h.ok) { console.error("PREREG HEADER CHANGED; refusing"); process.exit(2); }
  const rows = load(DIR), ev = evaluate(rows);
  fs.writeFileSync(OUT, JSON.stringify({ headerSha256: h.got, dir: path.basename(DIR), rows, ...ev }, null, 1));
  for (const r of rows) console.error(`${r.id.padEnd(26)} ${String(r.cls).padEnd(21)} ${r.missing ? "MISSING" : `${r.status.padEnd(22)} z ${r.z.map((x) => (x == null ? "null" : x.toFixed(1))).join("/")}  v ${r.v.map((x) => x?.toPrecision(3)).join("/")}  null ${r.nullMean.map((x) => x?.toPrecision(2)).join("/")}  ev ${r.events.join("/")} of ${r.pairs.join("/")}  ${r.sibling}${r.rangeOk === false ? "  RANGE-MISS" : ""}`}`);
  console.error(JSON.stringify({ verdict: ev.verdict, held: ev.heldRules, failed: ev.failedRules, presentSide: ev.presentSideCount }));
}
