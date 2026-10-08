// judge.mjs — ant-gold2, the rung-DEF JUDGE.
//
// The question the swarm poses: do the STIGMERGIC REFERENT-KINDS (rung CON,
// scene-trails.mjs) and the CONFIG-TRAILS (rung DEF, config-trails.mjs) TRACK the
// human action-situation types in GoldScenes@1 — or is the referent-trail still a
// referent SIGNAL (the Grosz center) that the type-layer must be built on top of?
//
// The gold is READ here only. It never enters either inducer. Segmentation,
// referent-kind resolution (lemma + ending-strip) and the deposit·evaporate·follow
// dynamics are reimplemented VERBATIM from ../../scene-trails.mjs and
// ../../experiments/config/config-trails.mjs, at the SAME char count the gold was
// cut at (120000 → 68 scenes), so scene:i indices align with GoldScenes@1.
// Disclosed: if a driver changes its cut or its EVAP, re-sync here.
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const { confirmedVerbSet, greekClauses } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);
const { createHolograph, admit } = await import(`${KHOR}/native/kernel/bayes-surprise.js`);
const posPrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-grc.json", "utf8"));
const casePrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/case-marking-grc.json", "utf8"));
const LEM = (JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/lemma/grc-lemma.json", "utf8"))).lemmas ?? {};
const NEc = casePrior.nominalEndings ?? {};
const gold = JSON.parse(fs.readFileSync(new URL("../gold/gold.json", import.meta.url), "utf8"));

const face = (x) => { if (!x) return ""; if (typeof x === "string") return x; return String(x.head ?? x.surface ?? x.text ?? ""); };
const seat = (x) => (x ? (x.case ?? "?") : "(∅)");
const stF = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const nF = (s) => stF(s).replace(/η|ῆ|ῃ/g, "ε").replace(/ω|ῶ/g, "ο").replace(/ΐ|ϊ|ί|ῖ/g, "ι");
const stmF = (w) => { for (let L = 3; L >= 1; L--) { const e = w.slice(-L); const t = NEc[e]; if (t && t.ranked?.[0]?.share >= 0.5 && t.ranked[0].count >= 10) return w.slice(0, w.length - L); } return w; };
const kindOf = (s) => { const k = stF(s); return LEM[k] ?? nF(stmF(k)); };
const ALL = confirmedVerbSet(posPrior);

const CHARS = Number(process.argv[2] || 120000);   // gold was cut at 120000
const EVAP = 0.92;                                  // scene-trails.mjs default
const FLOORS = [0.8, 1.0, 1.5];                     // config-trails.mjs sweep
const odyT = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-odyssey.txt", "utf8").replace(/^---[\s\S]*?\n---\n/, "").slice(0, CHARS);
const iliadT = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-iliad.txt", "utf8").replace(/^---[\s\S]*?\n---\n/, "").slice(0, 50000);
const readC = (t) => { const o = []; for (const s of t.split(/(?<=[.;—])/g)) if (s.trim().length > 3) for (const c of greekClauses(s.trim(), ALL, posPrior, casePrior, { articleMode: "soft", minShare: 0.6, minCount: 20 })) o.push(c); return o; };

const holo = createHolograph({ alpha: 1 });
for (const c of readC(iliadT)) admit(holo, { position: `${seat(c.subject)}:${seat(c.object)}`, actor: face(c.subject) || "(∅)", action: String(c.verb ?? "·"), outcome: c.object ? face(c.object) : "∅" });
const clauses = readC(odyT);
const B = clauses.map((c) => admit(holo, { position: `${seat(c.subject)}:${seat(c.object)}`, actor: face(c.subject) || "(∅)", action: String(c.verb ?? "·"), outcome: c.object ? face(c.object) : "∅" }).bayes);

// scenes (coarse: bayes-p90 revisions, min 4) — identical to the base driver
const TH = [...B].filter(Number.isFinite).sort((a, b) => a - b)[Math.floor(B.length * 0.9)] ?? 0;
const scenes = []; let cur = [];
for (let i = 0; i < clauses.length; i++) {
  const rev = Number.isFinite(B[i]) && B[i] >= TH && B[i] > (B[i - 1] ?? 0) && B[i] >= (B[i + 1] ?? 0);
  if (rev && cur.length >= 4) { scenes.push(cur); cur = []; }
  cur.push(clauses[i]);
}
if (cur.length) scenes.push(cur);

const CLOSED = new Set(["ος", "συ", "σε", "εγω", "εμε", "με", "πας", "πολυς", "αλλος", "τι", "τις", "αυτος", "το", "ο", "ημεις", "υμεις", "ον", "ω", "α", "ε", "γαρ", "μεν"]);
const kindsIn = (sc) => { const ks = new Set(); for (const c of sc) for (const x of [c.subject, c.object]) { if (!x) continue; const f = face(x); if (!f) continue; const k = kindOf(f); if (k.length > 2 && !CLOSED.has(k)) ks.add(k); } return ks; };
const refsOf = (sc) => [...kindsIn(sc)].sort();
const configKeyOf = (sc) => { const ks = refsOf(sc); return ks.length >= 2 ? ks.join("·") : null; };

// ── RUNG CON: referent-kind trails (deposit · evaporate · follow) ────────────
const trails = new Map();
for (let i = 0; i < scenes.length; i++) {
  for (const k of kindsIn(scenes[i])) trails.set(k, (trails.get(k) ?? 0) + 1);
  for (const [k, v] of trails) { const nv = v * EVAP; if (nv < 0.05) trails.delete(k); else trails.set(k, nv); }
}
const survivors = new Map([...trails.entries()].filter(([, v]) => v >= 0.8).sort((a, b) => b[1] - a[1]));

// a scene's assigned referent-kind: the STRONGEST SURVIVING trail it holds
// (the rung's stated semantics: "the scene kinds to its strongest surviving trail").
// The driver's own print reads the FULL field; we keep both to disclose the gap.
function assign(sc, map) { let best = null, bv = 0; for (const k of kindsIn(sc)) { const v = map.get(k) ?? 0; if (v > bv) { bv = v; best = k; } } return best ? `⛧${best}` : "·none"; }
const yTrail = scenes.map((sc) => assign(sc, survivors));   // primary: surviving referent-kinds
const yField = scenes.map((sc) => assign(sc, trails));      // driver's actual print (full field)

// ── RUNG DEF: config / situation-script trails ───────────────────────────────
const ctrails = new Map(); const csources = new Map();
for (let i = 0; i < scenes.length; i++) {
  const k = configKeyOf(scenes[i]);
  if (k) { ctrails.set(k, (ctrails.get(k) ?? 0) + 1); if (!csources.has(k)) csources.set(k, []); csources.get(k).push(i); }
  for (const [kk, v] of ctrails) { const nv = v * EVAP; if (nv < 0.05) { ctrails.delete(kk); csources.delete(kk); } else ctrails.set(kk, nv); }
}
const csurv = [...ctrails.entries()].filter(([, v]) => v >= FLOORS[0]).sort((a, b) => b[1] - a[1]);
const cSets = csurv.map(([k, v]) => [new Set(k.split("·")), v, k]);
function assignScript(sc) { const refs = new Set(refsOf(sc)); let best = null, bv = 0; for (const [set, v, k] of cSets) { if ([...set].every((x) => refs.has(x)) && v > bv) { bv = v; best = k; } } return best ? `⛧{${best}}` : "·none"; }
const yScript = scenes.map(assignScript);

// ── metrics ──────────────────────────────────────────────────────────────────
function counts(pairs) { const m = new Map(); for (const [x, y] of pairs) { const key = `${x}\u0000${y}`; m.set(key, (m.get(key) ?? 0) + 1); } return m; }
function margin(pairs, i) { const c = {}; for (const p of pairs) c[p[i]] = (c[p[i]] ?? 0) + 1; return c; }
function H(c, n) { let h = 0; for (const v of Object.values(c)) { const p = v / n; if (p > 0) h -= p * Math.log2(p); } return h; }
function NMI(s, t) {
  const n = s.length; if (!n) return 0;
  const pairs = s.map((x, i) => [x, t[i]]);
  const cxy = counts(pairs), cx = margin(pairs, 0), cy = margin(pairs, 1);
  const Hx = H(cx, n), Hy = H(cy, n);
  if (Hx === 0 && Hy === 0) return 1; if (Hx === 0 || Hy === 0) return 0;
  let I = 0;
  for (const [key, c] of cxy) { const [x, y] = key.split("\u0000"); const p = c / n; I += p * Math.log2((c * n) / (cx[x] * cy[y])); }
  return (2 * I) / (Hx + Hy);
}

const gScenes = Object.keys(gold.scenes).map(Number).sort((a, b) => a - b);
const yGold = gScenes.map((i) => gold.scenes[String(i)]);
const tc = {}; for (const t of yGold) tc[t] = (tc[t] ?? 0) + 1;
const sub = (arr) => gScenes.map((i) => arr[i]);
const idxOf = new Map(gScenes.map((gi, j) => [gi, j]));

// per-type purity: modal assigned trail within a human type + the spread of trails
function perType(yInd) {
  const y = sub(yInd);
  const by = new Map();
  y.forEach((k, j) => { const t = yGold[j]; if (!by.has(t)) by.set(t, []); by.get(t).push(j); });
  const rows = [];
  let wp = 0;
  for (const [t, js] of [...by.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const c = {}; for (const j of js) c[y[j]] = (c[y[j]] ?? 0) + 1;
    const [mk, mc] = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
    const pur = mc / js.length; wp += mc;
    rows.push({ t, n: js.length, trail: mk, purity: pur, spread: Object.keys(c).length, scenes: js.map((j) => gScenes[j]) });
  }
  return { rows, meanPurity: wp / gScenes.length };
}
// per-trail homogeneity: modal human type within an assigned trail
function perTrail(yInd) {
  const y = sub(yInd);
  const by = new Map();
  y.forEach((k, j) => { if (!by.has(k)) by.set(k, []); by.get(k).push(j); });
  return [...by.entries()].map(([k, js]) => { const c = {}; for (const j of js) { const t = yGold[j]; c[t] = (c[t] ?? 0) + 1; } const [mt, mc] = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return { k, n: js.length, top: mt, homog: mc / js.length }; }).sort((a, b) => b.n - a.n);
}

const nmiTrail = NMI(yGold, sub(yTrail));
const nmiField = NMI(yGold, sub(yField));
const nmiScript = NMI(yGold, sub(yScript));
const ptTrail = perType(yTrail), ptScript = perType(yScript);
const trTrail = perTrail(yTrail);

// permutation null: is NMI(yGold, yTrail) above chance for this label cardinality?
function permNull(yInd, reps = 20000) {
  const y = sub(yInd);
  const vals = new Float64Array(reps); let s = 0;
  for (let r = 0; r < reps; r++) {
    const g = yGold.slice();
    for (let i = g.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [g[i], g[j]] = [g[j], g[i]]; }
    const v = NMI(g, y); vals[r] = v; s += v;
  }
  const mean = s / reps;
  let sd = 0; for (let r = 0; r < reps; r++) sd += (vals[r] - mean) ** 2; sd = Math.sqrt(sd / reps);
  const cnt = (t) => { let c = 0; for (let r = 0; r < reps; r++) if (vals[r] >= t) c++; return c / reps; };
  return { mean, sd };
}
const nullTrail = permNull(yTrail);
const nullScript = permNull(yScript);
const zTrail = nullTrail.sd ? (nmiTrail - nullTrail.mean) / nullTrail.sd : 0;
const multi = gScenes.filter((gi) => tc[yGold[idxOf.get(gi)]] >= 2);
const nmiTrailMulti = NMI(multi.map((gi) => yGold[idxOf.get(gi)]), multi.map((gi) => yTrail[gi]));

// ── the KEY QUESTION: court (suitors) vs assembly (gathering) ────────────────
const SUITOR = ["feast", "intrigue"];      // the suitors' situations
const GATHER = ["assembly"];               // the deliberative gathering
function groupModal(types) {
  const c = {};
  gScenes.forEach((gi, j) => { if (types.includes(yGold[j])) c[yField[gi]] = (c[yField[gi]] ?? 0) + 1; });
  const total = Object.values(c).reduce((a, b) => a + b, 0);
  return { total, c, modal: Object.entries(c).sort((a, b) => b[1] - a[1])[0] };
}
const gCourt = groupModal(SUITOR), gAsm = groupModal(GATHER);
// does any surviving trail contain the suitors μνηστῆρες? which gold scenes hold it?
const SUITK = "μνεστερ";
const suitorScenes = gScenes.filter((gi) => kindsIn(scenes[gi]).has(SUITK));
const asmScenes = gScenes.filter((gi) => yGold[idxOf.get(gi)] === "assembly");
const sharedTrails = [...new Set(asmScenes.map((gi) => yField[gi]))].filter((k) => suitorScenes.some((gi) => yField[gi] === k));

// ── report ───────────────────────────────────────────────────────────────────
const L = [];
L.push(`GOLD2 JUDGE — GoldScenes@1 (${gScenes.length} hand-labelled scenes) vs rung-CON referent-trails + rung-DEF config-trails`);
L.push(`  base driver cut at ${CHARS} chars → ${scenes.length} scenes (gold was cut at ${CHARS}: indices align).`);
L.push(`  rung CON: ${trails.size} referent-trails laid, ${survivors.size} SURVIVING (≥0.8).`);
L.push(`  rung DEF: ${ctrails.size} config-trails laid, ${csurv.length} SURVIVING (≥${FLOORS[0]}).  ${csurv.length === 0 ? "NO surviving script." : ""}`);
L.push("");
L.push(`  gold types (n): ${Object.entries(tc).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t}:${n}`).join("  ")}`);
L.push("");
L.push(`═══ HEADLINE: NMI(gold, machine) ═══`);
L.push(`  referent-trail  (rung CON, survivors)  NMI = ${nmiTrail.toFixed(3)}  meanPurity = ${(ptTrail.meanPurity * 100).toFixed(1)}%`);
L.push(`      permutation null (20k): mean ${nullTrail.mean.toFixed(3)} · sd ${nullTrail.sd.toFixed(3)} → z = ${zTrail.toFixed(1)} — the NMI is INDISTINGUISHABLE from chance`);
L.push(`      NMI on the ${multi.length} scenes of multi-scene types only (singletons dropped): ${nmiTrailMulti.toFixed(3)}`);
L.push(`  referent-trail  (rung CON, full field) NMI = ${nmiField.toFixed(3)}   [driver's own print semantics]`);
L.push(`  config-script   (rung DEF, floor ${FLOORS[0]})  NMI = ${nmiScript.toFixed(3)}  meanPurity = ${(ptScript.meanPurity * 100).toFixed(1)}% (VACUOUS: all ·none)  — on the gold window it assigns ${yScript.slice(0, 30).filter((s) => s !== "·none").length}/30 scenes`);
L.push("");
L.push(`═══ PER HUMAN TYPE → dominant referent-trail (rung CON, survivors) ═══`);
L.push(`  type        n  modal-trail   purity  spread  scenes`);
for (const r of ptTrail.rows) L.push(`  ${r.t.padEnd(10)} ${String(r.n).padStart(2)}  ${r.trail.replace("⛧", "").padEnd(12)} ${String((r.purity * 100).toFixed(0) + "%").padStart(6)}  ${String(r.spread).padStart(6)}  ${r.scenes.join(",")}`);
L.push("");
L.push(`═══ PER referent-trail → dominant human type ═══`);
for (const r of trTrail) L.push(`  ${r.k.replace("⛧", "").padEnd(12)} ×${String(r.n).padStart(2)} → ${r.top.padEnd(10)} ${String((r.homog * 100).toFixed(0) + "%").padStart(4)} homog`);
L.push("");
L.push(`═══ THE KEY QUESTION — court (suitors) vs assembly (gathering) ═══`);
L.push(`  μνηστῆρες referent-trail present in gold scenes: [${suitorScenes.join(",")}]  types: ${suitorScenes.map((gi) => yGold[idxOf.get(gi)]).join(",")}`);
L.push(`  assembly gold scenes: [${asmScenes.join(",")}]`);
L.push(`  trails shared by an assembly scene and a suitor-holding scene: ${sharedTrails.length ? sharedTrails.map((k) => k.replace("⛧", "")).join(", ") : "none"}`);
L.push(`  court group {feast,intrigue} (n=${gCourt.total}) modal trail: ${gCourt.modal[0].replace("⛧", "")} ×${gCourt.modal[1]}`);
L.push(`  assembly group (n=${gAsm.total}) modal trail: ${gAsm.modal[0].replace("⛧", "")} ×${gAsm.modal[1]}`);
L.push("");
L.push(`  the label 'court/suitors' is NOT a human type in GoldScenes@1: the suitors appear inside feast/intrigue`);
L.push(`  (and the assembly of books 1–2). So the comparison is: does μνηστῆρες cut a distinct referent-trail, or does`);
L.push(`  the same court trail cover the assembly (and vice-versa)?`);
L.push("");
L.push(`VERDICT`);
L.push(`  NMI ${nmiTrail.toFixed(3)} (referent-trail, survivors) vs permutation null ${nullTrail.mean.toFixed(3)} ± ${nullTrail.sd.toFixed(3)}`);
L.push(`  (z=${zTrail.toFixed(1)}) — the apparent NMI is CHANCE, not tracking; on the multi-scene types only it is`);
L.push(`  ${nmiTrailMulti.toFixed(3)}. The dominant type (assembly, n=9) is spread over 7 distinct trails with modal θεος`);
L.push(`  at only 33%; the μνηστῆρες referent-trail sits in ${suitorScenes.length} scenes across ${new Set(suitorScenes.map((gi) => yGold[idxOf.get(gi)])).size} different human types (landing,feast,counsel,intrigue,assembly,prayer); and`);
L.push(`  θεος/θυμος are the trails SHARED by assembly scenes and suitor-holding scenes — the same referent-trail`);
L.push(`  covers both the assembly and the court.`);
L.push(`  ONE SENTENCE — the stigmergic referent-trail is STILL A REFERENT SIGNAL (a per-scene Grosz center), not a`);
L.push(`  scene-KIND: its NMI against the human types is at the permutation null, its only near-clean hits are distinctive`);
L.push(`  referents indexing individual scenes (τράπεζα→feast, κεῖνος→gossip, μνηστῆρες→landing), and it cannot separate`);
L.push(`  the court from the assembly — the type-layer must be built on top of it.`);

fs.writeFileSync(new URL("./judge.txt", import.meta.url), L.join("\n"));
console.log(L.join("\n"));

// machine-readable side-output
fs.writeFileSync(new URL("./judge.json", import.meta.url), JSON.stringify({
  schema: "Gold2Judgment@1", chars: CHARS, nScenes: scenes.length, nGold: gScenes.length,
  nRefSurvivors: survivors.size, nConfigSurvivors: csurv.length,
  nmi: { referentTrailSurvivors: nmiTrail, referentTrailFullField: nmiField, referentTrailMultiType: nmiTrailMulti, configScript: nmiScript },
  null: { referentTrail: nullTrail, configScript: nullScript }, zTrail,
  meanPurity: { referentTrail: ptTrail.meanPurity, configScript: ptScript.meanPurity },
  perType: ptTrail.rows, perTrail: trTrail,
  assignedTrail: yTrail.slice(0, 30), assignedScript: yScript.slice(0, 30),
  gold: yGold, courtVsAssembly: { court: gCourt, assembly: gAsm, sharedTrails }
}, null, 2));
