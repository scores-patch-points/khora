// scene/historicity-lane.mjs — THE FOUCAULDIAN MIND'S HISTORICITY: DATED, PLACED WITNESSES OF THE SAME WORDS.  (2026-10-14)
//
//   node eval/the-fold/scene/historicity-lane.mjs [--draws 5000] [--chunk 5000]
//
// "We need the context for historicity, get Foucaultianism in there" (the user, 2026-10-14). Genealogy needs the thing set in a
// series of dated, placed practices — not the ruled's later testimony only, and not the text alone. This lane indexes, in the GREEK
// of Plato's own world already on disk (Zenodotus/11-multi-language/greek-originals), every occurrence of the stems for slavery and
// for freedom, each with its byte address, its declared epoch and genre, and the clause window around it. It is the witness index the
// Foucauldian act attaches to a rule of the Republic as its historical context (a heard note with an epoch), and the thing the whole
// whom/ledger loop can take as a giver with a date.
//
// What it tests, with a born null: is the Republic's rate of slave-stems unusual for its time? Chunk every text, label chunks by
// text, and permute the labels across chunks; the Republic's mean density against the pooled others is read against that. If it is not
// unusual, then its backgrounding of slaves (collision-reading.mjs) is the period's idiom, not Plato's design — and that is what a
// genealogist would say first.
//
// DECLARED, NOT VERIFIED: the epochs are approximate composition dates given from general knowledge, not read from a source this
// session; they order the texts, they are not a finding. The stems are a declared closed class: a stem match is a candidate, not a
// reading (θεράπων is ambiguous between a servant and a free attendant and is reported apart).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { greekStemOf } from "./derived-lexicon.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const DRAWS = Number(opt("--draws", 5000)), CHUNK = Number(opt("--chunk", 5000));
const DIR = "/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/";
const SEED = 20261014;
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rnd = mulberry32(SEED);
const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

// text, declared approximate epoch (BCE; negative), genre, place — declared, not verified
const TEXTS = [
  { file: "hesiod-works-and-days.txt", epoch: -700, genre: "didactic poem", place: "Boeotia" },
  { file: "herodotus-histories.txt", epoch: -430, genre: "history", place: "Ionia/Athens" },
  { file: "aristophanes-frogs.txt", epoch: -405, genre: "comedy", place: "Athens" },
  { file: "thucydides-history.txt", epoch: -400, genre: "history", place: "Athens" },
  { file: "plato-meno.txt", epoch: -385, genre: "dialogue", place: "Athens" },
  { file: "plato-republic.txt", epoch: -375, genre: "dialogue", place: "Athens", focus: true },
  { file: "xenophon-anabasis.txt", epoch: -370, genre: "memoir", place: "Persia/Greece" },
  { file: "aristotle-politics.txt", epoch: -335, genre: "treatise", place: "Athens/Lyceum" },
];
// DERIVED: the slave and free stems are the Greek stems the Republic's own Stephanus-page grid pins to the concepts "slavery" and
// "freedom" (plato-republic-concepts-v1), reduced by successor variety (derived-lexicon.mjs) — δουλειασ → δουλ, ελευθερια → ελευθερ,
// identical to the stems this line used to type. DECLARED, NOT DERIVABLE (left, on purpose): ανδραποδ and οικετ are aligned with the
// English slave words too, but so are the tyrant and master stems (τυραν-, δεσπο-), so deriving them would pull those kinds in;
// θεραπον has no pin, and the "attendant" kind is itself a declared reading (θεράπων is ambiguous).
const STEMS = { slave: [greekStemOf("slavery"), "ανδραποδ", "οικετ"], attendant: ["θεραπον"], free: [greekStemOf("freedom")] };
const stripped = (c) => c.normalize("NFD").replace(/[̀-ͯͅ]/g, "").toLowerCase().replace(/ς/g, "σ");

const witnesses = []; const perText = [];
for (const T of TEXTS) {
  const p = path.join(DIR, T.file); if (!fs.existsSync(p)) { console.log(`missing ${T.file}`); continue; }
  const orig = fs.readFileSync(p, "utf8");
  let norm = ""; const map = [];
  for (let i = 0; i < orig.length; i++) { const n = stripped(orig[i]); norm += n; for (let k = 0; k < n.length; k++) map.push(i); }
  const hits = [];
  for (const [kind, stems] of Object.entries(STEMS)) {
    const re = new RegExp(`(?:^|[^α-ω])(${stems.join("|")})[α-ω]*`, "g"); let m;
    while ((m = re.exec(norm)) !== null) { const at = m.index + (m[0].length - m[0].replace(/^[^α-ω]/, "").length); hits.push({ kind, stem: m[1], normAt: at, origAt: map[Math.min(at, map.length - 1)] }); }
  }
  hits.sort((a, b) => a.origAt - b.origAt);
  for (const h of hits) {
    const lo = Math.max(0, h.origAt - 70), hi = Math.min(orig.length, h.origAt + 110);
    witnesses.push({ file: T.file, epoch: T.epoch, genre: T.genre, place: T.place, kind: h.kind, stem: h.stem, at: `${p}#${Buffer.byteLength(orig.slice(0, h.origAt), "utf8")}`, window: orig.slice(lo, hi).replace(/\s+/g, " ").trim() });
  }
  // chunks of CHUNK characters (of the normalized text): counts of each kind per chunk
  const nChunks = Math.max(1, Math.floor(norm.length / CHUNK)); const chunks = Array.from({ length: nChunks }, () => ({ slave: 0, attendant: 0, free: 0 }));
  for (const h of hits) { const c = Math.min(nChunks - 1, Math.floor(h.normAt / CHUNK)); chunks[c][h.kind] += 1; }
  const sum = (k) => hits.filter((h) => h.kind === k).length;
  perText.push({ ...T, chars: norm.length, chunks, slave: sum("slave"), attendant: sum("attendant"), free: sum("free") });
}
console.log(`texts: ${perText.length} · witnesses indexed: ${witnesses.length}`);
console.log(`\n${"text".padEnd(28)} ${"epoch".padStart(6)} ${"chars".padStart(9)} ${"slave".padStart(6)} ${"/10k".padStart(6)} ${"attend".padStart(7)} ${"free".padStart(5)} ${"/10k".padStart(6)}`);
for (const t of perText) console.log(`${t.file.padEnd(28)} ${String(t.epoch).padStart(6)} ${String(t.chars).padStart(9)} ${String(t.slave).padStart(6)} ${(1e4 * t.slave / t.chars).toFixed(1).padStart(6)} ${String(t.attendant).padStart(7)} ${String(t.free).padStart(5)} ${(1e4 * t.free / t.chars).toFixed(1).padStart(6)}`);

// ── the null: permute text labels across chunks ─────────────────────────────────────────────────────────────────────────────────
const all = perText.flatMap((t) => t.chunks.map((c) => ({ file: t.file, slave: c.slave, free: c.free })));
const nFocus = perText.find((t) => t.focus)?.chunks.length ?? 0;
const mean = (a, k) => a.reduce((s, x) => s + x[k], 0) / (a.length || 1);
const focus = all.filter((c) => c.file === "plato-republic.txt"), others = all.filter((c) => c.file !== "plato-republic.txt");
const report = {};
for (const k of ["slave", "free"]) {
  const obs = mean(focus, k) - mean(others, k); const nul = [];
  for (let d = 0; d < DRAWS; d++) { const p = shuffle(all); nul.push(mean(p.slice(0, nFocus), k) - mean(p.slice(nFocus), k)); }
  const pv = (nul.filter((x) => Math.abs(x) >= Math.abs(obs)).length + 1) / (DRAWS + 1);
  report[k] = { republicPerChunk: mean(focus, k), othersPerChunk: mean(others, k), diff: obs, p: pv, nullRange: [Math.min(...nul), Math.max(...nul)] };
  console.log(`\n${k}-stems per ${CHUNK}-char chunk: Republic ${mean(focus, k).toFixed(2)} vs the others pooled ${mean(others, k).toFixed(2)} · diff ${obs.toFixed(2)} · label-permutation p=${pv.toFixed(4)} (null ${Math.min(...nul).toFixed(2)}…${Math.max(...nul).toFixed(2)}; ${nFocus} Republic chunks, ${all.length - nFocus} others)`);
}
// a leave-one-text-out look: how does each other text sit relative to the rest, for scale
console.log(`\nfor scale — each text's slave-stem density against the other seven, same null:`);
for (const t of perText) {
  const a = all.filter((c) => c.file === t.file), b = all.filter((c) => c.file !== t.file); const obs = mean(a, "slave") - mean(b, "slave"); const nul = [];
  for (let d = 0; d < 1000; d++) { const p = shuffle(all); nul.push(mean(p.slice(0, a.length), "slave") - mean(p.slice(a.length), "slave")); }
  console.log(`  ${t.file.padEnd(28)} diff ${obs.toFixed(2).padStart(6)}  p=${((nul.filter((x) => Math.abs(x) >= Math.abs(obs)).length + 1) / 1001).toFixed(3)}`);
}
fs.writeFileSync(path.join(HERE, "historicity-witnesses.jsonl"), witnesses.map((w) => JSON.stringify(w)).join("\n") + "\n");
fs.writeFileSync(path.join(HERE, "historicity-lane.json"), JSON.stringify({ at: new Date().toISOString(), seed: SEED, chunk: CHUNK, draws: DRAWS, declaredEpochs: "approximate, from general knowledge, not verified this session", stems: STEMS, perText: perText.map(({ chunks, ...t }) => t), report }, null, 2) + "\n");
console.log(`\nthe Republic's slave-stem witnesses, in order (address · window):`);
for (const w of witnesses.filter((x) => x.file === "plato-republic.txt" && x.kind === "slave").slice(0, 6)) console.log(`  ${w.at.split("/").pop()}  ${w.window.slice(0, 150)}`);
console.log(`\n→ ${path.join(HERE, "historicity-witnesses.jsonl")}`);
