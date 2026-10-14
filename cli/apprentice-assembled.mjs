#!/usr/bin/env node
// cli/apprentice-assembled.mjs — THE THIRD TEACHING INSTRUMENT: FOUND, NOT WRITTEN (2026-10-13).
//
// The J3 facet `assembled-not-generated` (cennini-end-state.json): "every coder in the world goes and finds the library
// that already has the thing, and then adds a little." Is that true of the master's own work? No model is called. On
// the in-scope edits the replay already grades (file-grade, structural), two measurements, each against a null:
//
//   BYTES   Of the lines the edit ADDED (its after-text minus a line multiset of its before-text), how many already
//           existed verbatim as a line in a file the session held at that moment (the edit's own before-text, and every
//           in-scope file it had Read or written strictly earlier)? Prequential: nothing from a later moment.
//   CALLS   Of the CALLS the edit added (the reader's own `call:` edges), how many reach a name that already exists:
//           bound by an import (a bare specifier is a LIBRARY, a relative one a REPO file), declared in a file the
//           session holds (REPO), or declared in the edit's own file before the edit (OWN)? Versus a name the edit
//           itself declares (NEW) or a method, builtin or name nothing resolves (OTHER).
//
//   FIND    Standing at that edit with only the ask's own words and the callables the session already had on the ground
//           (organs/find-thing.js), does the ranking put the existing names the master's added calls actually reached
//           in its first R places (R = how many it reached; R-precision, a disclosed oracle on how many)? Versus the
//           same ground cut by up to three OTHER sessions' asks. Reported for held names (library, repo, own file) and,
//           separately, with the engine's own names in the field.
//
// THE NULL (a control built to fail). The same added lines and the same called names, scored against the held bytes and
// bound names of up to three OTHER sessions that finished earlier in the same language. A short line (`}`, `return;`)
// is "found" almost anywhere, so a bare share is not the claim: the claim is the excess over the donors, paired per
// edit, sign-flip at the session cluster, p at its draw floor (apprentice-mover.mjs `pairedNull`). The residue (bytes
// no held file had) is reported as a distribution and by line-length tercile, never against a hand-set threshold.
//
// WHAT THIS DOES NOT MEASURE. The session's held files are what the pair KNEW, not the whole repo or the installed
// libraries: a line the master took from a package it never Read is counted as written. So the BYTES share is a floor
// on "assembled", and the CALLS split is the one that sees a library at all. The next part (find the library) is the
// one that would put installed packages and the standard library on the ground.
//
// PRIVACY, as the sibling instruments: nothing emitted holds code text, a path or an identifier. Lines are hashed
// in memory and dropped; the report is counts and scores; scrubDeep runs over it; --out refuses a tracked path.
//
//   node cli/apprentice-assembled.mjs [--root DIR] [--sample N] [--seed N] [--draws N] [--out report.json]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readTranscript, pairedNull, verdictOf } from "./apprentice-mover.mjs";
import { loadScope, listTranscripts, editScope, scopeOfTurn, assertUntrackedOutput, scrubDeep, languageFor } from "./apprentice-replay.mjs";
import { mulberry32 } from "../native/adapters/code/lex.js";
import { parseDeclarations } from "../native/adapters/text/code-structure.js";
import { find, ReferentField, wordsOf } from "../native/organs/find-thing.js";

export const ASSEMBLED_VERSION = "apprentice-assembled-1";
const bump = (m, k, n = 1) => { m[k] = (m[k] ?? 0) + n; return m; };

// ═════════════════════════════ 1. lines, hashed ═════════════════════════════
const fnv = (s, seed) => { let h = seed >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
/** a 52-bit key for one trimmed line (two FNV-1a passes); lines are never kept as text */
export const lineKey = (s) => fnv(s, 2166136261) * 1048576 + (fnv(s, 0x9e3779b1) & 0xfffff);

const linesOf = (text) => String(text ?? "").split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

/** the set of line keys of a text */
export function keysOf(text) { const out = new Set(); for (const l of linesOf(text)) out.add(lineKey(l)); return out; }

/** the lines `after` holds that `before` does not (a multiset difference, so a moved line is not an added one) */
export function addedLines(before, after) {
  const have = new Map();
  for (const l of linesOf(before)) have.set(l, (have.get(l) ?? 0) + 1);
  const out = [];
  for (const l of linesOf(after)) {
    const n = have.get(l) ?? 0;
    if (n > 0) have.set(l, n - 1); else out.push(l);
  }
  return out;
}

// ═════════════════════════════ 2. the calls ═════════════════════════════
/**
 * runtimeNames() — every name the RUNNING engine itself owns: the own property names of its builtins and their
 * prototypes, and the exports of its core modules. The engine is the giver; no list is typed here (the same rule
 * follow-through.js uses for `runtime-global`). JavaScript only: a Python call is never classed `runtime`, and the report
 * says how many units were which language so the reader can weigh it.
 */
export async function runtimeNames() {
  const out = new Set();
  const take = (o) => { try { for (const n of Object.getOwnPropertyNames(o)) if (/^[A-Za-z_$][\w$]*$/.test(n)) out.add(n); } catch { /* an exotic object offers nothing */ } };
  for (const n of Object.getOwnPropertyNames(globalThis)) {
    out.add(n);
    const v = globalThis[n];
    if (v && (typeof v === "function" || typeof v === "object")) { take(v); if (v.prototype) take(v.prototype); }
  }
  for (const proto of [Object.getPrototypeOf(function* () {}), Object.getPrototypeOf(async function () {}), Object.getPrototypeOf([][Symbol.iterator]())]) take(proto);
  for (const m of ["fs", "fs/promises", "path", "os", "child_process", "crypto", "util", "url", "readline", "http", "https", "net", "stream", "events", "assert", "zlib", "buffer", "timers", "worker_threads", "perf_hooks", "module"]) {
    try { take(await import(`node:${m}`)); } catch { /* a core module this engine lacks */ }
  }
  return out;
}

/** the callee name of a reader key `call:name` or `call:obj.name` (the last segment), else null */
export const calleeOf = (key) => { const m = /^[+-]?call:(.+)$/.exec(String(key)); return m ? m[1].split(".").at(-1) : null; };
export const declaredOf = (key) => { const m = /^[+-]?declare:(.+)$/.exec(String(key)); return m ? m[1].split(".").at(-1) : null; };

/**
 * classifyCalls(addedKeys, { names, own }) → { new, library, repo, own, other } counts over the edit's ADDED call edges.
 * `names` is a Map name → "library" | "repo" (what the session's held files bind or declare); `own` a Set of names the
 * edit's file declared before the edit; `runtime` the engine's own names (JavaScript units only). A name the edit itself
 * declares is NEW whatever else binds it; a bound or held name outranks a runtime one.
 */
export function classifyCalls(addedKeys, { names = new Map(), own = new Set(), runtime = null } = {}) {
  const declaredHere = new Set(addedKeys.map(declaredOf).filter(Boolean));
  const out = { new: 0, library: 0, repo: 0, own: 0, runtime: 0, other: 0 };
  for (const k of addedKeys) {
    const c = calleeOf(k);
    if (c === null) continue;
    if (declaredHere.has(c)) out.new++;
    else if (names.get(c) === "library") out.library++;
    else if (names.get(c) === "repo") out.repo++;
    else if (own.has(c)) out.own++;
    else if (runtime && runtime.has(c)) out.runtime++;
    else out.other++;
  }
  return out;
}
const existing = (c) => c.library + c.repo + c.own;
const callTotal = (c) => c.new + c.library + c.repo + c.own + c.runtime + c.other;

/**
 * findArm({ ask, asks, names, own, runtime, reached }) -> { R, N, real, nulls, chance, gap } | null
 * R-precision of the find organ's ranking against the existing names the edit's added calls reached.
 */
export function findArm({ ask, asks = [], names, own, runtime, reached }) {
  const R = new Set(reached).size;
  if (!R) return null;
  const field = new Set([...names.keys(), ...own, ...(runtime ?? [])]);
  const N = field.size;
  const want = new Set(reached);
  const score = (text) => {
    const r = find({ ask: text, names, own, runtime, k: R });
    if (!r.ok) return { p: 0, gap: r.gap.kind };
    return { p: r.candidates.filter((c) => want.has(c.name)).length / R, gap: null };
  };
  const real = score(ask);
  const nulls = asks.map((a) => score(a).p);
  return { R, N, real: real.p, nulls, nullMean: nulls.length ? nulls.reduce((a, b) => a + b, 0) / nulls.length : null, chance: Math.min(1, R / Math.max(N, 1)), gap: real.gap };
}

// ═════════════════════════════ 3. one session's ground ═════════════════════════════
class Ground {
  constructor() { this.lines = new Map(); this.names = new Map(); this.seen = new Map(); }
  setOf(lang) { let s = this.lines.get(lang); if (!s) this.lines.set(lang, (s = new Set())); return s; }
  /** fold in every held file whose bytes changed since last time (append-only: what was held once was known) */
  absorb(world, tsAsJs) {
    for (const [p, { text }] of world.texts) {
      if (this.seen.get(p) === text) continue;
      this.seen.set(p, text);
      const lang = languageFor(p, { tsAsJs })?.language;
      if (!lang) continue;
      const set = this.setOf(lang);
      for (const l of linesOf(text)) set.add(lineKey(l));
    }
  }
  noteOffer(o) {
    const kind = String(o.target).startsWith("bare:") ? "library" : "repo";
    if (this.names.get(o.name) !== "library" || kind === "library") this.names.set(o.name, kind);
  }
}

/** the ask's text: replay's promptOf returns { text, origin }; a plain string passes through */
export const askText = (p) => (typeof p === "string" ? p : typeof p?.text === "string" ? p.text : "");

const quantile = (xs, q) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const byteLen = (s) => Buffer.byteLength(s);

// ═════════════════════════════ 4. the run ═════════════════════════════
export async function runAssembled({ root = path.join(os.homedir(), ".claude", "projects"), files = null, scopeFile = undefined, sample = null, seed = 1, draws = 1000, donors = 3, tsAsJs = false, out = null } = {}) {
  if (out) assertUntrackedOutput(out);
  const scope = loadScope(scopeFile);
  let list = files ?? listTranscripts(root);
  if (sample) { const r = mulberry32(seed); for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; } list = list.slice(); }
  const rnd = mulberry32(seed + 5);
  const runtime = await runtimeNames();
  const seen = new Set(), stats = { transcripts: 0 }, gaps = {};
  const finished = []; // grounds of sessions already read (the donor pool: earlier, same repo family or not, other sessions)
  const units = [];
  let inTurns = 0, outTurns = 0, mixedTurns = 0;
  for (const f of list) {
    stats.transcripts++;
    const sid = path.basename(f, ".jsonl");
    const ground = new Ground();
    const pending = new Map();
    let lastWorld = null; // the session's world object; its final state is folded in once the transcript ends
    const close = (turn) => {
      const v = scopeOfTurn(turn, scope);
      const us = pending.get(turn) ?? [];
      pending.delete(turn);
      if (v === "in") for (const u of us) units.push(u);
    };
    const turns = await readTranscript(f, {
      root, seen, stats, tsAsJs, scope, onTurnClose: close,
      onEdit: ({ turn, edit, row, rec, world, ts }) => {
        if (row.gap || row.frame !== "file" || row.category !== "structural") return;
        if (editScope(edit.file, scope).verdict !== "in") return;
        if (!rec) { bump(gaps, "no-file-bytes"); return; }
        const language = languageFor(edit.file, { tsAsJs })?.language;
        if (!language) return;
        lastWorld = world;
        world.refresh((o) => ground.noteOffer(o));
        ground.absorb(world, tsAsJs);
        const self = keysOf(rec.before);
        const sess = ground.setOf(language);
        const added = addedLines(rec.before, rec.after);
        const pool = finished.filter((g) => g.lines.get(language)?.size);
        const picks = [];
        for (let k = 0; k < donors && pool.length; k++) picks.push(pool[Math.floor(rnd() * pool.length)]);
        const lines = added.map((l) => {
          const key = lineKey(l);
          const inSelf = self.has(key), inSess = sess.has(key);
          const nullCov = picks.length ? picks.filter((g) => g.lines.get(language).has(key)).length / picks.length : null;
          return [byteLen(l), inSelf ? 1 : 0, inSess ? 1 : 0, nullCov];
        });
        let own = new Set();
        try { own = new Set((parseDeclarations(rec.before, edit.file) ?? []).map((d) => String(d.name))); } catch { /* an unreadable before has no own names */ }
        const keys = (row.added ?? []).map((e) => String(e.key));
        const rt = language === "javascript" ? runtime : null;
        const real = classifyCalls(keys, { names: ground.names, own, runtime: rt });
        const nulls = picks.map((g) => classifyCalls(keys, { names: g.names, own: new Set(), runtime: rt }));
        const u = { session: sid, ts: ts ?? edit.ts ?? null, language, created: !!rec.created, lines, calls: real, nullCalls: nulls };
        const askNow = askText(turn.prompt);
        if (askNow) {
          const declaredHere = new Set(keys.map(declaredOf).filter(Boolean));
          const callees = [...new Set(keys.map(calleeOf).filter((c) => c !== null && !declaredHere.has(c)))];
          // held in memory for the time-ordered find pass; never emitted. `names` is a SNAPSHOT of the session's ground at this
          // edit (a name this edit declares, or any later file, is not on the ground it was asked to reach into).
          u.askIn = { ask: askNow, turn: `${sid}|${turn.ts ?? ""}`, reached: callees.filter((c) => ground.names.get(c) || own.has(c)), names: new Map(ground.names), own };
        }
        const p = pending.get(turn) ?? []; p.push(u); pending.set(turn, p);
      },
    });
    for (const t of turns) { const v = scopeOfTurn(t, scope); if (v === "in") inTurns++; else if (v === "out") outTurns++; else mixedTurns++; }
    if (lastWorld) { lastWorld.refresh((o) => ground.noteOffer(o)); ground.absorb(lastWorld, tsAsJs); }
    finished.push(ground);
    if (sample && units.length >= sample) break;
  }
  findPass(units, { donors, seed });
  return report({ units, stats, gaps, inTurns, outTurns, mixedTurns, draws, seed, sample, donors, root });
}

/**
 * findPass(units, { donors, seed }) — the FIND arm, in TIME order. Units are grouped by the ask (session + turn) and the
 * groups taken by earliest timestamp. A group is scored against a referent field built ONLY from groups already
 * finished (so no edit of the same ask teaches its sibling), then taught to the field. The null is the same ground cut by
 * up to `donors` other sessions' earlier asks. Three arms on the same units: lexical (names), referent (attested
 * surfaces), both. Sets `u.find = { lexical, referent, both }` (each a findArm-shaped row) on held names.
 */
export function findPass(units, { donors = 3, seed = 1 } = {}) {
  const groups = new Map();
  for (const u of units) {
    if (!u.askIn || !u.ts) continue;
    const g = groups.get(u.askIn.turn) ?? { turn: u.askIn.turn, session: u.session, ask: u.askIn.ask, ts: u.ts, units: [] };
    if (u.ts < g.ts) g.ts = u.ts;
    g.units.push(u);
    groups.set(u.askIn.turn, g);
  }
  const ordered = [...groups.values()].sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
  const rnd = mulberry32(seed + 11);
  const field = new ReferentField();
  const reach = new Map(); // callable -> how many earlier asks reached it (the popularity prior)
  const recent = new Map(); // session -> callables reached by that session's earlier asks, most recent last
  const asks = []; // earlier groups' asks: [{ session, text }]
  for (const g of ordered) {
    const pool = asks.filter((a) => a.session !== g.session);
    const picks = [];
    for (let k = 0; k < donors && pool.length; k++) picks.push(pool[Math.floor(rnd() * pool.length)].text);
    for (const u of g.units) {
      const { ask, names, own, reached } = u.askIn;
      const R = new Set(reached).size;
      if (!R) continue;
      const row = (mode) => {
        const run = (text) => {
          const r = find({ ask: text, names, own, runtime: null, k: R, referents: mode === "lexical" ? null : field, mode });
          return r.ok ? { p: r.candidates.filter((c) => reached.includes(c.name)).length / R, gap: null } : { p: 0, gap: r.gap.kind };
        };
        const real = run(ask);
        const nulls = picks.map((t) => run(t).p);
        const N = new Set([...names.keys(), ...own]).size;
        return { R, N, real: real.p, nulls, nullMean: nulls.length ? nulls.reduce((a, b) => a + b, 0) / nulls.length : null, chance: Math.min(1, R / Math.max(N, 1)), gap: real.gap };
      };
      // ask-INDEPENDENT priors, scored by the same R-precision and the same donors' null: the null for a prior is
      // itself (it never reads the ask), so a prior cannot "beat another ask's words" — it is reported against chance
      const field_ = new Set([...names.keys(), ...own]);
      const byReach = [...field_].map((n) => [n, reach.get(n) ?? 0]).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, R).map(([n]) => n);
      const seq = (recent.get(g.session) ?? []).filter((n) => field_.has(n));
      const byRecent = [...new Set([...seq].reverse())].slice(0, R);
      const prior = (top) => ({ R, N: field_.size, real: top.filter((n) => reached.includes(n)).length / R, nulls: [0], nullMean: 0, chance: Math.min(1, R / Math.max(field_.size, 1)), gap: top.length ? null : "no-prior" });
      // BLENDS of the ask-independent prior with the ask-specific evidence. No weights are set: `askThenPop` takes the
      // callables the ask's evidence ranks first and fills the rest of the R places from popularity; `blend` sums the
      // two signals each scaled by its own maximum.
      const everyone = find({ ask, names, own, runtime: null, k: Math.max(field_.size, 1), referents: field, mode: "both" });
      const askRank = everyone.ok ? everyone.candidates.filter((c) => c.score > 0) : [];
      const popAll = [...field_].map((n) => [n, reach.get(n) ?? 0]).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([n]) => n);
      const askThenPop = [...new Set([...askRank.map((c) => c.name).slice(0, R), ...popAll])].slice(0, R);
      const maxAsk = Math.max(...askRank.map((c) => c.score), 0), maxPop = Math.max(...popAll.map((n) => reach.get(n) ?? 0), 0);
      const mixed = new Map();
      for (const c of askRank) mixed.set(c.name, maxAsk ? c.score / maxAsk : 0);
      for (const n of popAll) mixed.set(n, (mixed.get(n) ?? 0) + (maxPop ? (reach.get(n) ?? 0) / maxPop : 0));
      const blend = [...mixed].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, R).map(([n]) => n);
      u.find = { lexical: row("lexical"), referent: row("referent"), both: row("both"), popular: prior(byReach), recent: prior(byRecent), askThenPop: prior(askThenPop), blend: prior(blend), fieldUnits: field.units, askWords: wordsOf(ask).size };
    }
    for (const u of g.units) if (u.askIn.reached.length) {
      field.learn(g.ask, u.askIn.reached);
      for (const n of new Set(u.askIn.reached)) reach.set(n, (reach.get(n) ?? 0) + 1);
      const seq = recent.get(g.session) ?? [];
      seq.push(...u.askIn.reached);
      recent.set(g.session, seq.slice(-200));
    }
    asks.push({ session: g.session, text: g.ask });
    for (const u of g.units) delete u.askIn;
  }
  for (const u of units) delete u.askIn;
  return { groups: ordered.length, fieldCallables: field.bag.size, fieldUnits: field.units };
}

// ═════════════════════════════ 5. the report ═════════════════════════════
export function report({ units, stats = {}, gaps = {}, inTurns = 0, outTurns = 0, mixedTurns = 0, draws = 1000, seed = 1, sample = null, donors = 3, root = "" } = {}) {
  const withAdded = units.filter((u) => u.lines.length);
  const withNull = withAdded.filter((u) => u.lines.every((l) => l[3] !== null));
  const bytes = (u) => u.lines.reduce((a, l) => a + l[0], 0);
  const foundReal = (u) => u.lines.reduce((a, l) => a + (l[1] || l[2] ? l[0] : 0), 0);
  const foundNull = (u) => u.lines.reduce((a, l) => a + l[0] * (l[3] ?? 0), 0);
  const shareR = (u) => foundReal(u) / bytes(u), shareN = (u) => foundNull(u) / bytes(u);

  const d = withNull.map((u) => shareR(u) - shareN(u));
  const tBytes = pairedNull(d, withNull.map((u) => u.session), { draws, seed });

  const totalBytes = withNull.reduce((a, u) => a + bytes(u), 0);
  const pooled = totalBytes ? {
    real: withNull.reduce((a, u) => a + foundReal(u), 0) / totalBytes,
    null: withNull.reduce((a, u) => a + foundNull(u), 0) / totalBytes,
    selfOnly: withNull.reduce((a, u) => a + u.lines.reduce((x, l) => x + (l[1] ? l[0] : 0), 0), 0) / totalBytes,
    sessionBeyondSelf: withNull.reduce((a, u) => a + u.lines.reduce((x, l) => x + (!l[1] && l[2] ? l[0] : 0), 0), 0) / totalBytes,
  } : null;

  // residue in bytes per edit, real vs the donor arm's expectation; and the fully-assembled fraction
  const resReal = withNull.map((u) => bytes(u) - foundReal(u)), resNull = withNull.map((u) => bytes(u) - foundNull(u));
  const residue = {
    n: withNull.length,
    real: { median: quantile(resReal, 0.5), p90: quantile(resReal, 0.9), fullyAssembled: withNull.length ? resReal.filter((x) => x === 0).length / withNull.length : null },
    null: { median: quantile(resNull, 0.5), p90: quantile(resNull, 0.9), fullyAssembled: withNull.length ? resNull.filter((x) => x < 1e-9).length / withNull.length : null },
  };

  // by line-length tercile, cut points from the data itself
  const allLens = withNull.flatMap((u) => u.lines.map((l) => l[0]));
  const c1 = quantile(allLens, 1 / 3), c2 = quantile(allLens, 2 / 3);
  const bin = (len) => (len <= c1 ? "short" : len <= c2 ? "middle" : "long");
  const terciles = {};
  for (const u of withNull) for (const l of u.lines) {
    const t = (terciles[bin(l[0])] ??= { bytes: 0, real: 0, null: 0, lines: 0 });
    t.bytes += l[0]; t.lines++; t.real += l[1] || l[2] ? l[0] : 0; t.null += l[0] * (l[3] ?? 0);
  }
  for (const t of Object.values(terciles)) { t.realShare = t.bytes ? t.real / t.bytes : null; t.nullShare = t.bytes ? t.null / t.bytes : null; delete t.real; delete t.null; }

  const split = (pick) => {
    const us = withNull.filter(pick);
    const tot = us.reduce((a, u) => a + bytes(u), 0);
    return { n: us.length, real: tot ? us.reduce((a, u) => a + foundReal(u), 0) / tot : null, null: tot ? us.reduce((a, u) => a + foundNull(u), 0) / tot : null };
  };

  // calls
  const callUnits = units.filter((u) => callTotal(u.calls) > 0 && u.nullCalls.length);
  const callShare = (c) => existing(c) / callTotal(c);
  const dc = callUnits.map((u) => callShare(u.calls) - mean(u.nullCalls.map(callShare)));
  const tCalls = pairedNull(dc, callUnits.map((u) => u.session), { draws, seed });
  const sum = (key) => units.reduce((a, u) => a + u.calls[key], 0);
  const callMix = { new: sum("new"), library: sum("library"), repo: sum("repo"), own: sum("own"), runtime: sum("runtime"), other: sum("other") };
  const callAll = Object.values(callMix).reduce((a, b) => a + b, 0);
  const byLanguage = {};
  for (const u of units) { const l = (byLanguage[u.language] ??= { units: 0, calls: 0, runtime: 0 }); l.units++; l.calls += callTotal(u.calls); l.runtime += u.calls.runtime; }

  const findOf = (pick) => {
    const us = units.filter((u) => u.find && pick(u.find) && pick(u.find).nulls.length);
    const a = us.map((u) => pick(u.find));
    const dd = a.map((x) => x.real - x.nullMean);
    const t = pairedNull(dd, us.map((u) => u.session), { draws, seed });
    return {
      n: us.length, real: mean(a.map((x) => x.real)), null: mean(a.map((x) => x.nullMean)), chance: mean(a.map((x) => x.chance)),
      meanReached: mean(a.map((x) => x.R)), meanField: mean(a.map((x) => x.N)),
      landed: a.length ? a.filter((x) => !x.gap).length / a.length : null,
      found: a.length ? a.filter((x) => x.real > 0).length / a.length : null,
      difference: t, verdict: verdictOf(t),
    };
  };
  const priorOf = (pick) => {
    const us = units.filter((u) => u.find && pick(u.find));
    const a = us.map((u) => pick(u.find));
    return { n: a.length, real: mean(a.map((x) => x.real)), chance: mean(a.map((x) => x.chance)), found: a.length ? a.filter((x) => x.real > 0).length / a.length : null, ranked: a.length ? a.filter((x) => !x.gap).length / a.length : null };
  };
  // by ask length: tercile cut points from the data (an ask of two words cannot carry a referent)
  const wc = units.filter((u) => u.find?.referent && u.find.referent.nulls.length).map((u) => u.find.askWords);
  const w1 = quantile(wc, 1 / 3), w2 = quantile(wc, 2 / 3);
  const stratum = (u) => (u.find.askWords <= w1 ? "short" : u.find.askWords <= w2 ? "middle" : "long");
  const stratumOf = (u) => (u.find?.askWords === undefined ? null : stratum(u));
  const byAsk = {};
  for (const name of ["short", "middle", "long"]) {
    const us = units.filter((u) => u.find?.referent && u.find.referent.nulls.length && stratum(u) === name);
    const dd = us.map((u) => u.find.referent.real - u.find.referent.nullMean);
    const t = pairedNull(dd, us.map((u) => u.session), { draws, seed });
    byAsk[name] = {
      n: us.length, words: { min: Math.min(...us.map((u) => u.find.askWords)), max: Math.max(...us.map((u) => u.find.askWords)) },
      referent: mean(us.map((u) => u.find.referent.real)), nullAsk: mean(us.map((u) => u.find.referent.nullMean)),
      lexical: mean(us.map((u) => u.find.lexical.real)), lexicalNull: mean(us.map((u) => u.find.lexical.nullMean)),
      popular: mean(us.map((u) => u.find.popular.real)), chance: mean(us.map((u) => u.find.referent.chance)),
      difference: t, verdict: verdictOf(t),
    };
  }
  const vsPopular = {};
  for (const arm of ["askThenPop", "blend", "referent"]) {
    const pick = (us) => {
      const dd = us.map((u) => u.find[arm].real - u.find.popular.real);
      const t = pairedNull(dd, us.map((u) => u.session), { draws, seed });
      return { n: us.length, arm: mean(us.map((u) => u.find[arm].real)), popular: mean(us.map((u) => u.find.popular.real)), difference: t, verdict: verdictOf(t) };
    };
    const all = units.filter((u) => u.find?.[arm] && u.find.popular);
    vsPopular[arm] = { all: pick(all) };
    for (const name of ["short", "middle", "long"]) vsPopular[arm][name] = pick(all.filter((u) => stratumOf(u) === name));
  }
  const find_ = { vsPopular, byAskLength: byAsk, lexical: findOf((f) => f.lexical), referent: findOf((f) => f.referent), both: findOf((f) => f.both), popular: priorOf((f) => f.popular), recent: priorOf((f) => f.recent) };

  return {
    version: ASSEMBLED_VERSION, root: root && root.startsWith(os.homedir() + path.sep) ? `~${path.sep}${path.relative(os.homedir(), root)}` : "(custom root)",
    sample, seed, draws, donors, stats, gaps,
    coverage: { units: units.length, withAddedLines: withAdded.length, withNull: withNull.length, created: units.filter((u) => u.created).length, inTurns, outTurns, mixedTurns, addedLines: withAdded.reduce((a, u) => a + u.lines.length, 0) },
    bytes: { pooled, perEdit: { real: mean(withNull.map(shareR)), null: mean(withNull.map(shareN)), difference: tBytes, verdict: verdictOf(tBytes) }, residue, terciles, cuts: { shortMax: c1, middleMax: c2 }, created: split((u) => u.created), modified: split((u) => !u.created) },
    find: find_,
    calls: { mix: callMix, share: callAll ? { existing: (callMix.library + callMix.repo + callMix.own) / callAll, reused: (callMix.library + callMix.repo + callMix.own + callMix.runtime) / callAll, runtime: callMix.runtime / callAll, library: callMix.library / callAll, repo: callMix.repo / callAll, own: callMix.own / callAll, new: callMix.new / callAll, other: callMix.other / callAll } : null, byLanguage, unitsWithCalls: callUnits.length, perEdit: { real: mean(callUnits.map((u) => callShare(u.calls))), null: mean(callUnits.map((u) => mean(u.nullCalls.map(callShare)))), difference: tCalls, verdict: verdictOf(tCalls) } },
  };
}

// ═════════════════════════════ 6. rendering ═════════════════════════════
const f3 = (x) => (x === null || x === undefined || Number.isNaN(x) ? "n/a" : x.toFixed(3));
const tline = (label, t, v) => (!t || !t.n ? `  ${label}: no units` : `  ${label}: Δ=${t.mean >= 0 ? "+" : ""}${f3(t.mean)} (n=${t.n}, ${t.clusters} sessions; +${t.plus}/−${t.minus}/=${t.zero}) p=${t.p.toFixed(4)} (floor ${t.floor.toFixed(4)}) → ${v}`);

export function render(rep) {
  const L = [], b = rep.bytes, c = rep.calls, cv = rep.coverage;
  L.push(`apprentice-assembled ${rep.version} — ${rep.sample ? `sample (${rep.sample} units, seed ${rep.seed})` : "all transcripts"} · draws ${rep.draws} · donors ${rep.donors}`);
  L.push("");
  L.push(`BYTES — of the lines an edit ADDED, the share a file the session already held contained verbatim (n=${cv.withNull} edits with a donor arm)`);
  if (b.pooled) L.push(`  pooled by byte: real ${f3(b.pooled.real)} vs donor sessions ${f3(b.pooled.null)} · own file's before ${f3(b.pooled.selfOnly)} · other held files, beyond the own file ${f3(b.pooled.sessionBeyondSelf)}`);
  L.push(`  per edit: real ${f3(b.perEdit.real)} vs donors ${f3(b.perEdit.null)}`);
  L.push(tline("real vs donors", b.perEdit.difference, b.perEdit.verdict));
  L.push(`  residue (bytes the held files did not have), per edit: median ${b.residue.real.median} · p90 ${b.residue.real.p90} · fully assembled ${f3(b.residue.real.fullyAssembled)}   [donors: median ${f3(b.residue.null.median)} · p90 ${f3(b.residue.null.p90)} · fully ${f3(b.residue.null.fullyAssembled)}]`);
  for (const k of ["short", "middle", "long"]) { const t = b.terciles[k]; if (t) L.push(`  ${k.padEnd(6)} lines (${t.lines}): real ${f3(t.realShare)} vs donors ${f3(t.nullShare)}`); }
  L.push(`  new files (${b.created.n}): real ${f3(b.created.real)} vs ${f3(b.created.null)} · modified files (${b.modified.n}): real ${f3(b.modified.real)} vs ${f3(b.modified.null)}`);
  L.push("");
  L.push(`CALLS — of the calls an edit ADDED, those that reach a name that already exists (n=${c.unitsWithCalls} edits with calls and a donor arm)`);
  if (c.share) L.push(`  mix: reused ${f3(c.share.reused)} = library ${f3(c.share.library)} + repo ${f3(c.share.repo)} + own file ${f3(c.share.own)} + the engine's own names ${f3(c.share.runtime)} · new in the edit ${f3(c.share.new)} · unresolved ${f3(c.share.other)}`);
  L.push(`  by language (runtime is JavaScript only): ${JSON.stringify(c.byLanguage)}`);
  L.push("  the paired test below is on held names only (library + repo + own file): the engine's names are the same for every session, so they cannot be donor-nulled");
  L.push(`  per edit: real ${f3(c.perEdit.real)} vs donors ${f3(c.perEdit.null)}`);
  L.push(tline("real vs donors", c.perEdit.difference, c.perEdit.verdict));
  L.push("");
  for (const [label, k] of [["by NAME (lexical)", "lexical"], ["by REFERENT (ask words attested for the callable by earlier asks)", "referent"], ["by both", "both"]]) {
    const x = rep.find[k];
    L.push(`FIND ${label} — R-precision, held names, against the existing names the master's added calls reached (n=${x.n}, mean reached ${f3(x.meanReached)}, field ${f3(x.meanField)})`);
    L.push(`  real ${f3(x.real)} vs another ask's words ${f3(x.null)} · chance ${f3(x.chance)} · something ranked ${f3(x.landed)} · found at least one ${f3(x.found)}`);
    L.push(tline("real vs other asks", x.difference, x.verdict));
  }
  L.push(`FIND by ASK LENGTH (tercile cuts from the data: ${rep.find.byAskLength.short.words.max} / ${rep.find.byAskLength.middle.words.max} distinct words) — can a longer, more specific ask carry the referent?`);
  for (const k of ["short", "middle", "long"]) {
    const x = rep.find.byAskLength[k];
    L.push(`  ${k.padEnd(6)} (n=${x.n}, ${x.words.min}-${x.words.max} words): referent ${f3(x.referent)} vs other asks ${f3(x.nullAsk)} · name ${f3(x.lexical)} vs ${f3(x.lexicalNull)} · popularity ${f3(x.popular)} · chance ${f3(x.chance)}`);
    L.push(tline("  referent vs other asks", x.difference, x.verdict));
  }
  L.push("FIND, BLENDS vs the popularity prior alone (paired per edit, cluster = session) — does the ask add to the prior?");
  for (const arm of ["referent", "askThenPop", "blend"]) {
    for (const k of ["all", "short", "middle", "long"]) {
      const x = rep.find.vsPopular[arm][k];
      L.push(`  ${arm.padEnd(10)} ${k.padEnd(6)} n=${x.n}: ${f3(x.arm)} vs popularity ${f3(x.popular)}`);
      L.push(tline("    ", x.difference, x.verdict));
    }
  }
  for (const [label, k] of [["the POPULARITY prior (callables reached by the most earlier asks; never reads the ask)", "popular"], ["the RECENCY prior (callables this session's earlier asks reached, most recent first; never reads the ask)", "recent"]]) {
    const x = rep.find[k];
    L.push(`FIND by ${label} — R-precision, same units (n=${x.n}): ${f3(x.real)} · chance ${f3(x.chance)} · a prior existed ${f3(x.ranked)} · found at least one ${f3(x.found)}`);
  }
  L.push("");
  L.push(`COVERAGE  transcripts ${rep.stats.transcripts} · IN turns ${cv.inTurns} (OUT ${cv.outTurns}, MIXED ${cv.mixedTurns}) · units ${cv.units} · with added lines ${cv.withAddedLines} · added lines ${cv.addedLines} · created files ${cv.created}`);
  L.push(`  typed gaps ${JSON.stringify(rep.gaps)}`);
  return L.join("\n");
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const out = arg("--out");
  const rep = await runAssembled({
    root: arg("--root", path.join(os.homedir(), ".claude", "projects")),
    sample: arg("--sample") ? Number(arg("--sample")) : null, seed: Number(arg("--seed", "1")), draws: Number(arg("--draws", "1000")), out,
  });
  const scrubbed = {};
  const clean = scrubDeep(rep, scrubbed);
  if (out) fs.writeFileSync(out, JSON.stringify(clean, null, 1));
  console.log(render(clean));
}
