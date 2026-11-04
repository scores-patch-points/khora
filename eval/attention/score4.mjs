// eval/attention/score4.mjs — ROUND 3 scorer (rounds 1 and 2 are score.mjs and score4.mjs, unchanged). A binding or gap is matched to a case by the START of the token (a description case addresses its whole noun phrase, the binder its head word); a case with neither is SILENT, and silence is a failure (bar S1). Score the attention binder (adapters/text/attention-binder.js) against a set of addressed binding cases.
//
//   PARAGOLD_DIR=<folder holding text/*.txt> node eval/attention/score4.mjs --set dev2 | --file <cases.json> [--dir <folder holding text/>] [--control|--controls] [--grid] [--json]
//
//   --set dev   eval/attention/DEV-SET.json   (development: tuned on)
//   --set gold  <PARAGOLD_DIR>/PARA-GOLD.json `binding` (frozen, scored ONCE; see PREREG-ATTENTION.md)
//
// Every case is one token. The document is read once through the master pipeline (reading.js::readDocument): its cast and sentences go to the
// binder. A binding is RIGHT when the bound referent's cast surfaces include a surface the case accepts (case-insensitive), WRONG otherwise;
// a case with kind "elsewhere" (the token refers to something other than the attended subject) is a TRAP: any binding is wrong, a typed gap is right.
// Cases that are not the binder's business (a personal pronoun) are reported `out_of_scope` and counted in no denominator.
// --control reassigns every mention of every cast being to a random cast being (seeded) before binding: the structure the binder reads is
// destroyed, and the score must fail.
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readDocument } from "../../native/reading.js";
import { bindAttended } from "../../native/adapters/text/attention-binder.js";
import { localLexicon } from "../../native/adapters/text/wiktionary-pack.js";
import { nonPersonalOf as ruleNonPersonal, timeNamesOf } from "../../native/adapters/text/non-personal.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const DIRS = process.argv.flatMap((a, i, v) => (a === "--dir" ? [v[i + 1]] : [])).concat(process.env.PARAGOLD_DIR ? [process.env.PARAGOLD_DIR] : []);
const DIR = DIRS[0];
const textPath = (doc) => path.join(DIRS.find((d) => fs.existsSync(path.join(d, "text", doc + ".txt"))) ?? DIR, "text", doc + ".txt");
if (!DIR) { console.log("score: set PARAGOLD_DIR to the folder holding text/<doc>.txt."); process.exit(0); }

export const DECLARED = { window: 12, minActivation: 0.5, minMargin: 0.2, boost: 2, feed: true, centerVeto: true, clauseMateVeto: false,
  // round 2 (PREREG-ATTENTION-A2.md)
  minWordShare: 0.25, carryVeto: true, expletiveVeto: true, demonstrativeSubject: true, causalWords: true,
  // round 3 (PREREG-ATTENTION-A3.md)
  lineStarts: true, npHead: true, tieResolve: true, foldPlural: true, neverSilent: true, contextMinUses: 2,
  // round 4 (PREREG-ATTENTION-A4.md)
  bearerShare: 0.2, weakRouteCarry: false, centerRivalShare: null, openerReset: false };
const [w, f, m] = (arg("--dials", "") || "").split(",").filter(Boolean).map(Number);
const dials = { ...DECLARED, ...(Number.isFinite(w) ? { window: w } : {}), ...(Number.isFinite(f) ? { minActivation: f } : {}), ...(Number.isFinite(m) ? { minMargin: m } : {}) };
if (arg("--boost")) dials.boost = Number(arg("--boost"));
if (arg("--contextMinUses")) dials.contextMinUses = arg("--contextMinUses") === "null" ? null : Number(arg("--contextMinUses"));
for (const k of ["bearerShare", "centerRivalShare"]) if (arg("--" + k)) dials[k] = arg("--" + k) === "null" ? null : Number(arg("--" + k));
if (arg("--minWordShare")) dials.minWordShare = arg("--minWordShare") === "null" ? null : Number(arg("--minWordShare"));
for (const k of ["feed", "centerVeto", "clauseMateVeto", "carryVeto", "expletiveVeto", "demonstrativeSubject", "causalWords", "lineStarts", "npHead", "tieResolve", "foldPlural", "neverSilent", "weakRouteCarry", "openerReset"]) { const v = arg("--" + k); if (v) dials[k] = v === "true"; }

const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const norm = (s) => String(s).toLowerCase().replace(/\s+/g, " ").trim();
// THE MATCH RULE (declared in PREREG-ATTENTION.md before any gold scoring): a bound referent is the case's referent when one of its cast surfaces
// EQUALS an accepted name, or is a whole-word SUFFIX of it ("Liberty" of "Statue of Liberty": its head) or has it as a whole-word suffix.
// A prefix is not enough ("Mississippi" is also a state, "Gateway" is a park), and a surface that merely contains the name does not count.
const wordSuffix = (long, short) => long === short || long.endsWith(" " + short);
const accepts = (surfaces, accept) => surfaces.map(norm).some((s) => accept.map(norm).some((a) => wordSuffix(a, s) || wordSuffix(s, a)));

function loadCases(which) {
  const files = process.argv.flatMap((a, i, v) => (a === "--file" ? [v[i + 1]] : []));
  const j = { cases: (files.length ? files : [path.join(HERE, "DEV-SET-4.json")]).flatMap((f) => JSON.parse(fs.readFileSync(f, "utf8")).cases) };
  // the parent set marks expletive "it" as out_of_scope with trapKind "expletive": scored as a trap (any binding is wrong), as its pre-registration says
  return j.cases.map((c) => ({ ...c, accept: c.accept ?? [c.referent], kind: c.trapKind === "expletive" ? "elsewhere" : c.kind }));
}

const lexicon = localLexicon("en");
await lexicon.want(["office"]);
const haveGiver = Boolean(lexicon.giver);

const readCache = new Map();
async function readDoc(doc) {
  if (readCache.has(doc)) return readCache.get(doc);
  const buf = fs.readFileSync(textPath(doc));
  const text = buf.toString("utf8");
  // the reading is deterministic and slow: cached on disk by the text's hash when ATTN_CACHE is set
  const cacheFile = process.env.ATTN_CACHE ? path.join(process.env.ATTN_CACHE, doc + "-" + crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16) + ".json") : null;
  let entry = cacheFile && fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, "utf8")) : null;
  if (!entry) { entry = await readDocument(text, { language: "en", minCharacters: 0, lexicon }); if (cacheFile) fs.writeFileSync(cacheFile, JSON.stringify({ cast: entry.cast, sentences: entry.sentences })); }
  const r = { buf, text, entry };
  readCache.set(doc, r); return r;
}

const which = arg("--set", "dev2");
const control = process.argv.includes("--control") || process.argv.includes("--controls");
let mentionsSeed = Number(arg("--seed", "20261103"));
const cases = loadCases(which);
async function scoreWith(dials) {
const rows = [];
for (const doc of [...new Set(cases.map((c) => c.doc))]) {
  const { buf, text, entry } = await readDoc(doc);
  let mentions = [];
  const surfacesOf = new Map();
  for (const c of entry.cast ?? []) { surfacesOf.set(c.ref, c.allSurfaces ?? [c.surface]); for (const [a, b] of c.mentionSpans ?? []) mentions.push({ ref: c.ref, start: a, end: b }); }
  if (control) { const refs = [...surfacesOf.keys()]; const rnd = mulberry(mentionsSeed); mentions = mentions.map((x) => ({ ...x, ref: refs[Math.floor(rnd() * refs.length)] })); }
  let nonPersonal = null;
  if (haveGiver) {
    const surfaceToRef = new Map(); for (const [ref, ss] of surfacesOf) for (const s of ss) surfaceToRef.set(s, ref);
    nonPersonal = new Set(ruleNonPersonal(surfaceToRef, { timeNames: timeNamesOf(null), lexicon }));
  }
  const out = bindAttended(entry.sentences, mentions, { ...dials, nonPersonal });
  for (const c of cases.filter((x) => x.doc === doc)) {
    // the token's char offsets: addressed (dev) or the first whole-word occurrence of the surface inside the sentence span (gold)
    const sentChars = [buf.subarray(0, c.start).toString("utf8").length, buf.subarray(0, c.end).toString("utf8").length];
    let tok;
    if (c.tokenStart != null) { const a = buf.subarray(0, c.tokenStart).toString("utf8").length; tok = [a, a + c.surface.length]; }
    else { const re = new RegExp(`(?<![\\p{L}\\p{N}])${c.surface.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "u"); const mm = re.exec(text.slice(sentChars[0], sentChars[1])); tok = mm ? [sentChars[0] + mm.index, sentChars[0] + mm.index + c.surface.length] : null; }
    const hit = tok && out.bindings.find((b) => b.at[0] === tok[0]);
    const gap = tok && out.gaps.find((g) => g.at[0] === tok[0]);
    let verdict;
    if (c.kind === "out_of_scope") verdict = "out_of_scope";
    else if (hit) {
      const ok = c.kind === "attended" && accepts(surfacesOf.get(hit.referentId) ?? [], c.accept);
      // a trap bound to the entity it really refers to (a named cast candidate the set lists in `accept`) is right; bound to anything else is wrong
      const toStated = c.kind === "elsewhere" && c.trapKind !== "expletive" && c.accept?.length && accepts(surfacesOf.get(hit.referentId) ?? [], c.accept);
      verdict = ok ? "right" : toStated ? "right_other" : "wrong";
    } else verdict = gap ? "gap" : "unseen";
    rows.push({ id: c.id, kind: c.kind, trapKind: c.trapKind ?? null, surface: c.surface, verdict, bound: hit ? (surfacesOf.get(hit.referentId) ?? [])[0] : null, reason: gap?.reason ?? null, activation: hit?.activation ?? gap?.activation ?? null, margin: hit?.margin ?? gap?.margin ?? null, via: hit?.via ?? null });
  }
}
const att = rows.filter((r) => r.kind === "attended");
const bound = att.filter((r) => r.verdict === "right" || r.verdict === "wrong");
const traps = rows.filter((r) => r.kind === "elsewhere");
const summary = {
  set: which, control, dials, giver: haveGiver ? lexicon.giver : null, ruling: haveGiver ? "giver" : "text_evidence",
  attended: att.length, bound: bound.length, right: bound.filter((r) => r.verdict === "right").length,
  precision: bound.length ? bound.filter((r) => r.verdict === "right").length / bound.length : null,
  coverage: att.length ? bound.length / att.length : null,
  coverageRight: att.length ? bound.filter((r) => r.verdict === "right").length / att.length : null,
  traps: traps.length, trapsBoundWrong: traps.filter((r) => r.verdict === "wrong").length, trapsGapped: traps.filter((r) => r.verdict === "gap").length,
  silent: rows.filter((r) => r.verdict === "unseen").length,
  outOfScope: rows.filter((r) => r.verdict === "out_of_scope").length,
  trapWrongRate: traps.length ? traps.filter((r) => r.verdict === "wrong").length / traps.length : null,
  byTrapKind: Object.fromEntries([...new Set(traps.map((r) => r.trapKind))].map((k) => [k, { n: traps.filter((r) => r.trapKind === k).length, wrong: traps.filter((r) => r.trapKind === k && r.verdict === "wrong").length }])),
};
return { summary, rows };
}

if (process.argv.includes("--controls")) { // the shuffled-referent control over five declared seeds
  for (const sd of [20261103, 20261104, 20261105, 20261106, 20261107]) {
    mentionsSeed = sd;
    const { summary: x } = await scoreWith(dials);
    console.log(`control seed=${sd}  bound ${x.bound} right ${x.right} precision ${x.precision?.toFixed(2) ?? "-"} trapsBoundWrong ${x.trapsBoundWrong}`);
  }
  process.exit(0);
}
if (process.argv.includes("--grid")) {
  const line = (label, x) => console.log(`${label.padEnd(46)} bound ${String(x.bound).padStart(2)}/${x.attended} right ${String(x.right).padStart(2)} prec ${x.precision?.toFixed(2) ?? " - "} covRight ${x.coverageRight.toFixed(2)} trapWrong ${x.trapsBoundWrong}/${x.traps} (${x.trapWrongRate?.toFixed(2)}) silent ${x.silent}`);
  const OFF = { bearerShare: null, weakRouteCarry: false, centerRivalShare: null, openerReset: false };
  line("round-3 declared (round-4 options off)", (await scoreWith({ ...dials, ...OFF })).summary);
  for (const o of ["bearerShare", "weakRouteCarry", "centerRivalShare", "openerReset"]) line(`round-4 declared minus ${o}`, (await scoreWith({ ...dials, [o]: OFF[o] })).summary);
  for (const v of [0.05, 0.1, 0.2, 0.3, 0.5]) line(`round-4 declared, bearerShare ${v}`, (await scoreWith({ ...dials, bearerShare: v })).summary);
  for (const v of [0.3, 0.5, 0.7, 1]) line(`round-4 declared, centerRivalShare ${v}`, (await scoreWith({ ...dials, centerRivalShare: v })).summary);
  line("round-4 declared", (await scoreWith(dials)).summary);
  process.exit(0);
}
const { summary, rows } = await scoreWith(dials);
if (arg("--separate")) { // report named cases apart from the rest (the parent set's part-whole and bridging cases)
  const ids = new Set(arg("--separate").split(","));
  for (const [label, keep] of [["apart: " + [...ids].join(","), (r) => ids.has(r.id)], ["rest", (r) => !ids.has(r.id)]]) {
    const rs = rows.filter(keep), a = rs.filter((r) => r.kind === "attended"), bd = a.filter((r) => r.verdict === "right" || r.verdict === "wrong"), tr = rs.filter((r) => r.kind === "elsewhere");
    console.log(`${label}: attended ${a.length} bound ${bd.length} right ${bd.filter((r) => r.verdict === "right").length} | traps ${tr.length} wrong ${tr.filter((r) => r.verdict === "wrong").length} gapped ${tr.filter((r) => r.verdict === "gap").length} right_other ${tr.filter((r) => r.verdict === "right_other").length}`);
  }
}
if (process.argv.includes("--json")) console.log(JSON.stringify({ summary, rows }, null, 1));
else {
  for (const r of rows) console.log(`${r.id} ${(r.trapKind ?? r.kind).padEnd(9)} ${r.surface.padEnd(10)} ${r.verdict.padEnd(12)} ${String(r.bound ?? r.reason ?? "").slice(0, 28).padEnd(28)} act=${r.activation?.toFixed?.(2) ?? "-"} margin=${r.margin?.toFixed?.(2) ?? "-"} ${r.via ?? ""}`);
  console.log(JSON.stringify(summary));
}
