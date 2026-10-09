// summary-engine.mjs — THE WIRED SUMMARY ENGINE, NO MODEL.
// One pipeline, one entry:
//   KHORA reads  — clauses, beings, coref (activation+locality, measured register),
//                  zero-anaphora (personOf), learning per clause (admit().bayes)
//   RECORD       — the EOT: address-scoped note stream, referents as hash ids,
//                  blinks as G·F·P interpretations (backdrop·cast·scene).
//                  corrections are later notes at the same address, computed on
//                  projection — never a rewrite (P1). -> eot-odyssey-<chars>.json
//   JANUS relates— induceKinds over the bound scene-company
//   PENELOPE mouths— the English fold-summary from the record's own blinks.
// Every figure is an organ reading. The numbered organs share one walk.
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const JANUS = "/Users/mlacy/Documents/3.0/janus";
const { confirmedVerbSet, greekClauses, nominalClass, personOf } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);
const { resolvePronounsByActivation } = await import(`${KHOR}/native/adapters/text/pronouns.js`);
const { createActivation } = await import(`${KHOR}/native/kernel/activation.js`);
const { createHolograph, admit } = await import(`${KHOR}/native/kernel/bayes-surprise.js`);
const { induceKinds } = await import(`${JANUS}/native/organs/kind-induction.js`);
const { g } = await import(`file://${process.cwd()}/translate.mjs`);
const posPrior = JSON.parse(fs.readFileSync(`${JANUS}/priors/pos-grc.json`, "utf8"));
const casePrior = JSON.parse(fs.readFileSync(`${JANUS}/priors/case-marking-grc.json`, "utf8"));
const LEM = (JSON.parse(fs.readFileSync(`${JANUS}/priors/lemma/grc-lemma.json`, "utf8"))).lemmas ?? {};
const NEc = casePrior.nominalEndings ?? {};
const grcPronounRegister = JSON.parse(fs.readFileSync(`${JANUS}/priors/pronoun-grc.json`, "utf8"));
const face = (x) => { if (!x) return ""; if (typeof x === "string") return x; return String(x.head ?? x.surface ?? x.text ?? ""); };
const seat = (x) => (x ? (x.case ?? "?") : "(∅)");
const stF = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const nF = (s) => stF(s).replace(/η|ῆ|ῃ/g, "ε").replace(/ω|ῶ/g, "ο").replace(/ΐ|ϊ|ί|ῖ/g, "ι");
const stmF = (w) => { for (let L = 3; L >= 1; L--) { const e = w.slice(-L); const t = NEc[e]; if (t && t.ranked?.[0]?.share >= 0.5 && t.ranked[0].count >= 10) return w.slice(0, w.length - L); } return w; };
const kindOf = (s) => { const k = stF(s); return LEM[k] ?? nF(stmF(k)); };
const ALL = confirmedVerbSet(posPrior);
const PRON_S = new Set(["οι","τοι","ο","η","οἱ","ος","η","σφε","μιν","αυτος","αυτοι","αυτους","τον","τα","ων","το","τους","ον","ην"]);
const WIN = 160, MIN_A = 0.05, MIN_M = 0.3;

const CHARS = Number(process.argv[2] || 150000);
const odyT = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-odyssey.txt", "utf8").replace(/^---[\s\S]*?\n---\n/, "").slice(0, CHARS);
const sents = odyT.split(/(?<=[.;—])/g).map((text, order) => ({ text, order })).filter((s) => s.text.trim().length > 3);

// ---- KHORA 1 · the clauses, the beings, the referent universe ----
const clauses = [];
for (const s of sents) for (const c of greekClauses(s.text.trim(), ALL, posPrior, casePrior, { articleMode: "soft", minShare: 0.6, minCount: 20 })) clauses.push({ ...c, order: s.order, sent: s.text });
const refMap = new Map();
for (const c of clauses) for (const x of [c.subject, c.object]) {
  const f = face(x); if (!f) continue;
  const cat = nominalClass(f.toLowerCase(), posPrior);
  if (!(cat === "NOUN" || cat === "PROPN")) continue;
  // PROPN ids keep the ACCENT-STRIPPED LEMMA, never the case-stripped stem —
  // so the swap can still reduce it to the glossary stem (N:ζευς -> Zeus).
  const id = cat === "PROPN" ? "N:" + (LEM[stF(f)] ? stF(LEM[stF(f)]) : stF(f)) : kindOf(f);
  refMap.set(f.toLowerCase(), id); refMap.set(stF(f), id);
}
const nameOfId = (id) => {
  if (!id) return null;
  const core = id.startsWith("N:") ? id.slice(2) : id;
  // the swap: the pretty name resolves id → lemma → stem (the case-ending fold
  // the glossary keys on), so an accented-lemma id still renders as the being.
  return (g(core) && !(g(core) ?? "").startsWith("?")) ? g(core)
    : (g(fold(stF(core))) && !(g(fold(stF(core))) ?? "").startsWith("?")) ? g(fold(stF(core)))
    : (g(fold(stmF(core))) && !(g(fold(stmF(core))) ?? "").startsWith("?")) ? g(fold(stmF(core)))
    : `?${core}`;
};
const fold = (s) => stF(s).replace(/η|ῆ|ῃ/g, "ε").replace(/ω|ῶ/g, "ο").replace(/ΐ|ϊ|ί|ῖ/g, "ι");
const idOf = (x) => { if (!x) return null; const acc = x.toLowerCase(); return refMap.get(acc) ?? refMap.get(stF(acc)) ?? null; };

// ---- KHORA 2 · coreference: activation + locality + zero-anaphora ----
const { bindings, gaps } = resolvePronounsByActivation(sents, refMap, {
  window: WIN, minActivation: MIN_A, minMargin: MIN_M, language: "grc",
  createActivation: (o) => createActivation({ window: o.window ?? WIN }),
  pronounClass: grcPronounRegister, namedScope: "local",
});
const bySentence = new Map();
for (const b of bindings) { const prev = bySentence.get(b.sentenceOrder); if (!prev || (!prev.referentId.startsWith("N:") && b.referentId.startsWith("N:"))) bySentence.set(b.sentenceOrder, b); }
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const sMatcher = (() => { const u = [...new Set([...refMap.keys()].filter(Boolean))].sort((a, b) => b.length - a.length); return new RegExp(`(?<![\\p{L}\\p{N}])(?:${u.map(escapeRe).join("|")})(?![\\p{L}\\p{N}])`, "giu"); })();
const zaAct = createActivation({ window: WIN });
const zaBind = new Map(); const zaSeen = new Set();
for (const s of sents) {
  const named = new Set();
  sMatcher.lastIndex = 0; let m; while ((m = sMatcher.exec(s.text))) { const r = refMap.get(m[0]) ?? refMap.get(m[0].toLowerCase()); if (r) named.add(r); }
  for (const c of clauses.filter((c) => c.order === s.order)) {
    const verb = String(c.verb ?? "");
    if (!face(c.subject) && personOf(verb, casePrior)?.person === 3 && !bySentence.has(c.order)) {
      const top = [...zaSeen].map((r) => [r, zaAct.activationOf(r)]).sort((a, b) => b[1] - a[1]);
      const [ref, score] = top[0] ?? [];
      if (ref && score >= MIN_A) { const second = top[1]?.[1] ?? 0; const mg = score > 0 ? (score - second) / score : 0; if (mg >= MIN_M) zaBind.set(c.order, ref); }
    }
  }
  for (const r of named) zaSeen.add(r);
  zaAct.observe([...named]);
}
// the referents a clause's subject resolves to (coref or zero-anaphora, or —
// for an OVERT appellative — the being decided AT THE POINT)
const epithetRes = new Map(); // clause index -> being id, decided AT THE POINT
const subjectRefOf = (c) => {
  const ci = clauses.indexOf(c);
  const s = face(c.subject);
  if (s) return epithetRes.get(ci) ?? idOf(s) ?? null;
  return (bySentence.get(c.order)?.referentId) ?? zaBind.get(c.order) ?? null;
};

// ---- KHORA 2b · LEARN THE EPITHETS / ALIASES (rung CAST, mechanical) ----
// An appellative surface aliases a being when the being's NAME keeps appearing
// in the same sentence as that surface: "the son of Odysseus" always brings
// Odysseus's name; "the old man" brings the being whose scenes it adorns.
// Learned with the same honesty gates as coref: a surfacing only sticks when it
// leads ONE being by a margin and clears a floor — never a single co-occurrence.
const ALIAS_MIN = 3, ALIAS_MARGIN = 0.5;
const DEICTIC = new Set(["συ","σε","σου","σοι","εγω","με","εμου","μοι","ὑμεῖς","ὑμᾶς","ὑμῶν","ὑμῖν","ἤμεις"]);
const aliasCounts = new Map(); // key(stem) -> Map(beingName -> count)
for (const s of sents) {
  const namedBeings = new Set();
  sMatcher.lastIndex = 0; let m; const re2 = sMatcher;
  while (m = re2.exec(s.text), m) { const r = refMap.get(m[0]) ?? refMap.get(m[0].toLowerCase()); if (r && r.startsWith("N:")) namedBeings.add(nameOfId(r)); }
  if (!namedBeings.size) continue;
  for (const c of clauses.filter((c) => c.order === s.order)) {
    const subj = face(c.subject);
    if (!subj) continue;
    if (nominalClass(subj.toLowerCase(), posPrior) === "PROPN") continue; // a name, not an epithet
    const key = kindOf(subj);
    if (!key || DEICTIC.has(stF(key)) || DEICTIC.has(stF(subj))) continue; // 1st/2nd person is deixis, not an epithet
    if (!aliasCounts.has(key)) aliasCounts.set(key, new Map());
    const bm = aliasCounts.get(key);
    for (const b of namedBeings) bm.set(b, (bm.get(b) ?? 0) + 1);
  }
}
const aliases = {}; // key -> { name, count, margin }
for (const [key, bm] of aliasCounts) {
  const [top, ...rest] = [...bm.entries()].sort((a, b) => b[1] - a[1]);
  if (!top) continue;
  const second = rest[0]?.[1] ?? 0;
  const margin = top[1] > 0 ? (top[1] - second) / top[1] : 0;
  if (top[1] >= ALIAS_MIN && margin >= ALIAS_MARGIN) aliases[key] = { name: top[0], count: top[1], margin: +margin.toFixed(2) };
}
const displayName = (id) => { if (!id) return null; return nameOfId(id); }; // the FLAT alias table no longer drives rendering — epithets bind at the point (epithetRes), or the kind stays

// POINT-BOUND EPITHET RESOLUTION — identity is the fold at a point, so an
// appellative is a LONG PRONOUN: it binds by the point, never by a global table.
// A causal walk folds the present at each clause's address: an overt common-noun
// subject binds to the being NAMED in its own sentence when one leads with margin,
// else to the hottest being present, else NONE (the ``kind'' stays — no fabrication).
const namedBySentence = new Map();
for (const s of sents) { const nm = new Set(); sMatcher.lastIndex = 0; let m; while (m = sMatcher.exec(s.text), m) { const r = refMap.get(m[0]) ?? refMap.get(m[0].toLowerCase()); if (r && r.startsWith("N:")) nm.add(r); } namedBySentence.set(s.order, nm); }
const pointAct = createActivation({ window: WIN });
const pointEpithets = [];
let lastPointOrder = -1;
clauses.forEach((c, ci) => {
  if (c.order !== lastPointOrder) { lastPointOrder = c.order; pointAct.observe([...namedBySentence.get(c.order) ?? []]); }
  const subj = face(c.subject); if (!subj) return;
  const cat = nominalClass(subj.toLowerCase(), posPrior);
  if (cat !== "NOUN") return;                                   // only common-noun appellatives
  if (PRON_S.has(stF(subj)) || DEICTIC.has(stF(subj))) return;  // deixis is not an epithet
  const cands = [...namedBySentence.get(c.order) ?? []].map((r) => [r, pointAct.activationOf(r)]).filter((x) => x[1] >= MIN_A).sort((a, b) => b[1] - a[1]);
  const top = cands[0];
  if (!top) return;                                             // no named point here — the kind stays
  const second = cands[1]?.[1] ?? 0; const marg = top[1] > 0 ? (top[1] - second) / top[1] : 0;
  if (marg < MIN_M) return;                                     // two beings both present — refuse
  epithetRes.set(ci, top[0]);
  pointEpithets.push({ at: c.order, epithet: stF(subj), to: nameOfId(top[0]), activation: +top[1].toFixed(2) });
});

// ---- KHORA 3 · learning per clause (admit().bayes) + scenes + blinks ----
const holo = createHolograph({ gamma: 0.9 });
const clampV = (c) => { const p = { v: g(c.verb ?? "·") }; const s = subjectRefOf(c); if (s) p.S = nameOfId(s); const o = face(c.object); if (o) p.O = g(o); return p; };
for (let i = 0; i < clauses.length; i++) clauses[i].learning = admit(holo, clampV(clauses[i])).bayes;
const B = (() => { const s = createHolograph({ alpha: 1 }); return clauses.map((c) => admit(s, { position: `${seat(c.subject)}:${seat(c.object)}`, actor: face(c.subject) || "(∅)", action: String(c.verb ?? "·"), outcome: c.object ? face(c.object) : "∅" }).bayes); })();
const TH = [...B].filter(Number.isFinite).sort((a, b) => a - b)[Math.floor(B.length * 0.9)] ?? 0;
const SCE = []; let cur2 = [];
for (let i = 0; i < clauses.length; i++) { const rev = B[i]; if (Number.isFinite(rev) && rev >= TH && rev > (B[i - 1] ?? 0) && rev >= (B[i + 1] ?? 0) && cur2.length >= 4) { SCE.push(cur2); cur2 = []; } cur2.push(i); }
if (cur2.length) SCE.push(cur2);
const scenesOf = SCE.map((ids) => ids.map((i) => clauses[i]));
const sums = scenesOf.map((sc) => sc.reduce((s, c) => s + (c.learning ?? 0), 0));
const floor = [...sums].sort((a, b) => a - b)[Math.floor(scenesOf.length * 0.8)] ?? 0;
const isBlink = (i) => sums[i] >= floor && sums[i] > (sums[i - 1] ?? 0) && sums[i] >= (sums[i + 1] ?? 0);

// ---- RECORD · the EOT: edges + blink G·F·P notes, ids, address-scoped ----
const act = createActivation({ window: WIN });
const seen = new Set();
const edges = clauses.map((c) => { const s = face(c.subject), o = face(c.object); const sid = subjectRefOf(c); return { at: c.order, verb: g(c.verb ?? "·"), subjectId: sid ? (idOf(s) ?? sid) : sid, objectId: o ? (idOf(o) ?? `s:${stF(o).slice(0, 6)}`) : null }; });
// second causal walk for the blinks' cast/present (replay, P159)
const blinks = [];
let openScene = -1;
for (let i = 0; i < clauses.length; i++) {
  const c = clauses[i];
  if (c.order !== (i > 0 ? clauses[i - 1].order : null)) {
    const st = sents[c.order]?.text ?? ""; const named = new Set(); sMatcher.lastIndex = 0; let m; while ((m = sMatcher.exec(st))) { const r = refMap.get(m[0]) ?? refMap.get(m[0].toLowerCase()); if (r) named.add(r); }
    for (const r of named) seen.add(r);
    act.observe([...named]);
  }
}
for (let si = 0; si < SCE.length; si++) {
  if (!isBlink(si)) continue;
  const sc = SCE[si].map((i) => clauses[i]);
  const props = sc.map((c) => ({ s: subjectRefOf(c), v: g(c.verb ?? "·"), o: face(c.object) ? g(face(c.object)) : "", b: c.learning ?? 0 })).filter((p) => p.s || p.o);
  const byC = {}; for (const p of props) if (p.s) { const d = displayName(p.s) ?? "the world"; byC[d] = (byC[d] ?? 0) + 1; }
  const backdrop = Object.entries(byC).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "the world";
  const cast = [...seen].map((r) => [displayName(r) ?? r, act.activationOf(r)]).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n);
  const deeds = props.slice().sort((a, b) => b.b - a.b).slice(0, 3).map((p) => `${p.s ? (displayName(p.s) ?? "◦") : "◦"}.${p.v} ${p.o}`.trim());
  blinks.push({ at: Math.round((sc[sc.length - 1].order / sents.length) * odyT.length), learning: +sums[si].toFixed(1), backdrop, cast, scene: deeds.filter(Boolean).slice(0, 2), interpretation: `${backdrop}: ${deeds.filter(Boolean).slice(0, 2).join(" ; ")}` });
}

// THE IDENTITY-MEET ACROSS POINTS (identity-at-a-point): indeterminate epithets — the
// man, the god, the father, where no name was named — are INSTANCED per scene-run
// (the being at its own points), then met: two runs are ONE being when they occupy
// the same position in the story-graph (same neighbors/cast) at DISJOINT points.
// Co-presence at a point is never merged (counterfeit identity is co-presence);
// the point-bound ones (the-the-god→Zeus at the council) were already routed out.
const castOf = (ids) => { const s = new Set(); for (const ci of ids) { const c = clauses[ci]; const x = subjectRefOf(c); if (x) s.add(x); const o = idOf(face(c.object)); if (o) s.add(o); } return s; };
const indetByScene = SCE.map((ids) => { const s = new Set(); for (const ci of ids) { const x = subjectRefOf(clauses[ci]); if (x && !x.startsWith("N:")) s.add(x); } return s; });
// runs: segments of consecutive scenes where an indeterminate kind persists
const runsOf = new Map();
for (let si = 0; si < SCE.length; si++) for (const k of indetByScene[si]) {
  if (!runsOf.has(k)) runsOf.set(k, []);
  const arr = runsOf.get(k);
  // a run is one location: reappearing within a small gap stays the same point;
  // an absence of more than 3 scenes means the being LEFT that address
  if (arr.length && si - arr[arr.length - 1].end <= 3) { arr[arr.length - 1].end = si; arr[arr.length - 1].scenes.push(si); }
  else arr.push({ key: `${k}#${arr.length}`, kind: k, scenes: [si], end: si });
}
const instanceNeighbors = new Map(); const instanceScenes = new Map();
for (const arr of runsOf.values()) for (const r of arr) {
  instanceScenes.set(r.key, r.scenes);
  let nm; instanceNeighbors.set(r.key, nm = new Map());
  for (const si of r.scenes) for (const n of castOf(SCE[si])) if (n !== r.kind) nm.set(n, (nm.get(n) ?? 0) + 1);
}
const jaccard = (m1, m2) => { const k1 = [...m1.keys()], k2 = [...m2.keys()]; const u = new Set([...k1, ...k2]); let inter = 0; for (const x of k1) if (m2.has(x)) inter++; return inter / u.size; };
const keys = [...instanceScenes.keys()];
const pairs = [];
for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
  const a = keys[i], b = keys[j];
  let disjoint = true; for (const s of instanceScenes.get(a)) if (instanceScenes.get(b).includes(s)) { disjoint = false; break; }
  if (!disjoint) continue;
  if (instanceScenes.get(a).length < 1 || instanceScenes.get(b).length < 1) continue;
  if (instanceNeighbors.get(a).size < 2 || instanceNeighbors.get(b).size < 2) continue;
  const J = jaccard(instanceNeighbors.get(a), instanceNeighbors.get(b));
  if (J >= 0.4) pairs.push([a, b, ~~(J * 100)]);
}
const parent = new Map(); const findP = (x) => { let r = x; while (parent.has(r) && parent.get(r) !== r) r = parent.get(r); return r; };
for (const [a, b] of pairs) { const ra = findP(a), rb = findP(b); if (ra !== rb) parent.set(ra, rb); }
const chainOf = new Map();
for (const k of keys) { const r = findP(k); if (!chainOf.has(r)) chainOf.set(r, []); chainOf.get(r).push(k); }
const identities = [...chainOf.values()].filter((m) => m.length >= 2).map((m) => ({ members: m, label: m.map((x) => (nameOfId(x.split("#")[0]) ?? x)).join("/"), scenes: m.reduce((s, x) => s + instanceScenes.get(x).length, 0) }));

const eot = {
  schema: "@field/summary-engine-v1", source: "homer-odyssey.txt (Greek, Zenodotus)", chars: CHARS,
  declared: { window: WIN, minActivation: MIN_A, minMargin: MIN_M, namedScope: "local", pronounClass: "measured UD Ancient_Greek-PROIEL" },
  count: { clauses: clauses.length, sentences: sents.length, bindings: bindings.length, zeroAnaphora: zaBind.size, typedGaps: gaps.length, scenes: SCE.length, blinks: blinks.length, pointEpithets: pointEpithets.length },
  edges, blinks, aliases, epithets: pointEpithets, identities,
  note: "address-scoped note stream; referents are hash ids (pretty names are render swaps); a correction is a later note at the same address, computed on projection (asOf, clothAt) — never a rewrite (P1). learning = admit().bayes = the delta of the read's own prior -> posterior = how much belief moved. aliases = epithets LEARNED mechanically: an appellative surface aliases the being whose name keeps co-occurring in its sentence (floor + margin gated).",
};

// ---- JANUS · kinds over the bound scene-company ----
const vecs = SCE.map((sc, i) => {
  const props = sc.map((c) => ({ ...c, s: subjectRefOf(c) })).filter((p) => p.s);
  const names = [...new Set(props.flatMap((p) => [`A:${nameOfId(p.s)}`, `V:${g(p.verb ?? "·")}`]))];
  const company = {}; for (const n of names) company[n] = props.filter((p) => nameOfId(p.s) === n.substring(2) || g(p.verb ?? "·") === n.substring(2)).length;
  return { ref: `scene:${i}`, names, company };
});
const kinds = induceKinds(vecs, { threshold: 0.05 });

// ---- PENELOPE · the mouth phrases the record, no model ----
const eotFile = `eot-odyssey-${CHARS}.json`;
fs.writeFileSync(eotFile, JSON.stringify(eot, null, 2));
console.log(`summary engine: ${clauses.length} clauses · ${SCE.length} scenes · ${blinks.length} blinks · ${bindings.length} coref · ${zaBind.size} zero-anaphora · ${gaps.length} typed gaps · ${pointEpithets.length} point-epithets · ${identities.length} identity-chains`);
console.log(`record -> ${eotFile}`);
console.log(`\nTHE READ MET ${identities.length} beings across points (the same fold at different addresses):\n`);
for (const id of identities.slice(0, 12)) console.log(`   ${id.label}   [${id.members.length} instances · ${id.scenes} scenes]`);
console.log(`\nTHE READ LEARNED ${Object.keys(aliases).length} flat co-occurrences (recorded, unused — point-bound epithets supersede them):\n`);
for (const [k, a] of Object.entries(aliases).sort((a, b) => b[1].count - a[1].count).slice(0, 8)) console.log(`   ${g(k).padEnd(18)} → ${a.name}   (×${a.count}, margin ${a.margin})`);
console.log("\nPENELOPE — the fold summary, in the third person, from the record's blinks:\n");
blinks.forEach((n, i) => console.log(`✦ ${String(i + 1).padStart(2)} @${String(n.at).padStart(5)} ·${n.learning} bits · ${n.interpretation}`));
console.log(`\n(kinds: ${kinds.length} induced — the weld/over-split at this threshold is a standing falsification, recorded)`);