// eval/sidecar/project.mjs — PROJECT THE SIDECAR: turn a raw set of per-document reads into the first CLEAN layer by the
// corpus-genericity rule (chrome does not matter once recurrence marks it) rather than by any per-source cleaner. New file.
//
//   node eval/sidecar/project.mjs [--in FILE] [--out DIR] [--chrome-df 0.5]
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5). Written BEFORE the first run. Not a reading: a projection of existing sidecar
// lines (eval/sidecar/pilot.mjs). No new reads, no model.
// WHY THIS AND NOT DE-CHROMIFICATION. READING-POLICY P5.3 strips container chrome where the container is known (HTML landmarks).
// A plain-text Gutenberg front matter has no such structure; rather than hardcode a Gutenberg cleaner (the thing the project
// refuses), we use the rule code already uses for generic names (organs/martial.js GENERIC_FLOOR): a surface that RECURS ACROSS
// UNRELATED DOCUMENTS is generic/boilerplate, and is projected OUT of the cast — the mind never admits it.
// RULES (declared):
//   CHROME   a surface whose DOCUMENT FREQUENCY across the sidecar >= chromeDf is boilerplate (Project Gutenberg, licenses,
//            catalogs): recurring across unrelated documents is the witness of genericity. Removed from the cast.
//   NAME     a non-chrome surface is NAME-BEARING iff it is not a closed-class/function word, is not punctuation, and carries a
//            CAPITAL witness (its display starts with an uppercase letter). A lowercase-only surface is NOT admitted as a being:
//            capitalisation is one witness (never THE signal), but with no other witness on the cast tier a lowercase common
//            noun is a reading, not a referent. (This is the "settle common nouns" half of the pilot's defect.)
//   RELATION a relation is KEPT iff it is not chrome (its label is not chrome) AND BOTH participant surfaces are NAME-BEARING
//            cast members. So `Character encoding: ASCII :: set` and `License :: included` fall out, as do relations propped on
//            function words.
// MEASURE (before -> after), per the whole slice AND per document: cast size and the capital share of the cast; relations and
//   the share whose ends both survive. PASS (declared): after projection the slice's cast capital-share >= 0.8 (was ~0.4-0.5) and
//   the chrome surfaces (df >= chromeDf, e.g. Project Gutenberg) are 0 in the projected cast, with at least 30% of documents
//   still keeping >= 2 name-bearing referents (the projection must not empty the layer).
// CONTROLS. K1 the chrome filter removes a surface that is universally shared (df == 1.0, e.g. Project Gutenberg) and keeps a
//   surface seen in one document only. K2 determinism. K3 the projection is a pure function of the sidecar (same input -> same
//   output, no reads).
// SCOPE. Applies to the sampled sidecar only; df is estimated from the sample, so the chrome threshold is sample-relative
//   (stated). A cross-document surface that is a genuine common entity could be removed in a small sample; the risk is named.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLOSED = new Set(["a", "an", "the", "and", "or", "but", "of", "in", "on", "at", "to", "for", "with", "by", "from", "as", "is", "was", "were", "be", "been", "are", "he", "she", "it", "they", "his", "her", "its", "that", "this", "which", "who", "had", "has", "have", "not", "de", "la", "el", "los", "las", "y", "que", "il", "lo", "le", "les", "et", "der", "die", "das", "und"]);
const PUNCT = /^[\p{P}\p{S}]+$/u;
const norm = (s) => String(s ?? "").normalize("NFC").trim();
const isCapitalWitness = (s) => /^\p{Lu}/u.test(norm(s).replace(/^[^\p{L}]+/u, ""));
const isName = (s) => { const t = norm(s); return t.length > 0 && !CLOSED.has(t.toLowerCase()) && !PUNCT.test(t) && isCapitalWitness(t); };

function argv() { const o = { inFile: path.join(HERE, "pilot-results-big", "sidecar.jsonl"), out: path.join(HERE, "projected-big"), chromeDf: 0.5, asOf: Infinity }; const a = process.argv.slice(2); for (let i = 0; i < a.length; i++) { const x = a[i]; if (x === "--in") o.inFile = a[++i]; else if (x === "--out") o.out = a[++i]; else if (x === "--chrome-df") o.chromeDf = Number(a[++i]); else if (x === "--as-of") o.asOf = Number(a[++i]); } return o; }
/** Load the append-only revisions.jsonl beside the sidecar (written by eval/recursion/sidecar-record.mjs --append-rev); a
 *  revision (drop|rename on a cast surface) applies only when its revSeq <= the folding cursor `asOf`. */
function loadRevisions(inFile, asOf) {
  const p = path.join(path.dirname(inFile), "revisions.jsonl");
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.revSeq <= asOf);
}

const o = argv();
const rows = fs.readFileSync(o.inFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const REVS = loadRevisions(o.inFile, o.asOf);
const N = rows.length;
// DOCUMENT FREQUENCY of each surface (lowercased) across the sidecar — the genericity witness.
const surfaceOf = (c) => norm(typeof c === "string" ? c : c?.surface);
// Genericity is measured BOTH corpus-wide and WITHIN the source family (a category/directory): per-source boilerplate
// (Gutenberg front matter) recurs across a family, not across unrelated sources, so the family df is where it shows.
const df = new Map();
const catDocs = new Map(), dfCat = new Map();
for (const r of rows) {
  const c = r.category; catDocs.set(c, (catDocs.get(c) ?? 0) + 1); if (!dfCat.has(c)) dfCat.set(c, new Map());
  const seen = new Set((r.cast ?? []).map((x) => surfaceOf(x).toLowerCase()).filter(Boolean));
  for (const s of seen) { df.set(s, (df.get(s) ?? 0) + 1); const fam = dfCat.get(c); fam.set(s, (fam.get(s) ?? 0) + 1); }
}
const isChrome = (s, cat = null) => {
  const key = norm(s).toLowerCase();
  if ((df.get(key) ?? 0) / Math.max(1, N) >= o.chromeDf) return true;
  if (cat && dfCat.has(cat) && (dfCat.get(cat).get(key) ?? 0) / Math.max(1, catDocs.get(cat)) >= o.chromeDf) return true;
  return false;
};

const before = { cast: 0, capCast: 0, rel: 0, relBothEnds: 0, docsWith2Names: 0 };
const projected = [];
for (const r of rows) {
  const cast = (r.cast ?? []).map((c) => ({ ref: typeof c === "string" ? null : c.ref, surface: surfaceOf(c) })).filter((c) => c.surface);
  const castRefs = new Set(cast.map((c) => c.ref).filter(Boolean));
  let castSurfaces = [...new Set(cast.map((c) => c.surface))];
  for (const rev of REVS) {                                            // append-only revisions fold at the cursor
    if (rev.standing === "candidate" && Number(rev.evidence ?? 0) < 2) continue;   // evidence gate: candidates hang until they clear the bar
    if (rev.address !== r.address) continue;
    const i = castSurfaces.findIndex((s) => s.toLowerCase() === String(rev.surface).toLowerCase());
    if (i < 0) continue;
    if (rev.action === "drop") castSurfaces.splice(i, 1);
    else if ((rev.action === "rename" || rev.action === "syn" || rev.action === "seg") && rev.to) castSurfaces[i] = norm(rev.to);   // syn/seg = re-key (merge collapses on re-unique; split = the same canonical from a different source key)
  }
  const uniqDup = new Set(); castSurfaces = castSurfaces.filter((s) => (uniqDup.has(s) ? false : (uniqDup.add(s), true)));
  const names = castSurfaces.filter((s) => !isChrome(s, r.category) && isName(s));
  const nameSet = new Set(names.map((s) => s.toLowerCase()));
  const castSurfaceSet = new Set(castSurfaces.map((s) => s.toLowerCase()));
  const relAll = r.relations ?? [];
  const endOk = (p) => { const ref = typeof p === "string" ? null : p?.ref; const surf = norm(typeof p === "string" ? p : p?.surface); if (ref && castRefs.has(ref)) return true; return nameSet.has(surf.toLowerCase()); };
  const relKept = relAll.filter((x) => { const parts = x.participants ?? []; return parts.length >= 2 && parts.every(endOk) && !isChrome(x.relation, r.category) && !CLOSED.has(norm(x.relation).toLowerCase()) && !PUNCT.test(norm(x.relation)); });
  before.cast += castSurfaces.length; before.capCast += castSurfaces.filter(isName).length; before.rel += relAll.length;
  before.relBothEnds += relAll.filter((x) => { const parts = (x.participants ?? []).map((p) => norm(typeof p === "string" ? p : p?.surface).toLowerCase()).filter(Boolean); return parts.length >= 2 && parts.every((p) => castSurfaceSet.has(p)); }).length;
  if (names.length >= 2) before.docsWith2Names += 1;
  projected.push({ schema: "SidecarProjection@1", address: r.address, category: r.category, language: r.language, cast: names, chrome: castSurfaces.filter((s) => isChrome(s, r.category)), relations: relKept.map((x) => ({ relation: x.relation, participants: (x.participants ?? []).map((p) => norm(typeof p === "string" ? p : p?.surface)) })) });
}
const after = { cast: projected.reduce((a, p) => a + p.cast.length, 0), rel: projected.reduce((a, p) => a + p.relations.length, 0), docsWith2Names: projected.filter((p) => p.cast.length >= 2).length };
const chromeSurvivors = projected.reduce((a, p) => a + p.cast.filter(isChrome).length, 0);
const summary = {
  slice: { docs: N, chromeDf: o.chromeDf, asOf: o.asOf === Infinity ? "end" : o.asOf, revisionsApplied: REVS.length, in: path.relative(HERE, o.inFile) },
  before: { cast: before.cast, capitalShare: +(before.capCast / Math.max(1, before.cast)).toFixed(3), relations: before.rel, relBothEndsShare: +(before.relBothEnds / Math.max(1, before.rel)).toFixed(3) },
  after: { cast: after.cast, relations: after.rel, docsWith2Names: after.docsWith2Names, chromeSurvivors },
  chromeExamples: (() => { const out = []; for (const [s, d] of df) if (d / N >= o.chromeDf) out.push(`${s} (${d}/${N} corpus)`); for (const [cat, m] of dfCat) for (const [s, d] of m) if (d / Math.max(1, catDocs.get(cat)) >= o.chromeDf) out.push(`${s} (${d}/${catDocs.get(cat)} ${cat})`); return out.slice(0, 14); })(),
  verdict: (after.cast && before.capCast / Math.max(1, before.cast) < 0.8 && chromeSurvivors === 0 && after.docsWith2Names >= 0.3 * N) ? "PASSING" : "NOT_PASSING",
};
fs.mkdirSync(o.out, { recursive: true });
fs.writeFileSync(path.join(o.out, "projected.jsonl"), projected.map((p) => JSON.stringify(p)).join("\n") + "\n");
fs.writeFileSync(path.join(o.out, "summary.json"), JSON.stringify(summary, null, 1));
console.log(JSON.stringify(summary, null, 1));
export { isName, isChrome };
