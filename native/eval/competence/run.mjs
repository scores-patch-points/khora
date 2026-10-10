// eval/competence/run.mjs — the AGGREGATOR of the competence ladder.
//
//   node eval/competence/run.mjs --stem <stem[,stem]> [--split dev|test] [--json]
//   node eval/competence/run.mjs --all [--split dev|test] [--json] [--cards]
//   options: --rungs r0,r1,..  --limit N  --guards full|invariance|off  --fresh
//            --stems a,b,c  --out <dir>  --quiet
//   env:     KHORA_COMPETENCE_RUNGS  {"r0":"/abs/stub.mjs",..} or a directory holding the
//                                    standard rung files (a test seam: toy stub rungs)
//            KHORA_COMPETENCE_OUT    output directory (default /private/tmp/claude-501/competence)
//            KHORA_COMPETENCE_GUARDS full | invariance | off
//
// WHAT THIS IS. "Read many languages WELL" means passing a ladder of tests that
// can fail, scored on HELD-OUT gold the reader never saw:
//   R0 identify the language   R1 hear words   R2 classify   R3 find beings
//   R4 find claims             R5 cross-language agreement on parallel text
// Each rung is a module (eval/competence/r?-*.mjs) written to ONE contract:
//   export RUNG, async measure({stem, split, limit}) -> {stem, rung, split, n, score,
//   control, margin, pass, controls, gaps, notes, details}   (R5: measureAll({stems, split}))
// This file is the one place the rungs meet. It does not score anything itself.
// It (1) calls each rung, (2) refuses to hide a hole, (3) audits each verdict
// for the ways a verdict can be wrong without being false, (4) runs the GUARDS
// that say the reader is still the reader, and (5) prints the card.
//
// ── PRE-REGISTRATION (FOLD-CONSTITUTION II.5 — written before the guards' first
//    full run; the pass rules below are not tuned after a result) ───────────────
// Disclosure: before this header was written one exploratory TIMING run read 200
// English dev sentences through the cast cased and lowercased and printed that
// the two beings lists were identical (125 beings). That run chose nothing
// below; the rules are fixed by the law the cast cites (S3, S11, heard rule).
//
// GUARD G1 lowercase invariance (heard rule). PREDICTION: the listening-cast
//   beings of a cased text equal, entry for entry (surface, mentions, sentences,
//   language, presence, refires, evidence), those of the same text lowercased.
//   PASS RULE: canonical JSON of the two beings lists is byte-identical, AND the
//   perturbation changed >= 1 sentence (else status "vacuous": nothing was
//   perturbed — caseless script), AND the list is non-empty (an empty list
//   equal to an empty list proves nothing: "vacuous"), AND the LICENCE holds:
//   the CAPITAL tier (surfaces.js), a witness that reads case, gives a
//   DIFFERENT answer on the same two inputs — the statistic moves under the
//   perturbation. If the capital tier does not move the check could not have
//   failed: status "unlicensed", never "pass".
// GUARD G2 prefix invariance (causality, S3/A11). PREDICTION: beings after k
//   sentences of a fresh read equal the snapshot taken at step k of a longer
//   read, at every checkpoint (dyadic k, where the window is measured, and
//   off-grid k), and taking snapshots does not perturb the final answer.
//   PASS RULE: canonical JSON equal at every checkpoint, the final answer with
//   snapshots equals the final answer without; at least one snapshot is
//   non-empty (else "vacuous"); LICENCE: the LOOKAHEAD control — the
//   whole-read beings used in place of the prefix — DIFFERS from the snapshot
//   at >= 1 checkpoint k < n (the statistic moves with the extent read). A
//   lookahead control that equals every snapshot means the check could not
//   have failed: "unlicensed".
// GUARD G0 repo regression: node --test over conformance/*.test.mjs and
//   tests/*.test.js. PASS RULE: fail == 0 && cancelled == 0 && tests > 0.
// VERDICT AUDIT (every rung verdict). A rung's own `pass` is kept as reported
//   (`pass`) and judged again here (`verdict`): "pass" only when pass===true AND
//   n>0 AND a control exists AND margin = score - control > 0 (II.23: a control
//   that does as well as the real arm means the instrument or the mechanism is
//   broken, so the pass is INVALID, not a pass) AND the result is for the
//   split that was asked for (a result for another split is held-out
//   discipline broken: INVALID, even when it says fail). "unmeasured" for
//   pass:null, "error" for a thrown rung, "invalid" for the above.
// PREDICTION about the instrument: a stem lacking a rung module, data or a rung's
//   cooperation produces a visible hole in the card, never a silent pass or a
//   silently shorter denominator. PASS RULE (tests/competence-run.test.js): a toy
//   stub ladder with a passing, a failing, a throwing, a missing, a malformed
//   and a self-contradicting rung yields exactly pass/fail/error/unmeasured/
//   invalid/invalid in the card and in the matrix.
//
// SPLIT DISCIPLINE (rule 9): default split is dev. TEST is read only when
//   `--split test` is passed, and every TEST read is appended to
//   test-reads.jsonl in the output directory; the card says how many TEST
//   reads of that stem came before ("computed once" is checkable, not trusted).
//   The invariance guards read DEV sentences always (they score nothing).
//
// CAUSAL/PURE NOTES: guards read nothing from the future; no model is called.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const NATIVE = path.resolve(HERE, "..", "..");
export const OUT_DIR = "/private/tmp/claude-501/competence";
export const UD_EVAL = "/private/tmp/claude-501/ud-eval";
export const TB_DIR = "/private/tmp/claude-501/tb";
const PRIORS = path.join(NATIVE, "priors");

/** The ladder: id, the module file it lives in, and the question it asks (used for a rung whose module is missing). */
export const RUNGS = Object.freeze([
  { id: "r0", file: "r0-identify.mjs", name: "identify", question: "which language is each sentence in, heard causally from the prefix?" },
  { id: "r1", file: "r1-hear.mjs", name: "hear words", question: "are word boundaries and bound morphemes heard as the gold has them?" },
  { id: "r2", file: "r2-class.mjs", name: "classify", question: "can a word, an unseen one included, name a being?" },
  { id: "r3", file: "r3-beings.mjs", name: "find beings", question: "are beings found with case stripped?" },
  { id: "r4", file: "r4-claims.mjs", name: "find claims", question: "who did what to whom?" },
  { id: "r5", file: "r5-parallel.mjs", name: "agree across languages", question: "do parallel texts yield the same cast and claims in each language?", cross: true },
]);
const RUNG_IDS = RUNGS.map((r) => r.id);
/** The stems that exist with held-out gold (pos-<stem>.json prior + ud-eval/<stem>/{dev,test}.conllu). cmn = Traditional, cmn-hans = Simplified. */
export const STEMS = Object.freeze(["eng", "spa", "rus", "cmn", "cmn-hans", "arb", "heb", "fas", "kor", "jpn", "fra", "deu", "ita", "por", "nld", "pol", "ukr", "hin", "vie", "ind", "swe", "urd", "tur", "ell", "fin"]);
export const SPLITS = Object.freeze(["dev", "test"]);

const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
const num = (x) => (typeof x === "number" && Number.isFinite(x) ? x : null);
const first = (s) => String(s ?? "").split("\n")[0].slice(0, 300);
const sha1 = (buf) => crypto.createHash("sha1").update(buf).digest("hex");
const safe = (f, fallback = null) => { try { return f(); } catch { return fallback; } };

// ═══ RUNG MODULES: where they are, loading them, tolerating their absence ═════

/** Which file serves each rung. KHORA_COMPETENCE_RUNGS (JSON object, or a directory) overrides — a test seam, not a shortcut. */
export function resolveRungModules(spec = process.env.KHORA_COMPETENCE_RUNGS ?? null) {
  const out = {};
  let over = null, dir = HERE;
  if (isObj(spec)) over = spec;
  else if (typeof spec === "string" && spec.trim()) {
    const s = spec.trim();
    if (s.startsWith("{")) over = JSON.parse(s);
    else dir = path.resolve(s);
  }
  for (const r of RUNGS) out[r.id] = path.resolve(over?.[r.id] ?? path.join(dir, r.file));
  return out;
}

const loadCache = new Map();
/** Import a rung module; never throws. -> { id, path, present, mod?, error?, module:{sha1,size,preregistered_header,rung_id} } */
export async function loadRung(id, file) {
  const key = `${id}:${file}`;
  if (loadCache.has(key)) return loadCache.get(key);
  const rec = { id, path: file, present: fs.existsSync(file), mod: null, error: null, module: null };
  if (rec.present) {
    const buf = safe(() => fs.readFileSync(file));
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
export function holeFor({ rung, stem, split, reason, kind = "unmeasured", detail = null, short = null }) {
  const gapReason = kind === "error" ? `error: ${reason}` : "unmeasured";
  return {
    stem, rung, split, n: 0, score: null, control: null, margin: null, pass: null, controls: {},
    gaps: [short && kind !== "error" ? { reason: gapReason, count: 1, detail: short } : { reason: gapReason, count: 1 }],
    notes: kind === "error" ? [`rung threw — ${reason}`] : [detail ?? reason].filter(Boolean),
    details: kind === "error" && detail ? { error: detail } : {},
    verdict: kind, audit: [], ms: 0,
  };
}

const normGap = (g) => (isObj(g) ? { ...g, reason: String(g.reason ?? "unspecified"), count: num(g.count) ?? 0 } : { reason: String(g), count: 0 });

/**
 * Judge ONE rung result. `pass` is the rung's own verdict by its pre-registered rule; `verdict` is
 * what this aggregator is willing to say: pass | fail | unmeasured | error | invalid. A pass without
 * data, without a control, with a non-positive margin, or for the wrong split is INVALID.
 */
export function verdictOf(raw, { rung, stem, split }) {
  if (!isObj(raw)) return holeFor({ rung, stem, split, kind: "error", reason: `returned ${raw === null ? "null" : typeof raw}, not a result object` });
  const audit = [];
  const r = {
    stem: raw.stem ?? stem, rung: raw.rung ?? rung, split: raw.split ?? split,
    n: num(raw.n), score: num(raw.score), control: num(raw.control), margin: num(raw.margin),
    pass: raw.pass === true ? true : raw.pass === false ? false : null,
    controls: isObj(raw.controls) ? raw.controls : {},
    gaps: Array.isArray(raw.gaps) ? raw.gaps.map(normGap) : [],
    notes: Array.isArray(raw.notes) ? raw.notes.map(String) : [],
    details: raw.details ?? {},
  };
  if (raw.pass !== true && raw.pass !== false && raw.pass !== null && raw.pass !== undefined) audit.push(`pass_not_boolean:${JSON.stringify(raw.pass)}`);
  if (raw.pass === undefined) audit.push("pass_missing");
  if (r.rung !== rung) audit.push(`rung_mismatch:${r.rung}`);
  if (r.stem !== stem) audit.push(`stem_mismatch:${r.stem}`);
  if (r.split !== split) audit.push(`split_mismatch:asked_${split}_got_${r.split}`);
  if (r.score != null && (r.score < 0 || r.score > 1)) audit.push("score_out_of_range");
  if (r.score != null && r.control != null && r.margin != null && Math.abs(r.margin - (r.score - r.control)) > 1e-6) audit.push("margin_inconsistent");
  if (r.margin == null && r.score != null && r.control != null) r.margin = r.score - r.control;

  let verdict;
  const wrongSplit = audit.some((a) => a.startsWith("split_mismatch"));
  if (wrongSplit || (raw.pass !== undefined && raw.pass !== null && typeof raw.pass !== "boolean")) verdict = "invalid";
  else if (r.pass === null) verdict = r.gaps.some((g) => g.reason.startsWith("error")) ? "error" : "unmeasured";
  else if (r.pass === false) verdict = "fail";
  else {
    if (!(r.n > 0)) audit.push("pass_on_no_data");
    if (r.score == null) audit.push("pass_without_score");
    if (r.control == null) audit.push("pass_without_control");
    else if (!(r.margin > 0)) audit.push("control_matches_or_beats_real_arm");
    verdict = audit.some((a) => /^(pass_on_no_data|pass_without_score|pass_without_control|control_matches_or_beats_real_arm)$/.test(a)) ? "invalid" : "pass";
    // informational: a pass whose listed arms include one AT OR ABOVE the real arm (an ablation that does as well as the real arm says the part removed adds nothing) (the rung chose which arm is "the control"; the card shows the rest)
    if (verdict === "pass" && r.score != null) {
      const above = Object.entries(r.controls).filter(([, v]) => typeof v === "number" && Number.isFinite(v) && v >= r.score).map(([k, v]) => `${k}=${v.toFixed(3)}`);
      if (above.length) audit.push(`arms_at_or_above_score:${above.join(",")}`);
    }
  }
  return { ...r, verdict, audit, ms: 0 };
}

/** Run ONE rung for ONE stem. Never throws. */
async function measureRung(rec, { stem, split, limit }) {
  const { id } = rec;
  const base = { rung: id, stem, split };
  if (!rec.present) return holeFor({ ...base, short: "module absent", detail: `rung module absent: ${rec.path}` });
  if (rec.error) return holeFor({ ...base, kind: "error", reason: rec.error });
  if (typeof rec.mod?.measure !== "function") return holeFor({ ...base, short: "no measure() export", detail: `${path.basename(rec.path)} exports no measure()` });
  const t0 = Date.now();
  try {
    const res = verdictOf(await rec.mod.measure({ stem, split, limit }), base);
    res.ms = Date.now() - t0;
    return res;
  } catch (e) {
    const h = holeFor({ ...base, kind: "error", reason: first(e?.message ?? e), detail: String(e?.stack ?? e).slice(0, 1500) });
    h.ms = Date.now() - t0;
    return h;
  }
}

// ═══ R5: measured ONCE across stems, cached in memory and on disk ═════════════

const r5Memory = new Map();
export function resetCaches() { r5Memory.clear(); loadCache.clear(); regressionPromise = null; heardGuardPromises.clear(); }

/** One call of measureAll over all stems, cached by (module bytes, split, stem set). A thrown measureAll is cached in memory only. */
export async function r5Once(rec, { split, stems, outDir, fresh = false, limit = null, log = () => {} }) {
  const key = `${rec.path}|${rec.module?.sha1}|${split}|${limit ?? ""}|${stems.join(",")}`;
  if (r5Memory.has(key) && !fresh) return r5Memory.get(key);
  const p = (async () => {
    if (!rec.present) return { error: null, absent: `rung module absent: ${rec.path}` };
    if (rec.error) return { error: rec.error };
    const file = path.join(outDir, `r5-parallel-all-${split}.json`);
    const fp = { path: rec.path, sha1: rec.module?.sha1 ?? null, split, limit: limit ?? null, stems };
    if (!fresh) {
      const cached = safe(() => JSON.parse(fs.readFileSync(file, "utf8")));
      if (cached && JSON.stringify(cached.fingerprint) === JSON.stringify(fp) && cached.result) { log(`r5: reused ${file}`); return { result: cached.result, cached: true }; }
    }
    const fn = rec.mod.measureAll ?? null;
    try {
      log(`r5: measureAll over ${stems.length} stems (${split})`);
      let result;
      if (typeof fn === "function") result = await fn({ stems, split, ...(limit ? { limit } : {}) });
      else if (typeof rec.mod.measure === "function") { // tolerated fallback: a rung that only exports measure()
        result = { perStem: {}, pairs: [], notes: ["r5 module exports no measureAll(); fell back to per-stem measure() — no pairs"] };
        for (const s of stems) { try { result.perStem[s] = await rec.mod.measure({ stem: s, split, limit }); } catch (e) { result.perStem[s] = { error: first(e?.message ?? e) }; } }
      } else return { error: null, absent: `${path.basename(rec.path)} exports neither measureAll() nor measure()`, short: "no measureAll() export" };
      if (!isObj(result) || !isObj(result.perStem)) return { error: "measureAll() did not return {perStem, pairs, notes}" };
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(file, JSON.stringify({ fingerprint: fp, at: new Date().toISOString(), result }));
      return { result, cached: false };
    } catch (e) { return { error: first(e?.message ?? e), stack: String(e?.stack ?? e).slice(0, 1500) }; }
  })();
  r5Memory.set(key, p);
  return p;
}

// ═══ GUARDS ════════════════════════════════════════════════════════════════════

/** Parse a TAP summary (the node:test tap reporter) -> counts + the names of top-level failures. */
export function parseTap(text) {
  const n = (k) => { const m = new RegExp(`^# ${k} (\\d+)`, "m").exec(text); return m ? Number(m[1]) : null; };
  return { tests: n("tests"), pass: n("pass"), fail: n("fail"), cancelled: n("cancelled"), skipped: n("skipped"), todo: n("todo"), failing: [...text.matchAll(/^not ok \d+ - (.*)$/gm)].map((m) => m[1]).slice(0, 25) };
}

let regressionPromise = null;
/** G0: the repo's own regression tests, run once per process, in the background. */
export function regressionGuard({ cwd = NATIVE, timeoutMs = 15 * 60 * 1000, force = false } = {}) {
  if (process.env.KHORA_COMPETENCE_RUNNING && !force) return Promise.resolve({ id: "regression", status: "skipped", reason: "nested_run: this aggregator was started by the regression run itself" });
  if (regressionPromise && !force) return regressionPromise;
  regressionPromise = new Promise((resolve) => {
    const t0 = Date.now();
    // quoted globs, passed literally to node (no shell): node expands them
    const child = spawn(process.execPath, ["--test", "--test-reporter=tap", "conformance/*.test.mjs", "tests/*.test.js"], { cwd, env: { ...process.env, KHORA_COMPETENCE_RUNNING: "1", KHORA_COMPETENCE_GUARDS: "off" }, stdio: ["ignore", "pipe", "pipe"] });
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
  return regressionPromise;
}

/** Sentences of a UD file, from its `# text =` lines (never the tokens, never the labels). */
export function conlluSentences(file, n) {
  if (!fs.existsSync(file)) return null;
  const out = [];
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (line.startsWith("# text = ")) { const t = line.slice(9).trim(); if (t) out.push(t); if (out.length >= n) break; }
  }
  return out;
}

const canon = (beings) => JSON.stringify([...beings].sort((a, b) => (a.language ?? "").localeCompare(b.language ?? "") || a.surface.localeCompare(b.surface)));
const surfacesOf = (c) => new Set(JSON.parse(c).map((b) => `${b.language}:${b.surface}`));
const diffOf = (a, b) => {
  const A = surfacesOf(a), B = surfacesOf(b);
  const only = (X, Y) => [...X].filter((x) => !Y.has(x)).slice(0, 6);
  const A2 = JSON.parse(a), B2 = JSON.parse(b);
  const changed = A2.filter((x) => { const y = B2.find((z) => z.surface === x.surface && z.language === x.language); return y && JSON.stringify(x) !== JSON.stringify(y); }).map((x) => x.surface).slice(0, 6);
  return { only_in_first: only(A, B), only_in_second: only(B, A), fields_differ: changed };
};
const readAll = (cast, sentences) => { for (const s of sentences) cast.add({ text: s }); return cast; };

/** The cast used by every guard: the real listening cast behind the real language listener (`declared` = a fixed language; null = heard). */
export async function defaultMakeCast({ declared = null } = {}) {
  const { createListeningCast, ORIGINAL } = await import(pathToFileURL(path.join(NATIVE, "adapters/text/listening-cast.js")).href);
  const { createLanguageListener } = await import(pathToFileURL(path.join(NATIVE, "the-fold/language-listener.js")).href);
  return () => { const l = createLanguageListener({ declared }); return createListeningCast({ hear: (t, si) => l.listen(t, si), ...ORIGINAL }); };
}

/** The capital tier (surfaces.js): a witness that READS case — the control that must move under lowercasing. */
async function capitalSurfaces(sentences) {
  const { extractSurfaces } = await import(pathToFileURL(path.join(NATIVE, "adapters/text/surfaces.js")).href);
  return [...new Set(extractSurfaces(sentences.map((text) => ({ text })), {}).map((x) => String(x.surface).toLowerCase()))].sort();
}

/** G1. Lowercase invariance with its licence check. `makeCast` -> a FRESH cast each call; `capitalOf` -> the case-reading control. */
export async function lowercaseInvariance({ sentences, makeCast, capitalOf = capitalSurfaces }) {
  const lowered = sentences.map((s) => s.toLowerCase());
  const changed = sentences.filter((s, i) => s !== lowered[i]).length;
  const a = canon(readAll(makeCast(), sentences).beings());
  const b = canon(readAll(makeCast(), lowered).beings());
  const nA = JSON.parse(a).length, nB = JSON.parse(b).length;
  const equal = a === b;
  let capital = null, licence = null, licenceError = null;
  try {
    const cA = await capitalOf(sentences), cB = await capitalOf(lowered);
    capital = { cased: cA.length, lowercased: cB.length };
    licence = JSON.stringify(cA) !== JSON.stringify(cB);
  } catch (e) { licenceError = first(e?.message ?? e); }
  let status;
  if (changed === 0) status = "vacuous";
  else if (!equal) status = "fail";
  else if (nA === 0) status = "vacuous";
  else if (licence !== true) status = "unlicensed";
  else status = "pass";
  return {
    id: "lowercase_invariance", status, equal, n: sentences.length, perturbed: { changed, total: sentences.length },
    beings: { cased: nA, lowercased: nB }, licence: { ok: licence, control: "capital tier (surfaces.js) differs cased vs lowercased", capital, error: licenceError },
    diff: equal ? null : diffOf(a, b),
    reason: status === "vacuous" ? (changed === 0 ? "no sentence changed under lowercasing (caseless script)" : "no beings admitted: equal empty lists prove nothing") : status === "unlicensed" ? "the case-reading control did not move, so this check could not have failed" : null,
  };
}

/** The checkpoints: dyadic k (where the cast measures its window) plus off-grid k, all < n. */
export const checkpointsFor = (n, { offGrid = true } = {}) => {
  const ks = new Set();
  for (let d = 4; d < n; d *= 2) ks.add(d);
  if (offGrid) for (const k of [5, 7, 13, 21, 37, 53, 89, 133]) if (k < n) ks.add(k);
  return [...ks].sort((x, y) => x - y);
};

/** G2. Prefix invariance with its licence check (the lookahead control). */
export async function prefixInvariance({ sentences, makeCast, checkpoints = checkpointsFor(sentences.length), neutrality = true }) {
  const n = sentences.length, ks = checkpoints.filter((k) => k > 0 && k < n);
  const want = new Set(ks);
  const long = makeCast(), snaps = new Map();
  for (let i = 0; i < n; i++) { long.add({ text: sentences[i] }); if (want.has(i + 1)) snaps.set(i + 1, canon(long.beings())); }
  const final = canon(long.beings());
  const mismatches = [];
  for (const k of ks) {
    const fresh = canon(readAll(makeCast(), sentences.slice(0, k)).beings());
    if (fresh !== snaps.get(k)) mismatches.push({ k, ...diffOf(snaps.get(k), fresh) });
  }
  let neutral = null;
  if (neutrality) neutral = canon(readAll(makeCast(), sentences).beings()) === final;
  const nonEmpty = ks.filter((k) => JSON.parse(snaps.get(k)).length > 0).length;
  const moved = ks.filter((k) => snaps.get(k) !== final).length; // lookahead control: whole-read beings in place of the prefix's
  let status;
  if (mismatches.length || neutral === false) status = "fail";
  else if (nonEmpty === 0) status = "vacuous";
  else if (moved === 0) status = "unlicensed";
  else status = "pass";
  return {
    id: "prefix_invariance", status, n, checkpoints: ks, checked: ks.length, mismatches, neutral,
    licence: { ok: moved > 0, control: "lookahead: whole-read beings in place of the prefix snapshot", checkpoints_where_lookahead_differs: moved, of: ks.length },
    snapshots_nonempty: nonEmpty, final_beings: JSON.parse(final).length,
    reason: status === "vacuous" ? "no beings at any checkpoint: equal empty lists prove nothing" : status === "unlicensed" ? "the lookahead control equals every snapshot, so this check could not have failed" : null,
  };
}

const NOT_ENOUGH = (stem, why) => ({ id: "invariance", stem, status: "unmeasured", reason: why });
const guardData = (stem, n) => { const f = path.join(UD_EVAL, stem, "dev.conllu"); return conlluSentences(f, n); }; // DEV only, always: the guards score nothing

/** Both invariance guards for one stem. mode "declared": the listener is told the language (cheap, tests cast+ear+priors); "heard": the listener decides per sentence (tests the whole pipeline). */
export async function invarianceGuards({ stem, mode = "declared", n = mode === "heard" ? 48 : 200, checks = ["lowercase", "prefix"], sentences = null, makeCast = null }) {
  const sents = sentences ?? guardData(stem, n);
  if (!sents || sents.length < 8) return checks.map((c) => ({ ...NOT_ENOUGH(stem, `no dev sentences for ${stem} (${UD_EVAL}/${stem}/dev.conllu)`), id: c === "lowercase" ? "lowercase_invariance" : "prefix_invariance", scope: { stem, mode } }));
  let mk = makeCast;
  if (!mk) { try { mk = await defaultMakeCast({ declared: mode === "declared" ? stem : null }); } catch (e) { return checks.map((c) => ({ id: c === "lowercase" ? "lowercase_invariance" : "prefix_invariance", scope: { stem, mode }, status: "error", error: first(e?.message ?? e) })); } }
  const out = [];
  for (const c of checks) {
    const scope = { stem, mode, n: sents.length };
    try {
      if (c === "lowercase") out.push({ scope, ...(await lowercaseInvariance({ sentences: sents, makeCast: mk })) });
      else out.push({ scope, ...(await prefixInvariance({ sentences: sents, makeCast: mk, checkpoints: mode === "heard" ? checkpointsFor(sents.length, { offGrid: false }) : checkpointsFor(sents.length), neutrality: mode !== "heard" })) });
    } catch (e) { out.push({ id: c === "lowercase" ? "lowercase_invariance" : "prefix_invariance", scope, status: "error", error: first(e?.message ?? e), stack: String(e?.stack ?? e).slice(0, 800) }); }
  }
  return out;
}

const heardGuardPromises = new Map();
/** The heard guards (the listener decides the language per sentence): English (cased) for both checks, simplified Chinese (caseless, unspaced) for prefix. Once per process. */
export function heardGuards() {
  const key = "heard";
  if (!heardGuardPromises.has(key)) heardGuardPromises.set(key, (async () => [
    ...(await invarianceGuards({ stem: "eng", mode: "heard", checks: ["lowercase", "prefix"] })),
    ...(await invarianceGuards({ stem: "cmn-hans", mode: "heard", checks: ["prefix"] })),
  ])().catch((e) => [{ id: "heard_guards", status: "error", error: first(e?.message ?? e) }]));
  return heardGuardPromises.get(key);
}

const guardOk = (g) => g.status === "pass" || g.status === "skipped";
/** Roll the guards up. ok:true only when nothing failed or errored; vacuous/unlicensed/unmeasured are reported, never counted as good. */
export function summarizeGuards(list) {
  const by = {};
  for (const g of list) by[g.status] = (by[g.status] ?? 0) + 1;
  const bad = list.filter((g) => g.status === "fail" || g.status === "error");
  return { ok: bad.length ? false : list.length === 0 ? null : list.every(guardOk) ? true : null, counts: by, failed: bad.map((g) => `${g.id}${g.scope ? `[${g.scope.stem}:${g.scope.mode}]` : ""}`) };
}

// ═══ THE CARD ══════════════════════════════════════════════════════════════════

export function dataPresence(stem) {
  const tb = fs.existsSync(path.join(TB_DIR, stem, "train.conllu")) ? path.join(TB_DIR, stem, "train.conllu") : stem === "kor" ? path.join(TB_DIR, "kor-gsd", "train.conllu") : null;
  return {
    prior: fs.existsSync(path.join(PRIORS, `pos-${stem}.json`)),
    train: Boolean(tb && fs.existsSync(tb)),
    dev: fs.existsSync(path.join(UD_EVAL, stem, "dev.conllu")),
    test: fs.existsSync(path.join(UD_EVAL, stem, "test.conllu")),
  };
}

const testReadsFile = (outDir) => path.join(outDir, "test-reads.jsonl");
const testReadsBefore = (outDir, stem) => safe(() => fs.readFileSync(testReadsFile(outDir), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.stem === stem).length, 0);

const pairInvolves = (pair, stem) => isObj(pair) && Object.values(pair).some((v) => v === stem || (Array.isArray(v) && v.includes(stem)));

/**
 * One stem's card. Every rung is measured or is a hole that says why. `guards`: "full" | "invariance" | "off".
 */
export async function runCard({ stem, split = "dev", limit = null, rungs = RUNG_IDS, rungModules = resolveRungModules(), outDir = process.env.KHORA_COMPETENCE_OUT || OUT_DIR, guards = process.env.KHORA_COMPETENCE_GUARDS || "full", fresh = false, r5Stems = null, write = true, log = () => {}, regressionOptions = {} } = {}) {
  if (!SPLITS.includes(split)) throw new Error(`split must be one of ${SPLITS.join("|")}, got "${split}"`);
  if (!stem) throw new Error("runCard: stem is required");
  if (!["full", "invariance", "off"].includes(guards)) throw new Error(`guards must be full|invariance|off, got "${guards}"`);
  const t0 = Date.now();
  fs.mkdirSync(outDir, { recursive: true });
  const stems5 = r5Stems ?? (STEMS.includes(stem) || fs.existsSync(path.join(UD_EVAL, stem)) ? [...new Set([...STEMS, stem])] : [...STEMS]);

  // the slow guards start now and are awaited last (the regression run is shared by every card in the process)
  const regP = guards === "full" ? regressionGuard(regressionOptions) : null;
  const heardP = guards === "full" ? heardGuards() : null;

  const results = {};
  const modules = {};
  let cross = null;
  for (const R of RUNGS) {
    if (!rungs.includes(R.id)) continue;
    const rec = await loadRung(R.id, rungModules[R.id]);
    modules[R.id] = { path: rec.path, present: rec.present, error: rec.error, ...(rec.module ?? {}) };
    log(`${stem} ${R.id} ...`);
    if (R.cross) {
      const t1 = Date.now();
      const all = await r5Once(rec, { split, stems: stems5, outDir, fresh, limit, log });
      let res;
      if (all.absent) res = holeFor({ rung: R.id, stem, split, short: all.short ?? "module absent", detail: all.absent });
      else if (all.error) res = holeFor({ rung: R.id, stem, split, kind: "error", reason: all.error, detail: all.stack ?? null });
      else {
        const raw = all.result.perStem[stem];
        if (raw === undefined) res = holeFor({ rung: R.id, stem, split, short: "stem not in perStem", detail: `stem ${stem} is not in measureAll's perStem (asked for ${stems5.length} stems)` });
        else if (isObj(raw) && raw.error && raw.pass === undefined) res = holeFor({ rung: R.id, stem, split, kind: "error", reason: first(raw.error) });
        else res = verdictOf(raw, { rung: R.id, stem, split });
        cross = { pairs: (all.result.pairs ?? []).filter((p) => pairInvolves(p, stem)), pairs_total: (all.result.pairs ?? []).length, notes: all.result.notes ?? [], cached: all.cached ?? false };
      }
      res.ms = Date.now() - t1;
      results[R.id] = res;
    } else results[R.id] = await measureRung(rec, { stem, split, limit });
    const m = modules[R.id];
    results[R.id].module = { sha1: m.sha1 ?? null, preregistered_header: m.preregistered_header ?? null, rung_id: m.rung_id ?? null };
    if (m.present && !m.error && m.preregistered_header === false) results[R.id].audit.push("no_preregistration_header");
    if (m.rung_id && m.rung_id !== R.id) results[R.id].audit.push(`module_declares_rung:${m.rung_id}`);
  }

  // guards
  const guardList = { regression: null, invariance: [], heard: [] };
  if (guards !== "off") {
    log(`${stem} guards ...`);
    guardList.invariance = await invarianceGuards({ stem, mode: "declared" });
    if (guards === "full") { guardList.regression = await regP; guardList.heard = await heardP; }
  }
  const allGuards = [guardList.regression, ...guardList.invariance, ...guardList.heard].filter(Boolean);

  const summary = { total: Object.keys(results).length, pass: 0, fail: 0, unmeasured: 0, error: 0, invalid: 0 };
  for (const r of Object.values(results)) summary[r.verdict] += 1;

  const notes = [];
  const holes = Object.entries(results).filter(([, r]) => r.verdict === "unmeasured" || r.verdict === "error").map(([id]) => id);
  if (holes.length) notes.push(`HOLES: ${holes.join(", ")} are not measured — unmeasured is not good (rule 8).`);
  const inv = Object.entries(results).filter(([, r]) => r.verdict === "invalid").map(([id, r]) => `${id} (${r.audit.filter((a) => !/^no_prereg/.test(a)).join(", ")})`);
  if (inv.length) notes.push(`INVALID verdicts (rung's own pass is kept in .pass): ${inv.join("; ")}`);
  for (const [id, r] of Object.entries(results)) {
    const a = r.audit.find((x) => x.startsWith("arms_at_or_above_score:"));
    if (a) notes.push(`${id} PASSES against its declared control, but listed arms match or beat its score: ${a.slice(a.indexOf(":") + 1)} — read the pass with that in view.`);
  }
  const noPre = Object.entries(results).filter(([, r]) => r.audit.includes("no_preregistration_header")).map(([id]) => id);
  if (noPre.length) notes.push(`no pre-registration header found in: ${noPre.join(", ")} (II.5: prediction and pass rule belong in the file header before the first run)`);
  const lookaheadFree = guards === "off" ? "guards were switched OFF for this card" : null;
  if (lookaheadFree) notes.push(lookaheadFree);

  const card = {
    card_version: 1, stem, split, generated_at: new Date().toISOString(), ms: Date.now() - t0,
    split_discipline: { requested: split, default: "dev", test_reads_before_this: split === "test" ? testReadsBefore(outDir, stem) : null, guards_read: "dev sentences only (score nothing)" },
    data: dataPresence(stem), rungs: results, summary, cross_language: cross, modules,
    guards: { mode: guards, summary: summarizeGuards(allGuards), regression: guardList.regression, invariance: guardList.invariance, heard: guardList.heard },
    notes,
  };
  if (split === "test" && write) { try { fs.appendFileSync(testReadsFile(outDir), `${JSON.stringify({ stem, at: card.generated_at, modules: Object.fromEntries(Object.entries(modules).map(([k, v]) => [k, v.sha1 ?? null])) })}\n`); } catch {} }
  if (write) fs.writeFileSync(path.join(outDir, `card-${stem}-${split}.json`), JSON.stringify(card, null, 1));
  return card;
}

/** Every stem; R5 is measured once (r5Once caches by module+split+stem set). Guards that are global run once. */
export async function runAll({ stems = STEMS, split = "dev", ...opts } = {}) {
  const cards = [];
  for (const stem of stems) cards.push(await runCard({ stem, split, r5Stems: [...new Set([...STEMS, ...stems])], ...opts }));
  return { split, stems: [...stems], cards, totals: totalsOf(cards), matrix: matrixOf(cards) };
}

// ═══ RENDERING ═════════════════════════════════════════════════════════════════

const GLYPH = { pass: "✓", fail: "✗", unmeasured: "·", error: "E", invalid: "!" };
const f3 = (x) => (x == null ? "-" : Number(x).toFixed(3));
const fs3 = (x) => (x == null ? "-" : `${x >= 0 ? "+" : ""}${Number(x).toFixed(3)}`);
const gapText = (gaps, max = 3) => {
  if (!gaps?.length) return "";
  const cut = (x, n) => (x.length > n ? `${x.slice(0, n)}…` : x);
  const parts = gaps.slice(0, max).map((g) => `${cut(g.reason, 90)}${g.detail ? ` (${cut(String(g.detail), 40)})` : ""}${g.of != null ? ` ${g.count}/${g.of}` : g.count > 1 ? `×${g.count}` : ""}`);
  return parts.join("; ") + (gaps.length > max ? `; +${gaps.length - max} more` : "");
};
const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
const rungName = (id, name) => `${id} ${name ?? RUNGS.find((r) => r.id === id)?.name ?? ""}`.trim();

const guardLine = (g) => {
  if (g.id === "regression") {
    if (g.status === "skipped") return `regression tests: skipped (${g.reason})`;
    if (g.status === "error") return `regression tests: ERROR (${g.error})`;
    return `regression tests: ${g.status.toUpperCase()} — ${g.pass}/${g.tests} pass, ${g.fail} fail, ${g.cancelled ?? 0} cancelled, ${g.skipped ?? 0} skipped${g.failing?.length ? ` [${g.failing.slice(0, 5).join("; ")}]` : ""}`;
  }
  const sc = g.scope ? ` [${g.scope.stem}, ${g.scope.mode}${g.scope.n ? `, n=${g.scope.n}` : ""}]` : "";
  const extra = g.id === "lowercase_invariance" && g.perturbed ? `, perturbed ${g.perturbed.changed}/${g.perturbed.total}, beings ${g.beings.cased}/${g.beings.lowercased}, capital-tier control ${g.licence?.capital ? `${g.licence.capital.cased}->${g.licence.capital.lowercased}` : "n/a"}`
    : g.id === "prefix_invariance" && g.checked != null ? `, ${g.checked} checkpoints, lookahead control differs at ${g.licence?.checkpoints_where_lookahead_differs}/${g.checked}${g.neutral === false ? ", snapshots perturbed the read" : ""}` : "";
  return `${g.id}${sc}: ${g.status.toUpperCase()}${extra}${g.reason ? ` (${g.reason})` : ""}${g.error ? ` (${g.error})` : ""}`;
};

/** The per-stem competence card as markdown. */
export function renderCard(card) {
  const L = [];
  L.push(`## Competence card: ${card.stem} (${card.split})`);
  L.push("");
  const d = card.data;
  L.push(`data: prior ${d.prior ? "yes" : "NO"}, train ${d.train ? "yes" : "NO"}, dev ${d.dev ? "yes" : "NO"}, test ${d.test ? "yes" : "NO"}${card.split === "test" ? `; TEST reads of ${card.stem} before this one: ${card.split_discipline.test_reads_before_this}` : ""}`);
  L.push("");
  L.push("| rung | score | control | margin | pass | n | gaps |");
  L.push("|---|---|---|---|---|---|---|");
  for (const id of RUNG_IDS) {
    const r = card.rungs[id];
    if (!r) continue;
    const pass = `${GLYPH[r.verdict]} ${r.verdict.toUpperCase()}${r.verdict === "invalid" && r.pass === true ? " (rung said pass)" : ""}`;
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
    // the rung's own explanation of a null, a failed licence or a failure — said on the card, not buried in the file
    const key = r.notes.filter((n) => /LICENCE|pass: null|FAILED|underpowered|rung threw|absent|exports no/i.test(n)).slice(0, 2);
    if (!key.length && (r.verdict === "error" || r.verdict === "unmeasured") && r.notes[0]) key.push(r.notes[0]);
    for (const n of key) bits.push(n.length > 220 ? `${n.slice(0, 220)}…` : n);
    if (bits.length) L.push(`- ${id}: ${bits.filter(Boolean).join(" | ")}`);
  }
  const s = card.summary;
  L.push("");
  L.push(`rungs: ${s.pass} pass, ${s.fail} fail, ${s.unmeasured} unmeasured, ${s.error} error, ${s.invalid} invalid (of ${s.total})`);
  if (card.cross_language) L.push(`r5 pairs involving ${card.stem}: ${card.cross_language.pairs.length} of ${card.cross_language.pairs_total}${card.cross_language.cached ? " (cached)" : ""}`);
  L.push("");
  L.push(`guards (${card.guards.mode}): ${card.guards.summary.ok === true ? "all pass" : card.guards.summary.ok === false ? `FAILED: ${card.guards.summary.failed.join(", ")}` : card.guards.mode === "off" ? "OFF" : `none failed, not all pass (${JSON.stringify(card.guards.summary.counts)})`}`);
  const gl = [card.guards.regression, ...card.guards.invariance, ...card.guards.heard].filter(Boolean);
  for (const g of gl) L.push(`- ${guardLine(g)}`);
  if (card.notes.length) { L.push(""); for (const n of card.notes) L.push(`note: ${n}`); }
  return L.join("\n");
}

export function totalsOf(cards) {
  const perRung = {};
  for (const id of RUNG_IDS) perRung[id] = { pass: 0, fail: 0, unmeasured: 0, error: 0, invalid: 0 };
  const overall = { pass: 0, fail: 0, unmeasured: 0, error: 0, invalid: 0, cells: 0 };
  for (const c of cards) for (const id of RUNG_IDS) { const r = c.rungs[id]; if (!r) continue; perRung[id][r.verdict] += 1; overall[r.verdict] += 1; overall.cells += 1; }
  return { perRung, overall };
}
export function matrixOf(cards) {
  const m = {};
  for (const c of cards) { m[c.stem] = {}; for (const id of RUNG_IDS) { const r = c.rungs[id]; m[c.stem][id] = r ? { verdict: r.verdict, score: r.score, control: r.control, margin: r.margin, n: r.n } : null; } }
  return m;
}

/** The language x rung matrix as markdown, with totals. */
export function renderMatrix(cards, { split = "dev" } = {}) {
  const T = totalsOf(cards);
  const w = Math.max(10, ...cards.map((c) => c.stem.length));
  const L = [`## Competence matrix (${split}): ${cards.length} languages x ${RUNG_IDS.length} rungs`, ""];
  L.push(`| ${"lang".padEnd(w)} | ${RUNG_IDS.map((i) => i.padEnd(6)).join(" | ")} | p/f/u |`);
  L.push(`|${"-".repeat(w + 2)}|${RUNG_IDS.map(() => "-".repeat(8)).join("|")}|-------|`);
  for (const c of cards) {
    const cells = RUNG_IDS.map((id) => { const r = c.rungs[id]; if (!r) return "(skip)".padEnd(6); return `${GLYPH[r.verdict]}${r.score != null ? " " + r.score.toFixed(2) : "     "}`.padEnd(6); });
    const s = c.summary;
    L.push(`| ${c.stem.padEnd(w)} | ${cells.join(" | ")} | ${`${s.pass}/${s.fail}/${s.unmeasured + s.error + s.invalid}`.padEnd(5)} |`);
  }
  const rowOf = (label, key) => `| ${label.padEnd(w)} | ${RUNG_IDS.map((id) => String(T.perRung[id][key]).padEnd(6)).join(" | ")} | ${String(T.overall[key]).padEnd(5)} |`;
  L.push(`|${"-".repeat(w + 2)}|${RUNG_IDS.map(() => "-".repeat(8)).join("|")}|-------|`);
  L.push(rowOf("pass", "pass"), rowOf("fail", "fail"), rowOf("unmeasured", "unmeasured"), rowOf("error", "error"), rowOf("invalid", "invalid"));
  L.push("");
  L.push(`legend: ${GLYPH.pass} pass  ${GLYPH.fail} fail  ${GLYPH.unmeasured} unmeasured (hole)  E error (rung threw)  ${GLYPH.invalid} invalid (pass contradicted by its own control/split/data)   cell = glyph + score; p/f/u = pass / fail / everything else (unmeasured, error, invalid)`);
  const o = T.overall;
  L.push(`totals: ${o.pass} pass, ${o.fail} fail, ${o.unmeasured} unmeasured, ${o.error} error, ${o.invalid} invalid of ${o.cells} cells; only ${o.cells ? ((o.pass / o.cells) * 100).toFixed(1) : "0.0"}% of the ladder is measured-and-passing; ${o.unmeasured + o.error} cells are holes, not good.`);
  const g = cards[0]?.guards;
  if (g) {
    const gl = [g.regression, ...g.heard].filter(Boolean);
    L.push(`guards (${g.mode}): ${g.mode === "off" ? "OFF" : ""}`.trimEnd());
    for (const x of gl) L.push(`- ${guardLine(x)}`);
    const per = cards.flatMap((c) => c.guards.invariance);
    const by = {};
    for (const x of per) { const k = `${x.id}:${x.status}`; (by[k] ??= []).push(x.scope?.stem ?? "?"); }
    for (const [k, v] of Object.entries(by)) L.push(`- per-language ${k}: ${v.length}/${cards.length}${v.length < cards.length || /fail|error|vacuous|unlicensed|unmeasured/.test(k) ? ` (${v.join(", ")})` : ""}`);
  }
  return L.join("\n");
}

// ═══ CLI ═══════════════════════════════════════════════════════════════════════

export function parseArgs(argv) {
  const a = { stems: [], all: false, split: "dev", json: false, cards: false, quiet: false, fresh: false, rungs: null, limit: null, guards: null, out: null, help: false };
  const need = (i) => { if (i + 1 >= argv.length) throw new Error(`${argv[i]} needs a value`); return argv[i + 1]; };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === "--stem" || x === "--stems") { a.stems.push(...need(i).split(",").filter(Boolean)); i++; }
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
    else if (x === "--help" || x === "-h") a.help = true;
    else throw new Error(`unknown argument ${x}`);
  }
  if (!SPLITS.includes(a.split)) throw new Error(`--split must be dev or test, got "${a.split}"`);
  if (a.rungs) for (const r of a.rungs) if (!RUNG_IDS.includes(r)) throw new Error(`--rungs: unknown rung "${r}" (${RUNG_IDS.join(",")})`);
  if (a.limit != null && !(a.limit > 0)) throw new Error("--limit must be a positive number");
  if (a.guards && !["full", "invariance", "off"].includes(a.guards)) throw new Error("--guards must be full|invariance|off");
  return a;
}

const USAGE = `usage: node eval/competence/run.mjs --stem <stem[,stem]> [--split dev|test] [--json]
       node eval/competence/run.mjs --all [--split dev|test] [--json] [--cards]
  --rungs r0,r1,..   only these rungs      --limit N   pass a limit to every rung
  --guards full|invariance|off              --fresh     recompute the cached R5 run
  --stems a,b,c      a subset for --all    --out <dir> output directory   --quiet
default split is dev; TEST is read only with an explicit --split test.`;

export async function main(argv = process.argv.slice(2)) {
  let a;
  try { a = parseArgs(argv); } catch (e) { process.stderr.write(`${e.message}\n${USAGE}\n`); return 2; }
  if (a.help || (!a.all && !a.stems.length)) { process.stdout.write(`${USAGE}\n`); return a.help ? 0 : 2; }
  const log = a.quiet || a.json ? () => {} : (m) => process.stderr.write(`[competence] ${m}\n`);
  const opts = { split: a.split, limit: a.limit, fresh: a.fresh, log, ...(a.rungs ? { rungs: a.rungs } : {}), ...(a.guards ? { guards: a.guards } : {}), ...(a.out ? { outDir: a.out } : {}) };
  const outDir = a.out ?? process.env.KHORA_COMPETENCE_OUT ?? OUT_DIR;
  let cards, guardFailed;
  try {
    if (a.all) {
      const stems = a.stems.length ? a.stems : [...STEMS];
      const res = await runAll({ stems, ...opts });
      cards = res.cards;
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, `matrix-${a.split}.json`), JSON.stringify({ split: a.split, generated_at: new Date().toISOString(), totals: res.totals, matrix: res.matrix }, null, 1));
      const md = renderMatrix(cards, { split: a.split });
      fs.writeFileSync(path.join(outDir, `matrix-${a.split}.md`), `${md}\n`);
      if (a.json) process.stdout.write(`${JSON.stringify({ split: a.split, stems, totals: res.totals, matrix: res.matrix, guards: cards[0]?.guards?.summary ?? null, cards: cards.map((c) => path.join(outDir, `card-${c.stem}-${a.split}.json`)) })}\n`);
      else { if (a.cards) for (const c of cards) process.stdout.write(`${renderCard(c)}\n\n`); process.stdout.write(`${md}\n`); }
    } else {
      cards = [];
      for (const stem of a.stems) cards.push(await runCard({ stem, ...opts }));
      if (a.json) for (const c of cards) process.stdout.write(`${JSON.stringify(c)}\n`);
      else process.stdout.write(`${cards.map(renderCard).join("\n\n")}\n`);
    }
    guardFailed = cards.some((c) => c.guards.summary.ok === false);
  } catch (e) { process.stderr.write(`competence run failed: ${e?.stack ?? e}\n`); return 2; }
  return guardFailed ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().then((code) => { process.exitCode = code; });
}
