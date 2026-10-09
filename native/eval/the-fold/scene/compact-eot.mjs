// compact-eot.mjs — THE LEAN EOT SHAPE. The record stores the BIND — edges,
// referents, voice — not the raw surfaces (regenerable from source + span at
// its address). Each edge is SELF-CONTAINED: it carries its own story order
// (a), its own DMD delta (d = that clause's surprise), and index-referenced
// ends. This removes the fragile sceneSignal-indexed-by-array-position cross-
// mapping that accuracy.mjs used to guess through.
//   hashes r_h→ integer index into referents[]
//   long keys → single letters (v=act, s=subjectIdx, o=objectIdx, p=span,
//   a=story order, d=the clause's bayes delta, 4-dec fixed)
import fs from "node:fs";

const FULL = "/Users/mlacy/Documents/3.0/khora/native/eval/the-fold/scene/eot-odyssey-521664.json";
const OUT = "/Users/mlacy/Documents/3.0/khora/native/eval/the-fold/scene/eot-odyssey-521664.min.json";

export function compactEot(eot, { meaningful = true } = {}) {
  const idxByHash = new Map(eot.referents.map((r, i) => [r.hash, i]));
  const ref = (h) => (h == null ? null : idxByHash.get(h) ?? null);
  const referents = eot.referents.map((r) => ({ h: r.hash, n: r.name }));
  const name = new Map(eot.referents.map(r => [r.hash, r.name]));
  // sceneSignal is per-clause-array-position; edges were built in clause order,
  // so sceneSignal[i] is edge i's own delta → fold it IN, no cross-index.
  const scene = eot.sceneSignal ?? [];
  const fin = scene.filter(Number.isFinite).sort((a, b) => a - b);
  const blink = fin[Math.floor(fin.length * 0.9)] ?? 0;
  const nullish = new Set(["…", "", "null", "undefined", "?"]);
  const named = (h) => { const n = name.get(h); return n && !n.startsWith("?") && !nullish.has(n); };
  const particles = new Set(["μὲν", "ἀλλ", "ἦ", "εἰ", "κεν", "εἰς", "ἢ", "ἡ", "μέν", "μάλ", "ἄλλ", "ὡς", "δ", "γάρ", "καὶ", "οὐ", "τε", "δᾶ", "γ", "δη", "περ", "τά", "τ"]);
  const actReal = (a) => { const s = String(a ?? "").trim(); return s.length > 1 && !particles.has(s); };
  const isMeaningful = (e, i) => {
    const subj = e.subject && named(e.subject), obj = e.object && named(e.object);
    return (subj && actReal(e.action)) || obj || (Number.isFinite(scene[i]) && scene[i] >= blink);
  };
  const sourceEdges = meaningful ? eot.edges.map((e, i) => ({ e, i })).filter(({ e, i }) => isMeaningful(e, i)) : eot.edges.map((e, i) => ({ e, i }));
  const edges = sourceEdges.map(({ e, i }) => ({
      a: e.at,                                   // story order
      v: e.action,                               // verb/act surface
      s: ref(e.subject),                         // subject referent index
      o: ref(e.object),                          // object referent index
      p: e.span,                                 // char span [a, b]
      d: Number.isFinite(scene[i]) ? +scene[i].toFixed(4) : null,   // the clause's own DMD delta
    }));
  const voice = (eot.voice ?? []).map((j) => ({
    k: j.kind, a: j.at, w: j.who ?? null, f: j.from ?? null, s: j.surface ?? null,
  }));
  return {
    schema: eot.schema, medium: eot.medium, language: eot.language,
    source: eot.source, tools: eot.tools, counts: { ...eot.counts, scenesRecorded: edges.length },
    referents, edges, voice,
    extras: {
      chapters: eot.chapters, telling: eot.telling, lint: eot.lint,
      channels: eot.channels, channelReport: eot.channelReport, spiral: eot.spiral,
      visits: eot.visits, stillBeing: eot.stillBeing,
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const eot = JSON.parse(fs.readFileSync(FULL, "utf8"));
  const out = JSON.stringify(compactEot(eot));
  fs.writeFileSync(OUT, out);
  const bytes = Buffer.byteLength(out);
  const before = fs.statSync(FULL).size;
  console.log("on-disk full:", before + " B");
  console.log("lean        :", bytes + " B  = " + (bytes / before * 100).toFixed(1) + "%");
  console.log("whole-record  bytes of bind per edge:", (bytes / eot.edges.length).toFixed(1));
}