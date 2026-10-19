// the-fold/document-read.mjs — THE DOOR'S DOCUMENT READ, on the REAL PIPELINE.
//
// The door (opencode-doorway.mjs, POST /v1/documents) used to answer with a
// word-overlap grep over the text's own sentences — a lexical snip, not a
// reading. It now reads through the ONE reader, native/the-fold/read-process.mjs
// ::readToWeft (whole document, in order, primed from native/priors), and grounds
// the turn in what the reader found: the CAST (the beings it admitted) and the
// ADDRESSED edges (end1 · label · end2, each carrying refs/spans). The lexical
// pass only SELECTS which sources to read (cheap); the reading is the reader's.
// Model-free; the mouth is never consulted.
import {readToWeft} from "./read-process.mjs";

const wordsOf = (s) => new Set(String(s ?? "").toLowerCase().split(/[^a-z0-9']+/).filter((w) => w.length > 3));
const EOT = "EOTObservation@1";

/** Read a task's documents. `rows` and `projection` keep the door job's shape. */
export function documentRead(task, documents, {maxSources = 6, maxEdges = 8} = {}) {
  const docs = Array.isArray(documents) ? documents.filter((d) => d && typeof d.text === "string" && d.text.trim()) : [];
  const want = wordsOf(task);
  const q = String(task ?? "").trim() || "what does this workspace say?";
  const now = Date.now();
  const id = (n) => `$read-${now.toString(36)}-${n.toString(36)}`;
  const rows = [{schema: EOT, id: id(0), role: "plan", title: "the void plan", text: `- ${q}`, giver: "eoreader7:plan", supersedes: []}];
  if (!docs.length) {
    rows.push({schema: EOT, id: id(1), role: "part", title: "No ground", text: "No ground: no source was handed.", giver: "eoreader7:ground", supersedes: []});
    return {rows, projection: "DISCLOSED UNGROUNDED\n\nNo source was handed, so nothing here states anything about the task.", reader: "read-process.mjs::readToWeft", primed: false, cast: [], edges: []};
  }
  // SELECT (cheap, lexical): the sources sharing the most words with the task, whole.
  const scored = docs.map((d) => ({name: String(d.name ?? "source"), text: d.text, hit: [...wordsOf(d.text)].filter((w) => want.has(w)).length}))
    .sort((a, b) => b.hit - a.hit).slice(0, maxSources);
  // READ (the reader's own): each selected source through readToWeft.
  const reads = [];
  for (const d of scored) {
    try {
      const w = readToWeft(d.text, {address: d.name});
      reads.push({name: d.name, primed: w.vocabulary?.grammarPrior === true, cast: (w.cast ?? []).map((c) => c.surface), edges: (w.edges ?? []).map((e) => ({end1: e.end1Face ?? e.end1 ?? null, label: e.label ?? null, end2: e.end2Face ?? e.end2 ?? null, refs: e.refs ?? null}))});
    } catch (e) { reads.push({name: d.name, primed: false, cast: [], edges: [], error: String(e?.message ?? e)}); }
  }
  const allCast = [...new Set(reads.flatMap((r) => r.cast))];
  const allEdges = reads.flatMap((r) => r.edges.map((e) => ({...e, name: r.name})));
  const edgeHit = (e) => [...wordsOf(`${e.end1} ${e.label} ${e.end2}`)].filter((w) => want.has(w)).length;
  const keep = allEdges.map((e) => ({...e, hit: edgeHit(e)})).sort((a, b) => b.hit - a.hit || String(a.name).localeCompare(String(b.name))).slice(0, maxEdges);
  let n = 1;
  for (const e of keep) rows.push({schema: EOT, id: id(n++), role: "part", title: q, text: `${e.end1} [${e.label}] ${e.end2}`, giver: `eoreader7:read ${e.name}`, supersedes: [], address: e.refs ?? null});
  if (!keep.length) rows.push({schema: EOT, id: id(n++), role: "part", title: "No ground", text: "The reader admitted no addressed relation for this task.", giver: "eoreader7:ground", supersedes: []});
  const primed = reads.some((r) => r.primed);
  const projection = [
    allCast.length ? `CAST (the reader's beings): ${allCast.slice(0, 12).join(" · ")}` : null,
    keep.length ? keep.map((e) => `${e.end1} [${e.label}] ${e.end2}\n— ${e.name}${e.refs ? " " + (Array.isArray(e.refs) ? e.refs[0] : e.refs) : ""}`).join("\n\n")
      : "The reader admitted no addressed relation for this task — disclosed, never guessed.",
    `— read by read-process.mjs::readToWeft${primed ? " (primed)" : ""}`,
  ].filter(Boolean).join("\n\n");
  return {rows, projection, reader: "read-process.mjs::readToWeft", primed, cast: allCast, edges: keep.map(({name, end1, label, end2, refs}) => ({source: name, end1, label, end2, refs}))};
}
