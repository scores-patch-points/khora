// extract.mjs — GOLD extraction (ant-gold). Re-runs the base driver's segmentation
// VERBATIM (scene-kinds.mjs lines 22-45) but keeps each clause's source sentence, so
// the first N situations can be printed as raw Greek for hand-labelling.
// Writes under experiments/gold/ only. No commit. The gold is a TESTAMENT, never fed
// back into any inducer.
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const { confirmedVerbSet, greekClauses, paradigmOf } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);
const { createHolograph, admit } = await import(`${KHOR}/native/kernel/bayes-surprise.js`);
const posPrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-grc.json", "utf8"));
const casePrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/case-marking-grc.json", "utf8"));

const face = (x) => { if (!x) return ""; if (typeof x === "string") return x; return String(x.head ?? x.surface ?? x.text ?? ""); };
const seat = (x) => (x ? (x.case ?? "?") : "(∅)");
const ALL = confirmedVerbSet(posPrior);
const CHARS = Number(process.argv[2] || 120000);
const odyT = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-odyssey.txt", "utf8").replace(/^---[\s\S]*?\n---\n/, "").slice(0, CHARS);
const iliadT = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-iliad.txt", "utf8").replace(/^---[\s\S]*?\n---\n/, "").slice(0, 50000);
// readCl now tags each clause with its source sentence (disclosed change to the base's readCl).
const readCl = (t) => { const o = []; for (const s of t.split(/(?<=[.;—])/g)) if (s.trim().length > 3) for (const c of greekClauses(s.trim(), ALL, posPrior, casePrior, { articleMode: "soft", minShare: 0.6, minCount: 20 })) o.push({ ...c, sent: s.trim() }); return o; };

const holo = createHolograph({ alpha: 1 });
for (const c of readCl(iliadT)) admit(holo, { position: `${seat(c.subject)}:${seat(c.object)}`, actor: face(c.subject) || "(∅)", action: String(c.verb ?? "·"), outcome: c.object ? face(c.object) : "∅" });
const clauses = readCl(odyT);
const B = clauses.map((c) => admit(holo, { position: `${seat(c.subject)}:${seat(c.object)}`, actor: face(c.subject) || "(∅)", action: String(c.verb ?? "·"), outcome: c.object ? face(c.object) : "∅" }).bayes);

const TH = [...B].filter(Number.isFinite).sort((a, b) => a - b)[Math.floor(B.length * 0.9)] ?? 0;
const scenes = []; let cur = [];
const MIN_LEN = 4;
for (let i = 0; i < clauses.length; i++) {
  const rev = Number.isFinite(B[i]) && B[i] >= TH && B[i] > (B[i - 1] ?? 0) && B[i] >= (B[i + 1] ?? 0);
  if (rev && cur.length >= MIN_LEN) { scenes.push(cur); cur = []; }
  cur.push(clauses[i]);
}
if (cur.length) scenes.push(cur);

const N = Number(process.argv[3] || 30);
const out = { schema: "GoldExtract@1", chars: CHARS, clauses: clauses.length, scenes: scenes.length, extracted: Math.min(N, scenes.length), items: [] };
for (let i = 0; i < Math.min(N, scenes.length); i++) {
  const sc = scenes[i];
  const sents = [];
  for (const c of sc) if (sents[sents.length - 1] !== c.sent) sents.push(c.sent);
  out.items.push({
    scene: i,
    nclauses: sc.length,
    sentences: sents,
    clauses: sc.map((c) => ({ s: face(c.subject) || "(pro-drop)", v: String(c.verb ?? "·"), o: c.object ? face(c.object) : "∅", seat: `${seat(c.subject)}:${seat(c.object)}` })),
  });
}
fs.writeFileSync(new URL("./extract.json", import.meta.url), JSON.stringify(out, null, 1));
// human-readable dump for labelling
const lines = [`GoldExtract@1  chars=${CHARS}  clauses=${clauses.length}  scenes=${scenes.length}  (showing ${out.extracted})`, ""];
for (const it of out.items) {
  lines.push(`===== SCENE ${it.scene}  (${it.nclauses} clauses) =====`);
  lines.push(`  TEXT: ${it.sentences.join(" ")}`);
  lines.push(`  CLAUSES: ${it.clauses.map((c) => `${c.s}[${c.v}]${c.o}`).join("  |  ")}`);
  lines.push("");
}
fs.writeFileSync(new URL("./extract.txt", import.meta.url), lines.join("\n"));
console.log(lines.join("\n"));
