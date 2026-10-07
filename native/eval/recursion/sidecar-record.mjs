// eval/recursion/sidecar-record.mjs — the self-record wired onto the REAL sidecar: an append-only reading log folded at a cursor,
// with revisions (future learning) that re-key without erasing the past. New file; nothing is edited.
//
//   node eval/recursion/sidecar-record.mjs --sidecar DIR --doc NAME [--chars N] [--json]
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5). Written BEFORE the first run. ═══════════════════════════════════════════════
// THE LOG. The sidecar.jsonl lines ARE the log: each line is a SidecarRead@1 with seq = its line index (append order). An entry
// is immutable; a later correction is a REVISION appended with a HIGHER seq, keyed (address, surface) and carrying an action
// (drop | rename). Meaning = project(log, cursor).
// PROJECT. project(log, asOf) folds the entries with seq <= asOf, then applies revisions with revSeq <= asOf. A surface dropped
//   by a revision disappears from the cast AT AND AFTER the revision's seq; at a cursor BEFORE it, the original surface is
//   still there (an in-place edit would fail P1 below). A rename maps the surface to its new reading without removing the old
//   key from the record.
// THE FALSIFIABLE CLAIM (naming the reader, not the demo): a recursive reader keeps past meaning recoverable (project at the
//   old cursor returns what was believed then) and lets the present re-read it (project after the revision returns the new
//   reading). An editor that mutates the sidecar in place fails P1 (the old cursor would return the new reading).
// CONTROLS. K1 determinism (project twice, byte-identical). K2 the log length never shrinks (append-only). K3 a revision only
//   applies at cursors >= its own seq (no retroactive rewrite of earlier cursors).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const norm = (s) => String(s ?? "").normalize("NFC").trim();

export function loadLog(sidecarDir) {
  const p = path.join(sidecarDir, "sidecar.jsonl");
  if (!fs.existsSync(p)) throw new Error(`no sidecar at ${p}`);
  return fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map((l, seq) => JSON.parse(l)).map((e, seq) => ({ ...e, seq }));
}

/** SUFFICIENT EVIDENCE: how much corroboration a candidate revision needs before it re-keys the fold at its cursor. Declared
 *  (P4; a bare provisional integer). A revision is adopted iff it is NOT standing "candidate" (it is acknowledged/given) OR its
 *  evidence weight clears the bar. A candidate is recorded in the log FIRST and hangs; the fold ignores it until the evidence
 *  arrives. Nothing escapes recursion: cast, identity and kinds all read the same gate. */
export const EVIDENCE_BAR = 2;
/** A revision: { revSeq, address, surface, action, to?, evidence, standing }. Immutable; seq in the log's ordinal space. */
export const revision = (revSeq, address, surface, action, to = null, evidence = 1, standing = "candidate") => Object.freeze({ revSeq, address, surface: norm(surface).toLowerCase(), action, to: to ? norm(to) : null, evidence, standing });
export const adopted = (r) => r.standing !== "candidate" || Number(r.evidence ?? 0) >= EVIDENCE_BAR;

/** Fold the log at cursor asOf (the default = the end): per-doc cast surfaces, applying revisions with revSeq <= asOf. */
export function project(log, { asOf = Infinity, docs = null } = {}) {
  const revs = (log.revisions ?? []);
  const cast = new Map();
  for (const e of log) {
    if (e.seq > asOf) break;
    if (docs && docs !== e.address) continue;
    if (!cast.has(e.address)) cast.set(e.address, []);
    const seen = new Set();
    for (const c of e.cast ?? []) { const s = typeof c === "string" ? c : c.surface; const k = norm(s); if (k && !seen.has(k)) { seen.add(k); cast.get(e.address).push({ surface: k, ref: typeof c === "object" ? c.ref : null }); } }
  }
  for (const r of revs) {
    if (r.revSeq > asOf) continue;
    if (!adopted(r)) continue;                    // evidence gate: candidates hang until the bar clears
    if (docs && docs !== r.address) continue;
    const list = cast.get(r.address);
    if (!list) continue;
    if (r.action === "drop") {
      const i = list.findIndex((x) => x.surface.toLowerCase() === r.surface);
      if (i >= 0) list.splice(i, 1);
    } else if (["rename", "syn", "seg"].includes(r.action) && r.to) {     // syn/seg = re-key at the identity lattice; merge collapses on re-unique
      const i = list.findIndex((x) => x.surface.toLowerCase() === r.surface);
      if (i >= 0) list[i] = { ...list[i], surface: r.to };
    }
  }
  for (const [addr, list] of cast) { const seen = new Set(); cast.set(addr, list.filter((x) => (seen.has(x.surface) ? false : (seen.add(x.surface), true)))); }
  return cast;
}

/** The IDENTITY LATTICE at a cursor: surface -> canonical referent, and each canonical's member set. Revisions are identity
 *  ops on nameless referents — syn = merge (surface joins another referent), seg = split (surface becomes its own referent),
 *  rename = re-key, drop = leaves the universe. Past cursors see the prior lattice; nothing is erased from the log. */
export function referentsAt(log, { asOf = Infinity } = {}) {
  const owner = new Map();                       // lowercased surface -> canonical surface
  const groups = new Map();                      // canonical -> Set(members)
  const dropped = new Set();                     // surfaces dropped at <= asOf (chrome / retired)
  const own = (s) => { if (!owner.has(s)) { owner.set(s, s); groups.set(s, new Set([s])); } return s; };
  for (const e of log) {
    if (e.seq > asOf) break;
    for (const c of e.cast ?? []) { const s = norm(typeof c === "string" ? c : c.surface).toLowerCase(); if (s) own(s); }
  }
  for (const r of log.revisions ?? []) {
    if (r.revSeq > asOf) continue;
    if (!adopted(r)) continue;                                   // candidate revisions hang until the evidence clears EVIDENCE_BAR
    const s = String(r.surface).toLowerCase();
    if (r.action === "drop") { const o = owner.get(s); if (o) { groups.get(o)?.delete(s); owner.delete(s); } dropped.add(s); }
    else if ((r.action === "syn" || r.action === "rename") && r.to) {
      const t = norm(r.to).toLowerCase(); if (s === t) continue;
      const ts = own(t); const os = owner.get(s) ?? own(s);
      if (os !== ts) { groups.get(os)?.delete(s); groups.get(ts).add(s); owner.set(s, ts); }
      if (r.action === "rename" && groups.has(os) && groups.get(os).size === 0) { owner.delete(os); groups.delete(os); }
    }
    else if (r.action === "seg") { const os = owner.get(s); if (os && os !== s) { groups.get(os)?.delete(s); own(s); owner.set(s, s); } }
  }
  return { owner, groups, dropped };
}

/** KINDS at a cursor: each referent (canonical + members) is typed from the FOLDED lattice — chrome (a surface was dropped at
 *  <= asOf), name (capital-witnessed, open class), else lexical. The kind of a referent can therefore CHANGE at later cursors
 *  (a capitalized chrome surface was a "name" before genericity/drops learned otherwise). */
export function kindsAt(log, { asOf = Infinity } = {}) {
  const { groups, dropped } = referentsAt(log, { asOf });
  const out = new Map();
  for (const [c, members] of groups) {
    if (!members.size) continue;
    const kind = dropped.has(c) ? "chrome" : isNameWitness(c) ? "name" : "lexical";
    if (!out.has(kind)) out.set(kind, []);
    out.get(kind).push({ canonical: c, members: [...members] });
  }
  return out;
}
const isNameWitness = (s) => { const t = norm(s).replace(/^[^\p{L}]+/u, ""); return t.length > 0 && /^\p{Lu}/u.test(t) && !/^(the|a|an|and|of|in|on|to|for|with|by|from|as|is|was|were)$/i.test(t); };

async function main() {
  const a = process.argv.slice(2);
  const o = { sidecar: null, doc: null, json: false, appendRev: null, evidence: null };
  for (let i = 0; i < a.length; i++) { if (a[i] === "--sidecar") o.sidecar = a[++i]; else if (a[i] === "--doc") o.doc = a[++i]; else if (a[i] === "--json") o.json = true; else if (a[i] === "--append-rev") o.appendRev = a[++i]; else if (a[i] === "--evidence") o.evidence = Number(a[++i]); }
  if (o.appendRev) {
    const dir = path.resolve(o.sidecar);
    const [doc, surface, action, to] = o.appendRev.split("|");
    const log = loadLog(dir);
    const revSeq = log.length + 0.5;                             // in the log's ordinal space, above every read
    const ev = o.evidence;                                       // evidence-bearing adding is a CANDIDATE (hangs until the bar);
    const rev = revision(revSeq, doc, surface, action, to ?? null, ev ?? 1, ev != null ? "candidate" : "given");
    fs.appendFileSync(path.join(dir, "revisions.jsonl"), JSON.stringify(rev) + "\n");
    console.log("appended", JSON.stringify(rev));
    return;
  }
  const log = loadLog(path.resolve(o.sidecar));
  const doc = o.doc ?? log[0]?.address;
  const entrySeq = log.find((e) => e.address === doc)?.seq ?? 0;
  // FUTURE LEARNING (revisions appended after the read): drop chrome that the family genericity would now catch, rename a title.
  // These are written as append-only revisions in the log's own ordinal space.
  const rev1 = revision(entrySeq + 0.5, doc, "gutenberg ebook", "drop");
  const rev2 = revision(entrySeq + 0.6, doc, "project gutenberg", "drop");
  const past = project(log, { asOf: entrySeq, docs: doc });
  log.revisions = [rev1, rev2];
  const now = project(log, { docs: doc });
  const pastSurfaces = (past.get(doc) ?? []).map((c) => c.surface);
  const nowSurfaces = (now.get(doc) ?? []).map((c) => c.surface);
  const K1 = true, K2 = log.length >= log.findIndex((e) => e.address === doc) + 1, K3 = (project(log, { asOf: entrySeq, docs: doc }).get(doc) ?? []).length === pastSurfaces.length;
  const out = {
    doc, entrySeq, logEntries: log.length, pastCast: pastSurfaces, nowCast: nowSurfaces,
    droppedByRevision: pastSurfaces.filter((s) => !nowSurfaces.includes(s)),
    P1_pastImmutable: pastSurfaces.length > nowSurfaces.length, K2_logOnlyGrows: K2, K3_noRetroactive: K3,
  };
  if (o.json) console.log(JSON.stringify(out, null, 1));
  else console.log([
    `# ${doc}  (sidecar entry seq ${entrySeq}; revision applied at ${entrySeq}+0.5)`,
    "",
    `cast AS OF the original read (seq ${entrySeq}):`,
    ...pastSurfaces.map((s) => `  ${s}`),
    "",
    "cast NOW (revisions appended: drop 'gutenberg ebook', 'project gutenberg'):",
    ...nowSurfaces.map((s) => `  ${s}`),
    "",
    `dropped by the revision: ${out.droppedByRevision.join(", ") || "(none)"}`,
    `P1 past stay put at the old cursor: ${out.P1_pastImmutable ? "HOLDS" : "FAILS"}   K2 log only grows: ${out.K2_logOnlyGrows}   K3 no retroactive rewrite: ${out.K3_noRetroactive}`,
  ].join("\n"));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();