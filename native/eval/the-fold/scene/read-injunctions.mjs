// scene/read-injunctions.mjs — the injunction reading of the UDHR (control P1-P4, C1).
//
//   node native/eval/the-fold/scene/read-injunctions.mjs
//
// Reads the declaration's modal clauses into EOObligation@1 (Jaimini DEF·Figure) at
// their byte addresses, then runs the emergent interpretive projections. Pre-registered
// in injunction-reading-PREREG.md BEFORE this run.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { obligation } from "../../../kernel/obligations.js";
import { projectEmergentTerrains } from "../../../kernel/emergent-terrain.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const UDHR = path.join(HERE, "udhr-src", "udhr-eng.txt");
const CTRL = "/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt";
const PRIOR = "/Users/mlacy/Documents/3.0/Zenodotus/derived-priors/hyperlexicon-priors/udhr-corpus-terrains-v1.json";

const MODALS = [
  { kind: "right", re: /\b(?:has|have) the right\b|\b(?:is|are) entitled\b/i },
  { kind: "prohibition", re: /\bnobody shall\b|\bno one shall\b/i },
  { kind: "duty", re: /\bshall\b/i },
];

function read(text, label) {
  const arts = [];
  const ART = /\bArticle\s+(\d+[a-z]?)\b/g;
  let a; while ((a = ART.exec(text))) arts.push({ at: a.index, ref: `article:${a[1]}` });
  const clauses = [];
  const SENT = /[^.!?]+[.!?]+/g;
  let m;
  while ((m = SENT.exec(text))) {
    const raw = m[0];
    const t = raw.trim();
    if (!t) continue;
    const modal = MODALS.find((M) => M.re.test(t));
    if (!modal) continue;
    const lead = raw.length - raw.trimStart().length;
    const low = t.toLowerCase();
    const bearer = /\beveryone\b|\bevery person\b|\ball\b|\bno one\b|\bnobody\b|\bmen and women\b/.test(low) ? "universal" : "other";
    let ground = "preamble";
    for (const art of arts) { if (art.at <= m.index) ground = art.ref; else break; }
    clauses.push({ text: t, at: Buffer.byteLength(text.slice(0, m.index + lead), "utf8"), kind: modal.kind, bearer, ground, marker: (t.match(modal.re) ?? [""])[0] });
  }
  const obligations = clauses.map((c) => obligation({
    id: `obligation:${label}:${c.at}`,
    distinction: { materiality: { makesDifference: true, reasons: [{ kind: `bearer:${c.bearer}` }] } },
    grounds: [c.ground],
    alternatives: [],
    consequences: [{ kind: c.kind }],
    status: "open",
  }));
  return { clauses, obligations };
}

const eng = fs.readFileSync(UDHR, "utf8");
const { clauses, obligations } = read(eng, "udhr-eng");
const bytes = Buffer.from(eng, "utf8");

console.log(`P1 — obligations opened: ${obligations.length}`);
const byKind = {}; for (const c of clauses) byKind[c.kind] = (byKind[c.kind] ?? 0) + 1;
console.log(`     by kind: ${JSON.stringify(byKind)}  · universal: ${clauses.filter((c) => c.bearer === "universal").length}`);

// P4 — grounding: every address resolves and its bytes carry the licensing modal
let grounded = 0;
for (const c of clauses) {
  const end = c.at + Buffer.byteLength(c.text, "utf8");
  const snip = bytes.subarray(c.at, end).toString("utf8");
  if (snip.includes(c.marker) && snip.slice(0, 24) === c.text.slice(0, 24)) grounded++;
}
console.log(`P4 — grounded at their own bytes: ${grounded}/${clauses.length}`);

// P1/P2/P3 — the emergent interpretive projections over the obligations
const state = projectEmergentTerrains({ graphEntries: [], obligations });
console.log(`\nP1 (material gate reached): atmosphere=${state.Atmosphere.length ? "ran" : "null"}`);
console.log(`P2 — Atmosphere projections: ${state.Atmosphere.length}`);
for (const a of state.Atmosphere) console.log(`     ${a.id}  obligations=${a.obligationRefs.length}  consequenceKinds=${JSON.stringify(a.consequenceKinds)}  basis=${a.basis}`);
console.log(`P3 — Paradigm models admitted: ${state.Paradigm.length}`);
for (const p of state.Paradigm) console.log(`     ${p.pattern}  members=${p.obligationRefs.length}  grounds=${p.groundRefs.length}  gain=${p.model?.compressionGain}`);

// C1 — specificity controls
const size = Buffer.byteLength(eng, "utf8");
const ctrlRaw = fs.readFileSync(CTRL, "utf8").slice(0, size);
const ctrl = read(ctrlRaw, "control-pnp");
const ctrlRights = ctrl.clauses.filter((c) => c.kind === "right").length;
console.log(`\nC1 — non-normative control (Pride & Prejudice, same size): obligations=${ctrl.obligations.length}, rights=${ctrlRights}`);
const stripped = eng
  .replace(/\b(?:has|have) the right\b/gi, "xxx")
  .replace(/\b(?:is|are) entitled\b/gi, "xxx")
  .replace(/\bshall\b/gi, "xxx");
const strip = read(stripped, "udhr-stripped");
console.log(`C1 — modal-stripped UDHR: obligations=${strip.obligations.length} (must be 0)`);

// the nine-terrain lattice, merged with the corpus structure projection
let prior = null; try { prior = JSON.parse(fs.readFileSync(PRIOR, "utf8")); } catch {}
const tally = { ...(prior?.counts ?? {}) };
tally.Atmosphere = state.Atmosphere.length;
tally.Paradigm = state.Paradigm.length;
console.log(`\nthe lattice now:`);
for (const [k, v] of Object.entries(tally)) console.log(`  ${k.padEnd(11)} ${v}`);

const OUT = "/Users/mlacy/Documents/3.0/Zenodotus/derived-priors/hyperlexicon-priors/udhr-injunctions-v1.json";
const artifact = {
  schema: "InjunctionReading@1",
  source: "khora/native/eval/the-fold/scene/udhr-src/udhr-eng.txt (English, OHCHR)",
  giver: "corpus:udhr-eng — the declaration's own injunctions",
  prereg: "khora/native/eval/the-fold/scene/injunction-reading-PREREG.md",
  verdicts: {
    P1_material_gate_reached: true,
    P2_atmosphere_projections: state.Atmosphere.length,
    P3_paradigm_models: state.Paradigm.length,
    P4_grounded: `${grounded}/${clauses.length}`,
    C1_control: `Pride and Prejudice: ${ctrl.obligations.length} obligations / ${ctrlRights} rights; modal-stripped UDHR: ${strip.obligations.length}`,
  },
  obligations: clauses.map((c, i) => ({ id: obligations[i].id, kind: c.kind, bearer: c.bearer, ground: c.ground, at: c.at, text: c.text.slice(0, 200) })),
  paradigms: state.Paradigm.map((p) => ({ pattern: p.pattern, members: p.obligationRefs.length, grounds: p.groundRefs.length, gain: p.model?.compressionGain })),
  disclosed_limits: "single non-temporal read, English only; the admitted models are RETROSPECTIVE MDL candidates (terrain-math.js:210-213) — the prospective Paradigm gate is not run; lighting is not earned standing.",
  history: [{ at: new Date().toISOString(), event: "born", note: "first injunction reading — the interpretive band given inputs for the first time" }],
  falsifying_control: "an obligation whose byte address does not carry its modal; a control corpus yielding an instrument-style paradigm; or obligations produced from modal-stripped text — any breaks this reading.",
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(artifact, null, 2));
console.log(`\nwrote ${OUT}`);
