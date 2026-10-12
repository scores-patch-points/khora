// scene/flesh-udhr.mjs — the universal-rights paradigm across EVERY UDHR we hold.
//
//   node native/eval/the-fold/scene/flesh-udhr.mjs [--limit N]
//
// The OHCHR set is parallel: same document, same article order (paragraph counts
// cluster 88-95 — sentence-per-paragraph). Method, language-agnostic:
//   1. Align from the TAIL (Article 30 is stable) — paragraph i-from-the-end in
//      language L sits at the same slot as paragraph i-from-the-end in English.
//   2. English labels the slots (its own modal markers): right / prohibition / other.
//   3. For each language, DISCOVER its own modal from its own bytes: the character
//      n-gram (2..5) that appears in most modal slots and few others. No declared
//      tables — the marker is measured, not assumed.
//   4. Read the discovered marker into EOObligation@1 and run the same emergent
//      Paradigm projection.
//
// DISCLOSED: alignment is index-based (translators split paragraphs differently,
// so the tail-anchored window is ~85 and off-by-a-few slots are possible); the
// discovered marker is a measurement with a margin, refused when the margin is
// too thin (a typed gap, never a guess).

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { obligation } from "../../../kernel/obligations.js";
import { projectEmergentTerrains } from "../../../kernel/emergent-terrain.js";
import { splitSentences } from "../../../adapters/text/spans.js";
import { createMind, remember, verifyCitations } from "../../../kernel/mimir.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, "udhr-src");
const ENG = "udhr-eng.txt";
const args = process.argv.slice(2);
const li = args.indexOf("--limit");
const LIMIT = li >= 0 ? Number(args[li + 1]) : Infinity;
const MIND_OUT = "/Users/mlacy/Documents/3.0/khora/native/memory/mind.jsonl";

const norm = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
// paragraph blocks WITH byte offsets into the real file (the header is block 0)
const blocksOf = (raw) => {
  const out = []; let last = 0, m;
  const re = /\n\s*\n/g;
  const push = (text, charStart) => { const t = text.trim(); if (!t) return; const lead = text.length - text.trimStart().length; out.push({ text: t, at: Buffer.byteLength(raw.slice(0, charStart + lead), "utf8") }); };
  while ((m = re.exec(raw))) { push(raw.slice(last, m.index), last); last = m.index + m[0].length; }
  push(raw.slice(last), last);
  return out;
};
const parasOf = (raw) => blocksOf(raw).map((b) => b.text);

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".txt")).sort().slice(0, LIMIT);
const engParas = parasOf(fs.readFileSync(path.join(DIR, ENG), "utf8"));
const RIGHT_RE = /\b(?:has|have) the right\b|\b(?:is|are) entitled\b/i;
const PROH_RE = /\b(?:no one|nobody) shall\b/i;
const labelOf = (p) => (RIGHT_RE.test(p) ? "right" : PROH_RE.test(p) ? "prohibition" : "other");
// tail-anchored labels: revLabel[i] = the slot i paragraphs from the END
const revLabel = [...engParas].reverse().map(labelOf);
const W = Math.min(85, engParas.length);

function discoverFrom(modal, other) {
  if (!modal.length) return null;
  const counts = new Map();
  for (const p of modal) for (let n = 2; n <= 5; n++) for (let j = 0; j + n <= p.length; j++) {
    const g = p.slice(j, j + n);
    if (/^[\p{Z}\p{P}\p{N}]+$/u.test(g)) continue; // glyph-less grams carry no marker
    counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  const minModal = Math.max(4, Math.ceil(modal.length * 0.2));
  const cands = [...counts.entries()].filter(([, c]) => c >= minModal).sort((a, b) => b[1] - a[1]).slice(0, 1200);
  let best = null;
  for (const [g] of cands) {
    const m = modal.filter((p) => p.includes(g)).length;
    const o = other.filter((p) => p.includes(g)).length;
    const score = m - 2 * o;
    if (m < minModal || m - o < 2) continue;
    if (!best || score > best.score || (score === best.score && g.length > best.g.length)) best = { g, m, o, score };
  }
  return best;
}

// the real partition: L's own paragraphs in the slots English labels "right"
const partition = (paras) => {
  const rev = [...paras].reverse();
  const modal = [], other = [];
  for (let i = 0; i < Math.min(W, rev.length); i++) (revLabel[i] === "right" ? modal : other).push(norm(rev[i]));
  return { modal, other, count: modal.length };
};
const discoverMarker = (paras) => { const { modal, other } = partition(paras); return discoverFrom(modal, other); };

function readWith(paras, marker) {
  const rev = [...paras].reverse();
  const clauses = [];
  for (let i = 0; i < Math.min(W, rev.length); i++) {
    const text = rev[i]; if (revLabel[i] !== "right") continue;
    if (!norm(text).includes(marker.g)) continue;
    clauses.push({ text, slot: i, kind: "right", bearer: "universal" });
  }
  const obligations = clauses.map((c) => obligation({
    id: `obligation:slot:${c.slot}`,
    distinction: { materiality: { makesDifference: true, reasons: [{ kind: "bearer:universal" }] } },
    grounds: [`slot:${c.slot}`], alternatives: [], consequences: [{ kind: "right" }], status: "open",
  }));
  return { clauses, obligations };
}

// THE CONTROL (the record's discipline): shuffle the labels across the same
// window, discover from the SHUFFLED "modal" set, and ask how many TRUE right
// slots its marker reads. If the shuffled marker reads the real slots as well
// as the real one, the method measures frequency/alignment, not the modal.
function shuffledControl(paras, seed) {
  let s = seed >>> 0;
  const rng = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
  const rev = [...paras].reverse();
  const idx = [...Array(Math.min(W, rev.length)).keys()];
  const rightCount = idx.filter((i) => revLabel[i] === "right").length;
  const shuffled = idx.slice();
  for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  const modalSet = new Set(shuffled.slice(0, rightCount));
  const modal = [], other = [];
  for (const i of idx) (modalSet.has(i) ? modal : other).push(norm(rev[i]));
  const m = discoverFrom(modal, other);
  if (!m) return { found: false, reads: 0 };
  const trueRight = idx.filter((i) => revLabel[i] === "right");
  return { found: true, marker: m.g, reads: trueRight.filter((i) => norm(rev[i]).includes(m.g)).length };
}

const rows = [];
const firstCites = [];
for (const f of files) {
  let raw, paras, blocks, rawBytes;
  try { raw = fs.readFileSync(path.join(DIR, f), "utf8"); blocks = blocksOf(raw); paras = blocks.map((b) => b.text); rawBytes = Buffer.from(raw, "utf8"); } catch (e) { rows.push({ f, err: "unreadable" }); continue; }
  const marker = discoverMarker(paras);
  if (!marker) { rows.push({ f, marker: null }); continue; }
  const rev = [...blocks].reverse();
  let firstCite = null;
  for (let i = 0; i < Math.min(W, rev.length); i++) {
    if (revLabel[i] !== "right" || !norm(rev[i].text).includes(marker.g)) continue;
    const len = Buffer.byteLength(rev[i].text, "utf8");
    firstCite = { source: path.join(DIR, f), byte: rev[i].at, length: len, sha256: sha256(rawBytes.subarray(rev[i].at, rev[i].at + len)) };
    break;
  }
  const { obligations } = readWith(paras, marker);
  const state = projectEmergentTerrains({ graphEntries: [], obligations });
  const uni = state.Paradigm.find((x) => x.pattern.includes("consequence:right") && x.pattern.includes("bearer:universal"));
  const ctrl = shuffledControl(paras, [...f].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7));
  rows.push({ f, marker: marker.g, modal: marker.m, exclude: marker.o, obligations: obligations.length, members: uni ? uni.obligationRefs.length : 0, advantage: marker.score, controlReads: ctrl.reads, cite: firstCite });
  if (firstCite) firstCites.push(firstCite);
}

const admit = rows.filter((r) => (r.members ?? 0) >= 3);
const starved = rows.filter((r) => r.marker && (r.members ?? 0) < 3);
const nomarker = rows.filter((r) => !r.marker);
console.log(`UDHR files read: ${rows.length}`);
console.log(`universal-rights paradigm admitted (>=3 members): ${admit.length}  (${(100 * admit.length / rows.length).toFixed(1)}%)`);
console.log(`marker discovered but paradigm starved: ${starved.length}`);
console.log(`no marker discovered (typed gap): ${nomarker.length}`);
const sizes = admit.map((r) => r.members).sort((a, b) => a - b);
if (sizes.length) console.log(`member counts: min ${sizes[0]} · median ${sizes[Math.floor(sizes.length / 2)]} · max ${sizes[sizes.length - 1]}`);
console.log(`\nsample admitted (file · discovered marker · slots · members):`);
for (const r of admit.slice(0, 18)) console.log(`  ${r.f.replace("udhr-", "").replace(".txt", "").padEnd(16)} "${String(r.marker).slice(0, 24)}"  slots=${String(r.obligations).padStart(2)}  members=${r.members}`);
if (nomarker.length) console.log(`\nno marker (first 12): ${nomarker.slice(0, 12).map((r) => r.f).join(", ")}`);
if (starved.length) console.log(`starved (first 12): ${starved.slice(0, 12).map((r) => `${r.f}(s${r.obligations})`).join(", ")}`);

const ctrl = rows.filter((r) => Number.isFinite(r.controlReads)).map((r) => r.controlReads).sort((a, b) => a - b);
if (ctrl.length) {
  console.log(`\nCONTROL (shuffled labels) — how many TRUE right slots its marker reads:`);
  console.log(`  median ${ctrl[Math.floor(ctrl.length / 2)]} · mean ${(ctrl.reduce((a, b) => a + b, 0) / ctrl.length).toFixed(1)} · max ${ctrl[ctrl.length - 1]}`);
  console.log(`  control would "admit" (>=3): ${ctrl.filter((c) => c >= 3).length}/${rows.length}`);
  console.log(`  real median members ${sizes[Math.floor(sizes.length / 2)]} vs control median ${ctrl[Math.floor(ctrl.length / 2)]}`);
}

const OUT = "/Users/mlacy/Documents/3.0/Zenodotus/derived-priors/hyperlexicon-priors/udhr-flesh-v1.json";
fs.writeFileSync(OUT, JSON.stringify({
  schema: "InjunctionReading@1", kind: "udhr-flesh-out",
  question: "does the universal-rights paradigm read in every UDHR translation we hold?",
  files: rows.length,
  admitted: admit.length,
  method: "tail-anchored paragraph alignment (English labels the slots) + per-language modal DISCOVERY (character 2-5-grams scored modal-vs-other); declared tables never used",
  control: { kind: "shuffled-labels", medianReads: ctrl[Math.floor(ctrl.length / 2)], maxReads: ctrl[ctrl.length - 1], wouldAdmit: ctrl.filter((c) => c >= 3).length },
  memberCounts: { min: sizes[0], median: sizes[Math.floor(sizes.length / 2)], max: sizes[sizes.length - 1] },
  rows,
  disclosed_limits: "index alignment from the tail (translators split paragraphs differently; ~85-slot window); the discovered marker is a measurement with a margin; a language whose marker the method cannot find is a typed gap, never a guess",
  falsifying_control: "an admitted language whose discovered marker also reads the shuffled control equally well (the method measures alignment, not the modal); or a language where the true marker fails to read the slots the English labels",
  history: [{ at: new Date().toISOString(), event: "born", note: "first full-set read: the paradigm across every UDHR we hold" }],
}, null, 2));
console.log(`\nwrote ${OUT}`);

// ── seed THE MIND: one paradigm row citing every language's own underlying bytes ──
if (firstCites.length) {
  let mind = createMind({ meta: { handle: "Mimir", row: "udhr-flesh" } });
  mind = remember(mind, {
    kind: "paradigm",
    claim: {
      pattern: "consequence:right | materiality:bearer:universal",
      languages: firstCites.length,
      files: rows.length,
      members: { min: sizes[0], median: sizes[Math.floor(sizes.length / 2)], max: sizes[sizes.length - 1] },
      margin: `real median ${sizes[Math.floor(sizes.length / 2)]} vs shuffled-control median ${ctrl[Math.floor(ctrl.length / 2)]}`,
    },
    giver: "corpus:udhr — every held translation, each reading its own modal",
    cites: firstCites,
    standing: "candidate",
    basis: "per-language modal DISCOVERY at tail-anchored slot alignment, then the same emergent Paradigm projection",
    falsifying: "a translation whose discovered marker reads the shuffled control as well as its true slots; or a citation whose bytes drift from its pin",
    meta: { reading: "flesh-udhr.mjs", declared_tables: "none — markers measured, never assumed" },
  });
  const report = verifyCitations(mind, { read: (s) => fs.readFileSync(s), digest: sha256 });
  console.log(`mind row: paradigms=55+1 · citations checked ${report.checked} · failed ${report.failed}`);
  if (!report.ok) { console.error(report.findings.filter((f) => !f.ok).slice(0, 6)); process.exit(1); }
  const existing = fs.existsSync(MIND_OUT) ? fs.readFileSync(MIND_OUT, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l)) : [];
  const have = new Set(existing.map((r) => r.id));
  const fresh = mind.rows.filter((r) => !have.has(r.id));
  fs.appendFileSync(MIND_OUT, fresh.map((r) => JSON.stringify(r)).join("\n") + (fresh.length ? "\n" : ""));
  console.log(`appended ${fresh.length} mind row(s) (total on disk: ${existing.length + fresh.length}) -> ${MIND_OUT}`);
}
