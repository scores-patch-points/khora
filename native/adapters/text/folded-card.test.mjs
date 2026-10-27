// folded-card.test.mjs — the card renderer (folded-card.js): K1 to K7 of eval/referents/PREREG-FOLDED-CARD.md. No model is called; the point is what the card holds and what it never shows.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { readWith } from "../../the-fold/read-core.mjs";
import { renderCard, QUESTION_KINDS } from "./folded-card.js";
import { createDeclensionFolder } from "./declension.js";
import { makeGary } from "../../organs/gary.js";

const prior = JSON.parse(fs.readFileSync(new URL("../../priors/declension-rus.json", import.meta.url), "utf8"));
const RU = "Пьер вошёл в гостиную. Князь Андрей встретил Пьера у камина. Наташа смотрела на Пьера, и Пьер улыбнулся Наташе. Потом Пьеру подали чай, и Пьер долго говорил с Андреем о войне. Наташа слушала Пьера, а Андрей смотрел на Наташу. Все молчали, когда Наташа вошла в комнату.";
const read = (o = {}) => readWith(RU, { language: "ru", minCharacters: 0, referents: true, declension: true, ...o });
const entry = read();
const beingOf = (e, re) => e.referents.referents.filter((r) => r.standing === "referent" && re.test(r.face)).sort((a, b) => b.mentions.length - a.mentions.length)[0];
const natasha = beingOf(entry, /Наташ/), pierre = beingOf(entry, /Пьер/);
const Q = { gap: { kind: "gap", text: "Что в карточке сказано о матери Наташи?" }, free: { kind: "free", text: "Кто это?" }, contradiction: { kind: "contradiction", text: "Эти два утверждения расходятся?" }, identity: { kind: "identity", text: "Это один человек?" }, derivation: { kind: "derivation", text: "Она родственница?" } };
const card = (id, o = {}) => renderCard(entry, id, { forWhom: "a reader", declension: { prior }, question: Q.free, ...o });
const ID = /ref_|spn_|evt_|edg_|ref:auto:|material#|[0-9a-f]{16}/;

test("the fixture has the beings the card is about: Наташа with her case forms, Пьер", () => {
  assert.ok(natasha && pierre);
  assert.ok(natasha.mentions.length >= 3);
});

test("K1: no address, no id, no ref_ string in any card, for any question kind, plain or swapped", () => {
  for (const kind of QUESTION_KINDS) for (const swap of [null, { Наташа: "Зинаида" }]) {
    const c = card(natasha.id, { question: Q[kind], swap });
    assert.doesNotMatch(c.text, ID, `${kind}${swap ? " swapped" : ""}`);
    assert.doesNotMatch(JSON.stringify(c.messages), ID);
  }
});

test("K2: Gary's check over the card and the question returns no strike and no refuse; the flags are reported, and here there are none", () => {
  const gary = makeGary({});
  for (const kind of QUESTION_KINDS) for (const id of [natasha.id, pierre.id]) {
    const c = card(id, { question: Q[kind] });
    const { findings } = gary.check(c.messages, { material: c.available.appearances });
    assert.deepEqual(findings.filter((f) => f.severity === "strike" || f.severity === "refuse"), [], `${kind}`);
    assert.deepEqual(findings, [], `no flag from the wrapper's own prose (${kind})`);
    assert.equal(c.messages.at(-1).role, "user"); assert.equal(c.messages.at(-1).content, Q[kind].text, "the question is last and verbatim");
  }
});

test("K3: size by the window, never silently: shown + left = available per section, each omission is a count in the card, and a window the mandatory parts do not fit says fits:false", () => {
  const full = card(natasha.id);
  assert.equal(full.fits, true);
  for (const k of Object.keys(full.available)) assert.equal(full.left[k], 0, "no window, nothing left out");
  const window = Math.floor(full.text.length * 0.7);
  const small = card(natasha.id, { window });
  assert.ok(small.size.chars <= window && small.fits);
  let omitted = 0;
  for (const k of Object.keys(small.available)) {
    const shown = small.map.filter((m) => m.section === k).length;
    assert.equal(shown + small.left[k], small.available[k], k);
    omitted += small.left[k];
  }
  assert.ok(omitted > 0);
  assert.match(small.text, /more (appearance|statement|pronoun|row)s? (exist|exists) in the reading and (is|are) not shown/);
  const tiny = card(natasha.id, { window: 40 });
  assert.equal(tiny.fits, false, "the mandatory parts are not shrunk");
  assert.ok(tiny.size.chars > 40);
});

test("the question orders what is spent: the same window gives a gap question the giver rows first and an identity question the compared appearances first", () => {
  const rows = [{ giver: "the table of Russian kinship terms", text: "тётя — сестра отца или матери" }];
  const mandatory = card(natasha.id, { stated: rows, window: 1 });   // the frame, the names and the not-held statements: the part that is never shrunk
  assert.equal(mandatory.fits, false);
  const window = mandatory.size.chars + 220;                          // room for roughly one more item
  const gap = card(natasha.id, { stated: rows, window, question: Q.gap });
  assert.equal(gap.fits, true);
  assert.equal(gap.left.stated, 0, "a gap question spends on the giver rows first");
  assert.ok(gap.left.appearances > 0 || gap.left.edges > 0, "and what did not fit is counted, not dropped");
  assert.match(gap.text, /According to the table of Russian kinship terms: тётя/);
  const spans = natasha.mentions.slice(-1);
  const ident = card(natasha.id, { window, question: { ...Q.identity, about: { spans } } });
  const wanted = ident.map.filter((m) => m.section === "appearances").flatMap((m) => m.address.spans);
  assert.ok(wanted.includes(spans[0]), "the compared mention's sentence is among those shown");
});

test("K4: every ordinal in the text is in the private map once, every address resolves in the ledger, and none of it is in the text", () => {
  for (const id of [natasha.id, pierre.id]) {
    const c = card(id, { stated: [{ giver: "a giver", text: "a row" }] });
    const inText = [...c.text.matchAll(/^\((\d+)\) /gm)].map((m) => +m[1]);
    assert.deepEqual(inText, c.map.map((m) => m.ordinal));
    assert.equal(new Set(inText).size, inText.length);
    const spans = new Set(entry.referents.spans.map((s) => s.id)), refs = new Set(entry.referents.referents.map((r) => r.id)), edges = new Set(entry.referents.edges.map((e) => e.id));
    for (const m of c.map) {
      const a = m.address;
      if (a.referent) assert.ok(refs.has(a.referent));
      for (const s of a.spans ?? []) assert.ok(spans.has(s), `${m.section} span`);
      if (a.edge) assert.ok(edges.has(a.edge));
      for (const sn of [a.sentence, ...(a.sentences ?? [])].filter((x) => x != null)) assert.ok(sn >= 0 && sn < entry.sentences.length);
    }
    for (const m of c.map) for (const v of JSON.stringify(m.address).match(/(ref_|spn_|edg_)[0-9a-f]+/g) ?? []) assert.ok(!c.text.includes(v));
  }
});

test("K5: the name-swap: the same lines, ordinals and map; the old name gone; the invented name's case forms follow the fold; the hash differs", () => {
  const plain = card(natasha.id, { question: Q.gap }), swapped = card(natasha.id, { question: Q.gap, swap: { Наташа: "Зинаида" } });
  assert.equal(swapped.size.lines, plain.size.lines);
  assert.deepEqual(swapped.map, plain.map);
  assert.deepEqual(swapped.text.match(/^\(\d+\) /gm), plain.text.match(/^\(\d+\) /gm));
  assert.equal(swapped.swapped.leaks, 0, JSON.stringify(swapped.swapped.leaked));
  assert.doesNotMatch(swapped.text, /Наташ/);
  assert.notEqual(swapped.sha256, plain.sha256);
  const { sameStem } = createDeclensionFolder(prior);
  const pairs = new Map(swapped.swapped.pairs);
  assert.equal(pairs.get("Наташа"), "Зинаида");
  for (const [from, to] of pairs) if (from !== "Наташа") { assert.match(to, /^Зинаид/); assert.ok(sameStem(to.toLowerCase(), "зинаида"), `${to} is reached from the invented base by the same table`); }
  assert.ok([...pairs.values()].some((v) => /Зинаиде|Зинаиду|Зинаиды|Зинаидой/.test(v)), "a case form was generated");
});

test("K6: the same inputs give the same card and the same hash", () => {
  const a = card(natasha.id, { question: Q.gap, window: 3000 }), b = card(natasha.id, { question: Q.gap, window: 3000 });
  assert.equal(a.text, b.text); assert.equal(a.sha256, b.sha256); assert.deepEqual(a.map, b.map);
});

test("what the card does not hold is stated as fact: no giver rows, no pronoun, and the names are not folded from nothing", () => {
  const c = card(natasha.id);
  assert.match(c.text, /7\. What the card does not hold\n\(\d+\) No giver states anything about/);
  assert.match(c.text, /No pronoun was read as this being/);
  const withRows = card(natasha.id, { stated: [{ giver: "the table of Russian kinship terms", text: "мать — женщина, родившая ребёнка" }] });
  assert.doesNotMatch(withRows.text, /No giver states anything/);
  assert.match(withRows.text, /According to the table of Russian kinship terms/);
  assert.ok(withRows.map.some((m) => m.section === "stated" && m.address.giver === "the table of Russian kinship terms"));
  // each case form names the giver of its fold
  assert.match(c.text, /the declension table of the language \(UniMorph/);
});

test("a reading made without referents cannot be rendered, and a being that is not in it either", () => {
  const plain = readWith(RU, { language: "ru", minCharacters: 0 });
  assert.throws(() => renderCard(plain, "x"), /referents: true/);
  assert.throws(() => renderCard(entry, "ref_none"), /no such referent/);
});

test("K7: the option is off by default and non-enumerable when on: the entry on the wire is unchanged; card without referents is a typed gap", () => {
  const off = readWith(RU, { language: "ru", minCharacters: 0, referents: true, declension: true });
  const on = readWith(RU, { language: "ru", minCharacters: 0, referents: true, declension: true, card: true });
  assert.equal(off.renderCard, undefined);
  assert.equal(typeof on.renderCard, "function");
  assert.equal(Object.keys(on).includes("renderCard"), false);
  assert.equal(JSON.stringify({ ...on, ms: 0 }), JSON.stringify({ ...off, ms: 0 }));
  const c = on.renderCard(beingOf(on, /Наташ/).id, { question: Q.gap });
  assert.match(c.text, /the declension table of the language/, "the entry's own declension prior is handed to the renderer");
  const orphan = readWith(RU, { language: "ru", minCharacters: 0, card: true });
  assert.equal(orphan.renderCard, undefined);
  assert.ok(orphan.gaps.some((g) => g.gap === "card_needs_referents"));
});

test("the module imports only the page-safe hash and the pure declension folder (the reader's import graph stays free of node:)", () => {
  const src = fs.readFileSync(new URL("./folded-card.js", import.meta.url), "utf8");
  const imports = [...src.matchAll(/^\s*import\s+(?:[^'"]*?from\s+)?["']([^"']+)["']/gm)].map((m) => m[1]);
  assert.deepEqual(imports.sort(), ["./declension.js", "./sha256hex.js"]);
});
