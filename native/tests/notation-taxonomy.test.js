// taxonomy — the INSTRUMENT is regression-guarded here, and the ADAPTER is pinned against hand-written gold.
//   * a perfect reader (built from the toy gold) scores 1 on every rung it is measured at and PASSES;
//   * a deranged reader (the answers of the NEXT document) scores low and FAILS;
//   * a reader that reads nothing is refused (score 0, FAIL), never a silent pass;
//   * the causal licence is TWO-DIRECTIONAL (Amendment 2) and catches a revising reader AND an additive lookahead reader (a being promoted by whole-text recurrence);
//   * a control that does as well as the real arm is refused on R2 and R5 (prior-ablated arms, shotgun reader); R2 charges over-production and R5 charges false facts;
//   * without the prior-ablated arms R2 and R5 are a typed gap (pass: null), never a pass by absence;
//   * missing data is a typed gap (pass: null), never a throw.
// Only the cases marked "shipped priors" touch priors/notation-taxonomy-*.json; they skip when the priors are absent. No test needs the corpus.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as A from "../adapters/notation/taxonomy.js";
import * as I from "../eval/notation-competence/taxonomy.mjs";

// ── toy corpus: documents built from pieces, with gold (curator spans audited as gold) ──────────────
let _id = 0;
const sp = (genus, epithet, authors, year, { recomb = [] } = {}) => ({ genus, epithet, authors, year, recomb });
function render(n) {
  const base = `${n.genus} ${n.epithet}`;
  const y = n.year ? `, ${n.year}` : "";
  return n.recomb.length ? { core: base, full: `${base} (${n.authors.join(" & ")}${y}) ${n.recomb.join(" & ")}` } : { core: base, full: `${base} ${n.authors.join(" & ")}${y}` };
}
const akey = A.akey;
const FILL = "The material was collected near the river and examined under a stereo microscope at several magnifications by the first author".split(" ");
function mkDoc(pieces, journal = "Toy Journal") {
  let text = ""; const mentions = [];
  const add = (s) => { text += s; };
  for (const p of pieces) {
    if (typeof p === "string") { add(p); continue; }
    if (p.neutral) { const s = text.length; add(p.neutral); mentions.push({ s, e: text.length, status: "neutral", reason: "gn_unparsed" }); continue; }
    if (p.uni) {
      const s = text.length; const full = `${p.uni} ${p.authors.join(" & ")}, ${p.year}`; add(full); const e = text.length;
      const tokens = [[s, s + p.uni.length, "uninomial"]]; let off = s + p.uni.length;
      for (const a of p.authors) { const k = text.indexOf(a, off); tokens.push([k, k + a.length, "author"]); off = k + a.length; }
      const ky = text.indexOf(String(p.year), off); tokens.push([ky, ky + 4, "year"]);
      mentions.push({ s, e, core: [s, s + p.uni.length], status: "gold", id: p.uni, kind: "genus", tokens, rel: [...p.authors.map((a) => ["authored_by", akey(a)]), ["year_of", String(p.year)]], auth: [...p.authors.map((a) => ["authored_by", a]), ["year", String(p.year)]], claims_ok: true });
      continue;
    }
    const r = render(p); const s = text.length; add(r.full); const e = text.length;
    const g0 = s, g1 = s + p.genus.length, e0 = g1 + 1, e1 = e0 + p.epithet.length;
    const tokens = [[g0, g1, "genus"], [e0, e1, "epithet"]];
    const authLabel = p.recomb.length ? "authored_by" : "authored_by";
    // authors / year / combiner tokens are located by scanning the rendered tail
    const tail = r.full.slice(e1 - s); let off = e1;
    const scan = (word, cls) => { const k = text.indexOf(word, off); tokens.push([k, k + word.length, cls]); off = k + word.length; };
    for (const a of p.authors) scan(a, "author");
    if (p.year) scan(String(p.year), "year");
    for (const a of p.recomb) scan(a, "author");
    const rel = [["genus_of", `${p.genus}|${p.genus} ${p.epithet}`]];
    for (const a of p.authors) rel.push(["authored_by", akey(a)]);
    for (const a of p.recomb) rel.push(["recombined_by", akey(a)]);
    if (p.year) rel.push(["year_of", String(p.year)]);
    const auth = [...p.authors.map((a) => ["authored_by", a]), ...p.recomb.map((a) => ["recombined_by", a])]; if (p.year) auth.push(["year", String(p.year)]);
    mentions.push({ s, e, core: [g0, e1], status: "gold", id: `${p.genus} ${p.epithet}`, kind: "species", tokens: tokens.sort((a, b) => a[0] - b[0]), rel, auth, claims_ok: true });
  }
  return { id: `T${++_id}`, journal, lang: "en", text, mentions, gbif_taxon: null };
}
const GEN = ["Puma", "Felis", "Aus", "Cus", "Eus", "Gus", "Hus", "Ius", "Jus", "Kus", "Lus", "Nus", "Opus", "Pus", "Qus", "Rus", "Sus", "Tus"];
const EPI = ["concolor", "catus", "bus", "dus", "fus", "hus", "ibus", "jabus", "kebus", "lubus", "mibus", "nobus", "obus", "pibus", "qubus", "rabus", "sibus", "tubus"];
const AUT = [["Linnaeus"], ["Smith", "Jones"], ["Walker"], ["Kerr"], ["Hooker"], ["Gray"], ["Dana"], ["Mayr"], ["Cope"]];
const names = GEN.map((g, i) => sp(g, EPI[i], AUT[i % AUT.length], 1758 + i * 7, i % 5 === 3 ? { recomb: ["Brown"] } : {}));
const Cus = names[3];
const docs = [0, 1, 2, 3, 4, 5].map((i) => {
  const [n, a, b] = [names[3 * i], names[3 * i + 1], names[3 * i + 2]];
  const para = (k) => [`The ${k} specimens of `, n, ` were compared with `, a, ` and `, b, `. ${FILL.join(" ")}. `];
  return mkDoc([...para("first"), `In the genus `, { uni: `Taxon${"abcdef"[i]}us`, authors: ["Latreille"], year: 1800 + i }, `. `, ...para("second"), ...para("third"), ...para("fourth"), "Collected near the river. ", ...FILL, ". The end of the toy treatment.\n"]);
});
// a document with no name at all: the hard negative
docs.push(mkDoc([`${FILL.join(" ")}. `.repeat(6)]));

const foreign = [];
for (let i = 0; i < 40; i++) foreign.push({ kind: "prose_en", source: "toy/prose" + (i % 5), text: `${FILL.join(" ")} number ${i} once again and then a few more plain words follow for the stream to be long enough ok ok ok ok ok ok ok ok ok ok ok ok` });
for (let i = 0; i < 40; i++) foreign.push({ kind: "smiles", source: "toy/smiles", text: Array.from({ length: 70 }, (_, k) => "CC(=O)Oc1ccccc1C(=O)O".slice(0, 6 + ((i + k) % 12))).join(" ") });
const data = { split: "dev", docs, foreign, gbif: {}, gaps: [], neutral: {} };

// ── readers ─────────────────────────────────────────────────────────────────────────────────────────────────────
/** the perfect reader: reads the gold of the document whose text begins with the text it is given (so it is causal by construction). */
function perfectReader() {
  const byPrefix = (text) => docs.find((d) => d.text.startsWith(text));
  const items = (text) => {
    const d = byPrefix(text); const n = text.length; const tokens = [], beings = [], relations = [];
    if (!d) return { tokens, beings, relations };
    for (const m of d.mentions) {
      if (m.status !== "gold") continue;
      for (const [s, e, c] of m.tokens) if (e <= n) tokens.push({ s, e, cls: c, at: e, prov: false });
      if (m.core[1] <= n) beings.push({ id: m.id, kind: m.kind, span: m.core, at: m.core[1], prov: false, resolved: true });
      if (m.e <= n) for (const [lab, val] of m.rel) { const [a, b] = lab === "genus_of" ? val.split("|") : [m.id, val]; relations.push({ end1: a, label: lab, end2: b, at: m.e, prov: false, span: m.core }); }
    }
    return { tokens, beings, relations };
  };
  const nameStrings = names.map((x) => render(x).core);
  return {
    name: "perfect",
    read: (text, opts = {}) => { const o = items(text); if (!opts.noCase) return o; return { tokens: o.tokens, beings: o.beings.filter((_, k) => k % 2 === 0), relations: o.relations }; },
    identify: (text) => {
      const hits = []; for (const nm of nameStrings) { let k = text.indexOf(nm); while (k >= 0) { hits.push(k + nm.length); k = text.indexOf(nm, k + 1); } }
      hits.sort((a, b) => a - b);
      const wordOf = (off) => text.slice(0, off).split(/\s+/).filter(Boolean).length;
      const named = hits.length >= 2;
      return { named, namedAtWord: named ? wordOf(hits[1]) : null, curve: [], theta: 1 };
    },
  };
}
const empty = { name: "empty", read: () => ({ tokens: [], beings: [], relations: [] }), identify: () => ({ named: false, namedAtWord: null }) };
function derangedReader() {
  const perfect = perfectReader();
  return { name: "deranged", read: (text) => { const i = docs.findIndex((d) => d.text.startsWith(text)); return i < 0 ? { tokens: [], beings: [], relations: [] } : perfect.read(docs[(i + 1) % docs.length].text); }, identify: (text) => perfect.identify(text) };
}
/** an oracle for the SHEETS (which are new texts): it knows the toy names and reads what each line states. */
function sheetOracle() {
  return {
    name: "sheet-oracle",
    read: (text) => {
      const beings = [], relations = [];
      for (const line of text.split(/(?<=\.)\s+|\n/)) {
        for (const n of names) {
          const re = new RegExp(`(?:${n.genus}|${n.genus[0]}\\.) ${n.epithet}`);
          if (!re.test(line)) continue;
          const id = `${n.genus} ${n.epithet}`;
          beings.push({ id, kind: "species", span: [0, 1], resolved: true });
          relations.push({ end1: n.genus, label: "genus_of", end2: id });
          for (const a of n.authors) if (line.toLowerCase().includes(a.toLowerCase())) relations.push({ end1: id, label: "authored_by", end2: akey(a) });
          for (const a of n.recomb) if (line.toLowerCase().includes(a.toLowerCase())) relations.push({ end1: id, label: "recombined_by", end2: akey(a) });
          if (n.year && line.includes(String(n.year))) relations.push({ end1: id, label: "year_of", end2: String(n.year) });
        }
      }
      return { tokens: [], beings, relations };
    },
    identify: () => ({ named: false }),
  };
}
const P = { ...I.PARAMS, W: 40, CAUSAL_DOCS: 6, C0_STREAMS: 10, KIND_MIN: 10, R5_DOCS: 6, R5_NAMES: 4, STREAM_CAP: 50 };
/** the prior-ablated arms for the toy: a reader that reads nothing and a deranged one (both are far below a perfect reader). */
const toyArms = () => ({ ablate_all: empty, shuffled_classifier: derangedReader() });

// ── instrument ───────────────────────────────────────────────────────────────────────────────────────────────
test("toy gold is internally consistent (every token and span points at what it says)", () => {
  for (const d of docs) for (const m of d.mentions.filter((x) => x.status === "gold")) {
    assert.equal(d.text.slice(m.core[0], m.core[1]), m.id);
    for (const [s, e, c] of m.tokens) assert.ok(d.text.slice(s, e).length > 0, `${c} token empty`);
  }
});

test("a perfect reader scores 1 on R1-R4 and passes (with the controls far below)", () => {
  const out = I.runLadder({ data, reader: perfectReader(), params: P, controlReaders: toyArms() });
  for (const k of ["r1", "r2", "r3", "r4"]) {
    const r = out.rungs[k];
    assert.equal(r.applicable, true);
    assert.ok(r.score >= 0.999, `${k} score ${r.score}`);
    assert.equal(r.pass, true, `${k} should pass: ${JSON.stringify(r.details.clauses?.filter((c) => !c.ok))}`);
    assert.ok(r.margin > 0.1, `${k} margin ${r.margin}`);
    assert.ok(r.control < r.score);
  }
  assert.equal(out.rungs.r3.details.binomial.f1, 1);
  assert.equal(out.rungs.r4.details.claims.f1, 1);
  assert.equal(out.rungs.r4.details.structural.f1, 1);
  // the labelled-span F1 is exact for the perfect reader (nothing extra, nothing unheard)
  assert.equal(out.rungs.r2.details.accuracy_over_reader_tokens, 1);
  // the licence of the licence: the additive cheat is caught on every layer, the honest reader is exact in both directions
  for (const layer of ["tokens", "beings", "relations"]) {
    assert.equal(out.rungs.r1.details.causal[layer], 1, layer);
    assert.ok(out.rungs.r1.details.causal.additive_cheat[layer] <= I.PARAMS.RULE.r1.cheat, `cheat ${layer} ${out.rungs.r1.details.causal.additive_cheat[layer]}`);
  }
});

test("a perfect reader passes R0 (positives named, hard negatives and strangers refused, controls refused)", () => {
  const r = I.measureR0(data, perfectReader(), P);
  assert.equal(r.applicable, true);
  assert.ok(r.details.tpr_head >= 0.99 && r.details.tpr_mid >= 0.99, JSON.stringify(r.details));
  assert.equal(r.controls.hard_negatives, 0);
  assert.equal(r.controls.charshuf, 0);
  assert.ok(r.details.causal.agreement >= 0.99);
});

test("a deranged reader (the answers of the next document) FAILS R1-R4 with low scores", () => {
  const out = I.runLadder({ data, reader: derangedReader(), params: P, controlReaders: toyArms() });
  for (const k of ["r1", "r3", "r4"]) {
    assert.ok(out.rungs[k].score < 0.5, `${k} score ${out.rungs[k].score}`);
    assert.equal(out.rungs[k].pass, false, k);
  }
});

test("a reader that reads nothing scores 0 and FAILS (no pass by absence)", () => {
  const out = I.runLadder({ data, reader: empty, params: P, controlReaders: toyArms() });
  for (const k of ["r1", "r2", "r3"]) { assert.equal(out.rungs[k].score, 0, k); assert.equal(out.rungs[k].pass, false, k); }
  assert.notEqual(out.rungs.r0.pass, true);
});

test("a control that equals the real arm is refused: margin <= 0 never passes", () => {
  // the naive reader IS the control of R3: a reader identical to it cannot pass the margin clause
  const naive = { name: "naive", read: (t) => ({ tokens: [], beings: I.naiveBeings(t), relations: [] }), identify: () => ({ named: false }) };
  const r = I.runLadder({ data, reader: naive, params: P, controlReaders: toyArms() }).rungs.r3;
  assert.ok(r.margin <= 0.05, `margin ${r.margin}`);
  assert.notEqual(r.pass, true);
});

test("the causal licence catches a lookahead reader (it revises: the prefix says what the full text does not)", () => {
  const perfect = perfectReader();
  // a reader that fabricates a non-provisional being on every prefix that the full text then withdraws: it has used the future to revise
  const cheat = { ...perfect, read: (text) => { const o = perfect.read(text); const full = docs.find((d) => d.text.startsWith(text)); const isPrefix = full && full.text.length > text.length; return { ...o, beings: o.beings.concat(isPrefix ? [{ id: "Zzz zzz", kind: "species", span: [1, 2], at: 0, prov: false }] : []) }; } };
  const c = I.causalChecks(docs, cheat, P);
  assert.ok(c.beings < 0.999, `causal beings ${c.beings}`);
  assert.equal(I.causalChecks(docs, perfect, P).beings, 1);
});

test("the causal licence is TWO-DIRECTIONAL: an ADDITIVE lookahead cheat (promotion by whole-text recurrence, honest low `at`) is caught, though it never revises anything", () => {
  const perfect = perfectReader();
  // the cheat: any capitalised word that occurs >= 3 times ANYWHERE in the text is a genus being / token / genus_of relation at its first occurrence (the text it is given decides)
  const cheat = I.lookaheadCheat(perfect);
  const c = I.causalChecks(docs, cheat, P);
  for (const layer of ["tokens", "beings", "relations"]) {
    // one-directional non-revision (Amendment 1) cannot see it: nothing the cheat said on a prefix is withdrawn by the full text ...
    assert.equal(c.by_direction[layer].non_revision, 1, `non-revision ${layer}`);
    // ... the converse sees it: the full text has items that the prefix, lacking the later occurrences, does not
    assert.ok(c.by_direction[layer].no_lookahead_additions < 0.9, `no_lookahead_additions ${layer} ${c.by_direction[layer].no_lookahead_additions}`);
    assert.ok(c[layer] < 0.9, `combined ${layer} ${c[layer]}`);
  }
  // the honest reader is exact in both directions
  const h = I.causalChecks(docs, perfect, P);
  for (const layer of ["tokens", "beings", "relations"]) { assert.equal(h[layer], 1, layer); assert.equal(h.by_direction[layer].no_lookahead_additions, 1); }
  // a hand-written additive cheat of a different shape (it adds a being at every cut where the FULL text is longer): also caught
  const lookahead = { ...perfect, read: (text) => { const o = perfect.read(text); const d = docs.find((x) => x.text.startsWith(text)); const early = d && d.text.length === text.length ? [{ id: "Early early", kind: "species", span: [1, 2], at: 2, prov: false }] : []; return { ...o, beings: o.beings.concat(early) }; } };
  assert.ok(I.causalChecks(docs, lookahead, P).beings < 0.5);
});

test("a control that equals the real arm is refused on R2 and R5 (prior-ablated arms are IN the rule), and a missing arm is a typed gap, not a pass", () => {
  const perfect = perfectReader();
  // arms as good as the real reader: the margin clauses must fail
  const same = { ablate_all: perfect, shuffled_classifier: perfect };
  const out = I.runLadder({ data, reader: perfect, params: P, controlReaders: same });
  assert.equal(out.rungs.r2.pass, false);
  const c2 = out.rungs.r2.details.clauses.find((c) => c.clause === "margin_over_prior_ablated");
  assert.equal(c2.ok, false, JSON.stringify(c2));
  const r5 = I.measureR5(data, sheetOracle(), P, { ablate_all: sheetOracle(), shuffled_classifier: sheetOracle() });
  assert.equal(r5.pass, false);
  assert.equal(r5.details.clauses.find((c) => c.clause === "macro_minus_prior_ablated_and_shotgun").ok, false);
  // no arms at all (no priors to edit, none injected): null with a typed gap
  const none = I.runLadder({ data, reader: perfect, params: P });
  assert.equal(none.rungs.r2.pass, null);
  assert.ok(none.rungs.r2.gaps.some((g) => g.reason === "prior_ablated_arms_unavailable"));
  const r5none = I.measureR5(data, sheetOracle(), P);
  assert.equal(r5none.pass, null);
  assert.ok(r5none.gaps.some((g) => g.reason === "prior_ablated_arms_unavailable"));
});

test("R2 charges over-production: a reader that hears every gold token and adds a hundred false ones keeps its recall and loses its F1", () => {
  const perfect = perfectReader();
  const noisy = { ...perfect, name: "noisy", read: (text, opts) => { const o = perfect.read(text, opts); const extra = []; for (let k = 0; k + 3 < text.length && extra.length < 40; k += 7) extra.push({ s: k, e: k + 3, cls: "genus", at: k + 3, prov: false }); return { ...o, tokens: o.tokens.concat(extra) }; } };
  const clean = I.runLadder({ data, reader: perfect, params: P, controlReaders: toyArms() }).rungs.r2;
  const dirty = I.runLadder({ data, reader: noisy, params: P, controlReaders: toyArms() }).rungs.r2;
  assert.ok(dirty.details.accuracy_over_gold >= 0.99, "recall (the pre-Amendment-2 headline) is blind to over-production");
  assert.ok(dirty.score < clean.score - 0.1, `F1 ${dirty.score} vs ${clean.score}`);
  assert.ok(dirty.details.accuracy_over_reader_tokens < 0.9);
});

test("R5 charges false facts: the SHOTGUN reader (every author and year against every being) is far below the real reader and fails; the oracle passes", () => {
  const oracle = sheetOracle();
  const good = I.measureR5(data, oracle, P, toyArms());
  const shot = I.shotgunReader(oracle);
  const bad = I.measureR5(data, shot, P, toyArms());
  assert.ok(good.score >= 0.99, `oracle ${good.score}`);
  assert.ok(bad.score < good.score - 0.5, `shotgun as the reader ${bad.score}`);
  assert.equal(bad.pass, false);
  // the shotgun arm is derived from the real reader and sits in the rule: the oracle clears it by a wide margin
  assert.ok(good.controls.shotgun < good.score - 0.5, `shotgun arm ${good.controls.shotgun}`);
  assert.equal(good.details.clauses.find((c) => c.clause === "macro_minus_prior_ablated_and_shotgun").ok, true);
  // the precision of the shotgun on a rendering is tiny: it asserts a thousand facts the sheet does not state; the oracle's is ~1
  for (const st of ["nocomma", "upper", "prose"]) {
    assert.ok(bad.details.precision_on_this_rendering_by_rendering[st] < 0.3, `shotgun precision ${st} ${bad.details.precision_on_this_rendering_by_rendering[st]}`);
    assert.ok(good.details.precision_on_this_rendering_by_rendering[st] > 0.95, `oracle precision ${st} ${good.details.precision_on_this_rendering_by_rendering[st]}`);
  }
});

test("R5: sheets render the seven conventions and the oracle agrees across them; a blind reader scores 0", () => {
  const ns = I.r5Names(docs[1], 4);
  assert.ok(ns.length >= 3);
  const canon = I.renderSheet(ns, "canon"), icn = I.renderSheet(ns, "icn"), up = I.renderSheet(ns, "upper"), ab = I.renderSheet(ns, "abbr"), it = I.renderSheet(ns, "italic");
  const rc = ns.find((x) => x.comb.length);
  assert.ok(rc, 'a recombined name is in the sample');
  assert.ok(canon.includes(`${rc.genus} ${rc.epithet} (${rc.orig[0]}, ${rc.year}) Brown`), canon);
  assert.ok(icn.includes(`(${rc.orig[0]}) Brown`), icn);
  assert.ok(up.includes(ns[0].orig[0].toUpperCase()));
  assert.ok(it.includes(`*${ns[0].genus} ${ns[0].epithet}*`));
  assert.ok(ab.split("\n").length === ns.length);
  const good = I.measureR5(data, sheetOracle(), P, toyArms());
  assert.ok(good.score >= 0.99, `oracle macro ${good.score}`);
  assert.equal(good.pass, true, JSON.stringify(good.details.clauses));
  const blind = I.measureR5(data, empty, P);
  assert.equal(blind.score, 0);
  assert.equal(blind.pass, false);
  assert.equal(good.details.sheets_are.startsWith("DERIVED"), true);
});

test("sign test and derangement behave", () => {
  assert.ok(I.signTest([1, 1, 1, 1, 1, 1], [0, 0, 0, 0, 0, 0]).p < 0.02);
  assert.ok(I.signTest([1, 0, 1, 0], [0, 1, 0, 1]).p > 0.5);
  const rnd = I.mulberry32(7);
  for (let n = 2; n < 12; n++) { const p = I.derangement(n, rnd); assert.ok(p.every((v, i) => v !== i), `fixed point at n=${n}`); assert.equal(new Set(p).size, n); }
});

test("missing data is a typed gap, never a throw", async () => {
  const out = await I.measure({ split: "dev", root: "/nonexistent-taxonomy-root" });
  assert.equal(out.family, "taxonomy");
  for (const k of ["r0", "r1", "r2", "r3", "r4", "r5"]) {
    assert.equal(out.rungs[k].pass, null, k);
    assert.ok(out.rungs[k].gaps.some((g) => g.reason === "unmeasured"), k);
  }
});

test("the registration digest exists and is stable", () => {
  assert.match(I.PREREG_SHA256 ?? "", /^[0-9a-f]{64}$/);
});

// ── adapter, shipped priors ────────────────────────────────────────────────────────────────────────────────────
const priors = A.loadPriors();
const haveShipped = priors.ok;
const sk = { skip: haveShipped ? false : "shipped priors absent" };
const rels = (r, label) => r.relations.filter((x) => x.label === label).map((x) => `${x.end1}>${x.end2}`);

test("adapter (shipped priors): a binomial with an ICZN authority", sk, () => {
  const r = A.read("The big cat Puma concolor (Linnaeus, 1771) lives in Brazil.", priors);
  const b = r.beings.find((x) => x.id === "Puma concolor");
  assert.ok(b && b.kind === "species");
  assert.deepEqual(rels(r, "authored_by"), ["Puma concolor>linnaeus"]);
  assert.deepEqual(rels(r, "year_of"), ["Puma concolor>1771"]);
  assert.deepEqual(rels(r, "genus_of"), ["Puma>Puma concolor"]);
});

test("adapter (shipped priors): identity folds an abbreviated genus onto the full genus (the cast), and the abbreviation alone stays unresolved", sk, () => {
  const r = A.read("Felis catus Linnaeus, 1758 and F. silvestris Schreber, 1775 are cats.", priors);
  assert.ok(r.beings.some((b) => b.id === "Felis silvestris" && b.abbrev && b.resolved));
  const alone = A.read("We saw F. silvestris Schreber, 1775 today.", priors);
  assert.ok(alone.gaps.some((g) => g.reason === "abbrev_unresolved" && g.count > 0) || alone.beings.length === 0 || alone.beings.every((b) => b.resolved === false));
});

test("adapter (shipped priors): an ICN authority with parentheses, ex and a rank marker", sk, () => {
  const r = A.read("Quercus robur L. subsp. pedunculata (Ehrh.) Hoffm. ex Schult. grows in Europe.", priors);
  const id = "Quercus robur pedunculata";
  assert.ok(r.beings.some((b) => b.id === id && b.kind === "infraspecific"));
  assert.ok(rels(r, "authored_by").includes(`${id}>ehrh`));
  assert.ok(rels(r, "recombined_by").includes(`${id}>hoffm`));
  assert.ok(rels(r, "ex_author").includes(`${id}>schult`));
});

test("adapter (shipped priors): specimen data and prose are refused", sk, () => {
  const r = A.read("Holotype male, Brazil, Minas Gerais, 12 Jul. 2018, Silva leg. The species is large. Figure 3 shows Diagnosis female.", priors);
  assert.equal(r.beings.length, 0);
});

test("adapter (shipped priors): emphasis marks are transparent and the case-blind arm degrades but does not throw", sk, () => {
  const a = A.read("*Felis catus* Linnaeus, 1758", priors), b = A.read("Felis catus Linnaeus, 1758", priors);
  assert.deepEqual(a.beings.map((x) => x.id), b.beings.map((x) => x.id));
  assert.deepEqual(rels(a, "authored_by"), rels(b, "authored_by"));
  const low = A.read("felis catus linnaeus 1758", priors, { noCase: true });
  assert.ok(Array.isArray(low.beings));
});

test("adapter (shipped priors): reading is causal in BOTH directions (no revision, no lookahead promotion) on a hand-written paragraph", sk, () => {
  const text = "Material. Puma concolor (Linnaeus, 1771) was compared with Felis catus Linnaeus, 1758 and F. silvestris Schreber, 1775 near Quercus robur L. in the forest of Brazil where the third author found them all. " + "More text follows here so that there is enough to cut at several places in the paragraph. ".repeat(3);
  const full = A.read(text, priors);
  for (const frac of [0.3, 0.5, 0.7]) {
    let cut = Math.floor(text.length * frac); while (!/\s/.test(text[cut])) cut--;
    const pre = A.read(text.slice(0, cut), priors);
    // both directions (Amendment 2): the non-provisional items with at < cut of the prefix scan and of the full scan are the SAME set
    //   non-revision: prefix subset of full;  no lookahead promotion: full subset of prefix
    const subset = (a, b, f) => { const B = new Set(b.map(f)); return a.filter((x) => !x.prov && x.at < cut).map(f).every((k) => B.has(k)); };
    for (const [layer, f] of [["beings", (b) => `${b.span}|${b.id}|${b.kind}`], ["tokens", (t) => `${t.s}:${t.e}:${t.cls}`], ["relations", (r) => `${r.end1}|${r.label}|${r.end2}`]]) {
      assert.ok(subset(pre[layer], full[layer], f), `${layer} non-revision, cut ${cut}`);
      assert.ok(subset(full[layer], pre[layer], f), `${layer} no lookahead additions, cut ${cut}`);
    }
  }
});

test("adapter (shipped priors): R0 names a taxonomic stream and refuses prose", sk, () => {
  const tax = "Puma concolor (Linnaeus, 1771) and Felis catus Linnaeus, 1758 were compared with Panthera leo (Linnaeus, 1758) and Lynx lynx (Linnaeus, 1758) in the revision of the Felidae by the author in the first part of the work";
  assert.equal(A.identify(tax, priors).named, true);
  const prose = "The committee met on Tuesday and decided that the proposal would be discussed again after the summer break when more members were available";
  assert.equal(A.identify(prose, priors).named, false);
});

test("prior ablations edit COPIES of the received priors: all learned counts emptied, or the classifier's count pairs deranged with the marginals kept", sk, () => {
  const before = JSON.stringify(priors.classifier.binom.prior) + Object.keys(priors.genera.names).length + Object.keys(priors.refusal.cap_refuse).length;
  const all = I.ablatedPriors(priors, "all");
  assert.equal(Object.keys(all.genera.names).length, 0);
  assert.equal(Object.keys(all.refusal.cap_refuse).length, 0);
  assert.deepEqual(all.classifier.binom, { prior: { pos: 0, neg: 0 }, f: {} });
  assert.deepEqual(all.lexicon, priors.lexicon, "the Codes' lexicon is kept");
  assert.deepEqual(all.identity, priors.identity, "the R0 identity prior is kept");
  const sh = I.ablatedPriors(priors, "shuffled_classifier");
  for (const t of ["binom", "uni", "kind"]) {
    let moved = 0;
    for (const [name, row] of Object.entries(priors.classifier[t].f)) {
      const keys = Object.keys(row.v);
      const sum = (r, i) => keys.reduce((a, k) => a + r.v[k][i], 0);
      assert.equal(sum(sh.classifier[t].f[name], 0), sum(row, 0), `${t}.${name} pos marginal`);
      assert.equal(sum(sh.classifier[t].f[name], 1), sum(row, 1), `${t}.${name} neg marginal`);
      for (const k of keys) if (JSON.stringify(sh.classifier[t].f[name].v[k]) !== JSON.stringify(row.v[k])) moved++;
    }
    assert.ok(moved > 0, `${t}: the association was destroyed`);
    assert.deepEqual(sh.classifier[t].prior, priors.classifier[t].prior);
  }
  assert.equal(JSON.stringify(priors.classifier.binom.prior) + Object.keys(priors.genera.names).length + Object.keys(priors.refusal.cap_refuse).length, before, "the input priors are not mutated");
  const arms = I.ablationReaders(priors);
  assert.deepEqual(Object.keys(arms).sort(), ["ablate_all", "ablate_classifier", "ablate_lists", "shuffled_classifier"]);
});

test("the prior-ablated reader MOVES: with the learned priors emptied it admits what the shipped reader refuses (the control is not a copy of the real arm)", sk, () => {
  const arms = I.ablationReaders(priors);
  const real = I.adapterReader(priors);
  const text = "Holotype male, Brazil, Minas Gerais, 12 Jul. 2018, Silva leg. The species is large. Figure 3 shows Diagnosis female. Material examined near Lima and Madrid.";
  assert.equal(real.read(text).beings.length, 0);
  assert.ok(arms.ablate_all.read(text).beings.length > 0, "accept-every-candidate reader over-produces");
  const sheet = "Puma concolor (Linnaeus, 1771)\nFelis catus Linnaeus, 1758\nPanthera leo (Linnaeus, 1758)\nLynx lynx (Linnaeus, 1758)";
  const rb = real.read(sheet).beings.map((b) => b.id), sb = arms.shuffled_classifier.read(sheet).beings.map((b) => b.id);
  assert.ok(rb.includes("Puma concolor"));
  assert.ok(JSON.stringify(rb) !== JSON.stringify(sb) || arms.shuffled_classifier.read(text).beings.length > 0, "the shuffled classifier reads differently from the real one somewhere");
});

test("adapter: a missing prior is a typed gap, never a throw", () => {
  const p = A.loadPriors({ dir: "/nonexistent-priors" });
  assert.equal(p.ok, false);
  assert.ok(p.gaps.length >= 5 && p.gaps.every((g) => g.reason.startsWith("prior_missing:")));
  const r = A.read("Puma concolor (Linnaeus, 1771)", p);
  assert.equal(r.beings.length, 0);
  assert.ok(r.gaps.some((g) => g.reason.startsWith("prior_missing")));
});
