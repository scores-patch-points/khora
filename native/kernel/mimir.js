// Handle: Mímir — after the well beneath the world-tree: the reading stands on
// memory; the head is preserved and consulted, never re-earned from nothing;
// and the eye was paid for the drink. Amendment XVII.
//
// native/kernel/mimir.js — THE MIND: one append-only store of takings, every
// row citing the SOURCE UNDERLYING BYTES (`<source>#<byte>`). Not the record
// (Mnemosyne is penelope's ledger of what landed); the mind is the accumulated
// ground the reading STANDS ON and recovers. The laws are enforced HERE:
//
//   1. CITE THE BYTES — a row with no citation is refused (no generation from
//      nowhere; the same discipline the hyperlexicon gate holds).
//   2. APPEND-ONLY — remember/defeat return a NEW mind; no line is rewritten.
//   3. DEFEAT IS PRESERVED — a refuted row is kept; the defeat is a new line.
//      (The Orphic choice: drink from the well, never from Lethe.)
//   4. COHERENCE EARNS NOTHING — standing "earned" requires a measured
//      consequence (method + effect + pValue); without it the row is a
//      candidate, held. (GL-EN-22.)
//   5. THE LOG IS TRUTH, THE MIND IS ITS PROJECTION — mindAt replays a prefix,
//      so "what did it know as of encounter N" is answerable (lexicon.js).
//
// PURE. No disk, no model, no imports. The DRIVER owns I/O.

const freeze = (value) => Object.freeze(value);

export const MIND_SCHEMA = "EOMind@1";
export const MIND_ROW_SCHEMA = "MimirRow@1";
export const MIND_PROJECTION_SCHEMA = "EOMindProjection@1";
export const STANDINGS = Object.freeze(["candidate", "earned", "refuted"]);

const stable = (value) => (typeof value === "string" ? value : JSON.stringify(value));
const hash = (s) => { let h = 0x811c9dc5; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return `m_${h.toString(16).padStart(8, "0")}`; };

/** A citation to the SOURCE UNDERLYING BYTES. `source` is a real path; `byte` is
 *  an offset into it; `sha256` (optional) pins the bytes so the citation is
 *  verifiable and cannot drift. */
export function cite({ source, byte, length = null, sha256 = null } = {}) {
  if (typeof source !== "string" || !source) throw new TypeError("cite: a source path is required — a citation is to real bytes");
  if (!Number.isInteger(byte) || byte < 0) throw new TypeError("cite: a byte offset is required — the source underlying bytes");
  return freeze({ source, byte, length, sha256 });
}

export function createMind({ meta = {} } = {}) {
  return freeze({ schema: MIND_SCHEMA, rows: freeze([]), meta: freeze({ ...meta }) });
}

/** Parse the mind's JSONL store back into an EOMind (the log is truth; the
 *  store is its projection — a mind written by one process reads back whole).
 *  Line 0 is the header (EOMind@1), the rest are MimirRow@1 lines. */
export function parseMind(text) {
  const lines = String(text ?? "").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
  if (!lines.length) return createMind();
  const header = lines[0]?.schema === MIND_SCHEMA ? lines[0] : null;
  const rows = (header ? lines.slice(1) : lines).filter((r) => r?.schema === MIND_ROW_SCHEMA);
  return freeze({ schema: MIND_SCHEMA, rows: freeze(rows), meta: freeze({ ...(header?.meta ?? {}), handle: header?.handle ?? null, note: header?.note ?? null, giver: header?.giver ?? null }) });
}

/** Append one taking. Refuses rows with no bytes behind them; refuses "earned"
 *  without a measured consequence. Returns a NEW mind (append-only, P1). */
export function remember(mind, row = {}) {
  if (mind?.schema !== MIND_SCHEMA) throw new TypeError("remember requires EOMind@1");
  const { kind, claim, giver = null, cites = [], standing = "candidate", basis = null, falsifying = null, measurement = null, meta = {} } = row;
  if (!kind || typeof kind !== "string") throw new TypeError("remember: a kind is required");
  if (claim === undefined || claim === null) throw new TypeError("remember: a claim is required");
  if (!Array.isArray(cites) || cites.length === 0) throw new TypeError("remember: every row must cite the source underlying bytes — no generation from nowhere");
  const frozenCites = cites.map((c) => cite(c));
  if (!STANDINGS.includes(standing)) throw new TypeError(`remember: unknown standing ${JSON.stringify(standing)}`);
  if (standing === "earned") {
    const measured = measurement && typeof measurement.method === "string"
      && Number.isFinite(measurement.effect) && Number.isFinite(measurement.pValue);
    if (!measured) throw new TypeError("remember: coherence alone earns nothing — standing 'earned' requires a measured consequence (method, effect, pValue)");
  }
  const id = row.id ?? hash(`${kind}|${stable(claim)}|${frozenCites.map((c) => `${c.source}#${c.byte}`).join("|")}`);
  return freeze({
    ...mind,
    rows: freeze([...mind.rows, freeze({
      schema: MIND_ROW_SCHEMA, id, seq: mind.rows.length, kind, claim: freeze(claim),
      giver, cites: freeze(frozenCites), standing, basis, falsifying,
      measurement: measurement ? freeze({ ...measurement }) : null, meta: freeze({ ...meta }),
    })]),
  });
}

/** Defeat a row: append the defeat line (the target is untouched — the record
 *  keeps its scars). The projected standing of the target becomes "refuted". */
export function defeat(mind, id, { by = null, reason, witness = null } = {}) {
  if (mind?.schema !== MIND_SCHEMA) throw new TypeError("defeat requires EOMind@1");
  if (!id) throw new TypeError("defeat: the target row id is required");
  if (!reason) throw new TypeError("defeat: a reason is required — a defeat carries its ground");
  const target = mind.rows.find((r) => r.id === id);
  if (!target) throw new TypeError(`defeat: no such row ${id}`);
  const cites = witness ? [cite(witness)] : target.cites;
  return freeze({
    ...mind,
    rows: freeze([...mind.rows, freeze({
      schema: MIND_ROW_SCHEMA, id: `${id}::defeat:${mind.rows.length}`, seq: mind.rows.length,
      kind: "defeat", claim: freeze({ targets: id }), giver: by, cites: freeze(cites),
      standing: "earned", basis: reason, falsifying: null, measurement: null, meta: freeze({ targets: id }),
    })]),
  });
}

/** Replay the prefix `seq <= asOf` and project the present-tense standing per
 *  row id. A defeated row is "refuted"; defeat is never erased. */
export function mindAt(mind, { asOf = Infinity } = {}) {
  if (mind?.schema !== MIND_SCHEMA) throw new TypeError("mindAt requires EOMind@1");
  const rows = mind.rows.filter((r) => r.seq <= asOf);
  const standing = new Map();
  const defeated = new Set();
  for (const r of rows) {
    if (r.kind === "defeat") { defeated.add(r.meta?.targets ?? r.claim?.targets); continue; }
    standing.set(r.id, r.standing);
  }
  const standingById = Object.create(null);
  for (const [id, s] of standing) standingById[id] = defeated.has(id) ? "refuted" : s;
  return freeze({ schema: MIND_PROJECTION_SCHEMA, at: asOf, rows: freeze([...rows]), standingById: freeze({ ...standingById }) });
}

/** The citation gate: every row's bytes must resolve. `read` is injected
 *  (source path -> Buffer/Uint8Array); `digest` (optional) pins sha256. A
 *  citation that does not resolve is a finding, never a silent pass. */
export function verifyCitations(mind, { read, digest = null } = {}) {
  if (mind?.schema !== MIND_SCHEMA) throw new TypeError("verifyCitations requires EOMind@1");
  if (typeof read !== "function") throw new TypeError("verifyCitations: a reader (source -> bytes) is injected, never assumed");
  const findings = [];
  for (const r of mind.rows) for (const c of r.cites ?? []) {
    let buf = null;
    try { buf = read(c.source); } catch (e) { findings.push(freeze({ id: r.id, cite: c, ok: false, why: `source unreadable: ${String(e?.message ?? e)}` })); continue; }
    if (!buf || typeof buf.length !== "number") { findings.push(freeze({ id: r.id, cite: c, ok: false, why: "reader returned no bytes" })); continue; }
    if (c.byte >= buf.length) { findings.push(freeze({ id: r.id, cite: c, ok: false, why: `byte ${c.byte} beyond the source's ${buf.length} bytes` })); continue; }
    if (c.sha256 && typeof digest === "function") {
      const span = buf.subarray(c.byte, c.length ? c.byte + c.length : buf.length);
      const got = digest(span);
      if (got !== c.sha256) { findings.push(freeze({ id: r.id, cite: c, ok: false, why: `sha256 drift: cited ${c.sha256.slice(0, 12)}…, found ${String(got).slice(0, 12)}…` })); continue; }
    }
    findings.push(freeze({ id: r.id, cite: c, ok: true }));
  }
  const failed = findings.filter((f) => !f.ok).length;
  return freeze({ schema: "EOMindCitationReport@1", checked: findings.length, failed, ok: failed === 0, findings: freeze(findings) });
}
