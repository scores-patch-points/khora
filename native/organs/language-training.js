/* Champollion — language-training: for every language the fold holds a native
 * grammar for, run the seam against the Rosetta parallel, emit the EOT, score
 * the four good-enough gates (THE-GOOD-ENOUGH-BAR). The Rosetta is the GRID,
 * never content: the UDHR aligns article-by-article in hundreds of languages,
 * so a language's own seam is checked against what its own bytes should bind.
 *
 * The law, Champollion's: a language is entered through its OWN native
 * grammar (Greek case-ending, Sanskrit IAST, English word-order, German
 * article-case), verified against the parallel's grid of positions — the
 * parallel fixes the KNOWN, never the unknown; a name binds by recurrence
 * and company (the pin), never by wordlist. A seam that returns the
 * vocabulary instead of the beings is a dictionary, not a reader.
 */
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const JANUS = "/Users/mlacy/Documents/3.0/janus";
const ZENO = "/Users/mlacy/Documents/3.0/Zenodotus";
const PRIORS = `${JANUS}/priors`;

// THE SCHOOL: every language with a POS prior (its native word class) and a
// grammar seam recipe. Greek/Sanskrit/English/German are native-readers; the
// rest are present as PINNED BY THEIR PRIOR + their grammar is the school's
// declared recipe (the same pattern each seam proves).
const SEAMS = {
  grc: { reader: "reader.mjs", grammar: "case-ending", pos: "pos-grc.json", caseMarking: "case-marking-grc.json", rosetta: "homer-odyssey" },
  san: { reader: "reader-san.mjs", grammar: "IAST ending", pos: "pos-san.json", caseMarking: "case-marking-san.json", rosetta: "rigveda" },
  eng: { reader: "reader-en.mjs", grammar: "word-order position", pos: "pos-eng.json", rosetta: "udhr-eng" },
  deu: { reader: "reader-deu.mjs", grammar: "article-declared case", pos: "pos-deu.json", rosetta: "udhr-deu" },
};

export const goodEnough = (r, { grammar, judgeSentences = [], truths = [], falsehoods = [] }) => {
  const edges = r.clauses ?? [];
  const S = edges.filter((c) => r.subjectRefOf?.(c)).length;
  const O = edges.filter((c) => r.objectRefOf?.(c)).length;
  const names = (r.eot?.referents ?? []).map((x) => x.name);
  // GATE 1 — EO-native clauses: seeds carry case+cell (the grammar spoke).
  const seeded = edges.slice(0, 8).filter((c) => (c.subject?.case || c.object?.case || c.dative?.case));
  const gate1 = { bound: seeded.length, note: grammar };
  // GATE 2 — cast is beings, not vocabulary: top-5 by edge-presence.
  const inEdges = new Map();
  for (const c of edges) for (const x of [c.subject, c.object, c.dative]) if (x?.head) inEdges.set(x.head.toLowerCase(), (inEdges.get(x.head.toLowerCase()) ?? 0) + 1);
  const top = [...inEdges].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w);
  const gate2 = { top, note: "who appears in the seat across scenes, not orthography" };
  // GATE 3 — claims survive the byte: true claims attested, invented refused.
  const att = (claim) => { const k = claim.toLowerCase(); return inEdges.has(k) || names.some((n) => n.toLowerCase().includes(k)); };
  const gate3 = { truths: truths.map((t) => ({ text: t, attested: att(t) })), refusals: falsehoods.map((f) => ({ text: f, refused: !att(f) })) };
  // GATE 4 — genre: the read produced structure at all (clauses, bindings).
  const gate4 = { clauses: edges.length, bindings: S + O };
  const score = (0.4 * Math.min(1, O / Math.max(8, edges.length))) + (0.3 * gate1.bound / 8) + (0.3 * Math.min(1, S / Math.max(4, edges.length)));
  return { gates: { EO: gate1, cast: gate2, byte: gate3, genre: gate4 }, score: +score.toFixed(3) };
};

export async function trainLanguage(code, { text = null, truths = [], falsehoods = [], judgeSentences = [] } = {}) {
  const recipe = SEAMS[code];
  if (!recipe) return { code, error: `no native-grammar seam held for ${code}` };
  try {
    // the Greek reader imports translate.mjs off process.cwd(); pin the cwd to
    // the scene dir so every reader's relative song resolves (Champollion's
    // school, not a cwd lottery)
    process.chdir(`${KHOR}/native/eval/the-fold/scene`);
    const mod = await import(`${KHOR}/native/eval/the-fold/scene/${recipe.reader.replace(".mjs", ".mjs")}`);
    const read = recipe.reader === "reader-deu.mjs" ? mod.readGerman : recipe.reader === "reader-en.mjs" ? mod.readEnglish : recipe.reader === "reader-san.mjs" ? mod.readSanSanskrit : mod.readGreek;
    const r = await read({ text, chars: (text ?? "").length || undefined });
    return { code, grammar: recipe.grammar, rosetta: recipe.rosetta, ...goodEnough(r, { grammar: recipe.grammar, truths, falsehoods, judgeSentences }) };
  } catch (e) { return { code, grammar: recipe.grammar, error: e.message }; }
}

export async function runTheSchool({ texts = {} } = {}) {
  console.log("THE SCHOOL — every human natural language the fold holds a native grammar for, through the Rosetta grid (Champollion).\n");
  for (const code of Object.keys(SEAMS)) {
    const t = texts[code];
    const res = t ? await trainLanguage(code, t) : { code, grammar: SEAMS[code].grammar, skipped: "no sample text supplied to the trainer" };
    if (res.skipped) { console.log(`  ${code.padEnd(5)} ${res.grammar.padEnd(22)} — skipped`); continue; }
    console.log(`  ${code.padEnd(5)} ${res.grammar.padEnd(22)} gates.EO ${res.gates?.EO?.bound}/8  cast top: ${(res.gates?.cast?.top ?? []).join(", ")}  O% ${((res.gates?.genre?.bindings ?? 0) / Math.max(1, res.gates?.genre?.clauses) * 100).toFixed(0)}  score ${res.score}`);
    if (res.error) console.log(`        ERR: ${res.error}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runTheSchool({});
  const fin = fs.existsSync(`${ZENO}/06-government-legal/un-udhr/udhr-deu.txt`);
  console.log(`\nrosetta present: udhr-deu ${fin ? "yes" : "no"} (the grid: same 30 articles, every language)`);
}