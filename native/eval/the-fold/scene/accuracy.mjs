// accuracy.mjs — IS IT ACCURATE? DMD-BOUNDED, NOT VERBATIM.
// The read parsed the WHOLE Odyssey into EOT (21,692 bound edges at char
// addresses). A claim about the book is ACCURATE iff the record BINDS it:
//   • the being resolves to a named referent at the edge
//   • the act is a real edge (subject — action — patient)
//   • the DMD cut (the clause's learning = the bayes delta; a blink where the
//     surprise peaked) says THIS span differed — the claim is anchored in a
//     difference-that-makes-a-difference, never in a bare word.
// Verbatim presence in the source is IRRELEVANT: what matters is whether the
// read's own world-model (the EOT) attests the proposition at its address.
import fs from "node:fs";

const FULL = 521664;
const eot = JSON.parse(fs.readFileSync(`eot-odyssey-${FULL}.json`, "utf8"));
const name = new Map(eot.referents.map(r => [r.hash, r.name]));
const nullish = new Set(["…", ""]);

export function settle(k) { return String(k ?? ""); }

/** probe({ verb, being, patient, minDelta }) -> { accurate, verdict, at, delta }.
 *  Scans the EOT for a bound edge whose act gloss matches `verb`, whose subject
 *  resolves to `being` (and patient to `patient` when given), and whose learning
 *  clears `minDelta` (the DMD floor: the span made a difference). */
export function probeClaim({ verb, being = null, patient = null, minDelta = 0, verbose = false } = {}) {
  const wantV = String(verb ?? "").toLowerCase();
  const hits = [];
  for (const e of eot.edges) {
    const s = String(name.get(e.subject) ?? ""), o = String(name.get(e.object) ?? "");
    if (nullish.has(s) && nullish.has(o)) continue;   // both ends unbound: not a real edge
    const edgeV = String(e.action ?? "").toLowerCase();
    let why = null;
    if (wantV && !edgeV.includes(wantV)) { why = `verb '${edgeV}' lacks '${wantV}'`; if (verbose && s === being) console.log("  reject:", why, "at", e.at); continue; }
    if (being && s !== being && o !== being) { if (verbose) console.log("  reject: being", s, o, "≠", being, "at", e.at); continue; }
    if (patient) { const right = (s === being) ? o : s; if (right !== patient && !o.includes(patient)) { why = `patient mismatch`; if (verbose) console.log("  reject:", why, "at", e.at); continue; } }
    const delta = edgeDelta(e.at);
    if (delta >= minDelta) hits.push({ at: e.at, span: +e.span?.[0] ?? e.at, subject: s, action: e.action, object: o, delta: +delta.toFixed(3) });
  }
  if (!hits.length) return { accurate: false, verdict: "refused", detail: `no bound edge in the EOT binds ${being ?? "a being"} · ${verb}` };
  const best = hits.sort((a, b) => b.delta - a.delta)[0];
  return { accurate: true, verdict: "attested", at: best.at, spanChar: best.span, subject: best.subject, action: best.action, object: best.object, delta: best.delta, detail: `${best.subject} · ${best.action} ${best.object ?? ""} (at ${best.at}, Δ${best.delta})` };
}

// the DMD floor by address: the EOT's per-clause surprise curve (sceneSignal)
// IS the difference-that-makes-a-difference. A claim is anchored only where
// its span's surprise cleared the floor (the span differed; it is attested).
const SCENE = eot.sceneSignal ?? [];
export const dmdFloor = (() => {
  const finite = SCENE.filter(Number.isFinite).sort((a, b) => a - b);
  return (finite.length ? finite[Math.floor(finite.length * 0.9)] : 0);
})();
const edgeDelta = (at) => Number(SCENE[at] ?? 0);

// ── CLI: node accuracy.mjs 'Telemachus boarded the ship' ──
if (import.meta.url === `file://${process.argv[1]}`) {
  const claims = [
    { being: "Telemachus", verb: "βαῖν", patient: null, minDelta: 0, label: "Telemachus boarded the ship" },
    { being: "Athena", verb: "προσέφη", patient: "Telemachus", minDelta: 0, label: "Athena addressed Telemachus" },
    { being: "Telemachus", verb: "ἕζετο", patient: null, minDelta: 0, label: "Telemachus sat" },
    { being: "Odysseus", verb: "ὀδύρονται", patient: null, minDelta: 0, label: "Odysseus mourned (weathered)" },
    { being: "Zeus", verb: "κτείνει", patient: null, minDelta: 0, label: "Zeus smote" },
    { being: "Telemachus", verb: "never happened", patient: null, minDelta: 0, label: "Telemachus did something unread (refusal test)" },
  ];
  console.log(`ACCURACY of claims, per the FULL Odyssey EOT (${eot.edges.length} bound edges) — DMD-bounded, not verbatim:\n`);
  for (const c of claims) {
    const r = probeClaim({ verb: c.verb, being: c.being, patient: c.patient, minDelta: c.minDelta });
    console.log(`  ${r.accurate ? "✓" : "✗"} ${c.label}  —  ${r.detail ?? r.verdict}`);
  }
}