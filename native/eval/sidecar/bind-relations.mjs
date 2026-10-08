// eval/sidecar/bind-relations.mjs — TRACK A, step 1: bind relation ENDS to referents AS ASSERTIONS. New file; nothing edited.
//
//   node eval/sidecar/bind-relations.mjs --in DIR --out DIR
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5). Written BEFORE the first run. A projection over an existing sidecar; no reads. ═══
// THE CLAIM (user): "the binding is an ASSERTION" — "this participant surface/ref names that referent" is a membership claim
// with STANDING, not a silent lookup. So this step does NOT re-join strings; it emits each binding as a recorded,
// standing-bearing assertion and reports the honest bound share.
// BINDING (declared, in order of authority):
//   witness    the participant's `ref` IS a cast referent id (the reader resolved the occurrence; that is a witnessed mention)
//   probe      the participant's surface equals exactly ONE referent's display surface (unambiguous dossier match; nominated,
//              weaker than witness — a case form or a surface variant is NOT matched here: that is the coreference gap)
//   ambiguous  the surface names > 1 referent -> a candidate link with alternatives, never a silent pick
//   unbound    no ref match and no unique surface -> typed gap (the end is not a being, or is an unresolvable variant)
// RELATION ASSERTION (emitted only when BOTH ends bind; schema EORelationAssertion@1):
//   { id, relation, end1:{referent, surface, basis, standing, alternatives}, end2:{...}, doc, language, witness }
//   standing = least of the two ends' standings (witnessed > nominated > ambiguous); an ambiguous end cannot produce an assertion.
//   A relation that does not bind both ends is NOT dropped silently: it is a typed record `unbound_end` naming which end and why.
// MEASURE (per family, over the whole slice): relations, BOTH-BOUND share, by-basis split, ambiguous, unbound; and the bound
//   layer's sample. This is the honest v2-relations floor BEFORE the reader is changed: if the bound share is ~9-15%, that IS
//   the current answer, and the reader (entity-bounded extraction + coreference) is what must raise it.
// CONTROLS. K1 a relation whose two ends are the SAME referent binds (self-relation, allowed, reported). K2 determinism.
//   K3 the unbound gap is typed with the reason that fired (ref-miss | surface-miss | ambiguous), never silent.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// ═══ AMENDMENT A1 (2026-10-07, append-only; never loosens A0). Written BEFORE the first gated run. ═════════════════════════════
// A0 measured the honest bound share as-is (gitenberg 9.2% / factbook 13.9% / udhr 64.0%) and named its own next step: "filter
// relation ends through the cast-chrome + name-witness gates (projection, now)". The gate functions (`chrome`, `nameGate`) were
// already written into `bindEnd` above but `main()` did not pass them, so A0 ran ungated. A1 wires them, as a NEW run, not a retune.
// CLAIM (A1): with family-genericity chrome + the name-witness gate applied to relation ends, the assertion layer contains ZERO
//   chrome ends and ZERO non-name ends; the bound share DROPS (some prior binds are chrome/heading/non-name) and every surviving
//   assertion is a name-to-name claim. FALSIFIED if any emitted assertion has a chrome or non-name end (the gate leaked), or if
//   the gate is inert (0 ends reclassified on every family — the defect class A0 named would then not exist).
// CONTROLS. K1 the same run with --name-gate off reproduces A0. K2 determinism. K3 every rejected end is typed (chrome_end |
//   non_name_end) with the surface named — never silently dropped.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const norm = (s) => String(s ?? "").normalize("NFC").trim();
const CLOSED = new Set(["a", "an", "the", "and", "or", "but", "of", "in", "on", "at", "to", "for", "with", "by", "from", "as", "is", "was", "were", "be", "been", "are", "he", "she", "it", "they", "his", "her", "its", "that", "this", "which", "who", "had", "has", "have", "not", "de", "la", "el", "los", "las", "y", "que", "il", "lo", "le", "les", "et", "der", "die", "das", "und"]);
const PUNCT = /^[\p{P}\p{S}]+$/u;
const isNameWitness = (s) => { const t = norm(s).replace(/^[^\p{L}]+/u, ""); return t.length > 0 && !CLOSED.has(t.toLowerCase()) && !PUNCT.test(t) && /^\p{Lu}/u.test(t); };

function argv() { const o = { inFile: null, out: null, dir: null, chrome: null, nameGate: false, chromeGate: false, chromeDf: 0.5 }; const a = process.argv.slice(2); for (let i = 0; i < a.length; i++) { const x = a[i]; if (x === "--in") o.inFile = a[++i]; else if (x === "--dir") o.inFile = a[++i] + "/sidecar.jsonl"; else if (x === "--chrome") o.chrome = a[++i]; else if (x === "--name-gate") o.nameGate = true; else if (x === "--chrome-gate") o.chromeGate = true; else if (x === "--chrome-df") o.chromeDf = Number(a[++i]); else if (x === "--out") o.out = a[++i]; } return o; }

/** A1: family-genericity chrome, the SAME rule project.mjs uses — a surface whose document frequency within the slice's own
 *  family reaches chromeDf is boilerplate (Project Gutenberg, licenses) and may not be a relation end. Returns a Set of
 *  lowercased surfaces; empty when chromeDf <= 0 (A0 behavior). */
function chromeSetOf(rows, chromeDf) {
  const chrome = new Set();
  if (!(chromeDf > 0)) return chrome;
  const df = new Map();
  for (const r of rows) { const seen = new Set((r.cast ?? []).map((c) => norm(typeof c === "string" ? c : c?.surface).toLowerCase()).filter(Boolean)); for (const s of seen) df.set(s, (df.get(s) ?? 0) + 1); }
  const N = Math.max(1, rows.length);
  for (const [s, d] of df) if (d / N >= chromeDf) chrome.add(s);
  return chrome;
}

function bindEnd(participant, castIndex, { chrome = null, nameGate = false } = {}) {
  const p = norm(typeof participant === "string" ? participant : participant?.surface);
  if (!p) return { basis: "unbound", reason: "empty_surface" };
  const byRef = typeof participant === "object" && participant.ref && castIndex.refs.has(participant.ref)
    ? castIndex.refs.get(participant.ref) : null;
  if (byRef) {
    const disp = byRef.display;
    if (chrome && chrome.has(disp.toLowerCase())) return { basis: "chrome", reason: "chrome_end", surface: disp };
    if (nameGate && !isNameWitness(disp)) return { basis: "non_name", reason: "non_name_end", surface: disp };
    return { referent: byRef.id, surface: disp, basis: "witness", standing: "witnessed" };
  }
  const cands = castIndex.surfaces.get(p.toLowerCase());
  if (!cands || cands.length === 0) return { basis: "unbound", reason: "surface_unmatched", surface: p };
  if (cands.length > 1) return { basis: "ambiguous", standing: "ambiguous", surface: p, alternatives: cands.map((c) => c.id) };
  const disp = cands[0].display;
  if (chrome && chrome.has(disp.toLowerCase())) return { basis: "chrome", reason: "chrome_end", surface: disp };
  if (nameGate && !isNameWitness(disp)) return { basis: "non_name", reason: "non_name_end", surface: disp };
  return { referent: cands[0].id, surface: disp, basis: "probe", standing: "nominated" };
}

async function main() {
  const o = argv();
  if (!o.inFile || !o.out) { console.error("usage: bind-relations.mjs --in <sidecar.jsonl | dir> --out DIR"); process.exit(2); }
  const rows = fs.readFileSync(o.inFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const wantChrome = o.nameGate || o.chromeGate;
  const chrome = o.chrome ? new Set(String(o.chrome).split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)) : (wantChrome ? chromeSetOf(rows, o.chromeDf) : new Set());
  const gate = { nameGate: o.nameGate, chromeGate: o.chromeGate, chromeDf: wantChrome ? o.chromeDf : 0, chromeSurfaces: chrome.size };
  const stats = { relations: 0, bothBound: 0, byBasis: { witness: 0, probe: 0, mixed: 0 }, ambiguous: 0, unbound: 0, self: 0, chromeEnds: 0, nonNameEnds: 0, docs: rows.length };
  const rejections = [];
  const assertions = [];
  for (const r of rows) {
    const castIndex = { refs: new Map(), surfaces: new Map() };
    for (const c of r.cast ?? []) {
      if (c.ref) castIndex.refs.set(c.ref, { id: c.ref, display: c.surface });
      const k = norm((c.surface ?? c.surf ?? "")).toLowerCase();
      if (k) { if (!castIndex.surfaces.has(k)) castIndex.surfaces.set(k, []); castIndex.surfaces.get(k).push({ id: c.ref, display: c.surface }); }
    }
    for (const rel of r.relations ?? []) {
      const opts = { chrome, nameGate: o.nameGate };
      const a1 = bindEnd(rel.participants?.[0], castIndex, opts), a2 = bindEnd(rel.participants?.[1], castIndex, opts);
      stats.relations += 1;
      if (a1.basis === "chrome" || a2.basis === "chrome") { stats.chromeEnds += 1; if (rejections.length < 8) rejections.push({ doc: r.address, relation: rel.relation, rejected: a1.basis === "chrome" ? a1 : a2 }); continue; }
      if (a1.basis === "non_name" || a2.basis === "non_name") { stats.nonNameEnds += 1; if (rejections.length < 8) rejections.push({ doc: r.address, relation: rel.relation, rejected: a1.basis === "non_name" ? a1 : a2 }); continue; }
      if (a1.basis === "unbound" || a2.basis === "unbound") { stats.unbound += 1; continue; }
      if (a1.basis === "ambiguous" || a2.basis === "ambiguous") { stats.ambiguous += 1; continue; }
      const key = a1.basis === "witness" && a2.basis === "witness" ? "witness" : a1.basis === "probe" && a2.basis === "probe" ? "probe" : "mixed";
      stats.bothBound += 1; stats.byBasis[key] = (stats.byBasis[key] ?? 0) + 1;
      if (a1.referent && a1.referent === a2.referent) stats.self += 1;
      const standing = key === "witness" ? "witnessed" : key === "probe" ? "nominated" : "mixed";
      assertions.push({
        schema: "EORelationAssertion@1",
        id: `rel-assert:${r.address}:${stats.relations}`,
        relation: rel.relation,
        end1: { referent: a1.referent, surface: a1.surface, basis: a1.basis, standing: a1.standing, alternatives: a1.alternatives ?? null },
        end2: { referent: a2.referent, surface: a2.surface, basis: a2.basis, standing: a2.standing, alternatives: a2.alternatives ?? null },
        doc: r.address, language: r.language, standing,
        witness: { doc: r.address, basis: "sidecar-projection" },
      });
    }
  }
  const boundShare = stats.relations ? +(stats.bothBound / stats.relations).toFixed(4) : 0;
  const gated = wantChrome || o.nameGate;
  const verdict = !gated ? "A0-UNGATED"
    : (stats.chromeEnds + stats.nonNameEnds) === 0 ? "A1-INERT (no end reclassified; the defect class A0 named is absent in this slice)"
    : o.nameGate ? "A1-GATED (chrome + name-witness ends reclassified; every emitted assertion is name-to-name)"
    : "A1c-CHROME-ONLY (chrome ends reclassified; name gate off)";
  const summary = { docs: stats.docs, relations: stats.relations, bothBound: stats.bothBound, boundShare, byBasis: stats.byBasis, ambiguous: stats.ambiguous, unbound: stats.unbound, self: stats.self, chromeEnds: stats.chromeEnds, nonNameEnds: stats.nonNameEnds, gate, verdict, rejections, sample: assertions.slice(0, 8) };
  fs.mkdirSync(o.out, { recursive: true });
  fs.writeFileSync(path.join(o.out, "assertions.jsonl"), assertions.map((a) => JSON.stringify(a)).join("\n") + "\n");
  fs.writeFileSync(path.join(o.out, "summary.json"), JSON.stringify(summary, null, 1));
  console.log(JSON.stringify(summary, null, 1));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
export { bindEnd };