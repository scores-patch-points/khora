import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { clauseSpans, closedClassesFromPrior } from "./clause-spans.js";
import { loadModel } from "./english-parser.js";
import { readRows } from "../../organs/claim-realize.js";

const here = dirname(fileURLToPath(import.meta.url));
const pos = (l) => JSON.parse(readFileSync(join(here, `../../priors/pos-${l}.json`), "utf8"));
const eng = pos("eng"), spa = pos("spa");
const model = loadModel(JSON.parse(readFileSync(join(here, "../../priors/parser-eng-ewt.json"), "utf8")));
const cut = (t, o = {}) => clauseSpans(t, o).map((c) => [c.relation, c.text.replace(/[,.]$/, "")]);

test("gap 2 closed: a fronted subordinate clause ends at its comma, and the main clause after it is the root", () => {
  const spans = clauseSpans("Because it rained, the match was postponed.");
  assert.deepEqual(spans.map((c) => [c.relation, c.text]), [["subordinate", "Because it rained"], ["root", "the match was postponed."]]);
  assert.equal(spans[0].fronted, true);
  assert.equal(spans[0].parentIndex, 1, "the fronted clause hangs on the main clause, not the other way round");
  assert.equal(spans[1].parentIndex, null);
});

test("a fronted ADJUNCT needs evidence: with the POS prior it is cut; without it (the control) it is not", () => {
  const t = "On July 14, 2026, the House passed a bill backed by President Trump.";
  assert.deepEqual(cut(t, { posPrior: eng }), [["adjunct", "On July 14, 2026"], ["root", "the House passed a bill backed by President Trump"]]);
  assert.equal(clauseSpans(t).length, 1, "control: no prior, no predicate test, no adjunct cut");
  assert.equal(clauseSpans("The bill, the House said, passed.", { posPrior: eng })[0].relation, "root", "a fronted subject NP is not an adjunct");
});

test("with a parse every cut needs the parse to agree: a complement clause is never cut; “that” is decided per token (gap 1)", () => {
  const comp = "Critics argue that it could create dark winter mornings.";
  assert.equal(clauseSpans(comp, { rows: readRows(model, comp) }).length, 1, "“argue that …” is an argument");
  const rel = "The House passed a bill that would end the clock change.";
  assert.equal(clauseSpans(rel).length, 1, "control: without a parse “that” is never a boundary");
  const withParse = cut(rel, { rows: readRows(model, rel) });
  assert.deepEqual(withParse.at(-1), ["relative", "that would end the clock change"]);
  const adp = "The concept was repealed after two years.";
  assert.equal(clauseSpans(adp).length, 2, "control: the bare closed class cuts at “after”");
  assert.equal(clauseSpans(adp, { rows: readRows(model, adp) }).length, 1, "the parse says ADP: no clause follows");
});

test("quotations can be opaque: no cut inside paired quotation marks", () => {
  const t = "“It is something I can do, because people asked,” he said.";
  assert.ok(clauseSpans(t).length > 1, "control: the subordinator inside the quote cuts by default");
  assert.equal(clauseSpans(t, { opaqueQuotes: true }).length, 1);
});

test("omnilingual: a language's closed classes are DERIVED from its received UD POS prior, never typed", () => {
  const es = closedClassesFromPrior(spa);
  for (const w of ["y", "pero", "o", "ni", "sino"]) assert.ok(es.coordinators.has(w), w);
  for (const w of ["porque", "aunque", "si", "cuando", "mientras"]) assert.ok(es.subordinators.has(w), w);
  assert.ok(!es.subordinators.has("que"), "“que” is PRON-dominant in AnCora (6,859 vs 6,348 SCONJ): gap 1, in Spanish");
  assert.match(es.giver, /UD_Spanish-AnCora/);
  assert.equal(es.relativizers.size, 0, "no PronType in a POS prior: not guessed");
  assert.deepEqual(cut("Aunque el Parlamento votó a favor en 2019, el Consejo no ha llegado a un acuerdo.", es),
    [["subordinate", "Aunque el Parlamento votó a favor en 2019"], ["root", "el Consejo no ha llegado a un acuerdo"]]);
  assert.deepEqual(cut("En octubre de 2025, el Gobierno propuso acabar con el cambio de hora, y la Comisión respondió con cautela.", { ...es, posPrior: spa }),
    [["adjunct", "En octubre de 2025"], ["root", "el Gobierno propuso acabar con el cambio de hora"], ["coordinate", "y la Comisión respondió con cautela"]]);
  // CONTROL: the English defaults read the same Spanish sentence without a single Spanish boundary word.
  assert.equal(clauseSpans("El Gobierno propuso acabar con el cambio de hora y la Comisión respondió porque hubo dudas.").length, 1);
});
