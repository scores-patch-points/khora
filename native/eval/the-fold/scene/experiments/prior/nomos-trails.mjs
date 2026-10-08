// nomos-trails.mjs — CROSS-BOOK STIGMERGY (rung DEF). The nomos is the CARRIED GROUND:
// reading in time means the trails laid by an earlier book are the expectations a later
// book departs from. This is stigmergy ACROSS the corpus, not within one read.
//
//   PASS 1  deposit · evaporate (×0.92) · prune (<0.05) over the Greek ILIAD's referent-
//           kinds. What SURVIVES is the Iliad's nomos — the ground carried forward.
//
//   PASS 2  continue the SAME trail map into the ODYSSEY, scene by scene. A scene that
//           holds a referent-kind the Iliad already trail-set deposits +1 on that KNOWN
//           (expected) trail. A referent-kind the Iliad NEVER trail-set opens a FRESH
//           `new:` trail — the book's departure from the carried ground. New trails face
//           the same evaporation: the ones that SURVIVE are the book's new material MADE
//           VISIBLE as trails, not counted as words.
//
//   FALSIFIER  a surviving `new:` trail that is actually present in the Iliad's deposits
//           (a taught kind mis-flagged as new). Two reads: (a) an exact mis-flag against
//           the Iliad deposit SET; (b) a coarse-stem ALIAS (the kind function fragmenting
//           one referent across books). Either firing means a `new:` is not new.
//
// No model, no fitted threshold: deposit · evaporate · prune, the ant-swarm's own memory.
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

const ILIAD_CHARS = Number(process.argv[2] || 90000);
const ODY_CHARS = Number(process.argv[3] || 190000);
const EVAP = Number(process.argv[4] || 0.92);
const PRUNE = 0.05, SURVIVE = 0.8, MIN_LEN = 4;

const strip = (t) => t.replace(/^---[\s\S]*?\n---\n/, "");
const iliadT = strip(fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-iliad.txt", "utf8")).slice(0, ILIAD_CHARS);
const odyT = strip(fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-odyssey.txt", "utf8")).slice(0, ODY_CHARS);
const readC = (t) => { const o = []; for (const s of t.split(/(?<=[.;—])/g)) if (s.trim().length > 3) for (const c of greekClauses(s.trim(), ALL, posPrior, casePrior, { articleMode: "soft", minShare: 0.6, minCount: 20 })) o.push(c); return o; };
const iliadClauses = readC(iliadT);
const odyClauses = readC(odyT);

// SCENES: bound by a significant holograph revision (bayes ≥ p90, local max) — the SAME
// segmentation as scene-trails. The Iliad seeds the holograph; the Odyssey is admitted
// into that SAME holograph, so its boundaries are its deviation from the carried ground.
function scenesOf(clauses, holo) {
  const B = clauses.map((c) => admit(holo, { position: `${seat(c.subject)}:${seat(c.object)}`, actor: face(c.subject) || "(∅)", action: String(c.verb ?? "·"), outcome: c.object ? face(c.object) : "∅" }).bayes);
  const TH = [...B].filter(Number.isFinite).sort((a, b) => a - b)[Math.floor(B.length * 0.9)] ?? 0;
  const scenes = []; let cur = [];
  for (let i = 0; i < clauses.length; i++) {
    const rev = Number.isFinite(B[i]) && B[i] >= TH && B[i] > (B[i - 1] ?? 0) && B[i] >= (B[i + 1] ?? 0);
    if (rev && cur.length >= MIN_LEN) { scenes.push(cur); cur = []; }
    cur.push(clauses[i]);
  }
  if (cur.length) scenes.push(cur);
  return scenes;
}
const holo = createHolograph({ alpha: 1 });
const iliadScenes = scenesOf(iliadClauses, holo);   // holo now carries the Iliad
const odyScenes = scenesOf(odyClauses, holo);        // continues into the Odyssey

// a scene's referent-kinds: closed-class referents are GROUND, never a kind.
const CLOSED = new Set(["ος", "συ", "σε", "εγω", "εμε", "με", "πας", "πολυς", "αλλος", "τι", "τις", "αυτος", "το", "ο", "ημεις", "υμεις", "ον", "ω", "α", "ε", "γαρ", "μεν"]);
const kindsOfScene = (sc) => {
  const ks = new Set();
  for (const c of sc) for (const x of [c.subject, c.object]) { if (!x) continue; const f = face(x); if (!f) continue; const k = kindOf(f); if (k.length > 2 && !CLOSED.has(k)) ks.add(k); }
  return ks;
};
const evaporate = (map) => { for (const [k, v] of map) { const nv = v * EVAP; if (nv < PRUNE) map.delete(k); else map.set(k, nv); } };

// ── PASS 1 · deposit over the ILIAD ──────────────────────────────────────────────
const trails = new Map();          // the live trail map (deposit · evaporate · prune)
const origin = new Map();          // kind -> "taught" (Iliad) | "new" (Odyssey-only)
const iliadDeposited = new Set();  // EVERY kind the Iliad ever deposited (the falsifier set)
for (const sc of iliadScenes) {
  for (const k of kindsOfScene(sc)) { trails.set(k, (trails.get(k) ?? 0) + 1); iliadDeposited.add(k); origin.set(k, "taught"); }
  evaporate(trails);
}
const nomosSurvivors = [...trails.entries()].filter(([, v]) => v >= SURVIVE).sort((a, b) => b[1] - a[1]);
const nomosStrong = new Set(nomosSurvivors.map(([k]) => k));

// ── PASS 2 · continue the SAME map into the ODYSSEY ──────────────────────────────
const odyKinds = new Set(), newKinds = new Set();
for (const sc of odyScenes) {
  for (const k of kindsOfScene(sc)) {
    odyKinds.add(k);
    if (iliadDeposited.has(k)) { trails.set(k, (trails.get(k) ?? 0) + 1); origin.set(k, "taught"); }
    else { trails.set(k, (trails.get(k) ?? 0) + 1); if (!origin.has(k)) origin.set(k, "new"); newKinds.add(k); }
  }
  evaporate(trails);
}
const taughtSeen = [...odyKinds].filter((k) => iliadDeposited.has(k));
const taughtStrong = [...odyKinds].filter((k) => nomosStrong.has(k));
const newSurvivors = [...trails.entries()].filter(([k, v]) => v >= SURVIVE && origin.get(k) === "new").sort((a, b) => b[1] - a[1]);

// per-scene center: the scene's strongest surviving trail, tagged taught | new.
const centerRows = odyScenes.map((sc, i) => {
  let best = null, bv = 0;
  for (const k of kindsOfScene(sc)) { const v = trails.get(k) ?? 0; if (v > bv) { bv = v; best = k; } }
  const tag = !best ? "—" : (origin.get(best) === "new" ? "new" : "taught");
  const f = sc.map((c) => `${c.verb}`).slice(0, 2).join("/");
  return { i, best, v: bv, tag, f, nNew: [...kindsOfScene(sc)].filter((k) => origin.get(k) === "new").length };
});
const taughtCenters = centerRows.filter((r) => r.tag === "taught").length;
const newCenters = centerRows.filter((r) => r.tag === "new").length;

// ── FALSIFIER · is any surviving `new:` actually taught? ─────────────────────────
const aliases = (s) => {
  let w = nF(stF(s)).replace(/ει|οι|αι/g, "ε").replace(/ου/g, "ο");
  return w.length > 4 ? w.slice(0, 4) : w;
};
const taughtAlias = new Map();
for (const k of iliadDeposited) { const a = aliases(k); if (!taughtAlias.has(a)) taughtAlias.set(a, []); taughtAlias.get(a).push(k); }
const exactFlags = newSurvivors.filter(([k]) => iliadDeposited.has(k)).map(([k]) => k);
const aliasFlags = newSurvivors.filter(([k]) => iliadDeposited.has(k) === false && taughtAlias.has(aliases(k)) && !k.startsWith("v:"))
  .map(([k]) => [k, taughtAlias.get(aliases(k)).slice(0, 3)]);

// ── REPORT ───────────────────────────────────────────────────────────────────────
console.log("════════ nomos-trails — cross-book stigmergy (rung DEF) ════════");
console.log(`ILIAD   ${iliadClauses.length} clauses · ${iliadScenes.length} scenes   (first ${ILIAD_CHARS} chars)`);
console.log(`ODYSSEY ${odyClauses.length} clauses · ${odyScenes.length} scenes   (first ${ODY_CHARS} chars, read against the Iliad-seeded ground)\n`);

console.log(`── PASS 1 · the NOMOS CARRIED (Iliad surviving referent-trails, evap ${EVAP} prune ${PRUNE}) ──`);
console.log(`${nomosSurvivors.length} survival-trails of ${iliadDeposited.size} kinds ever deposited`);
for (const [k, v] of nomosSurvivors.slice(0, 20)) console.log(`  ⛧ ${v.toFixed(2)}  ${k}`);

console.log(`\n── PASS 2 · Odyssey deposits into the SAME map ──`);
console.log(`Odyssey referent-kinds seen: ${odyKinds.size}`);
console.log(`  already trail-strong (Iliad survivors): ${taughtStrong.length}  (${(100 * taughtStrong.length / odyKinds.size).toFixed(1)}%)`);
console.log(`  ever deposited by the Iliad (taught):   ${taughtSeen.length}`);
console.log(`  NEW (never trail-set by the Iliad):     ${newKinds.size}`);

console.log(`\n── the SURPRISE · Odyssey 'new:' kinds that SURVIVED the evaporation ──`);
if (!newSurvivors.length) console.log("  (none survived)");
for (const [k, v] of newSurvivors.slice(0, 20)) console.log(`  ✦ ${v.toFixed(2)}  new:${k}`);

console.log(`\n── per-scene center: taught (expected) or new (deviation) ──`);
for (const r of centerRows) console.log(`  ${String(r.i).padStart(3)}  ${r.tag.padEnd(6)}  ${(r.best ? `${r.best}` : "—").padEnd(12)} (${String(r.v).slice(0, 4)})  nNew=${r.nNew}  ${r.f}`);
console.log(`  split: taught-centered ${taughtCenters} · new-centered ${newCenters} · untrailed ${odyScenes.length - taughtCenters - newCenters}`);

console.log(`\n── named probes (the hypothesized nostos / household set) ──`);
const PROBE = ["νοστ", "μνηστ", "ξειν", "ξεν", "οικ", "πατρι", "πατρ", "θυρε", "θυρ", "σιτ", "πυρ", "οιν", "ναυ", "νεσ"];
for (const p of PROBE) {
  const p2 = nF(stF(p));
  const hits = [...odyKinds].filter((k) => k.includes(p2));
  if (!hits.length) continue;
  for (const k of hits) {
    const v = trails.get(k);
    console.log(`  ${p}* → ${iliadDeposited.has(k) ? "taught:" : "new:"}${k}  trail=${v === undefined ? "evaporated" : v.toFixed(2)}`);
  }
}

console.log(`\n── FALSIFIER · a 'new:' trail actually present in the Iliad's deposits ──`);
console.log(`  (a) exact mis-flag (new ∩ Iliad deposit set): ${exactFlags.length}${exactFlags.length ? " → " + exactFlags.slice(0, 8).join(", ") : "  [clean]"}`);
if (!aliasFlags.length) console.log(`  (b) coarse-stem alias candidates: 0  [clean]`);
else { console.log(`  (b) coarse-stem alias candidates (same stem, different kind string): ${aliasFlags.length}`); for (const [k, t] of aliasFlags.slice(0, 12)) console.log(`        new:${k}  ~  ${t.join(" ")}`); }

let verdict;
if (exactFlags.length) verdict = "FALSIFIED (exact): a surviving 'new:' trail is present in the Iliad's deposit set";
else if (aliasFlags.length) verdict = `mechanism works, with a DISCLOSED leak — cross-book stigmergy makes new material visible as surviving new: trails (carried nomos ${nomosSurvivors.length}; Odyssey scenes ${taughtCenters} taught-centered vs ${newCenters} new-centered), but the falsifier partially fires on the alias read: ${aliasFlags.length} surviving 'new:' kind(s) share a stem with an Iliad deposit (e.g. new:${aliasFlags[0][0]} ~ ${aliasFlags[0][1].join("/")}) — the kind function fragmented a taught referent and mis-flagged it new`;
else verdict = "YES — cross-book stigmergy makes the Odyssey's new material visible as surviving new: trails; the falsifier is clean (no new: kind is in the Iliad's deposits, exact or alias)";
console.log(`\nverdict: ${verdict}`);
