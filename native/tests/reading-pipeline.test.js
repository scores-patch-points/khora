// reading-pipeline.test.js — THE ONE READER (the-fold/read-core.mjs), read the canonical way: priors through the one door, the
// hyperlexicon's aliases at the sentence cut, the declared language read with its own priors, and everything the reader saw (its
// cast with addresses, its sentences, its pronoun bindings) on the entry, never read a second time. Falsifiers sit beside each claim.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readWith, makeReader, priorsFor, abbreviationsFor, consultAliases } from "../the-fold/read-core.mjs";
import { priorJson, setPriorSource, priorNames } from "../the-fold/prior-source.mjs";
import { readCanonical } from "../the-fold/read-door-canonical.mjs";
import { readToWeft } from "../the-fold/read-process.mjs";
import { makeLexicon } from "../organs/lexicon.js";
import { splitSentences } from "../adapters/text/spans.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MILL = "In 1850 Messrs. Smith and Jones bought the mill. They sold it to the town in 1871. The town council then built a school on the site, and the school stood for forty years. Years later Smith wrote that the sale was a mistake.";
const DOC = `${MILL}\n\n${MILL}`;

test("the prior door serves the janus home by name, and a replaced source is what every reader then reads", () => {
  assert.ok(priorJson("pos-eng.json")?.forms, "pos-eng.json arrives through the door");
  assert.ok(priorNames().includes("reading-rules.json"));
  const pos = priorJson("pos-eng.json");
  setPriorSource({ read: (n) => (n === "pos-eng.json" ? pos : null), list: () => ["pos-eng.json"] });
  try {
    const p = priorsFor("en");
    assert.ok(p.posPrior, "the stub's pos prior is read");
    assert.equal(p.lemmatizer, null, "and nothing the stub lacks is guessed");
    assert.ok(p.gaps.some((g) => g.gap === "no_morphology"), "the missing leg is a typed gap");
  } finally { setPriorSource(null); }
  assert.ok(priorsFor("en").lemmatizer, "restored: the home's morphology is back");
});

test("an alias the hyperlexicon resolves keeps its period: 'Messrs.' ends no sentence", () => {
  // the read-ahead dotted words are withheld here, so the live alias is what keeps the period
  const noDotted = { ...priorsFor("en"), dotted: null };
  const bare = readWith(DOC, { language: "en", priors: noDotted });
  const kept = readWith(DOC, { language: "en", priors: noDotted, aliases: ["Messrs."] });
  assert.ok(bare.sentences.some((s) => s.text === "In 1850 Messrs."), "FALSIFIER: without the alias the splitter cuts after Messrs.");
  assert.ok(kept.sentences.some((s) => s.text === "In 1850 Messrs. Smith and Jones bought the mill."), "with it, Messrs. stays in its sentence");
  assert.equal(kept.sentences.length, bare.sentences.length - 2);
  assert.equal(kept.abbreviations.aliases, 1);
});

test("the measured punctuation prior is passed to the splitter: 'Mr.' and 'Dr.' are words without any lookup", () => {
  const pr = priorsFor("en");
  if (!pr.punctuation) return test.skip?.("punctuation-eng.json is not in this priors home");
  const a = abbreviationsFor("Dr. Watson met Mr. Holmes.", { priors: pr });
  assert.ok(a.set.has("Mr") && a.set.has("Dr") && a.set.has("mr"), "the prior's tokens, as written and capitalised");
  assert.ok(a.prior >= 10, "the prior is the measured list, not a handful");
});

test("the hyperlexicon is asked only about unsure dotted forms, and the text's own use can refuse an alias", async () => {
  const asked = [];
  const lex = makeLexicon({ ask: async (forms) => { asked.push(...forms); return { giver: { name: "stub" }, results: Object.fromEntries(forms.map((f) => [f, f === "Messrs." ? [{ w: f, senses: [{ of: "Mr." }] }] : f === "in." ? [{ w: f, senses: [{ of: "inch" }] }] : null])) }; } });
  const text = "Messrs. Smith came in. He left. Messrs. Jones came in. The rest stayed in the hall.";
  const c = await consultAliases(text, lex, { priors: { ...priorsFor("en"), dotted: null } });
  assert.deepEqual(c.aliases, ["Messrs."]);
  const inch = c.rows.find((r) => r.form === "in.");
  assert.ok(inch && inch.kept === false, "'in.' is listed as a form of 'inch', but the text writes 'in' bare: refused");
  assert.ok(!asked.includes("Smith."), "a form at no junction is never asked about");
  const none = await consultAliases(text, null);
  assert.match(none.gap, /no hyperlexicon/);
});

test("a dotted form a giver lists beside an ordinary word is refused by the treebank's evidence; one the treebank writes dotted is kept", async () => {
  const lex = makeLexicon({ ask: async (forms) => ({ giver: { name: "stub" }, results: Object.fromEntries(forms.map((f) => [f, f === "ports." ? [{ w: f, senses: [{ of: "portraits" }] }] : f === "Messrs." ? [{ w: f, senses: [{ of: "Mr." }] }] : null])) }) });
  const text = "Trade ran between the northern ports. Messrs. Hall and Lee sailed at dawn.";
  const pr = { ...priorsFor("en"), dotted: null };
  assert.ok(pr.posPrior?.forms?.ports, "the class prior attests 'ports' as a word");
  const c = await consultAliases(text, lex, { priors: pr });
  const ports = c.rows.find((r) => r.form === "ports.");
  assert.ok(ports && ports.kept === false && /treebank/.test(ports.why), "'ports.' is listed, the text never writes 'ports' bare, and the treebank still refuses it");
  assert.deepEqual(c.aliases, ["Messrs."], "a form whose base the treebank does not attest as a word is the giver's and the text's to decide");
  const bare = await consultAliases(text, lex, { priors: { ...pr, posPrior: null } });
  assert.ok(bare.aliases.includes("ports."), "FALSIFIER: with no class prior the rule cannot be read, and the text's own use keeps 'ports.'");
  assert.deepEqual(splitSentences(text, { abbreviations: abbreviationsFor(text, { priors: pr, aliases: c.aliases }).set }).map((x) => x.text), ["Trade ran between the northern ports.", "Messrs. Hall and Lee sailed at dawn."]);
});

test("the declared language is read with its own priors; undeclared is heard; an unknown name is a typed gap", () => {
  const es = "El Banco Central subió las tasas en marzo. Las tasas altas encarecieron el crédito para las pequeñas empresas. El Banco Central subió las tasas otra vez en junio, y las pequeñas empresas pagaron más. Los proveedores pasaron el costo a los clientes.";
  const w = readWith(es, { language: "es" });
  assert.equal(w.language.stem, "spa");
  assert.equal(w.language.source, "declared");
  assert.equal(w.vocabulary?.grammarPrior, true, "read with pos-spa, not the English prior");
  const en = readWith(DOC, {});
  assert.equal(en.language.source, "heard");
  assert.equal(en.language.stem, "eng");
  const xx = readWith(DOC, { language: "xx" });
  assert.ok(xx.gaps.some((g) => g.gap === "unknown_language"));
});

test("the cast is the reader's own index, every mention addressed; the sentences carry the caller's offsets", () => {
  const w = readToWeft(DOC, { address: "mill" });
  assert.equal(w.error, null);
  const smith = w.cast.find((c) => c.allSurfaces.includes("Smith"));
  assert.ok(smith, "Smith is a being");
  assert.equal(smith.mentionsAt.length, 4, "every mention of Smith, in both copies");
  for (const c of w.cast) for (const [s, e] of c.mentionSpans) {
    const got = DOC.slice(s, e).replace(/\./g, "").toLowerCase();
    assert.ok(c.allSurfaces.some((x) => x.replace(/\./g, "").toLowerCase() === got), `${c.surface}: ${got} reads back`);
  }
  for (const s of w.sentences) assert.equal(DOC.slice(s.offset, s.offset + s.text.length), s.text, "a sentence's offset reads back");
  // mentionsAt is the weft's unit, UTF-8 bytes: on text with a multi-byte character before a name the two units differ
  const accented = `Café owners met. ${DOC}`;
  const w2 = readToWeft(accented, { address: "accented" });
  const smith2 = w2.cast.find((c) => c.allSurfaces.includes("Smith"));
  const buf = Buffer.from(accented, "utf8");
  for (const at of smith2.mentionsAt) assert.equal(buf.subarray(at, at + 5).toString("utf8"), "Smith", "a byte address reads back from the bytes");
  assert.ok(w.cast.every((c) => c.standing === "referent") && w.heard.every((c) => c.standing === "heard"), "beings and heard nominals are kept apart");
});

test("the clause tree is parsed inside the reader's own sentences", () => {
  const w = readWith(DOC, { language: "en", aliases: ["Messrs."] });
  assert.ok(w.quality.clauses.sentences <= w.sentences.length, "never more sentences than the reader cut");
});

test("a pronoun binding the reader makes reaches the entry, addressed and tied to its being", () => {
  const text = "Ada Lovelace wrote the notes in 1843. Ada Lovelace worked with Charles Babbage on the engine for many years. She published the notes under her initials, and the notes were read for more than a century after she died.";
  // the resolver is an organ: a stub that binds every "She" to Ada Lovelace proves the plumbing, whatever the engine's own resolver decides
  const resolvePronouns = (sentences) => ({ bindings: sentences.flatMap((s) => [...s.text.matchAll(/\bShe\b/g)].map((m) => ({ referentId: "r:ada", sentenceOrder: s.order, offset: s.offset + m.index, pronoun: "She" }))), gaps: [] });
  const reader = makeReader({ language: "en", resolvePronouns });
  const w = readWith(text, { language: "en", reader });
  assert.equal(w.pronouns.length, 1);
  const p = w.pronouns[0];
  assert.equal(text.slice(p.at[0], p.at[1]), "She");
  assert.equal(w.sentences[p.sentence].text.startsWith("She published"), true);
});

test("the door says when it cut the text, and a short source is still cut into sentences", () => {
  const long = DOC.repeat(5);
  const out = readCanonical(long, { name: "cut", maxCharacters: 400 });
  const cut = out.gaps.find((g) => g.reason === "truncated");
  assert.ok(cut, "FALSIFIER of the silent slice");
  assert.equal(cut.readCharacters, 400);
  assert.equal(cut.totalCharacters, long.length);
  // the alias is handed in, so the claim holds whether or not this checkout's janus carries the measured punctuation prior
  const tiny = readWith("Mr. Smith left. He came back.", { language: "en", aliases: ["Mr."] });
  assert.equal(tiny.skipped, "too_short");
  assert.equal(tiny.sentences.length, 2, "Mr. is a word even in a source too short to read for relations");
});

test("the core loads in a page: nothing in its import graph imports node: statically", () => {
  const seen = new Set(), stack = [path.join(HERE, "..", "the-fold", "read-core.mjs")], offenders = [];
  while (stack.length) {
    const f = stack.pop(); if (seen.has(f)) continue; seen.add(f);
    const src = fs.readFileSync(f, "utf8");
    for (const m of src.matchAll(/^\s*import\s+(?:[^'"]*?from\s+)?["']([^"']+)["']/gm)) {
      const spec = m[1];
      if (spec.startsWith("node:") || ["fs", "path", "url", "os"].includes(spec)) offenders.push(`${path.relative(HERE, f)} → ${spec}`);
      else if (spec.startsWith(".")) stack.push(path.resolve(path.dirname(f), spec));
    }
  }
  assert.deepEqual(offenders, [], "only prior-source.mjs-style guarded dynamic imports may reach node:");
  assert.ok(seen.size > 30, "the walk covered the reader");
});

// a stand-in for janus's hyperlexicon door (native/organs/hyperlexicon/door.mjs): `names` answers as the ledger does — every name a giver
// lists, and `written`, the nodes whose own names write the form exactly
async function standInDoor(written) {
  const http = await import("node:http");
  const srv = http.createServer(async (req, res) => {
    const chunks = []; for await (const c of req) chunks.push(c);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const answers = body.asks.map((a) => ({ head: "stand-in-head", standing: "given · ungrounded · undecided", surfaces: Object.fromEntries(a.surfaces.map((f) => [f, { languages: written[f] ? 1 : 0, here: [], written: written[f] ?? [] }])) }));
    res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ head: "stand-in-head", answers }));
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${srv.address().port}`, close: () => srv.close() };
}

test("the Node door asks the hyperlexicon through its door first, and a door that does not answer is a typed gap, never a silent read", async () => {
  const { readDocument, lexiconFor } = await import("../reading.js");
  const door = await standInDoor({ "Messrs.": [{ node: "n_m", kind: "lemma", of: ["Mr."], pos: ["noun"] }] });
  const was = process.env.HL_DOOR; process.env.HL_DOOR = door.url;
  try {
    const w = await readDocument(DOC, { address: "mill", priors: { ...priorsFor("en"), dotted: null } });
    assert.equal(w.aliasReport.giver?.name, "janus hyperlexicon");
    assert.equal(w.aliasReport.giver?.head, "stand-in-head");
    assert.ok(w.aliasReport.rows.some((x) => x.form === "Messrs." && x.kept), "the ledger's givers name Messrs. as written; the text never writes it bare");
    assert.ok(w.sentences.some((s) => s.text === "In 1850 Messrs. Smith and Jones bought the mill."));
  } finally { door.close(); }
  process.env.HL_DOOR = "http://127.0.0.1:9";   // nothing listens
  try {
    const gone = await readDocument("Messrs. Hall and Lee sold the mill in 1861 to a company from the north. The company ran it for twenty years. It closed in 1881 and was pulled down.", { language: "en", lexicon: (await import("../organs/lexicon.js")).makeHyperlexicon({ ask: async (b) => { const r = await fetch("http://127.0.0.1:9/v1/batch", { method: "POST", body: JSON.stringify(b) }).catch(() => null); return r && r.ok ? r.json() : null; } }), priors: { ...priorsFor("en"), dotted: null } });
    assert.match(gone.aliasReport.gap ?? "", /did not answer/);
  } finally { if (was === undefined) delete process.env.HL_DOOR; else process.env.HL_DOOR = was; }
  const off = await readDocument(DOC, { address: "mill", lexicon: false, priors: { ...priorsFor("en"), dotted: null } });
  assert.match(off.aliasReport.gap, /without the hyperlexicon/);
  assert.ok(off.sentences.some((s) => s.text === "In 1850 Messrs."), "FALSIFIER: with no hyperlexicon and no read-ahead dotted words the cut is the splitter's own");
  assert.equal(typeof lexiconFor("en").want, "function");
});

test("the hyperlexicon client keeps a form only as the givers write it, its giver is the ledger's head, and a prior from the same head settles the consult", async () => {
  const { makeHyperlexicon } = await import("../organs/lexicon.js");
  const asked = [];
  const ask = async (body) => { asked.push(...body.asks[0].surfaces); return { head: "h1", answers: [{ head: "h1", surfaces: Object.fromEntries(body.asks[0].surfaces.map((f) => [f, { written: f === "etc." ? [{ node: "n_e", kind: "lemma", of: [], pos: ["phrase"] }] : [] }])) }] }; };
  const hl = makeHyperlexicon({ ask });
  await hl.want(["etc.", "Etc.", "etc."]);
  assert.deepEqual(asked, ["etc.", "Etc."], "each form asked once");
  assert.equal(hl.get("etc.")[0].w, "etc.");
  assert.equal(hl.get("Etc."), null, "as written: the givers write 'etc.', not 'Etc.'");
  assert.deepEqual(hl.giver, { name: "janus hyperlexicon", head: "h1", standing: null });
  const text = "They sold bread, eggs, etc. to the town. The town paid them well. Everyone came back for more bread.";
  const settled = await consultAliases(text, makeHyperlexicon({ ask }), { priors: { ...priorsFor("en"), dotted: new Set(["etc."]), dottedGiver: { name: "janus hyperlexicon v1", head: "h1" } } });
  assert.match(settled.settled ?? "", /this hyperlexicon's own/);
  // a gap is the consult's own: once the door fails for one read, a later read whose forms are all known reports none
  let up = true;
  const flaky = makeHyperlexicon({ ask: async (body) => (up ? ask(body) : null), door: "stand-in" });
  const t1 = "They sold bread, eggs, etc. to the town. The town paid them well.", t2 = "We met Messrs. Hall and Lee by the mill. They sold it in 1861.";
  await consultAliases(t1, flaky, { priors: { ...priorsFor("en"), dotted: null } });
  up = false;
  assert.match((await consultAliases(t2, flaky, { priors: { ...priorsFor("en"), dotted: null } })).gap ?? "", /door \(stand-in\) did not answer/);
  assert.equal((await consultAliases(t1, flaky, { priors: { ...priorsFor("en"), dotted: null } })).gap, null, "t1's forms were answered before the door went down");
});

test("the hyperlexicon client asks a word's context once per ground: uses, the dated span, and the givers' candidates in the caller's language", async () => {
  const { makeHyperlexicon } = await import("../organs/lexicon.js");
  const bodies = [];
  const ask = async (body) => { bodies.push(body); const a = body.asks[0]; return { head: "h2", answers: [{ head: "h2", ground: a.ground, lang: a.lang, words: Object.fromEntries(a.words.map((w) => [w, w === "ports" ? { uses: 2, documents: 2, dated: { uses: 2, earliest: 1912, latest: 1997, documents: 2 }, undated: 0, candidates: [{ kind: "lemma", lang: "en", node: "n_p", pos: ["noun"], of: [], gloss: ["a harbour"] }], candidatesTotal: 1 } : { uses: 0, null: "never-set", gap: "unheard" }])) }] }; };
  const hl = makeHyperlexicon({ ask });
  const c = await hl.context(["ports", "zzz", "ports"]);
  assert.equal(c.get("ports").candidates[0].pos[0], "noun");
  assert.equal(c.get("ports").dated.earliest, 1912);
  assert.equal(c.get("zzz").candidates, undefined, "a word the log never heard names no node");
  assert.deepEqual(bodies[0].asks[0], { op: "context", words: ["ports", "zzz"], ground: {}, lang: "en" });
  await hl.context(["ports"]);
  assert.equal(bodies.length, 1, "asked once per ground");
  await hl.context(["ports"], { ground: { year: [1900, 1950] } });
  assert.equal(bodies.length, 2, "another ground is another ask");
  assert.equal(hl.giver.head, "h2");
  const down = makeHyperlexicon({ ask: async () => null, door: "stand-in" });
  assert.equal((await down.context(["ports"])).get("ports"), undefined);
  assert.match(down.log.at(-1).gap, /stand-in\) did not answer/);
});

test("a surface extends the base extraction without rebuilding it", () => {
  let base = null;
  const reader = makeReader({ language: "en", extendRelations: (b) => { base = b; return (t, o) => [...b(t, o), ...(/\bschool\b/.test(t) ? [{ end1: "the town council", label: "built", end2: "a school", polarity: "+", offset: 0 }] : [])]; } });
  const w = readWith(DOC, { language: "en", reader });
  assert.equal(typeof base, "function");
  assert.ok(w.edges.length >= readWith(DOC, { language: "en" }).edges.length);
});

test("every place the splitter cuts is a junction, and a dotted headword is a word even with no form-of", async () => {
  const lex = makeLexicon({ ask: async (forms) => ({ giver: { name: "stub" }, results: Object.fromEntries(forms.map((f) => [f, f === "U.S." ? [{ w: "U.S.", senses: [{ of: null }] }] : f === "Co." ? [{ w: "Co.", senses: [{ of: "company" }] }] : null])) }) });
  const text = "They bought the mill from Mary's Co. at the river in the U.S. for the town. It was cheap. The town paid for it in full in 1871 and kept it.";
  const c = await consultAliases(text, lex, { priors: null });
  assert.deepEqual(c.aliases.sort(), ["Co.", "U.S."], "a following lower-case word is still a junction; the headword 'U.S.' is a word");
  const w = readWith(text, { language: "en", aliases: c.aliases, minCharacters: 1 });
  assert.equal(w.sentences.length, 3, "Co. and U.S. end no sentence; the two real stops do");
});

test("THE MASTER PIPELINE: readDocument asks the lexicon it is handed, then reads; with none, the gap is on the entry", async () => {
  const { readDocument } = await import("../the-fold/read-core.mjs");
  const lex = makeLexicon({ ask: async (forms) => ({ giver: { name: "stub" }, results: Object.fromEntries(forms.map((f) => [f, f === "Messrs." ? [{ w: f, senses: [{ of: "Mr." }] }] : null])) }) });
  const w = await readDocument(DOC, { lexicon: lex });
  assert.equal(w.aliasReport.giver.name, "stub");
  assert.ok(w.sentences.some((s) => s.text === "In 1850 Messrs. Smith and Jones bought the mill."));
  const bare = await readDocument(DOC, { priors: { ...priorsFor("en"), dotted: null } });
  assert.match(bare.aliasReport.gap, /no hyperlexicon/);
  assert.ok(bare.sentences.some((s) => s.text === "In 1850 Messrs."), "FALSIFIER: no giver and no read-ahead dotted words, the cut falls after Messrs.");
});

test("a surface's organs join the master's one assembly; selfRead gives the claims with verdicts; the reader rides, not on the wire", async () => {
  const { readDocument } = await import("../the-fold/read-core.mjs");
  let used = false;
  const w = await readDocument(DOC, { selfRead: true, readerOptions: { extendRelations: (base) => { used = true; return base; } } });
  assert.ok(used, "the surface's organ was handed to the one reader");
  assert.ok(Array.isArray(w.claims) && w.claims.every((c) => c.verdict), "every claim carries the reader's verdict");
  assert.equal(typeof w.reader, "function");
  assert.ok(w.abbreviationSet instanceof Set);
  assert.ok(!("reader" in JSON.parse(JSON.stringify(w))), "the entry on the wire is plain data");
});

test("a word whose period is its own is not a being: 'Messrs.' and 'No.' stay out of the cast", async () => {
  const { readDocument, isAbbreviationSurface } = await import("../the-fold/read-core.mjs");
  const lex = makeLexicon({ ask: async (forms) => ({ giver: { name: "stub" }, results: Object.fromEntries(forms.map((f) => [f, f === "Messrs." ? [{ w: f, senses: [{ of: "Mr." }] }] : f === "No." ? [{ w: f, senses: [{ of: "number" }] }] : null])) }) });
  const text = `${DOC}\n\nThe deed was filed as No. 5 in the town book, and No. 6 followed it a year later in the same book.`;
  const w = await readDocument(text, { lexicon: lex });
  assert.ok(!w.cast.some((c) => c.allSurfaces.some((x) => ["Messrs", "No"].includes(x))), "neither is a being");
  assert.ok(w.cast.some((c) => c.allSurfaces.includes("Smith")), "the names beside them still are");
  assert.equal(isAbbreviationSurface("Mr", new Set(["Mr"])), true);
  assert.equal(isAbbreviationSurface("Mr Brown", new Set(["Mr"])), false, "a name that opens with a title is still a name");
});

test("the hyperlexicon read ahead: dotted words a giver lists hold their period with no giver in reach, and the text's own use can refuse one", async () => {
  const { dottedIn } = await import("../organs/lexicon.js");
  const words = new Set(["etc.", "U.S.", "e.g.", "in.", "Messrs."]);
  const t = "They bought nails, etc. and paid. The firm in the U.S. for years sold it, e.g. the mill. He came in. Messrs. Smith left.";
  assert.deepEqual(dottedIn(t, words).sort(), ["Messrs.", "U.S.", "e.g.", "etc."], "'in.' is listed, but this text writes 'in' bare: refused");
  const pr = priorsFor("en");
  if (!pr.dotted) return;   // a janus without dotted-eng.json: the live hyperlexicon is the only knowledge, and the entry says so
  const w = readWith(`${t} ${DOC}`, { language: "en" });
  assert.ok(w.sentences.some((s) => s.text === "They bought nails, etc. and paid."));
  assert.ok(w.sentences.some((s) => s.text === "The firm in the U.S. for years sold it, e.g. the mill."));
  assert.ok(w.sentences.some((s) => s.text === "He came in."));
  assert.ok(w.abbreviations.dotted >= 3);
});
