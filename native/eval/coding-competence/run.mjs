// eval/coding-competence/run.mjs — the AGGREGATOR of the CODING competence ladder (Lovelace's card).
//
//   node eval/coding-competence/run.mjs --language <lang[,lang]> [--split dev|test] [--json]
//   node eval/coding-competence/run.mjs --all [--split dev|test] [--json] [--cards]      (--language all = --all)
//   exit: 0 ok | 1 a guard FAILED (a failing rung is a result, not a failure of the aggregator) | 2 usage / crash
//   options: --rungs c0,c1,..  --limit N  --guards full|integrity|off  --fresh
//            --languages a,b,c (a subset for --all)  --out <dir>  --rung-timeout-ms N  --quiet
//            --guards full = repo regression + corpus integrity + prior provenance (the default; the repo suite now
//            takes MINUTES, and one run is shared by every card of a --all); integrity = the two cheap data guards
//            only (no test run: use it while iterating); off = none (the card says OFF)
//   env:     KHORA_CODING_RUNGS    {"c0":"/abs/stub.mjs",..} or a directory holding the rung files (a test seam)
//            KHORA_CODING_OUT      output directory (default /private/tmp/claude-501/coding-competence)
//            KHORA_CODING_GUARDS   full | integrity | off
//            KHORA_CODING_CORPUS   corpus dir (default /private/tmp/claude-501/code-corpus)
//
// WHAT THIS IS. "Read code WELL" means passing a ladder of tests that can fail, scored on HELD-OUT
// gold the reader never saw. The rung ids are shared with the natural-language card (eval/competence):
//   c0 identify the system from content alone, causally   c1 hear tokens (boundaries, lexemes)
//   c2 classify tokens (can it name a being? what class?)  c3 find beings (what the text declares)
//   c4 find relations/claims (calls, imports, inheritance) c5 agreement across representations/languages
// Each rung is a module (eval/coding-competence/c<N>*.mjs) written to ONE contract:
//   export RUNG, async measure({language, split, limit}) -> {language, rung, split, n, score, control,
//   margin, pass, controls, gaps, notes, details}            (c5 may export measureAll({languages, split}))
// The rung files are written by other hands, so the name is DISCOVERED: eval/coding-competence/c<N>-<name>.mjs
// (default names are in RUNGS), else the first file matching c<N>*.mjs/.js that textually exports measure or
// measureAll (a helper such as c2-lib.mjs is not a rung), else the first name match, else a hole. KHORA_CODING_RUNGS
// overrides per rung. c3 and r3 are the same rung (the id is shared with the natural-language card).
// A rung that does not apply to a language answers {applicable:false, reason:"<typed reason>"} (reason, or
// applicability_reason, or details.reason; a measurement gap such as "below declared floor" is never a reason) — a
// verdict "na" with its reason on the card, never a silent pass (and a missing reason is INVALID).
// This file is the one place the rungs meet. It does not score anything itself, and it calls no model.
// It (1) calls each rung, (2) refuses to hide a hole, (3) audits each verdict for the ways a verdict
// can be wrong without being false, (4) runs the GUARDS that say the instrument and its data are still
// what they claim, and (5) prints the card.
//
// LOVELACE (archon-holocracy role:lovelace). The engine has no pretensions to originate anything; it
// does what it is ordered to perform. So reading code means recovering what the text ORDERS (declarations,
// calls, imports, inheritance), and new coding capability is WITNESSED and MEASURED, never silently
// assumed. The order in which this harness acts is declared, not improvised: load the rung (never
// throw) -> measure it under a declared timeout -> audit the verdict -> run the guards -> write the card
// -> (TEST only) append to the test-reads log. An unmeasured language says so.
//
// ── PRE-REGISTRATION (FOLD-CONSTITUTION II.5 — written before the first run of this file; the rules
//    below are not tuned after a result) ───────────────────────────────────────────────────────────
// PREDICTION about the instrument. A toy ladder whose six rungs are a passing, a failing, a throwing, a
//   missing, a self-contradicting (pass with a control that does as well as the real arm) and a
//   not-applicable-with-a-reason rung is reported as
//     c0 pass | c1 fail | c2 error | c3 unmeasured | c4 invalid | c5 na
//   in the card, the card file, the matrix and the CLI, and no cell is dropped from a denominator.
//   A rung that says pass for the wrong split or language, with no control, on no data, with a
//   non-boolean verdict, with a failed licence, or that says "not applicable" with no typed reason (or
//   says not-applicable AND pass/fail) is INVALID, never a pass and never a quiet n/a.
// VERDICT AUDIT (every rung verdict). The rung's own `pass` is kept as reported (`pass`) and judged again
//   here (`verdict`): "pass" only when pass===true AND n>0 AND a control exists AND margin = score -
//   control > 0 (II.23: a control that does as well as the real arm means the instrument or the mechanism
//   is broken) AND the result is for the split and language asked AND no reported licence is false.
//   "fail" for pass===false. "unmeasured" for pass:null, "error" for a thrown / timed-out / malformed
//   rung, "na" for a typed {applicable:false, reason}, "invalid" for the contradictions above.
//   Informational flags (never change a verdict; shown on the card): arms_at_or_above_score (a listed
//   ablation/control at or above the real arm), no_licence_ok_reported (no machine-readable licence verdict in
//   the result), small_n (n < SMALL_N), margin_inconsistent, null_without_typed_gap (a pass:null with no gap: the
//   aggregator types it). A reported licence that FAILED voids a pass (invalid). A licence the rung DEFERRED
//   ("needs-pooled ... evaluated by measureAll") leaves the pass standing but PROVISIONAL: shown as PASS* on the
//   card and the matrix, counted apart in the totals, never as a clean pass (II.23: an unlicensed pass is not
//   a measured pass; the aggregator cannot evaluate a licence it was not given).
// GUARDS. G0 repo regression: node --test over conformance/*.test.mjs and tests/*.test.js, globs quoted.
//   PASS RULE: fail == 0 && cancelled == 0 && tests > 0 && exit 0 (a run that executes no tests is an
//   ERROR, never a pass). G1 corpus integrity (rule 9: held-out discipline is checkable, not trusted):
//   for the language asked, no repository and no file hash (sha256) occurs in more than one of train/dev/
//   test, and every file of the asked split exists on disk. PASS RULE: both clash sets empty and nothing
//   missing. LICENCE: the same check run on a DERANGED copy of the manifest entry (the first train repo
//   copied into test) must say fail; if it does not, the status is "unlicensed", never "pass". A language
//   split by directory (leakage_risk) can only be "partial": the repo-disjointness half is not measurable.
//   G2 prior provenance (rule 9: priors are built from TRAIN only): for every code prior on disk for the
//   language (priors/code-*-<lang>.json), a prior that records its training repositories
//   (provenance.trainRepos) and split must list no repository the manifest places in dev or test, and
//   declare split "train". PASS RULE: >= 1 corpus-derived prior checked clean, none unverifiable, none
//   overlapping. FAIL: any overlap or a declared split other than train. PARTIAL: some prior is
//   corpus-derived but records no repositories (the older ethos-tree name priors), or the language is
//   split by directory: reported by name, never counted as clean. VACUOUS: every prior is grammar/engine-
//   derived (CodeKeywordPrior: nothing corpus-derived to leak) or none exists. LICENCE: a DERANGED copy of
//   a checked prior (one dev/test repo added to its trainRepos) must be caught; if not, "unlicensed".
//   A prior-provenance gap is a result about the PRIOR, not about the rung: the aggregator does not know
//   which priors a rung loads, so it names every prior on disk and leaves the reading to the card.
// SPLIT DISCIPLINE (rule 9): default split is dev. --limit (a smoke-test device) is refused with --split test: a
//   limited TEST read would spend the held-out set on a sample. TEST is read only when `--split test` is passed, every
//   TEST read is appended to test-reads.jsonl (with the sha1 of each rung module that read it), and the
//   card says how many TEST reads of that language came before and whether the rung modules, or the READER
//   they measure (adapters/code/*.js, code-structure.js, the language's priors, gold.py, the instrument's helper
//   files: sha1s kept in card.sources and in the log), CHANGED between two TEST reads (a changed instrument or
//   reader re-reading TEST is tuning on held-out). c5's measureAll
//   on TEST is given ONLY the languages asked for, so a one-language TEST card never spends another
//   language's TEST. Priors are built from TRAIN only; this file reads no gold of its own.
// DECLARED CONSTANTS (P4): RUNG_TIMEOUT_MS = 30 min (an upper bound above any expected rung run; a rung
//   that has not returned is an error hole, not waited on forever); GUARD_TIMEOUT_MS = 20 min; SMALL_N = 30
//   (an informational flag only: under 30 scored items a pass is an anecdote).
// CAUSAL/PURE NOTES: nothing here reads the future of any text; no model is called.
//
// AMENDMENTS (II.5: dated, each with the observation that prompted it; no pass rule or threshold above was
// changed after a result — these are plumbing and one added guard; the toy-ladder prediction held on first run)
// 2026-10-05  A1 rung-file discovery now prefers a file that exports measure/measureAll and counts only those as
//   rivals. Prompted by: the first run against the real directory picked a helper (c2-lib.mjs) over c2-names.mjs.
// 2026-10-05  A2 cN and rN are the same rung id; --language all means --all; --json sends a rung's console.log to
//   stderr. Prompted by: c3-declared.mjs documents `--language all` and the shared R0..R5 ids.
// 2026-10-05  A3 a not-applicable reason may sit in details.reason or applicability_reason (never in gaps). Prompted by:
//   the real c3 result shape carries an `applicable` boolean on every result.
// 2026-10-05  A4 G2 prior provenance added. Prompted by: reading priors/ after the first real run showed the TRAIN-built
//   priors record provenance.trainRepos and split (so rule 9 for priors is mechanically checkable) while the older
//   ethos-tree name priors record neither (so they can only be reported unverifiable, which c2-names.mjs's header
//   also says). The first real run with G2: python PARTIAL (name-py unverifiable), the rest clean or grammar-derived.
// 2026-10-05  A5 licence reported as deferred leaves a provisional PASS*; --limit is refused with --split test; card.sources
//   fingerprints the reader. Prompted by: c3's measure() returns PASS_LANG without its licence (its header: "needs-pooled",
//   PASS void if the pooled licence fails); and a matrix run saw adapters/code/lex.js change under it (a transient c1 ERROR),
//   which showed the reader, not only the rung module, moves between runs.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const NATIVE = path.resolve(HERE, "..", "..");
export const OUT_DIR = "/private/tmp/claude-501/coding-competence";
export const CORPUS_DIR = "/private/tmp/claude-501/code-corpus";
const PRIORS = path.join(NATIVE, "priors");
const FIXTURE_MANIFEST = path.join(HERE, "fixtures", "MANIFEST.json");

export const RUNG_TIMEOUT_MS = 30 * 60 * 1000;
export const GUARD_TIMEOUT_MS = 20 * 60 * 1000;
export const SMALL_N = 30;

/** The ladder: id, the default module file, the question it asks (used for a rung whose module is missing). */
export const RUNGS = Object.freeze([
  { id: "c0", file: "c0-identify.mjs", name: "identify", question: "which language/system is this text, identified causally from the prefix of its content alone?" },
  { id: "c1", file: "c1-hear.mjs", name: "hear tokens", question: "are token boundaries and lexemes heard as the gold has them?" },
  { id: "c2", file: "c2-class.mjs", name: "classify tokens", question: "can a token, an unseen one included, name a being, and what class is it?" },
  { id: "c3", file: "c3-beings.mjs", name: "find beings", question: "are the entities the text declares found?" },
  { id: "c4", file: "c4-claims.mjs", name: "find relations", question: "are the calls, imports and inheritance the text orders found?" },
  { id: "c5", file: "c5-agree.mjs", name: "agree across representations", question: "do different representations or languages of the same content yield the same beings and relations?", cross: true },
]);
const RUNG_IDS = RUNGS.map((r) => r.id);
export const SPLITS = Object.freeze(["dev", "test"]);
export const VERDICTS = Object.freeze(["pass", "fail", "unmeasured", "error", "invalid", "na"]);
const zeroCounts = () => ({ pass: 0, fail: 0, unmeasured: 0, error: 0, invalid: 0, na: 0 });

const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
const num = (x) => (typeof x === "number" && Number.isFinite(x) ? x : null);
const first = (s) => String(s ?? "").split("\n")[0].slice(0, 300);
const sha1 = (buf) => crypto.createHash("sha1").update(buf).digest("hex");
const safe = (f, fallback = null) => { try { return f(); } catch { return fallback; } };
const outDirDefault = () => process.env.KHORA_CODING_OUT || OUT_DIR;
const corpusDir = () => process.env.KHORA_CODING_CORPUS || CORPUS_DIR;

// ═══ RUNG MODULES: where they are, loading them, tolerating their absence ═════

const RUNG_FILE_RE = (id) => new RegExp(`^${id}(?:[-_.][^/]*)?\\.(?:mjs|js)$`);
/** Files in `dir` that look like rung `id` (c0.mjs, c0-identify.mjs, c0_x.js ...), sorted. The rung files are written by other hands, so the name is discovered, not assumed. */
export function rungCandidates(dir, id) {
  const re = RUNG_FILE_RE(id);
  return safe(() => fs.readdirSync(dir).filter((f) => re.test(f)).sort(), []);
}

const SERVES_RE = /^\s*export\s+(?:async\s+)?function\s+measure(?:All)?\b|^\s*export\s+(?:const|let)\s+measure(?:All)?\b|^\s*export\s*\{[^}]*\bmeasure(?:All)?\b[^}]*\}/m;
/** Does this file textually export measure/measureAll? (no import, no side effects) A c2-lib.mjs helper beside c2-names.mjs does not serve the rung. */
export const servesRung = (file) => { const t = safe(() => fs.readFileSync(file, "utf8")); return Boolean(t && SERVES_RE.test(t)); };
/** The candidates that actually export a measure function. */
export const rungServers = (dir, id) => rungCandidates(dir, id).filter((f) => servesRung(path.join(dir, f)));

/** Which file serves each rung: KHORA_CODING_RUNGS (a JSON object, or a directory) overrides; else the default name if present, else the first discovered c<N>*.mjs that exports measure/measureAll, else the first name match, else the default name (absent). */
export function resolveRungModules(spec = process.env.KHORA_CODING_RUNGS ?? null, dirDefault = HERE) {
  const out = {};
  let over = null, dir = dirDefault;
  if (isObj(spec)) over = spec;
  else if (typeof spec === "string" && spec.trim()) {
    const s = spec.trim();
    if (s.startsWith("{")) over = JSON.parse(s);
    else dir = path.resolve(s);
  }
  for (const r of RUNGS) {
    if (over?.[r.id]) { out[r.id] = path.resolve(over[r.id]); continue; }
    const dflt = path.join(dir, r.file);
    if (fs.existsSync(dflt)) { out[r.id] = dflt; continue; }
    const c = rungCandidates(dir, r.id);
    const served = c.filter((f) => servesRung(path.join(dir, f)));
    out[r.id] = served.length ? path.join(dir, served[0]) : c.length ? path.join(dir, c[0]) : dflt;
  }
  return out;
}

const loadCache = new Map();
/** Import a rung module; never throws. -> { id, path, present, mod?, error?, module:{sha1,size,preregistered_header,rung_id} } */
export async function loadRung(id, file) {
  const buf0 = safe(() => fs.readFileSync(file));
  const key = `${id}:${file}:${buf0 ? sha1(buf0).slice(0, 12) : "absent"}`;
  if (loadCache.has(key)) return loadCache.get(key);
  const rec = { id, path: file, present: fs.existsSync(file), mod: null, error: null, module: null };
  if (rec.present) {
    const buf = buf0 ?? safe(() => fs.readFileSync(file));
    if (buf) {
      const head = buf.toString("utf8").split("\n").slice(0, 140).join("\n");
      rec.module = { sha1: sha1(buf).slice(0, 12), size: buf.length, preregistered_header: /PREDICTION|PRE-?REGISTER|PASS RULE/i.test(head) };
    }
    try {
      rec.mod = await import(`${pathToFileURL(file).href}${rec.module ? `?v=${rec.module.sha1}` : ""}`);
      if (rec.module) { rec.module.rung_id = rec.mod.RUNG?.id ?? null; rec.module.rung_name = rec.mod.RUNG?.name ?? null; }
    } catch (e) { rec.error = `import failed: ${first(e?.message ?? e)}`; }
  }
  loadCache.set(key, rec);
  return rec;
}

/** A hole in the card: said out loud, typed, with pass:null. kind: "unmeasured" | "error". */
export function holeFor({ rung, language, split, reason, kind = "unmeasured", detail = null, short = null }) {
  const gapReason = kind === "error" ? `error: ${reason}` : "unmeasured";
  return {
    language, rung, split, n: 0, score: null, control: null, margin: null, pass: null, applicable: true, controls: {},
    gaps: [short && kind !== "error" ? { reason: gapReason, count: 1, detail: short } : { reason: gapReason, count: 1 }],
    notes: kind === "error" ? [`rung threw — ${reason}`] : [detail ?? reason].filter(Boolean),
    details: kind === "error" && detail ? { error: detail } : {},
    verdict: kind, audit: [], ms: 0,
  };
}

/** What a rung says about its own licence (II.23: the statistic must move under a control built to fail): ok | failed | deferred | not_reported. `deferred` = it says the licence is evaluated elsewhere (e.g. "needs-pooled ... evaluated by measureAll"). */
export function licenceStatusOf(raw) {
  const d = isObj(raw?.details) ? raw.details : {};
  const lic = raw?.licence ?? raw?.license ?? d.licence ?? d.license;
  if (typeof lic === "boolean") return { status: lic ? "ok" : "failed", text: null };
  if (isObj(lic) && typeof lic.ok === "boolean") return { status: lic.ok ? "ok" : "failed", text: null };
  if (isObj(lic) && (lic.ok === null || lic.status === "deferred")) return { status: "deferred", text: String(lic.reason ?? lic.note ?? "ok:null") };
  if (typeof lic === "string" && /needs|defer|pending|not (yet )?(evaluated|measured)|measureAll/i.test(lic)) return { status: "deferred", text: lic };
  return { status: "not_reported", text: null };
}
/** Where a rung that returned pass:null but no typed gap usually says why: details.passRule.reasons, details.reasons, or a note that names the shortfall. */
function nullHint(raw) {
  const d = isObj(raw.details) ? raw.details : {};
  const lists = [d.passRule?.reasons, d.pass_rule?.reasons, d.reasons].filter(Array.isArray);
  for (const l of lists) { const t = l.filter((x) => typeof x === "string" && x.trim()).join("; "); if (t) return t.slice(0, 200); }
  const n = (Array.isArray(raw.notes) ? raw.notes : []).find((x) => typeof x === "string" && /unmeasur|underpower|below|floor|pass: ?null|too few|insufficient/i.test(x));
  return n ? n.slice(0, 200) : null;
}
/** c3 and r3 name the same rung (the id is shared with the natural-language card). */
const rungKey = (x) => { const m = /^[cr]([0-5])\b/i.exec(String(x ?? "").trim()); return m ? m[1] : String(x ?? ""); };
const normGap = (g) => (isObj(g) ? { ...g, reason: String(g.reason ?? "unspecified"), count: num(g.count) ?? 0 } : { reason: String(g), count: 0 });
const reasonText = (x) => {
  if (typeof x === "string") return x.trim();
  if (isObj(x)) return String(x.text ?? x.reason ?? x.code ?? x.description ?? "").trim();
  return "";
};

/**
 * Judge ONE rung result. `pass` is the rung's own verdict by its pre-registered rule; `verdict` is what
 * this aggregator is willing to say: pass | fail | unmeasured | error | invalid | na. A pass without data,
 * without a control, with a non-positive margin, with a failed licence, or for the wrong split/language is
 * INVALID. A not-applicable claim needs a typed reason and must not carry a pass/fail.
 */
export function verdictOf(raw, { rung, language, split }) {
  if (!isObj(raw)) return holeFor({ rung, language, split, kind: "error", reason: `returned ${raw === null ? "null" : typeof raw}, not a result object` });
  const audit = [];
  const r = {
    language: raw.language ?? raw.stem ?? language, rung: raw.rung ?? rung, split: raw.split ?? split,
    n: num(raw.n), score: num(raw.score), control: num(raw.control), margin: num(raw.margin),
    pass: raw.pass === true ? true : raw.pass === false ? false : null,
    applicable: raw.applicable === false ? false : true,
    controls: isObj(raw.controls) ? raw.controls : {},
    gaps: Array.isArray(raw.gaps) ? raw.gaps.map(normGap) : [],
    notes: Array.isArray(raw.notes) ? raw.notes.map(String) : [],
    details: raw.details ?? {},
  };
  if (raw.pass !== true && raw.pass !== false && raw.pass !== null && raw.pass !== undefined) audit.push(`pass_not_boolean:${JSON.stringify(raw.pass)}`);
  if (raw.pass === undefined && raw.applicable !== false) audit.push("pass_missing");
  if (rungKey(r.rung) !== rungKey(rung)) audit.push(`rung_mismatch:${r.rung}`);
  if (r.language !== language) audit.push(`language_mismatch:asked_${language}_got_${r.language}`);
  if (r.split !== split) audit.push(`split_mismatch:asked_${split}_got_${r.split}`);
  if (r.score != null && (r.score < 0 || r.score > 1)) audit.push("score_out_of_range");
  if (r.score != null && r.control != null && r.margin != null && Math.abs(r.margin - (r.score - r.control)) > 1e-6) audit.push("margin_inconsistent");
  if (r.margin == null && r.score != null && r.control != null) r.margin = r.score - r.control;

  const wrongTarget = audit.some((a) => a.startsWith("split_mismatch") || a.startsWith("language_mismatch"));
  const nonBool = raw.pass !== undefined && raw.pass !== null && typeof raw.pass !== "boolean";
  let verdict;
  if (wrongTarget || nonBool) verdict = "invalid";
  else if (raw.applicable === false) {
    // a typed gap about the SYSTEM, not about our measurement: needs a reason, and no verdict of its own
    // the reason is about the SYSTEM (top-level `reason`, or details.reason): a measurement gap ("below declared floor") is never a reason
    const why = reasonText(raw.reason) || reasonText(raw.applicability_reason) || reasonText(raw.details?.reason);
    r.reason = why || null;
    if (!why) { audit.push("not_applicable_without_reason"); verdict = "invalid"; }
    else if (raw.pass === true || raw.pass === false) { audit.push(`not_applicable_but_${raw.pass ? "pass" : "fail"}`); verdict = "invalid"; }
    else {
      verdict = "na";
      if (r.score != null || (r.n ?? 0) > 0) audit.push("not_applicable_but_scored");
      r.gaps = [{ reason: "not_applicable", count: 1, detail: why }, ...r.gaps];
    }
  } else if (r.pass === null) {
    verdict = r.gaps.some((g) => g.reason.startsWith("error")) ? "error" : "unmeasured";
    if (!r.gaps.length) {
      // a null is a typed gap or it is a hidden one (rule 8): say what the rung did not say
      const hint = nullHint(raw);
      audit.push("null_without_typed_gap");
      r.gaps = [{ reason: "unmeasured", count: 1, detail: hint ?? "the rung returned pass:null and no typed gap", ...(hint ? { via: "rung details/notes" } : {}) }];
    }
  }
  else if (r.pass === false) verdict = "fail";
  else {
    if (!(r.n > 0)) audit.push("pass_on_no_data");
    if (r.score == null) audit.push("pass_without_score");
    if (r.control == null) audit.push("pass_without_control");
    else if (!(r.margin > 0)) audit.push("control_matches_or_beats_real_arm");
    const lic = licenceStatusOf(raw);
    if (lic.status === "failed") audit.push("licence_not_met");
    verdict = audit.some((a) => /^(pass_on_no_data|pass_without_score|pass_without_control|control_matches_or_beats_real_arm|licence_not_met)$/.test(a)) ? "invalid" : "pass";
    if (verdict === "pass") {
      // informational only: shown on the card, never a verdict change
      if (lic.status === "deferred") { audit.push(`licence_deferred:${String(lic.text).slice(0, 90)}`); r.provisional = true; }
      else if (lic.status !== "ok") audit.push("no_licence_ok_reported");
      if (r.n > 0 && r.n < SMALL_N) audit.push(`small_n:${r.n}`);
      if (r.score != null) {
        const above = Object.entries(r.controls).filter(([, v]) => typeof v === "number" && Number.isFinite(v) && v >= r.score).map(([k, v]) => `${k}=${v.toFixed(3)}`);
        if (above.length) audit.push(`arms_at_or_above_score:${above.join(",")}`);
      }
    }
  }
  return { ...r, verdict, audit, ms: 0 };
}

const withTimeout = (p, ms, what) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error(`timeout: ${what} did not return within ${ms} ms`)), ms);
  t.unref?.();
  Promise.resolve(p).then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
});

/** Run ONE rung for ONE language. Never throws. */
async function measureRung(rec, { language, split, limit, timeoutMs }) {
  const { id } = rec;
  const base = { rung: id, language, split };
  if (!rec.present) return holeFor({ ...base, short: "module absent", detail: `rung module absent: ${rec.path}` });
  if (rec.error) return holeFor({ ...base, kind: "error", reason: rec.error });
  if (typeof rec.mod?.measure !== "function") {
    const cands = rungCandidates(path.dirname(rec.path), id);
    return holeFor({ ...base, short: "no measure() export", detail: `${path.basename(rec.path)} exports no measure()${cands.length > 1 ? `; files matching ${id}*: ${cands.join(", ")} (none serves the rung yet?)` : ""}` });
  }
  const t0 = Date.now();
  try {
    const raw = await withTimeout(rec.mod.measure({ language, split, ...(limit ? { limit } : {}) }), timeoutMs, `${id}.measure(${language})`);
    const res = verdictOf(raw, base);
    res.ms = Date.now() - t0;
    return res;
  } catch (e) {
    const h = holeFor({ ...base, kind: "error", reason: first(e?.message ?? e), detail: String(e?.stack ?? e).slice(0, 1500) });
    h.ms = Date.now() - t0;
    return h;
  }
}

// ═══ C5: a cross-language rung is measured ONCE across languages, cached in memory and on disk ═════

const keyedByLanguage = (arr) => Object.fromEntries(arr.filter((r) => isObj(r) && (r.language ?? r.stem)).map((r) => [r.language ?? r.stem, r]));
/** The per-language results of a measureAll() answer, whatever it calls them: {perLanguage|perStem|perSystem|byLanguage|results: map or array}, or a bare array of results. */
export function perLanguageOf(result) {
  if (Array.isArray(result)) return keyedByLanguage(result);
  if (!isObj(result)) return null;
  const per = result.perLanguage ?? result.perStem ?? result.perSystem ?? result.byLanguage ?? result.results ?? null;
  return Array.isArray(per) ? keyedByLanguage(per) : isObj(per) ? per : null;
}
const crossMemory = new Map();
export function resetCaches() { crossMemory.clear(); loadCache.clear(); regressionPromise = null; manifestMemo = null; }

/** One call of measureAll over a language set, cached by (module bytes, split, language set, limit). A thrown measureAll is cached in memory only. -> {result,cached} | {absent,short} | {error} | {perLanguage:null} (no measureAll: use per-language measure) */
export async function crossOnce(rec, { split, languages, outDir, fresh = false, limit = null, log = () => {}, timeoutMs = RUNG_TIMEOUT_MS }) {
  if (rec.present && !rec.error && typeof rec.mod?.measureAll !== "function") return { perLanguage: null };
  const key = `${rec.path}|${rec.module?.sha1}|${split}|${limit ?? ""}|${languages.join(",")}`;
  if (crossMemory.has(key) && !fresh) return crossMemory.get(key);
  const p = (async () => {
    if (!rec.present) return { error: null, absent: `rung module absent: ${rec.path}` };
    if (rec.error) return { error: rec.error };
    const hash = sha1(Buffer.from(languages.join(","))).slice(0, 10);
    const file = path.join(outDir, `${rec.id}-all-${split}-${hash}.json`);
    const fp = { path: rec.path, sha1: rec.module?.sha1 ?? null, split, limit: limit ?? null, languages };
    if (!fresh) {
      const cached = safe(() => JSON.parse(fs.readFileSync(file, "utf8")));
      if (cached && JSON.stringify(cached.fingerprint) === JSON.stringify(fp) && cached.result) { log(`${rec.id}: reused ${file}`); return { result: cached.result, cached: true }; }
    }
    try {
      log(`${rec.id}: measureAll over ${languages.length} languages (${split})`);
      const result = await withTimeout(rec.mod.measureAll({ languages, split, ...(limit ? { limit } : {}) }), timeoutMs, `${rec.id}.measureAll`);
      const per = perLanguageOf(result);
      if (!per) return { error: "measureAll() did not return {perLanguage, pairs, notes}" };
      const norm = isObj(result) && !Array.isArray(result) ? { ...result, perLanguage: per } : { perLanguage: per, pairs: [], notes: [] };
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(file, JSON.stringify({ fingerprint: fp, at: new Date().toISOString(), result: norm }));
      return { result: norm, cached: false };
    } catch (e) { return { error: first(e?.message ?? e), stack: String(e?.stack ?? e).slice(0, 1500) }; }
  })();
  crossMemory.set(key, p);
  return p;
}

// ═══ GUARDS ════════════════════════════════════════════════════════════════════

/** Parse a TAP summary (the node:test tap reporter) -> counts + the names of top-level failures. */
export function parseTap(text) {
  const n = (k) => { const m = new RegExp(`^# ${k} (\\d+)`, "m").exec(text); return m ? Number(m[1]) : null; };
  return { tests: n("tests"), pass: n("pass"), fail: n("fail"), cancelled: n("cancelled"), skipped: n("skipped"), todo: n("todo"), failing: [...text.matchAll(/^not ok \d+ - (.*)$/gm)].map((m) => m[1]).slice(0, 25) };
}

let regressionPromise = null;
const NESTED_MARKERS = ["KHORA_CODING_RUNNING", "KHORA_COMPETENCE_RUNNING"];
/** G0: the repo's own regression tests, run once per process, in the background. `cwd` and `force` are test seams. */
export function regressionGuard({ cwd = NATIVE, timeoutMs = Number(process.env.KHORA_CODING_GUARD_TIMEOUT_MS) || GUARD_TIMEOUT_MS, force = false } = {}) {
  const nested = NESTED_MARKERS.find((k) => process.env[k]);
  if (nested && !force) return Promise.resolve({ id: "regression", status: "skipped", reason: `nested_run: this aggregator was started by a regression run (${nested})` });
  if (regressionPromise && !force) return regressionPromise;
  const p = new Promise((resolve) => {
    const t0 = Date.now();
    const env = { ...process.env, KHORA_CODING_RUNNING: "1", KHORA_CODING_GUARDS: "off", KHORA_COMPETENCE_RUNNING: "1", KHORA_COMPETENCE_GUARDS: "off" };
    delete env.NODE_TEST_CONTEXT; // a nested node --test must not think it is a test file of the one that started it
    // quoted globs, passed literally to node (no shell): node expands them
    const child = spawn(process.execPath, ["--test", "--test-reporter=tap", "conformance/*.test.mjs", "tests/*.test.js"], { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { err += d; });
    child.on("error", (e) => { clearTimeout(timer); resolve({ id: "regression", status: "error", error: first(e.message) }); });
    child.on("close", (code, sig) => {
      clearTimeout(timer);
      const c = parseTap(out);
      const ran = c.tests != null && c.tests > 0;
      const ok = ran && c.fail === 0 && (c.cancelled ?? 0) === 0 && code === 0;
      resolve({ id: "regression", status: ok ? "pass" : sig ? "error" : ran ? "fail" : "error", exit: code, signal: sig, ...c, ms: Date.now() - t0, error: ran ? null : first(err || out) || "no TAP summary" });
    });
  });
  if (!force) regressionPromise = p;
  return p;
}

let manifestMemo = null;
/** The corpus manifest (CodeCorpusManifest@1), parsed once per process; null when absent/unreadable. */
export function loadManifest(dir = corpusDir()) {
  if (manifestMemo?.dir === dir) return manifestMemo.value;
  const value = safe(() => JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8")));
  manifestMemo = { dir, value };
  return value;
}

const SPLIT_NAMES = ["train", "dev", "test"];
/** The two held-out checks on one manifest entry's file lists: repos and sha256 hashes occurring in more than one split. */
function clashes(files) {
  const repoSplit = new Map(), shaSplit = new Map();
  const repo = new Set(), sha = new Set();
  for (const s of SPLIT_NAMES) for (const x of files[s]) {
    if (x.repo != null) { const prev = repoSplit.get(x.repo); if (prev === undefined) repoSplit.set(x.repo, s); else if (prev !== s) repo.add(x.repo); }
    if (x.sha256) { const prev = shaSplit.get(x.sha256); if (prev === undefined) shaSplit.set(x.sha256, s); else if (prev !== s) sha.add(x.sha256); }
  }
  return { repo: [...repo], sha: [...sha] };
}
/** The control built to fail: the first train repo (its files) copied into test. */
function derange(files) {
  const lead = files.train.find((x) => x.repo != null) ?? files.train[0];
  if (!lead) return null;
  const moved = files.train.filter((x) => (lead.repo != null ? x.repo === lead.repo : x === lead));
  return { ...files, test: [...files.test, ...moved] };
}

/** G1. Corpus integrity for one language and split, with its licence check. `entry` = manifest.languages[language]. */
export function corpusIntegrity({ language, split, entry, exists = fs.existsSync }) {
  const id = "corpus_integrity";
  const scope = { language, split };
  if (!entry) return { id, scope, status: "unmeasured", reason: "language not in the corpus manifest" };
  const files = Object.fromEntries(SPLIT_NAMES.map((s) => [s, Array.isArray(entry[s]) ? entry[s] : []]));
  const counts = Object.fromEntries(SPLIT_NAMES.map((s) => [s, files[s].length]));
  const risk = entry.info?.leakage_risk === true;
  if (files[split].length === 0) return { id, scope, status: "vacuous", counts, reason: `no ${split} files for ${language}: nothing to check or to score` };
  const real = clashes(files);
  const missing = files[split].filter((x) => !exists(x.path)).length;
  const bad = derange(files);
  let licence;
  if (!bad) licence = { ok: null, control: "first train repo copied into test", reason: "no train files to derange" };
  else {
    const d = clashes(bad);
    licence = { ok: d.sha.length > 0 && (risk || d.repo.length > 0), control: "first train repo copied into test must produce a sha256 clash and (repo-split languages) a repo clash", deranged: { repo_clashes: d.repo.length, sha_clashes: d.sha.length } };
  }
  let status, reason = null;
  if (real.repo.length && !risk) { status = "fail"; reason = `${real.repo.length} repo(s) in more than one split`; }
  else if (real.sha.length) { status = "fail"; reason = `${real.sha.length} file hash(es) in more than one split`; }
  else if (missing) { status = "fail"; reason = `${missing} of ${files[split].length} ${split} files missing on disk`; }
  else if (licence.ok !== true) { status = licence.ok === null ? "vacuous" : "unlicensed"; reason = licence.ok === null ? "no train files: the check could not have failed" : "the deranged control did not fail: this check could not have failed"; }
  else if (risk) { status = "partial"; reason = "split by directory/file (leakage_risk): the repo-disjointness half is not measurable; hashes disjoint, files present"; }
  else status = "pass";
  return { id, scope, status, counts, repo_clashes: real.repo.slice(0, 6), sha_clashes: real.sha.length, missing_on_disk: missing, leakage_risk: risk, split_rule: entry.info?.split_rule ?? null, licence, reason };
}

const PRIOR_ALIAS = { python: "py", javascript: "js", typescript: "ts" };
const reEsc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The code priors on disk for a language: priors/code-<kind>-<lang or alias>.json (code-kw-py, code-name-train-py, code-ctx-py ...). */
export function priorsFor(language, dir = PRIORS) {
  const names = [language, PRIOR_ALIAS[language]].filter(Boolean).map(reEsc);
  const re = new RegExp(`^code-.+-(?:${names.join("|")})\\.json$`);
  return safe(() => fs.readdirSync(dir).filter((f) => re.test(f)).sort(), []);
}
const lowerRepo = (r) => String(r ?? "").trim().toLowerCase();

/** G2. Prior provenance for one language, with its licence check. `entry` = manifest.languages[language]. */
export function priorProvenance({ language, split, entry, dir = PRIORS }) {
  const id = "prior_provenance";
  const scope = { language, split };
  const files = priorsFor(language, dir);
  if (!files.length) return { id, scope, status: "vacuous", priors: [], reason: `no code priors on disk for ${language}` };
  const heldOut = new Map();
  for (const sp of ["dev", "test"]) for (const x of entry?.[sp] ?? []) if (x.repo != null) heldOut.set(lowerRepo(x.repo), sp);
  const risk = entry?.info?.leakage_risk === true;
  const priors = files.map((file) => {
    const p = safe(() => JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")));
    if (!isObj(p)) return { file, status: "unreadable" };
    const prov = isObj(p.provenance) ? p.provenance : {};
    const repos = prov.trainRepos ?? prov.train_repos ?? null;
    const base = { file, schema: p.schema ?? null, giver: typeof prov.giver === "string" ? prov.giver.slice(0, 80) : null };
    if (/^CodeKeywordPrior/.test(String(p.schema ?? ""))) return { ...base, status: "not_corpus_derived" };
    if (!Array.isArray(repos)) return { ...base, status: "unverifiable", reason: `records no trainRepos${prov.source ? ` (source: ${String(prov.source).slice(0, 60)})` : ""}` };
    const overlap = repos.filter((r) => heldOut.has(lowerRepo(r)));
    const splitBad = prov.split != null && prov.split !== "train";
    return { ...base, status: overlap.length || splitBad ? "overlap" : "clean", train_repos: repos.length, overlap: overlap.slice(0, 8).map((r) => `${r} (${heldOut.get(lowerRepo(r))})`), declared_split: prov.split ?? null, ...(splitBad ? { reason: `declares split "${prov.split}", not train` } : {}), _repos: repos };
  });
  const out = priors.map(({ _repos, ...rest }) => rest);
  const checked = priors.filter((x) => x.status === "clean" || x.status === "overlap");
  const unverifiable = priors.filter((x) => x.status === "unverifiable" || x.status === "unreadable");
  const bad = priors.filter((x) => x.status === "overlap");
  if (!entry) return { id, scope, status: "unmeasured", priors: out, reason: `language not in the corpus manifest: cannot place any prior's repositories` };
  if (bad.length && !risk) return { id, scope, status: "fail", priors: out, reason: `${bad.map((x) => x.file).join(", ")} trained on repositories the manifest places in dev/test (or declares another split)` };
  // the control built to fail: a checked-clean prior with one held-out repo added must be caught
  let licence = { ok: null, control: "a clean prior with one dev/test repository added to its trainRepos must overlap" };
  const clean = priors.find((x) => x.status === "clean");
  if (clean && heldOut.size) {
    const planted = [...heldOut.keys()][0];
    licence = { ok: [...clean._repos, planted].some((r) => heldOut.has(lowerRepo(r))), control: licence.control, planted };
  }
  let status, reason = null;
  if (!checked.length && !unverifiable.length) { status = "vacuous"; reason = "every prior on disk is grammar/engine-derived: nothing corpus-derived to leak"; }
  else if (risk) { status = "partial"; reason = "split by directory (leakage_risk): repo-level provenance cannot clear a prior"; }
  else if (checked.length && licence.ok !== true && heldOut.size) { status = "unlicensed"; reason = "the deranged prior was not caught: this check could not have failed"; }
  else if (unverifiable.length) { status = "partial"; reason = `no training repositories recorded in ${unverifiable.map((x) => x.file).join(", ")}: cannot be cleared as TRAIN-only`; }
  else if (!checked.length) { status = "vacuous"; reason = "no corpus-derived prior"; }
  else status = "pass";
  return { id, scope, status, priors: out, licence, leakage_risk: risk, reason };
}

const guardOk = (g) => g.status === "pass" || g.status === "skipped";
/** Roll the guards up. ok:true only when nothing failed or errored AND all passed; vacuous/unlicensed/partial/unmeasured are reported, never counted as good. */
export function summarizeGuards(list) {
  const by = {};
  for (const g of list) by[g.status] = (by[g.status] ?? 0) + 1;
  const bad = list.filter((g) => g.status === "fail" || g.status === "error");
  return { ok: bad.length ? false : list.length === 0 ? null : list.every(guardOk) ? true : null, counts: by, failed: bad.map((g) => `${g.id}${g.scope ? `[${g.scope.language}]` : ""}`) };
}

// ═══ THE CARD ══════════════════════════════════════════════════════════════════

/** Corpus summary (per-language counts, split rule, leakage risk): summary.json, else manifest.json. -> { languages: {lang: {...}}, source } | null */
export function corpusSummary(dir = corpusDir()) {
  const s = safe(() => JSON.parse(fs.readFileSync(path.join(dir, "summary.json"), "utf8")));
  if (isObj(s?.languages)) return { languages: s.languages, source: path.join(dir, "summary.json") };
  const m = loadManifest(dir);
  if (isObj(m?.languages)) {
    const languages = {};
    for (const [l, e] of Object.entries(m.languages)) {
      const counts = {};
      for (const sp of SPLIT_NAMES) counts[sp] = { files: (e[sp] ?? []).length, repos: new Set((e[sp] ?? []).map((x) => x.repo)).size };
      languages[l] = { split_rule: e.info?.split_rule ?? null, leakage_risk: e.info?.leakage_risk === true, counts };
    }
    return { languages, source: path.join(dir, "manifest.json") };
  }
  return null;
}

/** Every language with a corpus, in declared order (the order of the corpus summary); else the languages of the authored fixtures. */
export function languageList(dir = corpusDir()) {
  const c = corpusSummary(dir);
  if (c) return { languages: Object.keys(c.languages), source: c.source };
  const f = safe(() => JSON.parse(fs.readFileSync(FIXTURE_MANIFEST, "utf8")));
  if (isObj(f?.fixtures)) return { languages: [...new Set(Object.values(f.fixtures).map((x) => x.language))].sort(), source: `${FIXTURE_MANIFEST} (authored fixtures only: no corpus found at ${dir})` };
  return { languages: [], source: null };
}

/** What is on disk for a language: corpus counts per split, the received priors, an authored fixture. */
export function dataPresence(language, dir = corpusDir()) {
  const c = corpusSummary(dir);
  const e = c?.languages?.[language] ?? null;
  const split = (s) => (e?.counts?.[s] ? { files: e.counts[s].files ?? 0, repos: e.counts[s].repos ?? 0, files_unrestricted: e.counts[s].files_unrestricted ?? null } : null);
  const pf = priorsFor(language);
  const prior = (kind) => pf.some((f) => f.startsWith(`code-${kind}-`));
  const fx = safe(() => JSON.parse(fs.readFileSync(FIXTURE_MANIFEST, "utf8")));
  return {
    corpus: e ? { train: split("train"), dev: split("dev"), test: split("test"), split_rule: e.split_rule ?? null, leakage_risk: e.leakage_risk === true, note: e.note ?? null } : null,
    priors: { kw: prior("kw"), name: prior("name"), files: pf },
    authored_fixture: isObj(fx?.fixtures) ? Object.values(fx.fixtures).some((x) => x.language === language) : false,
  };
}

const testReadsFile = (outDir) => path.join(outDir, "test-reads.jsonl");
const readTestReads = (outDir, language) => safe(() => fs.readFileSync(testReadsFile(outDir), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.language === language), []);

/**
 * sha1 (12 hex) of everything a rung's answer for `language` depends on besides the rung module itself: the code reader
 * (adapters/code/*.js, adapters/text/code-structure.js), the priors on disk for the language, the gold extractor and the
 * instrument's helper files. Recorded on every card and in the TEST log, so a changed READER re-reading TEST is visible.
 */
export function sourceFingerprint(language, { native = NATIVE, priorsDir = PRIORS, here = HERE } = {}) {
  const out = {};
  const add = (abs) => { const b = safe(() => fs.readFileSync(abs)); if (b) out[path.relative(native, abs)] = sha1(b).slice(0, 12); };
  const js = (d) => safe(() => fs.readdirSync(d).filter((f) => /\.m?js$/.test(f)).sort().map((f) => path.join(d, f)), []);
  for (const f of js(path.join(native, "adapters", "code"))) add(f);
  add(path.join(native, "adapters", "text", "code-structure.js"));
  for (const f of priorsFor(language, priorsDir)) add(path.join(priorsDir, f));
  for (const f of js(here)) add(f);
  add(path.join(here, "gold.py"));
  return out;
}
const changedSources = (before, after) => {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  return [...keys].filter((k) => before?.[k] !== after?.[k]).sort();
};

const pairInvolves = (pair, language) => isObj(pair) && Object.values(pair).some((v) => v === language || (Array.isArray(v) && v.includes(language)));

/**
 * One language's card. Every rung is measured or is a hole that says why. `guards`: "full" | "integrity" | "off".
 * `r5Languages`: the language set handed to a measureAll (default: every corpus language plus this one on dev; ONLY this one on test).
 */
export async function runCard({ language, split = "dev", limit = null, rungs = RUNG_IDS, rungModules = resolveRungModules(), outDir = outDirDefault(), guards = process.env.KHORA_CODING_GUARDS || "full", fresh = false, r5Languages = null, write = true, log = () => {}, regressionOptions = {}, timeoutMs = RUNG_TIMEOUT_MS, corpus = corpusDir(), priorsDir = PRIORS, fingerprint = sourceFingerprint } = {}) {
  if (!SPLITS.includes(split)) throw new Error(`split must be one of ${SPLITS.join("|")}, got "${split}"`);
  if (!language) throw new Error("runCard: language is required");
  if (split === "test" && limit) throw new Error("limit is a DEV smoke-test device: a limited TEST read would spend the held-out set on a sample (rule 9); refused with split test");
  if (!["full", "integrity", "off"].includes(guards)) throw new Error(`guards must be full|integrity|off, got "${guards}"`);
  const t0 = Date.now();
  fs.mkdirSync(outDir, { recursive: true });
  const sources = fingerprint(language, { priorsDir });
  const known = languageList(corpus);
  const langs5 = r5Languages ?? (split === "test" ? [language] : [...new Set([...known.languages, language])]);

  // the slow guard starts now and is awaited last (the regression run is shared by every card in the process)
  const regP = guards === "full" ? regressionGuard(regressionOptions) : null;

  const results = {};
  const modules = {};
  let cross = null;
  for (const R of RUNGS) {
    if (!rungs.includes(R.id)) continue;
    const rec = await loadRung(R.id, rungModules[R.id]);
    modules[R.id] = { path: rec.path, present: rec.present, error: rec.error, ...(rec.module ?? {}) };
    log(`${language} ${R.id} ...`);
    const base = { rung: R.id, language, split };
    let res = null;
    if (R.cross) {
      const t1 = Date.now();
      const all = await crossOnce(rec, { split, languages: langs5, outDir, fresh, limit, log, timeoutMs });
      if (all.perLanguage === null) res = null; // no measureAll(): the per-language measure() below serves
      else {
        if (all.absent) res = holeFor({ ...base, short: all.short ?? "module absent", detail: all.absent });
        else if (all.error) res = holeFor({ ...base, kind: "error", reason: all.error, detail: all.stack ?? null });
        else {
          const raw = all.result.perLanguage[language];
          if (raw === undefined) res = holeFor({ ...base, short: "language not in perLanguage", detail: `language ${language} is not in measureAll's perLanguage (asked for ${langs5.length} language${langs5.length === 1 ? "" : "s"}${split === "test" ? "; on TEST only the languages asked for are read" : ""})` });
          else if (isObj(raw) && raw.error && raw.pass === undefined) res = holeFor({ ...base, kind: "error", reason: first(raw.error) });
          else res = verdictOf(raw, base);
          cross = { pairs: (all.result.pairs ?? []).filter((p) => pairInvolves(p, language)), pairs_total: (all.result.pairs ?? []).length, notes: all.result.notes ?? [], cached: all.cached ?? false, languages_read: langs5.length };
        }
        res.ms = Date.now() - t1;
      }
    }
    results[R.id] = res ?? await measureRung(rec, { language, split, limit, timeoutMs });
    const m = modules[R.id];
    results[R.id].module = { sha1: m.sha1 ?? null, preregistered_header: m.preregistered_header ?? null, rung_id: m.rung_id ?? null };
    if (m.present && !m.error && m.preregistered_header === false) results[R.id].audit.push("no_preregistration_header");
    if (m.rung_id && rungKey(m.rung_id) !== rungKey(R.id)) results[R.id].audit.push(`module_declares_rung:${m.rung_id}`);
    const cands = rungServers(path.dirname(rec.path), R.id); // helpers (c2-lib.mjs) that export no measure() are not rivals
    if (cands.length > 1 && cands.includes(path.basename(rec.path))) results[R.id].audit.push(`ambiguous_module:${cands.join("|")}`);
  }

  // guards
  const guardList = { regression: null, integrity: null, priors: null };
  if (guards !== "off") {
    log(`${language} guards ...`);
    const m = loadManifest(corpus);
    guardList.integrity = corpusIntegrity({ language, split, entry: m?.languages?.[language] ?? null });
    if (!m) guardList.integrity.reason = `no corpus manifest at ${path.join(corpus, "manifest.json")}`;
    guardList.priors = priorProvenance({ language, split, entry: m?.languages?.[language] ?? null, dir: priorsDir });
    if (!m) guardList.priors.reason = `no corpus manifest at ${path.join(corpus, "manifest.json")}`;
    if (guards === "full") guardList.regression = await regP;
  }
  const allGuards = [guardList.regression, guardList.integrity, guardList.priors].filter(Boolean);

  const summary = { total: Object.keys(results).length, ...zeroCounts(), provisional: 0 };
  for (const r of Object.values(results)) { summary[r.verdict] += 1; if (r.verdict === "pass" && r.provisional) summary.provisional += 1; }

  const data = dataPresence(language, corpus);
  const prior = split === "test" ? readTestReads(outDir, language) : [];
  const notes = [];
  if (!known.languages.includes(language)) notes.push(`language "${language}" is not in the corpus (${known.source ?? "no corpus found"}); ids look like: ${known.languages.slice(0, 8).join(", ")}...`);
  if (data.corpus?.leakage_risk) notes.push(`LEAKAGE RISK: ${language} was split by directory/file, not repository (${data.corpus.split_rule}): a pass here is weaker held-out evidence.`);
  if (data.corpus && data.corpus[split] && data.corpus[split].files === 0) notes.push(`NO ${split.toUpperCase()} FILES for ${language}: rungs that read ${split} have nothing to be scored on.`);
  const holes = Object.entries(results).filter(([, r]) => r.verdict === "unmeasured" || r.verdict === "error").map(([id]) => id);
  if (holes.length) notes.push(`HOLES: ${holes.join(", ")} are not measured — unmeasured is not good (rule 8).`);
  const inv = Object.entries(results).filter(([, r]) => r.verdict === "invalid").map(([id, r]) => `${id} (${r.audit.filter((a) => !/^(no_prereg|no_licence)/.test(a)).join(", ")})`);
  if (inv.length) notes.push(`INVALID verdicts (rung's own pass is kept in .pass): ${inv.join("; ")}`);
  for (const [id, r] of Object.entries(results)) {
    if (r.verdict === "pass" && r.provisional) notes.push(`${id} PASS* is PROVISIONAL: the rung deferred its licence (${(r.audit.find((x) => x.startsWith("licence_deferred:")) ?? "").slice("licence_deferred:".length)}) — an unlicensed pass is not a measured pass (II.23); it is counted apart in the totals.`);
    if (r.verdict === "na") notes.push(`${id} declared NOT APPLICABLE to ${language} by the rung (not verified here): ${r.reason}`);
    const a = r.audit.find((x) => x.startsWith("arms_at_or_above_score:"));
    if (a) notes.push(`${id} PASSES against its declared control, but listed arms match or beat its score: ${a.slice(a.indexOf(":") + 1)} — read the pass with that in view.`);
  }
  const noPre = Object.entries(results).filter(([, r]) => r.audit.includes("no_preregistration_header")).map(([id]) => id);
  if (noPre.length) notes.push(`no pre-registration header found in: ${noPre.join(", ")} (II.5: prediction and pass rule belong in the file header before the first run)`);
  const amb = Object.entries(results).filter(([, r]) => r.audit.some((a) => a.startsWith("ambiguous_module"))).map(([id]) => id);
  if (amb.length) notes.push(`more than one module matches rung(s) ${amb.join(", ")}: the first by name was used (see audit)`);
  if (split === "test" && prior.length) {
    notes.push(`TEST already read ${prior.length} time(s) for ${language}: this is NOT the one-shot final read (rule 9).`);
    const last = prior[prior.length - 1];
    const changed = Object.keys(results).filter((id) => last.modules?.[id] && modules[id]?.sha1 && last.modules[id] !== modules[id].sha1);
    if (changed.length) notes.push(`rung modules CHANGED since the previous TEST read: ${changed.join(", ")} — a changed instrument reading TEST again is tuning on held-out data.`);
    if (last.sources) {
      const moved = changedSources(last.sources, sources);
      if (moved.length) notes.push(`the READER or its priors/gold/helpers CHANGED since the previous TEST read: ${moved.slice(0, 8).join(", ")}${moved.length > 8 ? `, +${moved.length - 8} more` : ""} — a changed system reading TEST again is tuning on held-out data (rule 9).`);
    }
  }
  if (guards === "off") notes.push("guards were switched OFF for this card");
  if (guards === "integrity") notes.push("guards: regression tests were NOT run for this card (integrity only)");

  const card = {
    card_version: 1, language, split, generated_at: new Date().toISOString(), ms: Date.now() - t0,
    split_discipline: { requested: split, default: "dev", test_reads_before_this: split === "test" ? prior.length : null, c5_languages_read: split === "test" ? "only those asked for" : "all corpus languages plus this one" },
    data, rungs: results, summary, cross_language: cross, modules, sources,
    guards: { mode: guards, summary: summarizeGuards(allGuards), regression: guardList.regression, integrity: guardList.integrity, priors: guardList.priors },
    notes,
  };
  if (split === "test" && write) { try { fs.appendFileSync(testReadsFile(outDir), `${JSON.stringify({ language, at: card.generated_at, rungs: Object.keys(results), modules: Object.fromEntries(Object.entries(modules).map(([k, v]) => [k, v.sha1 ?? null])), sources })}\n`); } catch {} }
  if (write) fs.writeFileSync(path.join(outDir, `card-${language}-${split}.json`), JSON.stringify(card, null, 1));
  return card;
}

/** Every language; c5's measureAll is run once per (module, split, language set) and cached. TEST: the language set is exactly the languages asked for. */
export async function runAll({ languages = null, split = "dev", corpus = corpusDir(), ...opts } = {}) {
  const list = languages ?? languageList(corpus).languages;
  const cards = [];
  const r5 = opts.r5Languages ?? (split === "test" ? [...list] : [...new Set([...languageList(corpus).languages, ...list])]);
  for (const language of list) cards.push(await runCard({ language, split, r5Languages: r5, corpus, ...opts }));
  return { split, languages: [...list], cards, totals: totalsOf(cards), matrix: matrixOf(cards) };
}

// ═══ RENDERING ═════════════════════════════════════════════════════════════════

const GLYPH = { pass: "✓", fail: "✗", unmeasured: "·", error: "E", invalid: "!", na: "–" };
const f3 = (x) => (x == null ? "-" : Number(x).toFixed(3));
const fs3 = (x) => (x == null ? "-" : `${x >= 0 ? "+" : ""}${Number(x).toFixed(3)}`);
const gapText = (gaps, max = 3) => {
  if (!gaps?.length) return "";
  const cut = (x, n) => (x.length > n ? `${x.slice(0, n)}…` : x);
  const parts = gaps.slice(0, max).map((g) => `${cut(g.reason, 90)}${g.detail ? ` (${cut(String(g.detail), 60)})` : ""}${g.of != null ? ` ${g.count}/${g.of}` : g.count > 1 ? `×${g.count}` : ""}`);
  return parts.join("; ") + (gaps.length > max ? `; +${gaps.length - max} more` : "");
};
const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
const rungName = (id, name) => { const n = String(name ?? RUNGS.find((r) => r.id === id)?.name ?? ""); return `${id} ${n.length > 34 ? `${n.slice(0, 33)}…` : n}`.trim(); };
const label = (v) => (v === "na" ? "N/A" : v.toUpperCase());

const guardLine = (g) => {
  if (g.id === "regression") {
    if (g.status === "skipped") return `regression tests: skipped (${g.reason})`;
    if (g.status === "error") return `regression tests: ERROR (${g.error})`;
    return `regression tests: ${g.status.toUpperCase()} — ${g.pass}/${g.tests} pass, ${g.fail} fail, ${g.cancelled ?? 0} cancelled, ${g.skipped ?? 0} skipped${g.failing?.length ? ` [${g.failing.slice(0, 5).join("; ")}]` : ""}`;
  }
  if (g.id === "corpus_integrity") {
    const c = g.counts ? ` train/dev/test files ${g.counts.train}/${g.counts.dev}/${g.counts.test}` : "";
    const d = g.licence?.deranged ? `; deranged control clashes repo ${g.licence.deranged.repo_clashes} sha ${g.licence.deranged.sha_clashes}` : "";
    return `corpus integrity [${g.scope?.language}, ${g.scope?.split}]: ${g.status.toUpperCase()}${c}${d}${g.missing_on_disk ? `; ${g.missing_on_disk} missing on disk` : ""}${g.reason ? ` (${g.reason})` : ""}`;
  }
  if (g.id === "prior_provenance") {
    const one = (x) => `${x.file.replace(/^code-|\.json$/g, "")} ${x.status === "not_corpus_derived" ? "(grammar/engine)" : x.status === "clean" ? `(TRAIN-only, ${x.train_repos} repos)` : x.status === "overlap" ? `(OVERLAP: ${x.overlap.join(", ") || x.reason})` : x.status === "unverifiable" ? "(UNVERIFIABLE)" : `(${x.status})`}`;
    const lic = g.licence?.planted ? `; deranged control ${g.licence.ok ? "caught" : "NOT caught"}` : "";
    return `prior provenance [${g.scope?.language}]: ${g.status.toUpperCase()}${g.priors?.length ? ` — ${g.priors.map(one).join("; ")}` : ""}${lic}${g.reason ? ` (${g.reason})` : ""}`;
  }
  return `${g.id}: ${g.status.toUpperCase()}${g.reason ? ` (${g.reason})` : ""}${g.error ? ` (${g.error})` : ""}`;
};
const dataLine = (card) => {
  const d = card.data;
  const sp = (s) => (d.corpus?.[s] ? `${s} ${d.corpus[s].files} files/${d.corpus[s].repos} repos` : `${s} NO`);
  const corpus = d.corpus ? `corpus ${sp("train")}, ${sp("dev")}, ${sp("test")} (split ${d.corpus.split_rule ?? "?"}${d.corpus.leakage_risk ? ", LEAKAGE RISK" : ""})` : "corpus NO";
  return `data: ${corpus}; priors kw ${d.priors.kw ? "yes" : "NO"} name ${d.priors.name ? "yes" : "NO"}; authored fixture ${d.authored_fixture ? "yes" : "NO"}${card.split === "test" ? `; TEST reads of ${card.language} before this one: ${card.split_discipline.test_reads_before_this}` : ""}`;
};

/** The per-language coding competence card as markdown. */
export function renderCard(card) {
  const L = [];
  L.push(`## Coding competence card: ${card.language} (${card.split})`);
  L.push("");
  L.push(dataLine(card));
  L.push("");
  L.push("| rung | score | control | margin | pass | n | gaps |");
  L.push("|---|---|---|---|---|---|---|");
  for (const id of RUNG_IDS) {
    const r = card.rungs[id];
    if (!r) continue;
    const pass = `${GLYPH[r.verdict]} ${label(r.verdict)}${r.verdict === "pass" && r.provisional ? "*" : ""}${r.verdict === "invalid" && r.pass === true ? " (rung said pass)" : ""}`;
    L.push(`| ${cell(rungName(id, card.modules[id]?.rung_name))} | ${f3(r.score)} | ${f3(r.control)} | ${fs3(r.margin)} | ${pass} | ${r.n ?? 0} | ${cell(gapText(r.gaps))} |`);
  }
  L.push("");
  for (const id of RUNG_IDS) {
    const r = card.rungs[id];
    if (!r) continue;
    const cs = Object.entries(r.controls ?? {}).map(([k, v]) => `${k}=${typeof v === "number" ? f3(v) : JSON.stringify(v)}`).join(", ");
    const bits = [];
    if (cs) bits.push(`controls: ${cs}`);
    const au = r.audit.filter((a) => a !== "no_preregistration_header");
    if (au.length) bits.push(`audit: ${au.join(", ")}`);
    const key = r.notes.filter((n) => /LICENCE|pass: null|FAILED|underpowered|rung threw|absent|exports no/i.test(n)).slice(0, 2);
    if (!key.length && (r.verdict === "error" || r.verdict === "unmeasured") && r.notes[0]) key.push(r.notes[0]);
    for (const n of key) bits.push(n.length > 220 ? `${n.slice(0, 220)}…` : n);
    if (bits.length) L.push(`- ${id}: ${bits.filter(Boolean).join(" | ")}`);
  }
  const s = card.summary;
  L.push("");
  L.push(`rungs: ${s.pass} pass${s.provisional ? ` (${s.provisional} provisional*)` : ""}, ${s.fail} fail, ${s.unmeasured} unmeasured, ${s.error} error, ${s.invalid} invalid, ${s.na} not applicable (of ${s.total})`);
  if (card.cross_language) L.push(`c5 pairs involving ${card.language}: ${card.cross_language.pairs.length} of ${card.cross_language.pairs_total}${card.cross_language.cached ? " (cached)" : ""}`);
  L.push("");
  L.push(`guards (${card.guards.mode}): ${card.guards.summary.ok === true ? "all pass" : card.guards.summary.ok === false ? `FAILED: ${card.guards.summary.failed.join(", ")}` : card.guards.mode === "off" ? "OFF" : `none failed, not all pass (${JSON.stringify(card.guards.summary.counts)})`}`);
  for (const g of [card.guards.regression, card.guards.integrity, card.guards.priors].filter(Boolean)) L.push(`- ${guardLine(g)}`);
  if (card.notes.length) { L.push(""); for (const n of card.notes) L.push(`note: ${n}`); }
  return L.join("\n");
}

export function totalsOf(cards) {
  const perRung = {};
  for (const id of RUNG_IDS) perRung[id] = zeroCounts();
  const overall = { ...zeroCounts(), cells: 0, provisional: 0 };
  for (const c of cards) for (const id of RUNG_IDS) { const r = c.rungs[id]; if (!r) continue; perRung[id][r.verdict] += 1; overall[r.verdict] += 1; overall.cells += 1; if (r.verdict === "pass" && r.provisional) overall.provisional += 1; }
  return { perRung, overall };
}
export function matrixOf(cards) {
  const m = {};
  for (const c of cards) { m[c.language] = {}; for (const id of RUNG_IDS) { const r = c.rungs[id]; m[c.language][id] = r ? { verdict: r.verdict, score: r.score, control: r.control, margin: r.margin, n: r.n, ...(r.provisional ? { provisional: true } : {}) } : null; } }
  return m;
}

/** The language x rung matrix as markdown, with totals. */
export function renderMatrix(cards, { split = "dev" } = {}) {
  const T = totalsOf(cards);
  const w = Math.max(10, ...cards.map((c) => c.language.length));
  const L = [`## Coding competence matrix (${split}): ${cards.length} languages x ${RUNG_IDS.length} rungs`, ""];
  L.push(`| ${"lang".padEnd(w)} | ${RUNG_IDS.map((i) => i.padEnd(7)).join(" | ")} | p/f/u/n |`);
  L.push(`|${"-".repeat(w + 2)}|${RUNG_IDS.map(() => "-".repeat(9)).join("|")}|---------|`);
  for (const c of cards) {
    const cells = RUNG_IDS.map((id) => { const r = c.rungs[id]; if (!r) return "(skip)".padEnd(7); return `${GLYPH[r.verdict]}${r.verdict === "pass" && r.provisional ? "*" : ""}${r.score != null ? " " + r.score.toFixed(2) : "     "}`.padEnd(7); });
    const s = c.summary;
    L.push(`| ${c.language.padEnd(w)} | ${cells.join(" | ")} | ${`${s.pass}/${s.fail}/${s.unmeasured + s.error + s.invalid}/${s.na}`.padEnd(7)} |`);
  }
  const rowOf = (lab, key) => `| ${lab.padEnd(w)} | ${RUNG_IDS.map((id) => String(T.perRung[id][key]).padEnd(7)).join(" | ")} | ${String(T.overall[key]).padEnd(7)} |`;
  L.push(`|${"-".repeat(w + 2)}|${RUNG_IDS.map(() => "-".repeat(9)).join("|")}|---------|`);
  L.push(rowOf("pass", "pass"), rowOf("fail", "fail"), rowOf("unmeasured", "unmeasured"), rowOf("error", "error"), rowOf("invalid", "invalid"), rowOf("n/a", "na"));
  L.push("");
  L.push(`legend: ${GLYPH.pass} pass  ${GLYPH.fail} fail  ${GLYPH.unmeasured} unmeasured (hole)  E error (rung threw)  ${GLYPH.invalid} invalid (pass contradicted by its own control/split/data, or n/a with no reason)  ${GLYPH.na} not applicable (typed reason from the rung)  ✓* provisional pass (the rung deferred its licence)   cell = glyph + score; p/f/u/n = pass / fail / everything else unmeasured, error or invalid / not applicable`);
  const o = T.overall;
  const applicable = o.cells - o.na;
  const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) : "0.0");
  L.push(`totals: ${o.pass} pass${o.provisional ? ` (${o.provisional} provisional*: licence deferred by the rung)` : ""}, ${o.fail} fail, ${o.unmeasured} unmeasured, ${o.error} error, ${o.invalid} invalid, ${o.na} not applicable of ${o.cells} cells; ${pct(o.pass, o.cells)}% of the ladder is measured-and-passing${o.provisional ? ` (${pct(o.pass - o.provisional, o.cells)}% counting clean passes only)` : ""} (${pct(o.pass, applicable)}% of the ${applicable} applicable cells); ${o.unmeasured + o.error} cells are holes, not good; ${pct(o.na, o.cells)}% declared not applicable (a rung's claim, not verified here).`);
  const g = cards[0]?.guards;
  if (g) {
    L.push(`guards (${g.mode}): ${g.mode === "off" ? "OFF" : ""}`.trimEnd());
    if (g.regression) L.push(`- ${guardLine(g.regression)}`);
    const per = cards.map((c) => c.guards.integrity).filter(Boolean);
    const by = {};
    for (const x of per) (by[x.status] ??= []).push(x.scope?.language ?? "?");
    for (const [k, v] of Object.entries(by)) L.push(`- corpus integrity ${k}: ${v.length}/${cards.length}${k === "pass" ? "" : ` (${v.slice(0, 12).join(", ")}${v.length > 12 ? ", ..." : ""})`}`);
    const pby = {};
    for (const x of cards.map((c) => c.guards.priors).filter(Boolean)) (pby[x.status] ??= []).push(x.scope?.language ?? "?");
    for (const [k, v] of Object.entries(pby)) L.push(`- prior provenance ${k}: ${v.length}/${cards.length}${k === "pass" ? "" : ` (${v.slice(0, 12).join(", ")}${v.length > 12 ? ", ..." : ""})`}`);
  }
  return L.join("\n");
}

// ═══ CLI ═══════════════════════════════════════════════════════════════════════

export function parseArgs(argv) {
  const a = { languages: [], all: false, split: "dev", json: false, cards: false, quiet: false, fresh: false, rungs: null, limit: null, guards: null, out: null, timeoutMs: null, help: false };
  const need = (i) => { if (i + 1 >= argv.length) throw new Error(`${argv[i]} needs a value`); return argv[i + 1]; };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === "--language" || x === "--languages") { a.languages.push(...need(i).split(",").filter(Boolean)); i++; }
    else if (x === "--all") a.all = true;
    else if (x === "--split") { a.split = need(i); i++; }
    else if (x === "--json") a.json = true;
    else if (x === "--cards") a.cards = true;
    else if (x === "--quiet") a.quiet = true;
    else if (x === "--fresh") a.fresh = true;
    else if (x === "--rungs") { a.rungs = need(i).split(",").filter(Boolean); i++; }
    else if (x === "--limit") { a.limit = Number(need(i)); i++; }
    else if (x === "--guards") { a.guards = need(i); i++; }
    else if (x === "--out") { a.out = need(i); i++; }
    else if (x === "--rung-timeout-ms") { a.timeoutMs = Number(need(i)); i++; }
    else if (x === "--help" || x === "-h") a.help = true;
    else throw new Error(`unknown argument ${x}`);
  }
  if (a.languages.includes("all")) { a.all = true; a.languages = a.languages.filter((l) => l !== "all"); } // c3's own CLI says --language all
  if (!SPLITS.includes(a.split)) throw new Error(`--split must be dev or test, got "${a.split}"`);
  if (a.rungs) for (const r of a.rungs) if (!RUNG_IDS.includes(r)) throw new Error(`--rungs: unknown rung "${r}" (${RUNG_IDS.join(",")})`);
  if (a.limit != null && !(a.limit > 0)) throw new Error("--limit must be a positive number");
  if (a.limit != null && a.split === "test") throw new Error("--limit is a DEV smoke-test device: a limited TEST read would spend the held-out set on a sample (rule 9)");
  if (a.timeoutMs != null && !(a.timeoutMs > 0)) throw new Error("--rung-timeout-ms must be a positive number");
  if (a.guards && !["full", "integrity", "off"].includes(a.guards)) throw new Error("--guards must be full|integrity|off");
  return a;
}

const USAGE = `usage: node eval/coding-competence/run.mjs --language <lang[,lang]> [--split dev|test] [--json]
       node eval/coding-competence/run.mjs --all [--split dev|test] [--json] [--cards]
  --rungs c0,c1,..   only these rungs      --limit N   pass a limit to every rung
  --guards full|integrity|off              --fresh     recompute the cached c5 run
     full (default) runs the whole repo test suite (minutes); integrity = corpus + prior checks only (seconds)
  --languages a,b,c  a subset for --all    --out <dir> output directory   --quiet
  --rung-timeout-ms N   a rung that has not returned by then is an error hole
default split is dev; TEST is read only with an explicit --split test.`;

export async function main(argv = process.argv.slice(2)) {
  let a;
  try { a = parseArgs(argv); } catch (e) { process.stderr.write(`${e.message}\n${USAGE}\n`); return 2; }
  if (a.help || (!a.all && !a.languages.length)) { process.stdout.write(`${USAGE}\n`); return a.help ? 0 : 2; }
  const log = a.quiet || a.json ? () => {} : (m) => process.stderr.write(`[coding-competence] ${m}\n`);
  // --json promises one JSON document per line on stdout: a rung that prints progress with console.log must not corrupt it
  if (a.json) for (const k of ["log", "info", "debug"]) console[k] = (...x) => process.stderr.write(`${x.map((y) => (typeof y === "string" ? y : JSON.stringify(y))).join(" ")}\n`);
  const opts = { split: a.split, limit: a.limit, fresh: a.fresh, log, ...(a.rungs ? { rungs: a.rungs } : {}), ...(a.guards ? { guards: a.guards } : {}), ...(a.out ? { outDir: a.out } : {}), ...(a.timeoutMs ? { timeoutMs: a.timeoutMs } : {}) };
  const outDir = a.out ?? outDirDefault();
  let cards, guardFailed;
  try {
    if (a.all) {
      const languages = a.languages.length ? a.languages : languageList().languages;
      if (!languages.length) { process.stderr.write(`no languages found: no corpus at ${corpusDir()} and no authored fixtures\n`); return 2; }
      const res = await runAll({ languages, ...opts });
      cards = res.cards;
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, `matrix-${a.split}.json`), JSON.stringify({ split: a.split, generated_at: new Date().toISOString(), totals: res.totals, matrix: res.matrix }, null, 1));
      const md = renderMatrix(cards, { split: a.split });
      fs.writeFileSync(path.join(outDir, `matrix-${a.split}.md`), `${md}\n`);
      if (a.json) process.stdout.write(`${JSON.stringify({ split: a.split, languages, totals: res.totals, matrix: res.matrix, guards: cards[0]?.guards?.summary ?? null, cards: cards.map((c) => path.join(outDir, `card-${c.language}-${a.split}.json`)) })}\n`);
      else { if (a.cards) for (const c of cards) process.stdout.write(`${renderCard(c)}\n\n`); process.stdout.write(`${md}\n`); }
    } else {
      cards = [];
      // a one-language TEST read must not spend another language's TEST: c5 sees exactly the languages asked for
      const r5 = a.split === "test" ? { r5Languages: [...a.languages] } : {};
      for (const language of a.languages) cards.push(await runCard({ language, ...r5, ...opts }));
      if (a.json) for (const c of cards) process.stdout.write(`${JSON.stringify(c)}\n`);
      else process.stdout.write(`${cards.map(renderCard).join("\n\n")}\n`);
    }
    guardFailed = cards.some((c) => c.guards.summary.ok === false);
  } catch (e) { process.stderr.write(`coding competence run failed: ${e?.stack ?? e}\n`); return 2; }
  return guardFailed ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().then((code) => { process.exitCode = code; });
}
