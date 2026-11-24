// EXPLORATORY. HOW SHOULD A PROPER NOUN BE GENDERED? The owner (2026-11-23): "(1) priors that would weight this (2) be able to look up the name Natasha (3) Mrs gives it away".
// Three sources of evidence, tested separately against what a HELD-OUT novel's own pronouns say (the text is its own giver: the cast's sign test over the pro-forms a clause
// attaches to a being, run with NO table of given names, so it cannot see anything tested here):
//   TITLE   a title in the name ("Mrs Bennet", "Miss Bingley", "Mr Darcy"): read from the dictionary's gloss of the title, following the giver's own cross-reference once
//           ("Abbreviation of Mister" -> Mister); the gender words in a gloss are the reader's marks over the gloss
//   GIVEN   the dictionary's senses of the first name read through the reader: "A female given name from Russian" is a noun "name" with "given" and "female" under it
//   LEARNED the per-word counts in name-gender/corpus-en.json (built from four other novels: Dracula, Emma, Treasure Island, War and Peace), the table the repo already has
// The books are not among those four. Gold = a named being (5+ mentions) whose pro-form the cast decides by its sign test (alpha 0.05), not contested.
//   node eval/chat-register/name-gender-giver.mjs [book.txt ...]   (MAXSENT=4000 sentences per book by default)   -> name-gender-giver.json
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import readline from "node:readline"; import { fileURLToPath, pathToFileURL } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", ".."), K = pathToFileURL(path.join(ROOT, "native") + "/").href;
const ZEN = process.env.ZENODOTUS || path.resolve(ROOT, "..", "Zenodotus"), KAIKKI = process.env.KAIKKI_EN || "/tmp/given-pharos/kaikki-en.jsonl";
const SPLIT = process.env.SPLIT || "DEV";   // DEV = the three books the rules were written against; FRESH = books read once after the rules were frozen
const books = process.argv.slice(2).length ? process.argv.slice(2) : ["gutenberg/pg1342_Pride_and_Prejudice.txt", "gitenberg/pg514_Little-Women.txt", "gitenberg/pg1400_Great-Expectations.txt"].map((b) => path.join(ZEN, "01-literature-books", b));
const { rowsOfFor } = await import(K + "reading.js"); const { priorsFor, abbreviationsFor } = await import(K + "the-fold/read-core.mjs");
const { splitSentences } = await import(K + "adapters/text/spans.js"); const { classifyWord } = await import(K + "adapters/text/wordclass.js"); const { referentsInOrder } = await import(K + "adapters/text/referents-in-order.mjs");
const parser = await rowsOfFor("eng"), pr = priorsFor("eng");
const commonNoun = (t) => { const c = classifyWord(t, { posPrior: pr.posPrior }); if (!c?.found || !(c.total > 0)) return false; const n = (u) => c.candidates.filter((x) => x.upos === u).reduce((a, x) => a + x.count, 0); return n("NOUN") > n("PROPN"); };
// DECLARED (English reader parameter, the same kind as the interrogative table in acts.mjs): which lemmas say a gender when the reader finds them in a gloss
const FEM = new Set(["female", "woman", "women", "girl", "lady", "wife", "feminine", "mistress"]), MASC = new Set(["male", "man", "men", "boy", "gentleman", "husband", "masculine"]);
const sideOf = (lemmas) => { const f = lemmas.some((l) => FEM.has(l)), m = lemmas.some((l) => MASC.has(l)); return f && m ? "both" : f ? "f" : m ? "m" : null; };
const lem = (r) => String(r.lemma ?? r.form).toLowerCase();

// ---- 1. read the novels: the named beings, their names, and the cast's own decision about their pro-form
const casts = [], CACHE = process.env.NGG_CACHE || path.join(os.tmpdir(), "ngg-cache"); fs.mkdirSync(CACHE, { recursive: true });
for (const file of books) {
  if (!fs.existsSync(file)) { console.error(`no such book: ${file}`); continue; }
  const MAXSENT = Number(process.env.MAXSENT || 4000), name = path.basename(file).replace(/\.txt$/, ""), cf = path.join(CACHE, `${name}.${MAXSENT}.json`);   // regex-ok: a file extension
  if (fs.existsSync(cf)) { const c = JSON.parse(fs.readFileSync(cf, "utf8")); casts.push({ book: name, cast: c }); console.log(`${name}: cast from cache (${c.referents.filter((r) => r.kind === "name").length} named beings)`); continue; }
  let text = fs.readFileSync(file, "utf8"); const a = text.indexOf("*** START"), b = text.indexOf("*** END"); if (a >= 0) text = text.slice(text.indexOf("\n", a) + 1, b > a ? b : undefined);
  const t0 = Date.now(), parse = [];
  for (const c of splitSentences(text, { abbreviations: abbreviationsFor(text.slice(0, 20000), { priors: pr, aliases: [], abbreviations: null }).set }).slice(0, MAXSENT)) { const rows = parser.rowsOf(c.text) ?? []; if (rows.length) parse.push({ order: parse.length, offset: c.offset, text: c.text, rows }); }
  const cast = referentsInOrder(parse, { commonNoun, genderOf: null });
  fs.writeFileSync(cf, JSON.stringify({ referents: cast.referents.filter((r) => r.kind === "name") })); casts.push({ book: name, cast: { referents: cast.referents.filter((r) => r.kind === "name") } }); console.log(`${name}: ${parse.length} sentences, ${cast.referents.filter((r) => r.kind === "name").length} named beings (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
// ---- 2. the gold: the pronouns the text itself bound to a named being (he/him/his/himself against she/her/hers/herself, a declared English table): 8+ pronouns and 90% one side.
//         "strict" = the cast's own sign test over clause-attached pro-forms also decided it. Neither can see a table of given names: none was given to the cast.
const HE = new Set(["he", "him", "his", "himself"]), SHE = new Set(["she", "her", "hers", "herself"]), gold = [];
for (const { book, cast } of casts) for (const r of cast.referents) {
  if (r.kind !== "name" || r.mentions < 5) continue;
  let m = 0, f = 0; for (const [form, n] of r.pronouns ?? []) { if (HE.has(form)) m += n; else if (SHE.has(form)) f += n; }
  if (m + f < 8 || Math.max(m, f) / (m + f) < 0.9) continue;
  const top = [...(r.forms ?? [])].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "", tokens = String(top).split(/\s+/).map((t) => t.replace(/[.,;:!?'’“”"]+$/g, "").replace(/^[“"'‘]+/, "")).filter(Boolean);   // regex-ok: strips punctuation around a name token
  const tok = (f) => String(f).split(/\s+/).map((t) => t.replace(/[.,;:!?'’“”"]+$/g, "").replace(/^[“"'‘]+/, "")).filter(Boolean);   // regex-ok: strips punctuation around a name token
  gold.push({ book, ref: r.ref, name: top, formTokens: (r.forms ?? []).map(([f]) => tok(f)), tokens, mentions: r.mentions, gold: m > f ? "m" : "f", evidence: `${Math.max(m, f)} of ${m + f}`, strict: !!r.proform && !r.proform.contested && r.proform.cls === (m > f ? "m" : "f") });
}
console.log(`gold beings (5+ mentions, 8+ bound pronouns, 90% one side): ${gold.length}  (${gold.filter((g) => g.gold === "f").length} she, ${gold.filter((g) => g.gold === "m").length} he; also decided by the cast's sign test: ${gold.filter((g) => g.strict).length})`);
// ---- 3. the dictionary: the glosses of exactly the words we need, one pass over the giver
const need = new Set(gold.flatMap((g) => g.formTokens.flat().map((t) => t.toLowerCase()))), gl = new Map([...need].map((w) => [w, []])), hops = new Set();
const pass = async (wanted) => { for await (const line of readline.createInterface({ input: fs.createReadStream(KAIKKI), crlfDelay: Infinity })) { if (!line.startsWith('{"addr":"lemma:')) continue; const lemma = line.slice(15, line.indexOf('"', 15)); if (!wanted.has(lemma)) continue; try { const g = JSON.parse(line).body?.gloss; if (g) (gl.get(lemma) ?? gl.set(lemma, []).get(lemma)).push(g); } catch { /* torn */ } } };
if (!fs.existsSync(KAIKKI)) { console.error(`no dictionary giver at ${KAIKKI}: set KAIKKI_EN (a typed gap)`); process.exit(2); }
await pass(need);
// one hop of the giver's own cross-reference ("Abbreviation of Mister." -> mister), for the titles
const XREF = /^(?:Abbreviation|Alternative (?:spelling|form|letter-case form)|Short form|Clipping|Contraction) of ([A-Za-z]+)/;   // regex-ok: the dictionary's own cross-reference gloss format
for (const t of gold.flatMap((g) => g.formTokens.flat().map((x) => x.toLowerCase()))) for (const g of gl.get(t) ?? []) { const m = XREF.exec(g); if (m) hops.add(m[1].toLowerCase()); }
await pass(new Set([...hops].filter((h) => !gl.has(h) || !gl.get(h).length)));
// ---- 4. read the glosses through the reader
const GN = { female: "f", feminine: "f", male: "m", masculine: "m", unisex: "both" };   // DECLARED (English reader parameter): the words that say a given name's gender
const glossGender = (word) => {   // GIVEN: the reader's lemmas "<gender> given name" (the parser sometimes makes "male" the root and "name" an oblique, so the rule is positional); TITLE: a gloss that says it is a title, a form of address, or "used before" a name
  const out = { given: new Set(), title: new Set(), isTitle: false };
  for (const g of gl.get(word) ?? []) { const lems = (parser.rowsOf(g) ?? []).map(lem);
    lems.forEach((l, i) => { if (l === "name" && (lems[i - 1] === "given" || lems[i - 1] === "give")) { const w = lems.slice(Math.max(0, i - 5), i - 1).map((x) => GN[x]).filter(Boolean); if (w.length) out.given.add(new Set(w).size > 1 ? "both" : w[0]); } });
    if (lems.includes("title") || lems.includes("address") || lems.includes("courtesy") || (lems.includes("use") && lems.includes("before"))) { out.isTitle = true; const s = sideOf(lems); if (s && s !== "both") out.title.add(s); } }
  return out;
};
const titleInfo = (t) => { let o = glossGender(t); if (!o.isTitle && !o.title.size) for (const g of gl.get(t) ?? []) { const m = XREF.exec(g); if (m) { const h = glossGender(m[1].toLowerCase()); if (h.isTitle || h.title.size) { o = h; break; } } } return { isTitle: o.isTitle || o.title.size > 0, gender: o.title.size === 1 ? [...o.title][0] : null }; };
const givenOf = (w) => { const s = glossGender(w).given; return s.size === 1 ? [...s][0] : s.size > 1 ? "both" : null; };
const corpus = JSON.parse(fs.readFileSync(path.join(ROOT, "native/adapters/text/name-gender/corpus-en.json"), "utf8")).table;
// the Wikidata given-name snapshot the canonical read already uses (identity/givers/wikidata-given-names-en.json; male and female lists are truncated subsets, the file says so): looked up by the capitalised token as written
const { snapshotGiverFrom, Q } = await import(K + "adapters/text/wikidata-name-giver.js"); const wd = snapshotGiverFrom(path.join(ROOT, "identity/givers/wikidata-given-names-en.json"));
const wikidataOf = (tok) => { const r = tok ? wd.get(tok) : null; if (!r) return null; const p = r.exact[0].p31, m = p.includes(Q.male), f = p.includes(Q.female); return m && f ? "both" : p.includes(Q.unisex) ? "both" : m ? "m" : f ? "f" : null; };
const endingOf = (w) => (w ? (/[aeiy]$/.test(w) ? "f" : "m") : null);   // regex-ok: the dumb baseline the sources must beat (a name ending in a, e, i or y is a woman's)
const learnedOf = (w) => { const c = corpus[w]; if (!c) return null; const m = c.m ?? 0, f = c.f ?? 0; return m + f >= 2 && m !== f ? (m > f ? "m" : "f") : null; };
// ---- 5. score each source against the gold, and what combining them does
// a title is read from ANY surface form of the being ("Mr. Darcy" makes "Darcy" a man); the given name from the most frequent form
const rows = gold.map((g) => { const per = g.formTokens.map((ts) => ts.map((t) => ({ t: t.toLowerCase(), ...titleInfo(t.toLowerCase()), cap: /^\p{Lu}/u.test(t), n: ts.length }))),   // regex-ok: a capital letter test on a token
    titleHits = per.flatMap((info) => info.filter((x) => x.isTitle && x.cap && x.n > 1)), titleTok = [...new Set(titleHits.map((x) => x.t))], titleSides = [...new Set(titleHits.map((x) => x.gender).filter(Boolean))],
    top = g.tokens.map((t) => ({ t: t.toLowerCase(), ...titleInfo(t.toLowerCase()), cap: /^\p{Lu}/u.test(t) })), given = top.some((x) => x.isTitle && x.cap) ? null : top.find((x) => x.cap && !x.isTitle)?.t ?? null;   // after a title the next name is a surname ("Mrs. Bennet"): it is not looked up as a given name   // regex-ok: a capital letter test on a token
  return { ...g, titleTok, title: titleSides.length === 1 ? titleSides[0] : null, given, giver: given ? givenOf(given) : null, learned: given ? learnedOf(given) : null, wikidata: given ? wikidataOf(g.tokens.find((t) => t.toLowerCase() === given)) : null, ending: endingOf(given) }; });
const wilson = (k, n) => { if (!n) return [0, 0]; const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), w = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [(c - w) / d, (c + w) / d]; };
const says = (v) => v === "m" || v === "f";
const score = (key) => { const has = rows.filter((r) => says(r[key])), ok = has.filter((r) => r[key] === r.gold), [lo, hi] = wilson(ok.length, has.length); return { says: has.length, of: rows.length, right: ok.length, wrong: has.length - ok.length, rightRate: has.length ? +(ok.length / has.length).toFixed(3) : null, ci95: [+lo.toFixed(2), +hi.toFixed(2)], both: rows.filter((r) => r[key] === "both").length, coverage: +(has.length / rows.length).toFixed(3) }; };
const chain = (r) => (says(r.title) ? r.title : says(r.wikidata) ? r.wikidata : says(r.giver) ? r.giver : says(r.learned) ? r.learned : null);   // the strongest first: what the name carries, the Wikidata snapshot, the dictionary, the learned table
const withChain = rows.filter((r) => chain(r)), chainOk = withChain.filter((r) => chain(r) === r.gold), [cl, ch] = wilson(chainOk.length, withChain.length);
const sources = { title: score("title"), wikidata: score("wikidata"), dictionary: score("giver"), learned: score("learned"), endingBaseline: score("ending"),
  chain: { says: withChain.length, of: rows.length, right: chainOk.length, wrong: withChain.length - chainOk.length, rightRate: withChain.length ? +(chainOk.length / withChain.length).toFixed(3) : null, ci95: [+cl.toFixed(2), +ch.toFixed(2)], coverage: +(withChain.length / rows.length).toFixed(3) } };
const addDict = rows.filter((r) => says(r.giver) && !says(r.wikidata) && !says(r.title)), addDictOk = addDict.filter((r) => r.giver === r.gold), addWd = rows.filter((r) => says(r.wikidata) && !says(r.title)), disagree = rows.filter((r) => says(r.wikidata) && says(r.giver) && r.wikidata !== r.giver);
const strict = rows.filter((r) => r.strict);
console.log(`\n[${SPLIT}] of ${rows.length} gold beings (${strict.length} also decided by the cast's sign test):`);
for (const [k, v] of Object.entries(sources)) console.log(`  ${k.padEnd(16)} says ${String(v.says).padStart(3)} (${(v.says / v.of * 100).toFixed(0)}%), right ${String(v.right).padStart(3)}, wrong ${String(v.wrong).padStart(2)}${v.rightRate != null ? `, right rate ${(v.rightRate * 100).toFixed(0)}% [${(v.ci95[0] * 100).toFixed(0)}-${(v.ci95[1] * 100).toFixed(0)}]` : ""}${v.both ? `, "both" ${v.both}` : ""}`);
console.log(`  the dictionary adds, where the title and Wikidata are silent: ${addDict.length} beings, right ${addDictOk.length}; Wikidata says something where there is no title for ${addWd.length}; Wikidata and the dictionary disagree on ${disagree.length}${disagree.length ? " (" + disagree.slice(0, 5).map((r) => `${r.given}: wd ${r.wikidata}, dict ${r.giver}, text ${r.gold}`).join("; ") + ")" : ""}`);
console.log(`  the beings with a title in some form: ${rows.filter((r) => r.titleTok.length).length}; the title says ${rows.filter((r) => says(r.title)).length}, right ${rows.filter((r) => r.title === r.gold).length}`);
console.log("\nthe wrong ones (any source):"); for (const r of rows.filter((r) => ["title", "wikidata", "giver", "learned"].some((k) => says(r[k]) && r[k] !== r.gold)).slice(0, 14)) console.log(`  ${r.name.padEnd(22)} text says ${r.gold} (${r.evidence}); title ${r.title ?? "-"} (${r.titleTok.join(",") || "-"}), wikidata ${r.wikidata ?? "-"}, dictionary ${r.giver ?? "-"} [${r.given ?? "-"}], learned ${r.learned ?? "-"}`);
const silent = rows.filter((r) => !chain(r)); console.log(`\nsilent for every source (${silent.length}), e.g.: ${silent.slice(0, 14).map((r) => `${r.name} (${r.gold})`).join("; ")}`);
fs.writeFileSync(path.join(HERE, `name-gender-giver.${SPLIT.toLowerCase()}.json`), JSON.stringify({ stamp: { when: new Date().toISOString(), split: `${SPLIT} (EXPLORATORY; gold is the text's own bound pronouns, 8+ and 90% one side)`, books: casts.map((c) => c.book), sentencesPerBook: Number(process.env.MAXSENT || 4000), givers: "title and dictionary: kaikki-en glosses read by khora's reader; wikidata: identity/givers/wikidata-given-names-en.json (the canonical read's snapshot); learned: corpus-en.json (Dracula, Emma, Treasure Island, War and Peace); baseline: last letter a, e, i or y" }, gold: rows.length, strictGold: strict.length, sources, dictionaryAddsBeyondWikidata: { beings: addDict.length, right: addDictOk.length }, wikidataVsDictionaryDisagree: disagree.length, rows: rows.map((r) => ({ book: r.book, name: r.name, gold: r.gold, evidence: r.evidence, strict: r.strict, title: r.title, titleTok: r.titleTok, given: r.given, wikidata: r.wikidata, dictionary: r.giver, learned: r.learned, ending: r.ending })) }, null, 1));
process.exit(0);
