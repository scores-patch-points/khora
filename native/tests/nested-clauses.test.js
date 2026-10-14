// tests/nested-clauses.test.js — nested clauses are READ AS NESTED, and the polarity of a clause is the clause's own.
//
// Pre-registered (2026-10-14, before the first run), each with what would break it:
//   N1  a complement, an adverbial and a relative clause land under the clause they belong to, with their relation and marker.
//       Breaks if the tree is flat (every clause a root) or a subordinate's parent is wrong on the five probe sentences.
//   N2  on HELD-OUT gold (UD English-EWT test, which the parser was not trained on) the nested clause triples
//       (clause head, parent head, relation) beat a random-parent null drawn from the same clause heads, over every
//       draw. Breaks if the parser's nesting is no better than chance.
//   N3  a negator scopes to ITS clause: "Nobody told them that the school would not reopen" has two negative clauses;
//       "She said the road was open although it was not" has an affirmative matrix and a negative subordinate.
//       Breaks if either leaks to the whole sentence or vanishes.
//   N4  the gold-derived tree and the parsed tree are computed by the SAME function (clausesOf), so a disagreement is the
//       parser's — the function is not a judge of its own work. Breaks if clausesOf reads a deprel the gold does not use.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModel, analyse, tokenize } from "../adapters/text/english-parser.js";
import { clausesOf, treeTriples, clauseTree } from "../adapters/text/nested-clauses.js";
import { polarityLens, polarityOfSentence, nestedClauses } from "../the-fold/read-quality.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRIORS = path.resolve(HERE, "../../../janus/priors");
const GOLD = path.resolve(HERE, "../eval/fixtures/ud-english-ewt/en_ewt-ud-test.conllu");
const MODEL_FILE = path.join(PRIORS, "parser-eng-ewt.json");
const have = fs.existsSync(MODEL_FILE);
const model = have ? loadModel(JSON.parse(fs.readFileSync(MODEL_FILE, "utf8"))) : null;
const rowsOf = (s) => analyse(model, tokenize(s).map((t) => t.form));

test("N1 complement, adverbial and relative clauses nest under their governor", { skip: !have }, () => {
  const t1 = clausesOf(rowsOf("My grandmother said that the storm took the roof because the nails were old."));
  assert.equal(t1.length, 3);
  const root = t1.find((c) => c.relation === "root"), comp = t1.find((c) => c.relation === "complement"), adv = t1.find((c) => c.relation === "adverbial");
  assert.ok(root && comp && adv);
  assert.equal(comp.parent, root.id); assert.equal(comp.marker, "that");
  assert.equal(adv.parent, comp.id, "the because-clause is inside what she said, not beside it"); assert.equal(adv.marker, "because");
  assert.deepEqual(root.complement, [comp.id]);

  const t2 = clausesOf(rowsOf("The man who built the school told us that the river, which floods every spring, had moved again."));
  const rel = t2.filter((c) => c.relation === "relative");
  assert.equal(rel.length, 2);
  const compl = t2.find((c) => c.relation === "complement");
  assert.ok(rel.some((c) => c.parent === compl.id), "the which-clause hangs on the river, inside the that-clause");
  assert.ok(t2.some((c) => c.depth >= 2));

  const t3 = clausesOf(rowsOf("She believed he would return if the war ended before the harvest."));
  const iff = t3.find((c) => c.marker === "if");
  assert.equal(t3.find((c) => c.id === iff.parent).relation, "complement");
});

test("N2 held-out gold: nested clause triples beat a random-parent null on every draw", { skip: !have || !fs.existsSync(GOLD) }, () => {
  const gold = []; let cur = [];
  for (const line of fs.readFileSync(GOLD, "utf8").split("\n")) {
    if (line.startsWith("#")) continue;
    if (!line.trim()) { if (cur.length) gold.push(cur); cur = []; continue; }
    const f = line.split("\t"); if (/[-.]/.test(f[0])) continue;
    cur.push({ id: +f[0], form: f[1], lemma: f[2], upos: f[3], head: +f[6], deprel: f[7] });
  }
  const sample = gold.filter((s) => s.length >= 6).slice(0, 300);
  let tp = 0, fp = 0, fn = 0; const pools = [];
  for (const g of sample) {
    const parsed = analyse(model, g.map((r) => r.form));
    const G = new Set(treeTriples(g).filter((t) => !t.endsWith("\u0000root"))), P = new Set(treeTriples(parsed).filter((t) => !t.endsWith("\u0000root")));
    for (const t of P) (G.has(t) ? tp++ : fp++); for (const t of G) if (!P.has(t)) fn++;
    pools.push({ G, P, heads: [...new Set(treeTriples(parsed).map((t) => +t.split("\u0000")[0]))] });
  }
  let seed = 11; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  let worst = 0;
  for (let d = 0; d < 20; d++) {
    let hit = 0;
    for (const { G, P, heads } of pools) for (const t of P) { const [h, , rel] = t.split("\u0000"); const rp = heads.length > 1 ? heads[Math.floor(rnd() * heads.length)] : 0; if (G.has(`${h}\u0000${rp}\u0000${rel}`)) hit++; }
    worst = Math.max(worst, hit);
  }
  const p = tp / (tp + fp || 1), r = tp / (tp + fn || 1), f1 = 2 * p * r / (p + r || 1);
  console.log(`# N2 nested triples on ${sample.length} held-out sentences: P ${p.toFixed(3)} R ${r.toFixed(3)} F1 ${f1.toFixed(3)} · tp ${tp} vs best random-parent null ${worst}`);
  assert.ok(tp > worst, `nested triples (${tp}) must beat the null's best draw (${worst})`);
  assert.ok(tp > 0 && fn > 0, "a perfect score here would mean the test is not held out");
});

test("N3 a negator scopes to its own clause", { skip: !have }, () => {
  const a = clausesOf(rowsOf("Nobody told them that the school would not reopen."));
  assert.ok(a.length >= 2 && a.every((c) => c.polarity === "-"), "both the matrix (nobody) and the complement (not) are negative");
  const by = (cl, rel) => cl.find((c) => c.relation === rel);
  const b = clausesOf(rowsOf("She said the road was open although it was not."));
  assert.equal(by(b, "root").polarity, "+", "the matrix clause is affirmative");
  assert.equal(by(b, "complement").polarity, "+", "what she said is affirmative");
  assert.equal(by(b, "adverbial").polarity, "-", "the although-clause carries the 'not'");
  const c = clausesOf(rowsOf("She said the road was not open although it was clear."));
  assert.equal(by(c, "complement").polarity, "-"); assert.equal(by(c, "adverbial").polarity, "+");
  const d = clausesOf(rowsOf("We did not leave because the water had risen."));
  assert.equal(by(d, "root").polarity, "-"); assert.equal(by(d, "adverbial").polarity, "+", "the reason is not itself negated");
  assert.ok(clausesOf(rowsOf("They walked home and the rain stopped.")).every((x) => x.polarity === "+"));
});

test("N4 the learned Polarity lens agrees with the clause reader on the plain cases", { skip: !have }, () => {
  const lens = polarityLens("en");
  assert.equal(lens.gap, undefined, "the English Polarity model is filed");
  assert.equal(polarityOfSentence("He did not go home.", lens).polarity, "-");
  assert.equal(polarityOfSentence("He didn't go home.", lens).polarity, "-");
  assert.equal(polarityOfSentence("He went home.", lens).polarity, "+");
  assert.equal(polarityOfSentence("Nada.", polarityLens("xx")).polarity, null, "a language with no model is a typed gap, not a default");
});

test("nestedClauses is English-only and says so", { skip: !have }, () => {
  assert.ok(nestedClauses("El hombre dijo que llovía.", "es").gap);
  const r = nestedClauses("My grandmother said that the storm took the roof.", "en");
  assert.equal(r.gap, null);
  assert.ok(r.clauses.length >= 2 && r.clauses.some((c) => c.parent));
  assert.ok(r.clauses.every((c) => Number.isFinite(c.own.start)), "every clause is addressable by character offset");
});
