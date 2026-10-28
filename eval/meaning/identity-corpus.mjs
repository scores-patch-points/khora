// eval/meaning/identity-corpus.mjs — HOLOGRAPHIC IDENTITY AT CORPUS SCALE: the Motorola resolution against its exhibits (PREREG Run 24).
// The 108 sentence-sized spent pairs cannot earn identity (a node needs 3 occurrences before the fold speaks; at sentence scale almost none has them). This reads
// four whole documents as PAGES (read-atoms.js readPage: the page resolved once, so an entity keeps its id and its occurrences add up), builds the world
// from them (atom-world.js), and asks every pair a shared NAME nominates: same / against / raised_difference / needs_deeper_reading. Then it lets judgeClaim
// commit verdicts with that identity injected and says, for each, whether its reach is settled. Controls are planted (decoys, a document split in two, figures
// doubled, names shuffled) because the real documents carry no ground truth of who is who.
//   IDENTITY_CORPUS_DIR=<dir> node eval/meaning/identity-corpus.mjs     the four documents; each is checked against its registered sha256 (PREREG Run 24)
//   IDENTITY_READ_CACHE=<file>   keep the readings between runs (keyed by the document's sha256; delete it after changing the reader)
//   IDENTITY_REPORT_OUT=<file>   every nominated pair, every verdict, as JSON
// The documents are public records but carry a city employee's phone number and email, so they are NOT committed: the script names where it looked and stops.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), K = path.join(HERE, "../..");
const GE = await import(path.join(K, "native/adapters/text/grammar-en.js"));
const { readPage } = await import(path.join(K, "native/organs/read-atoms.js"));
const { atomIdentity, nominations } = await import(path.join(K, "native/adapters/text/atom-world.js"));
const { IDENTITY_PARAMS } = await import(path.join(K, "native/adapters/text/corpus-identity.js"));
const { stageFromAtoms, judgeClaim } = await import(path.join(K, "native/kernel/stage.js"));

// ── the registered inputs (PREREG Run 24) ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const DOCS = [
  { id: "res", file: "RS2026-2264 resolution and certification.txt", sha256: "6e37484743f1229933b7ae82244d3515a44bd6d268cae3f295dbc83db46a20e1" },
  { id: "agr", file: "Sourcewell master agreement 030425-MOT with Motorola Solutions.txt", sha256: "e6ebfe3cb1f8deb1cf5d1cd26b9df0352b22b7aa35f5aef8b4fa8e2eb525a413" },
  { id: "code", file: "Metro Code 13.08.080 surveillance technology.txt", sha256: "989194427205120f5a2dae8ee7fa8f47e2d20e92f1fa63004f3eb7cb75369ab9" },
  { id: "debate", file: "Council debate on RS2026-2264 verbatim record 2026-10-06.txt", sha256: "92405b9411079172e284296fc0860a76193cf665237d3af918b568b59e16859f" },
];
const DECOY = { id: "decoy", file: path.join(HERE, "identity-corpus/decoys.txt"), sha256: "9645e87c0ba45bfb4a5df4b5630da211be3607fc677031bebbd036ce6848d6e2" };
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const dir = [process.env.IDENTITY_CORPUS_DIR, "/Users/mlacy/holodeck-isthmus/demo-motorola", "/Users/mlacy/Downloads/workspace/holodeck/demo-motorola"].filter(Boolean).find((d) => fs.existsSync(path.join(d, DOCS[0].file)));
if (!dir) { console.log("the Motorola resolution and its exhibits were not found (IDENTITY_CORPUS_DIR); nothing is scored, and no other data is substituted"); process.exit(2); }
const unregistered = !!process.env.IDENTITY_UNREGISTERED;
for (const d of [...DOCS.map((x) => ({ ...x, path: path.join(dir, x.file) })), { ...DECOY, path: DECOY.file }]) {
  const got = sha(fs.readFileSync(d.path, "utf8"));
  if (got !== d.sha256 && !unregistered) { console.log(`${d.id}: sha256 ${got.slice(0, 12)} is not the registered ${d.sha256.slice(0, 12)}; this is not the registered corpus, nothing is scored`); process.exit(2); }
}
console.log(`corpus: ${dir}${unregistered ? "  (UNREGISTERED: not a result)" : "  (every document matches its registered sha256)"}`);

// ── reading: a document is a PAGE ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// DECLARED preparation (PREREG Run 24): control characters out; a paragraph is a block between blank lines and its line breaks are wraps, joined by a space; a
// sentence ends at . ! ? followed by a space and a capital, a digit, a quote or a bracket; a block with no two letters in a row is dropped.
const pageSentences = (text) => text.replace(/[\u0000-\u0008\u000b-\u001f]/g, " ").replace(/\r\n?/g, "\n").split(/\n\s*\n/)
  .flatMap((b) => b.replace(/\s*\n\s*/g, " ").trim().split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/)).map((s) => s.trim()).filter((s) => /\p{L}{2}/u.test(s));
const corefModel = JSON.parse(fs.readFileSync(path.join(HERE, "atoms/coref-ranker.json"), "utf8"));
const grammar = { rowsOf: GE.rowsOf, claimsOf: (t, rows) => GE.claimsOf(t, rows) };
const CACHE = process.env.IDENTITY_READ_CACHE && fs.existsSync(process.env.IDENTITY_READ_CACHE) ? JSON.parse(fs.readFileSync(process.env.IDENTITY_READ_CACHE, "utf8")) : {};
const read = (id, sentences) => {
  const key = sha(`${id}\n${sentences.join("\n")}`);
  if (!CACHE[key]) {
    const t0 = Date.now(), R = readPage({ sentences, lang: "en", grammar, corefModel });
    // the name words an entity was met under: the reader's own cues on its name and alias mentions (the resolver's learned entities carry only a label)
    const names = new Map(); for (const m of R.flatMap((r) => r.mentions)) if (m.entity != null && (m.how === "name" || m.how === "alias")) for (const w of m.cues?.names ?? []) (names.get(m.entity) ?? names.set(m.entity, new Set()).get(m.entity)).add(w);
    CACHE[key] = { sentences, atoms: R.map((r, si) => r.atoms.map((a) => ({ ...a, sentence: sentences[si] }))), entities: (R[0]?.entities ?? []).map((e) => ({ id: e.id, name: e.name, names: [...(names.get(e.id) ?? [])].sort() })) };
    console.log(`  read ${id}: ${sentences.length} sentences, ${R.reduce((n, r) => n + r.atoms.length, 0)} atoms, ${CACHE[key].entities.length} entities, ${Date.now() - t0} ms`);
    if (process.env.IDENTITY_READ_CACHE) fs.writeFileSync(process.env.IDENTITY_READ_CACHE, JSON.stringify(CACHE));
  }
  const c = CACHE[key];
  return { doc: id, sentences: c.sentences, atomsBy: c.atoms, atoms: c.atoms.flat(), entities: c.entities };
};
const R = {};
for (const d of DOCS) R[d.id] = read(d.id, pageSentences(fs.readFileSync(path.join(dir, d.file), "utf8")));
R.decoy = read("decoy", pageSentences(fs.readFileSync(DECOY.file, "utf8")));
const halves = (r, m) => read(`${r.doc}${m ? "-odd" : "-even"}`, r.sentences.filter((_, i) => i % 2 === m));

// ── planted controls, built from the readings by a rule (no hand-set list) ────────────────────────────────────────────────────────────────────────────
// figures doubled: every keyed figure of a reading, twice what it was (its text says so)
const doubled = (r, doc) => ({ ...r, doc, atoms: r.atoms.map((a) => (/^has_/.test(a.pred) && a.args?.[1]?.base != null ? { ...a, args: [a.args[0], { ...a.args[1], value: `${a.args[1].value} (doubled)`, base: a.args[1].base * 2, alts: (a.args[1].alts ?? []).map((x) => x * 2) }] } : a)) });
// names shuffled: the named entities of a reading trade names among themselves under a seeded permutation, so a name no longer says who it is
const mulberry = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffled = (r, seed) => {
  const rng = mulberry(seed), used = new Set(r.atoms.flatMap((a) => (a.args ?? []).filter((x) => x.entity != null).map((x) => x.entity)));
  const named = r.entities.filter((e) => e.names?.length && used.has(e.id)), perm = named.map((_, i) => i);
  for (let i = perm.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  const to = new Map(named.map((e, i) => [e.id, named[perm[i]]]));
  return { ...r, entities: r.entities.map((e) => (to.has(e.id) ? { ...e, name: to.get(e.id).name, names: to.get(e.id).names } : e)),
    atoms: r.atoms.map((a) => ({ ...a, args: (a.args ?? []).map((x) => (x.entity != null && to.has(x.entity) ? { ...x, name: to.get(x.entity).name } : x)) })) };
};

// ── the questions ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const need = IDENTITY_PARAMS.minOccurrences, bump = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; return o; };
const nodeId = (e) => `${e.doc}:${e.entity}`;
const gold = (p, truth) => {
  if (truth) { const t = truth(p); if (t) return t; }
  const A = new Set(p.a.names), B = new Set(p.b.names), sub = [...A].every((w) => B.has(w)), sup = [...B].every((w) => A.has(w));
  return sub && sup ? "same_name" : sub || sup ? "unlabeled" : "different_name";
};
function ask(label, readings, truth = null) {
  const W = atomIdentity(readings), N = nominations(readings), pairs = [];
  for (const p of N) {
    const st = W.standing(p.a.doc, { entity: p.a.entity }, p.b.doc, { entity: p.b.entity });
    pairs.push({ a: nodeId(p.a), b: nodeId(p.b), names: [p.a.name, p.b.name], words: p.words, gold: gold(p, truth), kind: st.kind, reason: st.reason, have: st.have, askable: Math.min(...st.have) >= need, contested: !!st.contested, proof: st.proof ?? null, raised: st.raised ?? null });
  }
  const by = (f) => pairs.reduce((o, p) => bump(o, f(p)), {}), fmt = (o) => Object.entries(o).sort().map(([k, n]) => `${k} ${n}`).join(", ") || "none";
  const ask = pairs.filter((p) => p.askable);
  console.log(`\n── world ${label}: ${[...W.record.keys()].length} nodes, ${[...W.record.values()].filter((o) => o.length >= need).length} with ${need}+ occurrences, ${pairs.length} nominated pairs, ${ask.length} askable (both ${need}+)`);
  console.log(`   standing, all pairs     : ${fmt(by((p) => p.kind))}`);
  console.log(`   standing, askable pairs : ${fmt(ask.reduce((o, p) => bump(o, p.kind), {}))}`);
  console.log(`   by gold (askable)       : ${fmt(ask.reduce((o, p) => bump(o, `${p.gold}>${p.kind}`), {}))}`);
  console.log(`   why not decided         : ${fmt(by((p) => (p.kind === "needs_deeper_reading" ? p.reason : "(decided)")))}`);
  return { label, W, pairs, askable: ask };
}

// ── the worlds ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const real = DOCS.map((d) => R[d.id]);
console.log("\nreading controls");
const odd = halves(R.agr, 1), even = halves(R.agr, 0), dbl = doubled(R.res, "res2x");
const worlds = {
  R: ask("R (the resolution and its three exhibits)", real),
  D: ask("D (R and the planted decoys)", [...real, R.decoy], (p) => (p.a.doc === "decoy" || p.b.doc === "decoy" ? "different_planted" : null)),
  H: ask("H (R with the agreement split into its odd and even sentences)", [R.res, R.code, R.debate, odd, even], (p) => (/^agr-/.test(p.a.doc) && /^agr-/.test(p.b.doc) && p.a.doc !== p.b.doc && new Set(p.a.names).size === new Set(p.b.names).size && p.a.names.every((w) => p.b.names.includes(w)) ? "same_planted" : null)),
  X: ask("X (R and the resolution with every keyed figure doubled)", [...real, dbl], (p) => (new Set([p.a.doc, p.b.doc]).has("res2x") && new Set([p.a.doc, p.b.doc]).has("res") && p.a.entity === p.b.entity ? "same_planted" : null)),
  S: ask("S (R with the names shuffled)", real.map((r, i) => shuffled(r, 20261028 + i)), () => "different_shuffled"),
};

// ── verdicts: judgeClaim with identity injected, resolution sentences against each exhibit ───────────────────────────────────────────────────────────────
function verdicts(label, readings, claimDoc, sourceDocs, claimsOf) {
  const W = atomIdentity(readings), cache = new Map(), out = [], stages = Object.fromEntries(sourceDocs.map((s) => [s, stageFromAtoms(readings.find((r) => r.doc === s).atoms, { doc: s })]));
  for (const s of sourceDocs) {
    const identity = { standing: (c, a, o) => { const key = `${s}|${c.entity}|${a.entity}|${[...(o?.except ?? [])].sort()}`; if (!cache.has(key)) cache.set(key, W.standing(claimDoc, c, s, a, o)); return cache.get(key); } };
    for (const [si, claim] of claimsOf) {
      const j = judgeClaim(stages[s], claim.atoms, { identity });
      out.push({ source: s, sentence: si, text: claim.text, verdict: j.verdict, reach: j.reach?.standing ?? null, ends: (j.reach?.ends ?? []).map((e) => `${e.end}:${e.kind}(${e.reason}; ${e.have})`), standings: j.standings.map((x) => x.kind), gaps: j.gaps.map((g) => g.kind) });
    }
  }
  const tally = out.reduce((o, v) => bump(o, `${v.verdict}${v.reach ? `/${v.reach}` : ""}`), {}), st = out.flatMap((v) => v.standings).reduce((o, k) => bump(o, k), {});
  console.log(`\n── verdicts ${label}: ${out.length} (claim sentence × source) → ${Object.entries(tally).sort().map(([k, n]) => `${k} ${n}`).join(", ")}`);
  console.log(`   holographic standings drawn by their binds: ${Object.entries(st).sort().map(([k, n]) => `${k} ${n}`).join(", ") || "none"}`);
  for (const v of out.filter((x) => x.verdict !== "N")) console.log(`   ${v.verdict} [${v.reach}] ${claimDoc} s${v.sentence} vs ${v.source}: ${v.text.slice(0, 90)}${v.ends.length ? `\n        open: ${v.ends.join("; ")}` : ""}`);
  return out;
}
const claimsOf = (r, only = null) => r.atomsBy.map((atoms, si) => [si, { atoms, text: r.sentences[si] }]).filter(([, c]) => c.atoms.length && (!only || only(c)));
const V = {
  R: verdicts("R: each sentence of the resolution against each exhibit", real, "res", ["agr", "code", "debate"], claimsOf(R.res)),
  X: verdicts("X: each sentence of the resolution that states a figure, against the resolution with its figures doubled", [...real, dbl], "res", ["res2x"], claimsOf(R.res, (c) => c.atoms.some((a) => /^has_/.test(a.pred) && a.args?.[1]?.base != null))),
};

// ── the bars (PREREG Run 24), each pass, FAIL or N/E (not evaluable: fewer askable cases than the registered floor) ────────────────────────────────────────
const bars = [];
const bar = (id, what, ok, n, floor = 0, note = "") => bars.push({ id, what, status: n < floor ? "N/E" : ok ? "pass" : "FAIL", n, note });
const all = Object.values(worlds).flatMap((w) => w.pairs.map((p) => ({ ...p, world: w.label[0] })));
bar("I1", "a pair read too thinly is never same and never raised_difference", all.filter((p) => !p.askable).every((p) => p.kind === "needs_deeper_reading" || p.kind === "against"), all.filter((p) => !p.askable).length);
bar("I2", "every against cites a given relation (with giver) and both assertions' spans", all.filter((p) => p.kind === "against").every((p) => p.proof?.length && p.proof.every((c) => c.standing === "given" && c.giver && [c.a, c.b].every((x) => Number.isInteger(x.span?.[0]) && Number.isInteger(x.span?.[1])))), all.filter((p) => p.kind === "against").length);
bar("I3", "against comes only from an exclusion", all.filter((p) => p.kind === "against").every((p) => /^exclusion:/.test(p.reason)), all.filter((p) => p.kind === "against").length);
const committed = Object.values(V).flat().filter((v) => v.verdict === "E" || v.verdict === "C");
bar("I6", "a committed verdict carries a reach, and is settled only when every end it rests on is the same being", committed.every((v) => v.reach && (v.reach === "settled") === (v.ends.length === 0)), committed.length);
const D = worlds.D.askable.filter((p) => p.gold === "different_planted");
bar("II1", "no same between a planted decoy and a real node", D.every((p) => p.kind !== "same"), D.length, 10);
const Rd = worlds.R.askable.filter((p) => p.gold === "different_name");
bar("III1", "no same between two askable nodes whose names each carry a word the other lacks", Rd.every((p) => p.kind !== "same"), Rd.length, 10);
const S = worlds.S.askable;
bar("IV1", `same among askable pairs of the name-shuffled world is at most alpha (${IDENTITY_PARAMS.alpha})`, S.filter((p) => p.kind === "same").length <= IDENTITY_PARAMS.alpha * S.length, S.length, 20, `${S.filter((p) => p.kind === "same").length} same`);
// V1's expectation is derived from the atoms alone, not from the exclusion: a node is expected against its doubled self when its reading states a figure of a NAMED
// measure (not has_count / has_value), positively, not hedged, in a sentence that gives no year, and does not itself state two figures of that measure that differ
const YEAR = /\b(?:1[5-9]|20)\d\d\b/;
const expectAgainst = (entity) => {
  const own = R.res.atoms.filter((a) => /^has_/.test(a.pred) && !/^has_(count|value)$/.test(a.pred) && !a.neg && !a.hedged && a.start != null && a.args?.[0]?.entity === entity && a.args[1]?.base != null && !YEAR.test(a.sentence ?? ""));
  return own.some((a) => own.filter((b) => b.pred === a.pred).every((b) => Math.abs(b.args[1].base - a.args[1].base) <= 0.02 * Math.max(Math.abs(a.args[1].base), Math.abs(b.args[1].base), 1e-9)));
};
const Xp = worlds.X.pairs.filter((p) => p.gold === "same_planted"), wrongX = Xp.filter((p) => (p.kind === "against") !== expectAgainst(p.a.split(":")[1]));
bar("V1", "a node whose reading states a witnessed, untimed, named figure is against its doubled self with the figure cited; any other is not", wrongX.length === 0 && Xp.filter((p) => p.kind === "against").every((p) => p.proof.every((c) => /^has_/.test(c.rel))), Xp.length, 1, `${Xp.filter((p) => p.kind === "against").length} against of ${Xp.length} same-named pairs; ${wrongX.length} differ from the expectation`);
const Hp = worlds.H.askable.filter((p) => p.gold === "same_planted");
bar("VI1", "at least half of the askable planted-same pairs (the agreement's two halves) are joined", Hp.filter((p) => p.kind === "same").length >= Hp.length / 2, Hp.length, 20, `${Hp.filter((p) => p.kind === "same").length} same of ${Hp.length}`);
console.log("\n── bars (PREREG Run 24)");
for (const b of bars) console.log(`   ${b.id.padEnd(5)} ${b.status.padEnd(5)} n=${String(b.n).padEnd(5)} ${b.what}${b.note ? `  [${b.note}]` : ""}`);

// descriptive, no bar: what the real corpus does with identity, said plainly
const Ra = worlds.R.askable;
console.log(`\n── in R: ${worlds.R.pairs.length} nominated pairs; ${Ra.length} askable; ${worlds.R.pairs.filter((p) => p.kind === "same").length} same, ${worlds.R.pairs.filter((p) => p.kind === "against").length} against, ${worlds.R.pairs.filter((p) => p.kind === "raised_difference").length} raised_difference, ${worlds.R.pairs.filter((p) => p.kind === "needs_deeper_reading").length} needs_deeper_reading (${(100 * worlds.R.pairs.filter((p) => p.kind === "needs_deeper_reading").length / Math.max(1, worlds.R.pairs.length)).toFixed(1)}%)`);
for (const p of worlds.R.pairs.filter((q) => q.kind !== "needs_deeper_reading").slice(0, 60)) console.log(`   ${p.kind.padEnd(17)} ${p.gold.padEnd(14)} ${p.a} "${p.names[0]}" ~ ${p.b} "${p.names[1]}"  have ${p.have}  ${p.reason}${p.proof ? `  cites ${p.proof.map((c) => `${c.rel} ${c.a.text} | ${c.b.text}`).join("; ")}` : ""}`);
if (process.env.IDENTITY_REPORT_OUT) fs.writeFileSync(process.env.IDENTITY_REPORT_OUT, JSON.stringify({ params: IDENTITY_PARAMS, worlds: Object.fromEntries(Object.entries(worlds).map(([k, w]) => [k, w.pairs])), verdicts: V, bars }, null, 1));
const report = JSON.stringify({ worlds: Object.fromEntries(Object.entries(worlds).map(([k, w]) => [k, w.pairs])), verdicts: V, bars });
console.log(`\nreport sha256 ${sha(report).slice(0, 16)}`);

// POST HOC DIAGNOSTIC (added after the registered run; no bar, IDENTITY_DIAGNOSE=1): how many occurrences does a node need before the fold's weight test (test 3 of
// identity-induction.js: does the node depart from the rest of the corpus more than a same-size slice of the rest departs from itself) can pass at the DECLARED params? Every
// node with the declared minimum or more is judged against the best-attested node of its world, and its own weight is read; nothing is tuned and no pair is rescored.
if (process.env.IDENTITY_DIAGNOSE) {
  const { makeIdentityInduction } = await import(path.join(K, "native/kernel/identity-induction.js"));
  for (const w of [worlds.R, worlds.H]) {
    const rec = w.W.record, ind = makeIdentityInduction(rec, { ...IDENTITY_PARAMS, namesNode: (f) => (f.startsWith("w:") ? f.slice(2) : null) });
    const nodes = [...rec].filter(([, o]) => o.length >= need).sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1)), anchor = nodes[0][0], bucket = (n) => (n <= 5 ? String(n) : n <= 9 ? "6-9" : n <= 19 ? "10-19" : n <= 39 ? "20-39" : "40+");
    const tab = new Map();
    for (const [n, occ] of nodes.slice(1)) {
      const wt = ind.judge(n, anchor).tests?.weight?.a, row = tab.get(bucket(occ.length)) ?? tab.set(bucket(occ.length), { nodes: 0, carries: 0 }).get(bucket(occ.length));
      if (wt) { row.nodes++; if (wt.carries) row.carries++; }
    }
    const order = ["3", "4", "5", "6-9", "10-19", "20-39", "40+"];
    console.log(`\n── diagnostic (post hoc), world ${w.label[0]}: nodes that carry weight against the rest of the corpus, by occurrences (anchor ${anchor} has ${rec.get(anchor).length})`);
    console.log("   " + order.filter((k) => tab.has(k)).map((k) => `${k}: ${tab.get(k).carries}/${tab.get(k).nodes}`).join("   "));
  }
}
