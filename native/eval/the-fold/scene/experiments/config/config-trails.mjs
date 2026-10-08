// config-trails.mjs — RUNG DEF: the stigmergic SCENE-SCRIPT fold (deposit · evaporate · follow).
// Rung CON (scene-trails.mjs) deposited on each referent-KIND a scene holds, so nodes
// recur and survive (ἀνήρ, θυμός, Ζεύς, ξεῖνος …). Rung DEF deposits on the scene's whole
// referent-CONFIGURATION — the sorted set of the scene's referent-kinds (∅ and the closed
// classes excluded), at |config| ≥ 2. A SITUATION-SCRIPT ({guest·house·gift·welcome},
// {gathering·speech·decree}) then survives because its CONFIGURATION recurs, not just its nodes.
//
// Same EOT (Greek Odyssey via lavar/greek.mjs + janus priors), same scene boundary
// (bayes-p90 revisions, min scene length 4), same deposit/evaporate/prune dynamics as the base.
// Extends the base with: a strength-floor SWEEP {0.8,1.0,1.5}, the scene→script sequence,
// and the SCENE-SIZE FREQUENCY-BAND falsifier.
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
const EVAP = Number(process.argv[3] || 0.92);
const FLOORS = (process.argv[4] || "0.8,1.0,1.5").split(",").map(Number);
const odyT = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-odyssey.txt", "utf8").replace(/^---[\s\S]*?\n---\n/, "").slice(0, CHARS);
const iliadT = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-iliad.txt", "utf8").replace(/^---[\s\S]*?\n---\n/, "").slice(0, 50000);
const readC = (t) => { const o = []; for (const s of t.split(/(?<=[.;—])/g)) if (s.trim().length > 3) for (const c of greekClauses(s.trim(), ALL, posPrior, casePrior, { articleMode: "soft", minShare: 0.6, minCount: 20 })) o.push(c); return o; };

const holo = createHolograph({ alpha: 1 });
for (const c of readC(iliadT)) admit(holo, { position: `${seat(c.subject)}:${seat(c.object)}`, actor: face(c.subject) || "(∅)", action: String(c.verb ?? "·"), outcome: c.object ? face(c.object) : "∅" });
const clauses = readC(odyT);
const B = clauses.map((c) => admit(holo, { position: `${seat(c.subject)}:${seat(c.object)}`, actor: face(c.subject) || "(∅)", action: String(c.verb ?? "·"), outcome: c.object ? face(c.object) : "∅" }).bayes);

// scenes (coarse: bayes-p90 revisions, min 4) — identical to the base
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
const refsOf = (sc) => { const ks = new Set(); for (const c of sc) for (const x of [c.subject, c.object]) { if (!x) continue; const f = face(x); if (!f) continue; const k = kindOf(f); if (k.length > 2 && !CLOSED.has(k)) ks.add(k); } return [...ks].sort(); };
// A config of size < 2 is not a script; the singleton case is rung CON's business.
const configKeyOf = (sc) => { const ks = refsOf(sc); return ks.length >= 2 ? ks.join("·") : null; };

// DEPOSIT · EVAPORATE · FOLLOW over the situation-log, keyed on the CONFIGURATION.
// Each scene deposits +1 on its config key (if |config| ≥ 2); every scene then
// evaporates the whole field (×EVAP, prune <0.05). A config SURVIVES because the
// whole co-occurring set recurs — the situation-script, not the recurring node.
const trails = new Map();   // key -> strength
const sources = new Map();  // key -> [scene indices that deposited] (surviving keys only)
const allDeposits = new Map(); // key -> [every scene index that deposited] (never pruned)
for (let i = 0; i < scenes.length; i++) {
  const k = configKeyOf(scenes[i]);
  if (k) {
    trails.set(k, (trails.get(k) ?? 0) + 1);
    if (!sources.has(k)) sources.set(k, []); sources.get(k).push(i);
    if (!allDeposits.has(k)) allDeposits.set(k, []); allDeposits.get(k).push(i);
  }
  for (const [kk, v] of trails) { const nv = v * EVAP; if (nv < 0.05) { trails.delete(kk); sources.delete(kk); } else trails.set(kk, nv); }
}
// RECURRENCE: a config-trail can only carry a script if the SAME configuration
// recurs (multiplicity ≥ 2). A [×1] survivor is a freshness tail (one deposit,
// then evaporation), not recurrence.
const recur = [...allDeposits.entries()].filter(([, idx]) => idx.length >= 2);
const maxMult = allDeposits.size ? Math.max(...[...allDeposits.values()].map((v) => v.length)) : 0;
const tailOnly = [...trails.entries()].every(([k]) => (allDeposits.get(k) ?? []).length === 1);

// ── THE SCENE-SIZE FREQUENCY-BAND (the falsifier's control) ──────────────────
// A surviving config must not be a scene-size band in disguise. Build the same
// stigmergy keyed only on the scene's size bucket (multiples of 3 clauses). If a
// surviving config's scenes ALL fall in one size bucket, its recurrence is a
// property of that scene size, not of referent identity → falsified.
const bandOf = (n) => `sz${Math.min(9, Math.floor(n / 3))}`;
const bands = scenes.map((sc) => bandOf(sc.length));
const bandTrails = new Map();
for (let i = 0; i < scenes.length; i++) {
  const k = bands[i]; bandTrails.set(k, (bandTrails.get(k) ?? 0) + 1);
  for (const [kk, v] of bandTrails) { const nv = v * EVAP; if (nv < 0.05) bandTrails.delete(kk); else bandTrails.set(kk, nv); }
}
const bandFreq = new Map(); for (const b of bands) bandFreq.set(b, (bandFreq.get(b) ?? 0) + 1);
const modalBand = [...bandFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

const survivorsAt = (floor) => [...trails.entries()].filter(([, v]) => v >= floor).sort((a, b) => b[1] - a[1]);

console.log(`RUNG DEF · CONFIG-TRAILS (scene → its referent-CONFIGURATION)\n${clauses.length} clauses · ${scenes.length} scenes · EVAP ${EVAP} prune <0.05\n`);
console.log(`scene sizes: min ${Math.min(...scenes.map((s) => s.length))} · max ${Math.max(...scenes.map((s) => s.length))} · modal size-band ${modalBand} (×${bandFreq.get(modalBand)})`)
console.log(`config RECURRENCE: ${allDeposits.size} distinct configs laid · ${trails.size} still above the 0.05 prune at the end · ${recur.length} recur (×≥2) · max multiplicity ${maxMult}${recur.length === 0 ? "  ← NO configuration ever repeats" : ""}\n`);

// ── THE STRENGTH-FLOOR SWEEP ────────────────────────────────────────────────
for (const fl of FLOORS) {
  const sv = survivorsAt(fl);
  console.log(`═══ FLOOR ${fl.toFixed(2)} — ${sv.length} SURVIVING CONFIG-TRAILS (situation-scripts) ═══`);
  for (const [k, v] of sv) {
    const idx = sources.get(k) ?? [];
    const bs = new Set(idx.map((i) => bands[i]));
    const multi = (allDeposits.get(k) ?? []).length;
    const flag = bs.size === 1 ? (bands[idx[0]] === modalBand ? "  ⚠ SIZE-BAND (modal)" : "  ⚠ SIZE-BAND") : "";
    const fresh = multi === 1 ? "  · SINGLE-DEPOSIT (freshness tail, not recurrence)" : "";
    console.log(`  ⛧ ${v.toFixed(2)}  [×${idx.length}]  {${k.replace(/·/g, ", ")}}  scenes[${idx.join(",")}]${flag}${fresh}`);
  }
  console.log("");
}

// ── THE SCENE → SCRIPT SEQUENCE (first 20) ──────────────────────────────────
// Primary floor = the lowest swept (0.8). A scene is assigned the STRONGEST
// surviving script whose referent-set is CONTAINED in the scene's referent-set
// (the scene enacts every script it holds; the strongest wins the label).
const PRIMARY = FLOORS[0];
const surv = survivorsAt(PRIMARY);
const survSets = surv.map(([k, v]) => [new Set(k.split("·")), v, k]);
console.log(`═══ SCENE → SCRIPT (strongest surviving script @ floor ${PRIMARY}, same EOT as base) ═══`);
for (let i = 0; i < Math.min(20, scenes.length); i++) {
  const refs = new Set(refsOf(scenes[i]));
  let best = null, bv = 0;
  for (const [set, v, k] of survSets) { if ([...set].every((x) => refs.has(x)) && v > bv) { bv = v; best = k; } }
  const own = configKeyOf(scenes[i]);
  const form = scenes[i].map((c) => `${c.verb}`).slice(0, 2).join("/");
  console.log(`  ${String(i).padStart(2)}  ${best ? `⛧ ${best.replace(/·/g, "·")}` : "— (no surviving script)"}  ${best ? `(${bv.toFixed(2)})` : ""}  ${own ? `own={${own.replace(/·/g, ", ")}}` : "own=∅"}  ${form}`);
}

// ── THE FALSIFIER VERDICT ───────────────────────────────────────────────────
console.log(`\n═══ FALSIFIER: config == a scene-size frequency band? ═══`);
const flagged = [];
for (const [k, v] of surv) {
  const idx = sources.get(k) ?? [];
  const multi = (allDeposits.get(k) ?? []).length;
  const bs = new Set(idx.map((i) => bands[i]));
  const uniband = bs.size === 1;
  const band = uniband ? bands[idx[0]] : null;
  const bandStrength = band ? (bandTrails.get(band) ?? 0) : 0;
  const artifact = uniband && band === modalBand;
  if (artifact) flagged.push(k);
  console.log(`  ${artifact ? "FALSIFIED" : "genuine  "}  ${v.toFixed(2)}  ×${multi}  {${k.replace(/·/g, ", ")}}  bands[${[...bs].join(",")}]${uniband ? ` uniband ${band} (band-trail ${bandStrength.toFixed(2)})` : ""}`);
}
console.log(`\nVERDICT (size-band): ${flagged.length ? `falsifier FIRES on ${flagged.length}/${surv.length} surviving configs @ floor ${PRIMARY}: ${flagged.join(" | ")}` : `falsifier does NOT fire @ floor ${PRIMARY} — no surviving config is a modal scene-size band in disguise`}`);
console.log(`VERDICT (freshness): ${recur.length === 0 ? `FIRES — ${allDeposits.size} configs laid, 0 recur (all ×1); every survivor is a fresh last-laid tail, not recurrence` : `${recur.length} configs recur (×≥2); the script premise is met for those`}`);
console.log(`VERDICT (rung DEF): ${recur.length === 0 ? "FALSIFIED at this EOT — no referent-CONFIGURATION ever recurs, so no situation-script survives BY ITS CONFIGURATION; rung DEF needs MORE TIME (the whole corpus), as the standing law predicts" : "config recurrence EXISTS — the scripts above are candidates"}`);
