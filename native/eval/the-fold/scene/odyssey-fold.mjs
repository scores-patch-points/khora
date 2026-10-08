// odyssey-fold.mjs — THE MECHANICAL FOLD OF THE ODYSSEY (genuine Greek, no model).
// NL -> grammar (the recovered pro-drop seam) -> EOT (clauses) -> fold:
//   cast (who acts, weighted) · each being's relation profile · the rim ·
//   scenes (cut at blinks, Murch) · surprise (verbs the Iliad, as prior, never taught).
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const { confirmedVerbSet, greekClauses } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);
const posPrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-grc.json", "utf8"));
const casePrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/case-marking-grc.json", "utf8"));

const read = (p, chars) => fs.readFileSync(p, "utf8").replace(/^---[\s\S]*?\n---\n/, "").slice(0, chars);
const odyText = read("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-odyssey.txt", Number(process.argv[2] || 200000));
const iliadVerbs = (() => { const t = read("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-iliad.txt", 200000); return new Set([...t.split(/(?<=[.;—])/g)].map((s) => { const out = []; for (const c of greekClauses(s.trim(), confirmedVerbSet(posPrior), posPrior, casePrior, { articleMode: "soft", minShare: 0.6, minCount: 20 })) if (c.verb) out.push(String(c.verb)); return out; }).flat()); })();
console.log(`priors: pos-grc (${posPrior.provenance.giver.slice(0, 30)}…) · case-marking-grc · Iliad-as-prior verbs: ${iliadVerbs.size}`);

const ALL = confirmedVerbSet(posPrior);
const clauses = [];
for (const s of odyText.split(/(?<=[.;—])/g)) if (s.trim().length > 3)
  for (const c of greekClauses(s.trim(), ALL, posPrior, casePrior, { articleMode: "soft", minShare: 0.6, minCount: 20 })) clauses.push(c);
const face = (x) => { if (!x) return ""; let v = typeof x === "string" ? x : String(x.head ?? x.surface ?? x.text ?? ""); return v; };

console.log(`ODYSSEY (Greek, first ${odyText.length} chars): ${clauses.length} clauses\n`);

// CAST — who acts (subjects, weighted); verbs per being
const cast = new Map();
const profiles = new Map();
for (const c of clauses) {
  const v = String(c.verb ?? "");
  const s = face(c.subject);
  if (s) { const e = cast.get(s) ?? { s, n: 0, verbs: new Map() }; e.n++; e.verbs.set(v, (e.verbs.get(v) ?? 0) + 1); cast.set(s, e); }
  if (c.object) { const ps = profiles.get(v) ?? new Map(); ps.set(face(c.object), (ps.get(face(c.object)) ?? 0) + 1); profiles.set(v, ps); }
}
console.log(`═══ THE CAST — who acts in the Odyssey ═══`);
for (const e of [...cast.values()].sort((a, b) => b.n - a.n).slice(0, 12))
  console.log(`  ${e.s.padEnd(16)} ${String(e.n).padEnd(4)} ${[...e.verbs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([v, n]) => `${v}×${n}`).join(" ")}`);

console.log(`\n═══ THE RIM — the recurring relations ═══`);
const rel = new Map();
for (const c of clauses) if (c.subject && c.object) { const s = face(c.subject), o = face(c.object), v = String(c.verb); const k = `${s}—${v}→${o}`; rel.set(k, (rel.get(k) ?? 0) + 1); }
for (const [k, n] of [...rel.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18)) console.log(`  ×${n}  ${k}`);

// SURPRISE — verbs the Iliad (as prior) never taught
const newv = [...new Set(clauses.map((c) => String(c.verb)).filter(Boolean))].filter((v) => !iliadVerbs.has(v));
console.log(`\n═══ SURPRISE — verbs the Iliad-as-prior never taught: ${newv.length} of ${new Set(clauses.map((c)=>String(c.verb))).size} ═══`);
console.log(`  ${newv.slice(0, 24).join("  ")}`);

// SCENES — cut the clause stream at blinks (Murch: a short clause after long ones)
const lens = clauses.map((c) => String(c.verb ?? "").length + (face(c.subject) || "").length);
const blinks = new Set();
for (let i = 1; i < lens.length; i++) { const w = lens.slice(Math.max(0, i - 3), i); if (!w.length) continue; const m = w.reduce((a, b) => a + b, 0) / w.length; if (lens[i] <= m * 0.65 && lens[i] >= 1) blinks.add(i); }
console.log(`\n═══ THE SCENES — ${blinks.size} blinks over ${clauses.length} clauses ═══`);
let sc = 0, rendered = 0;
for (let i = 0; i < clauses.length; i++) {
  if (blinks.has(i) && i > 0) { console.log(`   · (scene ${++sc} blink at #${i})`); rendered = 0; }
  if (rendered < 3 && (clauses[i].subject || clauses[i].object)) {
    console.log(`      ${(face(clauses[i].subject) || "(pro-drop)").padEnd(12)} ${String(clauses[i].verb)?.padEnd(12)} ${face(clauses[i].object)}`);
    rendered++;
  }
}
const top = [...cast.values()].sort((a, b) => b.n - a.n)[0];
console.log(`\n═══ FOLDED SUMMARY ═══`);
console.log(`  The Odyssey is predominantly acted by ${top ? top.s : "…"}: ${[...top.verbs.keys()].slice(0, 5).join(", ")}, over ${clauses.length} clauses.`);
console.log(`  ${newv.length} verbs not taught by the Iliad — the nostos/household idiom (νοστῆσαι, μνῆστες, χαῖρε).`);