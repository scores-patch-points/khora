// the-fold/pharos-gate.mjs — KHORA WORKS ONLY IF IT FLOWS THROUGH PHAROS (2026-11-18).
// The rules every repo works under are held ONCE, in pharos (pharos/rules/rules.json, checked by pharos/lib/gate.mjs). khora carries only a pointer: its holon.json (its one door, what the door needs, the hash of the rules it
// acknowledged). `assertPharos()` runs that gate at the door and REFUSES when it fails: no pharos found, a missing need, a stale acknowledgement. A refusal also leaves a chatter line in pharos (SAY-WHEN-REFUSED).
//   Where pharos is: PHAROS_HOME (authoritative when set), else a `pharos` checkout beside this repo, else <repo>/pharos, else ~/Documents/pharos.
//   Off (for a test or a one-off run that knows what it is doing): KHORA_NO_PHAROS_GATE=1. A page has no pharos and no gate: it is not a door.
import { IS_NODE } from "./prior-source.mjs";
import { loadNamePrior } from "../adapters/text/name-prior.js";
import { genderPriorChainFor } from "../adapters/text/gender-chain.js";
import { nestFromRead, containmentFromKarakas } from "../adapters/text/nest-from-read.js";

const N = IS_NODE ? { crypto: (await import("node:crypto")).default, fs: (await import("node:fs")).default, os: (await import("node:os")).default, path: (await import("node:path")).default, url: await import("node:url") } : null;
const ROOT = IS_NODE ? N.path.resolve(N.path.dirname(N.url.fileURLToPath(import.meta.url)), "..", "..") : null;

function candidates() {
  if (process.env.PHAROS_HOME) return [N.path.resolve(process.env.PHAROS_HOME)];
  return [N.path.join(ROOT, "..", "pharos"), N.path.join(ROOT, "pharos"), N.path.join(N.os.homedir(), "Documents", "pharos")].map((p) => N.path.resolve(p));
}
const tried = IS_NODE ? candidates() : [];
let GATE = null, loadError = null;
if (IS_NODE) {
  for (const p of tried) {
    const f = N.path.join(p, "lib", "gate.mjs");
    if (!N.fs.existsSync(f)) continue;
    try { GATE = await import(N.url.pathToFileURL(f).href); break; } catch (e) { loadError = `${f} did not load: ${String(e?.message ?? e).slice(0, 160)}`; }
  }
}
// the pharos lib itself, for weaving the FULL READ (the parse, not just the summary) — khora writes its own entries.
let P = null;
if (IS_NODE) {
  for (const p of tried) {
    const f = N.path.join(p, "lib", "pharos.mjs");
    if (!N.fs.existsSync(f)) continue;
    try { P = await import(N.url.pathToFileURL(f).href); break; } catch { /* the gate's loadError already names the path */ }
  }
}

// where the log and the chatter go: PHAROS / PHAROS_CHATTER when set; under `node --test` a temp directory (tests never write to the real ~/.pharos); otherwise pharos' own default.
const dirs = () => { const test = !!process.env.NODE_TEST_CONTEXT; return { pharosDir: process.env.PHAROS ? undefined : test ? N.path.join(N.os.tmpdir(), "khora-test-pharos") : undefined, chatterDir: process.env.PHAROS_CHATTER ? undefined : test ? N.path.join(N.os.tmpdir(), "khora-test-chatter") : undefined }; };
let verdict = null;
export function assertPharos({ fresh = false } = {}) {
  if (!IS_NODE || process.env.KHORA_NO_PHAROS_GATE === "1") return { ok: true, skipped: true };
  if (verdict && !fresh) { if (!verdict.ok) throw verdict.error; return verdict; }
  if (!GATE) {
    const err = new Error(`khora refused: pharos was not found, and khora works only through pharos (it holds the rules). Looked for lib/gate.mjs in: ${tried.join(" | ")}${loadError ? `. ${loadError}` : ""}. Clone it beside khora: gh repo clone scores-patch-points/pharos ${N.path.join(ROOT, "..", "pharos")}  (or set PHAROS_HOME). Needs pharos with the gate (lib/gate.mjs).`);
    verdict = { ok: false, error: err }; throw err;
  }
  const r = GATE.gate(ROOT, { writer: "khora", ...dirs() });
  if (!r.ok) {
    const err = new Error(`khora refused by pharos' gate (${r.failures.map((f) => f.rule).join(", ")}):\n${r.failures.map((f) => `  - ${f.rule}: ${f.why}`).join("\n")}\nThe rules are held in pharos (${tried.find((p) => N.fs.existsSync(N.path.join(p, "lib", "gate.mjs"))) ?? "?"}/rules/rules.json). A refusal leaves a chatter line: pharos chatter --tail 5.`);
    verdict = { ok: false, error: err }; throw err;
  }
  verdict = r; return r;
}

// THE CAPACITIES of a read: each is something the canonical read HAS for the language (available) and something this read did or did not use (used). A read that left an available capacity out is refused by pharos (rule FULL-CAPACITY).
// Available is what the language's competency profile says exists (entry.competency.pieces / .pronouns, the priors on disk) plus the English name ruling; used is read off the entry (grammarPrior, the gaps it filed, pronounsPresence, presenceInputs).
export function capacitiesOf(w) {
  const c = w?.competency; if (!c || w.skipped) return { available: [], used: [] };
  const gaps = new Set((w.gaps ?? []).map((g) => g?.gap ?? g)); const eng = c.stem === "eng";
  const caps = [
    ["pos", !!c.pieces?.pos, w.vocabulary?.grammarPrior === true],
    ["morphology", !!c.pieces?.morphology, !gaps.has("no_morphology")],
    ["punctuation", !!c.pieces?.punctuation, !gaps.has("no_punctuation_prior")],
    ["dotted", !!c.pieces?.dotted, !gaps.has("no_dotted_prior")],
    ["clause-reader", eng || String(c.clauseReader ?? "").startsWith("case-marked"), w.clauses != null],   // only where a clause reader exists for the language (English parser; the case-marked seam): the positional reader is unvalidated elsewhere, so it is not claimed as a capacity there
    ["pronoun-binding", c.pronouns?.status === "bound", Array.isArray(w.pronounsPresence)],
    ["name-ruling", eng && !!loadNamePrior(), w.presenceInputs?.nameRuling === true],
    ["non-personal-ruling", eng, !gaps.has("pronoun_presence_no_nonpersonal_ruling")],
  ];
  return { available: caps.filter((x) => x[1]).map((x) => x[0]), used: caps.filter((x) => x[1] && x[2]).map((x) => x[0]) };
}

// WRITES-TO-PHAROS + FULL-CAPACITY at the moment of acting: write ONE entry for this read into pharos (what was read by content hash, never the text; the capacities; the competency tier) and refuse when a capacity was left out.
// A throw here means the caller does not get the read. Under `node --test` the log and chatter go to the temp directory unless PHAROS / PHAROS_CHATTER say otherwise, so tests never write to the real ~/.pharos.
export function recordRead(w, text, { door, allowDegraded = false } = {}) {
  if (!IS_NODE || process.env.KHORA_NO_PHAROS_GATE === "1") return w;
  assertPharos();
  const { pharosDir, chatterDir } = dirs();
  const str = String(text ?? ""); const c = w?.competency;
  GATE.record(ROOT, {
    door, addr: `sha256:${N.crypto.createHash("sha256").update(str).digest("hex")}`, degraded: allowDegraded, pharosDir, chatterDir, writer: "khora",
    capacities: capacitiesOf(w),
    body: { chars: str.length, language: c?.stem ?? w?.language?.stem ?? null, tier: c?.tier ?? null, skipped: w?.skipped ?? null, gaps: [...new Set((w?.gaps ?? []).map((g) => g?.gap ?? g))].slice(0, 20), pronounsBound: Array.isArray(w?.pronounsPresence) ? w.pronounsPresence.length : null },
  });
  weaveFullRead(w, str, { door, pharosDir });
  return w;
}

// THE FULL READ, WOVEN AS ENTRIES (the parse, not the summary). The fold and the surfaces read THIS off the pharos;
// they do not call the reader. Khora writes its own entries: beings (INS·Figure), kāraka edges (SYN·Pattern),
// pronoun bindings (CON·Figure), the gender prior (DEF·Figure), and the speaker/addressee beings — each addressed,
// each the read's own claim, none special to the fold.
export function weaveFullRead(w, text, { door, pharosDir } = {}) {
  if (!IS_NODE || process.env.KHORA_NO_PHAROS_GATE === "1" || !P) return;
  const h = P.open("khora", { dir: pharosDir, writer: "khora" });
  for (const [kind, cell] of [["being", "INS·Figure"], ["karaka", "SYN·Pattern"], ["binding", "CON·Figure"], ["gender", "DEF·Figure"], ["part_of", "SYN·Pattern"]]) {
    if (!P.entries(h).some((e) => e.kind === "kind" && e.addr === `kind:${kind}`)) P.weave(h, { cell: "DEF·Figure", kind: "kind", addr: `kind:${kind}`, body: { name: kind, cell } });
  }
  // beings: each cast referent is one node of the fold
  for (const c of w.cast ?? []) P.weave(h, { cell: "INS·Figure", kind: "being", addr: String(c.ref), body: { surface: c.surface, surfaces: c.allSurfaces ?? [], spans: c.mentionSpans ?? [] } });
  // the speaker/addressee referents (I/you) — beings too, one per document
  const spk = new Map();
  for (const sb of w.speakerBindings ?? []) if (sb && typeof sb === "object" && sb.cl) spk.set(String(sb.cl), sb.kind ?? "speaker");
  for (const [cl, kind] of spk) P.weave(h, { cell: "INS·Figure", kind: "being", addr: cl, body: { surface: kind === "addressee" ? "you" : "I", surfaces: [kind === "addressee" ? "you" : "I"], spans: [], kind } });
  // the gender prior: each being's attested class from the ingested-material chain (the corpus/Wikidata)
  try {
    const giver = genderPriorChainFor(w?.competency?.stem ?? w?.language?.stem ?? "en");
    if (giver) { const prior = giver({ text: String(text ?? ""), cast: w.cast ?? [] }); for (const [ref, cls] of prior ?? []) P.weave(h, { cell: "DEF·Figure", kind: "gender", addr: String(ref), body: { gender: cls } }); }
  } catch { /* a giver that throws on this cast is a gap, never a crash */ }
  // the containment relations (a referent inside another) — the holarchy's part_of edges, from the
  // kāraka roles (subject kartṛ inside the locus adhikaraṇa, both proper nouns), not surface labels
  try {
    for (const { child, parent } of containmentFromKarakas(w)) P.weave(h, { cell: "SYN·Pattern", kind: "part_of", addr: `part_of:${child}:${parent}`, body: { child, parent } });
  } catch { /* containmentFromKarakas throwing on this read is a gap, never a crash */ }
  // kāraka edges: the read's own relations, deduped (head|role|arg). The ARG is a REFERENT, not a
  // string: a token inside a cast mention span is that referent, so "Mina?" and "the book" resolve to
  // their beings — the edge is between referents, the "everything is a referent" rule made literal.
  const refAt = new Map();
  for (const c of w.cast ?? []) for (const [a, b] of c.mentionSpans ?? []) for (let i = a; i < b; i++) if (!refAt.has(i)) refAt.set(i, c.ref);
  const edges = new Map();
  for (const p of w.parse ?? []) { const headOf = (id) => p.rows.find((x) => x.id === id); for (const row of p.rows ?? []) if (row.karaka && row.head) { const hd = headOf(row.head); if (hd?.lemma) { const argRef = refAt.get((p.offset ?? 0) + (row.start ?? 0)) ?? (row.lemma ?? row.form); const k = `${hd.lemma}|${row.karaka}|${argRef}`; if (!edges.has(k)) edges.set(k, { head: hd.lemma, role: row.karaka, arg: argRef }); } } }
  for (const [, e] of edges) P.weave(h, { cell: "SYN·Pattern", kind: "karaka", addr: `edge:${e.head}:${e.role}:${e.arg}`, body: e });
  // pronoun bindings: the identity edges, with their agreement label
  for (const b of [...(w.pronounsPresence ?? []), ...(w.pronounsGuess ?? [])]) P.weave(h, { cell: "CON·Figure", kind: "binding", addr: `bind:${b.at?.[0] ?? ""}`, body: { pronoun: b.pronoun, ref: b.ref, agreement: b.agreement ?? {}, at: b.at ?? null } });
}
