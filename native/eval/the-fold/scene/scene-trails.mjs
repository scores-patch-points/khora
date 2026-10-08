// scene-trails.mjs — THE STIGMERGIC SCENE-FOLD (deposit · evaporate · follow).
// The static scene-induction welds because a one-shot proem shares nothing. Here the
// reader walks the WHOLE read causally; every scene DEPOSITS a pheromone on its
// situation-config (its resolved referent-kinds); every deposit EVAPORATES the rest
// (×0.9, prune < 0.05); the KINDS are the trials that SURVIVE because they recur.
// The hunt FOLLOWS the strongest trail. This is the ant-swarm's own memory, applied
// to situations instead of pages. No model, no threshold to fit.
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const { confirmedVerbSet, greekClauses } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);
const { createHolograph, admit } = await import(`${KHOR}/native/kernel/bayes-surprise.js`);
const posPrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-grc.json", "utf8"));
const casePrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/case-marking-grc.json", "utf8"));
const LEM = (JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/lemma/grc-lemma.json", "utf8"))).lemmas ?? {};
const NEc = casePrior.nominalEndings ?? {};

const face = (x) => { if (!x) return ""; if (typeof x === "string") return x; return String(x.head ?? x.surface ?? x.text ?? ""); };
const seat = (x) => (x ? (x.case ?? "?") : "(∅)");
const stF = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const nF = (s) => stF(s).replace(/η|ῆ|ῃ/g, "ε").replace(/ω|ῶ/g, "ο").replace(/ΐ|ϊ|ί|ῖ/g, "ι");
const stmF = (w) => { for (let L = 3; L >= 1; L--) { const e = w.slice(-L); const t = NEc[e]; if (t && t.ranked?.[0]?.share >= 0.5 && t.ranked[0].count >= 10) return w.slice(0, w.length - L); } return w; };
const kindOf = (s) => { const k = stF(s); return LEM[k] ?? nF(stmF(k)); };
const ALL = confirmedVerbSet(posPrior);

const CHARS = Number(process.argv[2] || 190000);
const odyT = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-odyssey.txt", "utf8").replace(/^---[\s\S]*?\n---\n/, "").slice(0, CHARS);
const iliadT = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-iliad.txt", "utf8").replace(/^---[\s\S]*?\n---\n/, "").slice(0, 50000);
const readC = (t) => { const o = []; for (const s of t.split(/(?<=[.;—])/g)) if (s.trim().length > 3) for (const c of greekClauses(s.trim(), ALL, posPrior, casePrior, { articleMode: "soft", minShare: 0.6, minCount: 20 })) o.push(c); return o; };

const holo = createHolograph({ alpha: 1 });
for (const c of readC(iliadT)) admit(holo, { position: `${seat(c.subject)}:${seat(c.object)}`, actor: face(c.subject) || "(∅)", action: String(c.verb ?? "·"), outcome: c.object ? face(c.object) : "∅" });
const clauses = readC(odyT);
const B = clauses.map((c) => admit(holo, { position: `${seat(c.subject)}:${seat(c.object)}`, actor: face(c.subject) || "(∅)", action: String(c.verb ?? "·"), outcome: c.object ? face(c.object) : "∅" }).bayes);

// scenes (coarse: bayes-p90 revisions, min 4)
const lens = clauses.map((c) => String(c.verb ?? "").length + face(c.subject).length + face(c.object).length);
const TH = [...B].filter(Number.isFinite).sort((a, b) => a - b)[Math.floor(B.length * 0.9)] ?? 0;
const scenes = []; let cur = [];
for (let i = 0; i < clauses.length; i++) {
  const rev = Number.isFinite(B[i]) && B[i] >= TH && B[i] > (B[i - 1] ?? 0) && B[i] >= (B[i + 1] ?? 0);
  if (rev && cur.length >= 4) { scenes.push(cur); cur = []; }
  cur.push(clauses[i]);
}
if (cur.length) scenes.push(cur);

// THE CLOSED-CLASS REFERENTS are ground, not kind: exclude them from the config key
const CLOSED = new Set(["ος", "συ", "σε", "εγω", "εμε", "με", "πας", "πολυς", "αλλος", "τι", "τις", "αυτος", "το", "ο", "ημεις", "υμεις", "ον", "ω", "α", "ε", "γαρ", "μεν"]);
const configOf = (sc) => { const ks = new Set(); for (const c of sc) { for (const x of [c.subject, c.object]) { if (!x) continue; const f = face(x); if (!f) continue; const k = kindOf(f); if (k.length > 2 && !CLOSED.has(k)) ks.add(k); } } return [...ks].sort().join("·"); };

// DEPOSIT · EVAPORATE · FOLLOW — stigmergy over the situation-log. A trail is
// per REFERENT-KIND (the node, not the whole config): every scene deposits +1 on
// each referent it holds; every scene EVAPORATES the rest (×EVAP, prune <0.05).
// The kinds are the referents that SURVIVE because they recur — the Grosz center
// and the recurring objects (Zeus, the gods, the suitors) — not a static weld.
const trails = new Map();
const EVAP = Number(process.argv[3] || 0.92);
for (let i = 0; i < scenes.length; i++) {
  const kinds = new Set();
  for (const c of scenes[i]) for (const x of [c.subject, c.object]) { if (!x) continue; const f = face(x); if (!f) continue; const k = kindOf(f); if (k.length > 2 && !CLOSED.has(k)) kinds.add(k); }
  for (const k of kinds) trails.set(k, (trails.get(k) ?? 0) + 1);
  for (const [k, v] of trails) { const nv = v * EVAP; if (nv < 0.05) trails.delete(k); else trails.set(k, nv); }
}

const survivors = [...trails.entries()].filter(([, v]) => v >= 0.8).sort((a, b) => b[1] - a[1]);
console.log(`${clauses.length} clauses · ${scenes.length} scenes · referent-trails laid: ${trails.size} · SURVIVING (recurrent referent-kinds): ${survivors.length}\n`);
for (const [k, v] of survivors.slice(0, 14)) console.log(`  ⛧ ${v.toFixed(2)}  ${k}`);

console.log(`\nthe kinded sequence (scene → its strongest surviving referent-trail):`);
const sset = new Map(survivors);
for (let i = 0; i < scenes.length; i++) {
  let best = null, bv = 0;
  for (const c of scenes[i]) for (const x of [c.subject, c.object]) { if (!x) continue; const k = kindOf(face(x)); const v = trails.get(k) ?? 0; if (v > bv) { bv = v; best = k; } }
  const f = scenes[i].map((c) => `${c.verb}`).slice(0, 2).join("/");
  console.log(`  ${String(i).padStart(2)}  ${best ? `⛧ ${best}` : "—"} (${String(bv).slice(0, 4)})  ${f}`);
}