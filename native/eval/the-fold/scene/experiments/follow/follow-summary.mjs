// follow-summary.mjs — THE FOLLOWED SUMMARY (REC rung). Extends scene-trails.mjs.
// The stigmergic pass is run once (deposit · evaporate 0.92 · prune 0.05): every
// scene deposits +1 on each referent-kind it holds; every scene evaporates the rest.
// The surviving kinds are the shared memory. Then FOLLOW: walk the scenes in story
// order; each scene's line is its strongest SURVIVING trail (center >= 0.8). Scenes
// whose strongest trail is below 0.8 are UNKINDED GAPS — typed, never guessed.
// The FOLLOWED SUMMARY is the surviving center-kinds in story order, deduplicated to
// consecutive runs: the chapter's own referent-spine. The falsifier asks whether that
// spine is just the order of first appearances (a rehash) or a real arc (with returns).
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

// DEPOSIT · EVAPORATE · FOLLOW — stigmergy over the situation-log (the memory).
const trails = new Map();
const EVAP = Number(process.argv[3] || 0.92);
const SCENE_KINDS = scenes.map((sc) => {
  const ks = new Set();
  for (const c of sc) for (const x of [c.subject, c.object]) { if (!x) continue; const f = face(x); if (!f) continue; const k = kindOf(f); if (k.length > 2 && !CLOSED.has(k)) ks.add(k); }
  return ks;
});
for (let i = 0; i < scenes.length; i++) {
  for (const k of SCENE_KINDS[i]) trails.set(k, (trails.get(k) ?? 0) + 1);
  for (const [k, v] of trails) { const nv = v * EVAP; if (nv < 0.05) trails.delete(k); else trails.set(k, nv); }
}

const SURVIVE = 0.8;
const survivors = [...trails.entries()].filter(([, v]) => v >= SURVIVE).sort((a, b) => b[1] - a[1]);
const survivorSet = new Set(survivors.map(([k]) => k));

console.log(`${clauses.length} clauses · ${scenes.length} scenes · referent-trails laid: ${trails.size} · SURVIVING (>= ${SURVIVE}): ${survivors.length}\n`);
console.log("surviving referent-kinds (the memory):");
for (const [k, v] of survivors) console.log(`  ⛧ ${v.toFixed(2)}  ${k}`);

// FOLLOW — walk the scenes in order; each scene's line is its strongest SURVIVING
// trail. A scene whose strongest trail is below 0.8 is an unkinded gap: it is TYPED
// (its best sub-threshold candidate named) but never guessed into a center.
const lines = [];   // per scene: { i, center|null, val, best, bestVal, verbs }
for (let i = 0; i < scenes.length; i++) {
  let best = null, bestVal = 0, surv = null, survVal = 0;
  for (const k of SCENE_KINDS[i]) {
    const v = trails.get(k) ?? 0;
    if (v > bestVal) { bestVal = v; best = k; }
    if (survivorSet.has(k) && v > survVal) { survVal = v; surv = k; }
  }
  const verbs = scenes[i].map((c) => `${c.verb}`).slice(0, 2).join("/");
  lines.push({ i, center: surv, val: survVal, best, bestVal, verbs });
}

console.log(`\nthe followed lines (scene → its strongest SURVIVING referent-trail):`);
for (const L of lines) {
  if (L.center) console.log(`  (center: ${L.center}, in scene ${L.i})   ⛧ ${L.val.toFixed(2)}   ${L.verbs}`);
  else console.log(`  (center: —, in scene ${L.i})   unkinded gap: best ${L.best ?? "∅"} ${L.bestVal.toFixed(2)} < ${SURVIVE}   ${L.verbs}`);
}

// THE FOLLOWED SUMMARY: surviving center-kinds in story order, dedup-to-consecutive.
const spine = [];
for (const L of lines) if (L.center && L.center !== spine[spine.length - 1]) spine.push(L.center);
const gaps = lines.filter((L) => !L.center);
const gapKinds = new Map();
for (const g of gaps) gapKinds.set(g.best ?? "∅", (gapKinds.get(g.best ?? "∅") ?? 0) + 1);

// FALSIFIER: the order of FIRST appearance of each surviving center-kind (the first
// scene at which it becomes a center) vs the followed spine.
const firstSeen = [];
const seen = new Set();
for (const L of lines) if (L.center && !seen.has(L.center)) { seen.add(L.center); firstSeen.push(L.center); }
const same = spine.length === firstSeen.length && spine.every((k, i) => k === firstSeen[i]);

console.log(`\n═══ THE FOLLOWED SUMMARY (the chapter's own spine) ═══`);
console.log(`  ${spine.join(" → ")}`);
console.log(`\n  spine length: ${spine.length} (from ${lines.length - gaps.length} kinded scenes, ${gaps.length} gaps)`);
console.log(`\n═══ UNKINDED GAPS (strongest surviving trail < ${SURVIVE}; typed, never guessed) ═══`);
console.log(`  count: ${gaps.length} of ${scenes.length} scenes (${(100 * gaps.length / scenes.length).toFixed(1)}%)`);
for (const [k, n] of [...gapKinds.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`    ${k} ×${n}`);
console.log(`  scenes: ${gaps.map((g) => g.i).join(", ")}`);

console.log(`\n═══ FALSIFIER: first-appearance order vs followed spine ═══`);
console.log(`  first appearance : ${firstSeen.join(" → ")}`);
console.log(`  followed spine   : ${spine.join(" → ")}`);
console.log(`  identical?       : ${same ? "YES — the following added nothing (rehash)" : "NO — the spine returns to kinds, so following is real"}`);

// does it read as a referent-arc? count the returns (recurrences after a gap)
let returns = 0; const lastAt = new Map();
for (let i = 0; i < spine.length; i++) { if (lastAt.has(spine[i]) && lastAt.get(spine[i]) < i - 1) returns++; lastAt.set(spine[i], i); }
console.log(`\n  recurrences (a kind returning after ≥1 other center): ${returns}`);
console.log(`  distinct centers: ${new Set(spine).size} over ${spine.length} runs`);
