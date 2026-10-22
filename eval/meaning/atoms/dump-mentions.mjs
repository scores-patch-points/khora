// dump-mentions.mjs — every page of a set read once with coref.js (title first, all sentences up to the last one asked about): each mention
// with its cues and the rules' entity, for a learned resolver to train and test on without re-parsing.
//   SET=<sentences.json> node eval/meaning/atoms/dump-mentions.mjs <out.json>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), N = path.join(HERE, "../../../native");
const G = await import(`${N}/adapters/text/grammar-en.js`), { loadGrammar } = await import(`${N}/adapters/text/grammar-ud.js`), { PACKS } = await import(`${N}/adapters/text/grammar-packs.js`);
const { resolvePage } = await import(`${N}/organs/coref.js`);
const { openSlim } = await import(`${N}/organs/wikt-slim.js`), { makeGlossary, loadTranslations, makeSynonymy } = await import(`${N}/organs/wikt-gloss.js`);
const slim = openSlim(`${process.env.HOME}/.cache/live_priors/wiktionary/${process.env.PACK ?? "wiktionary-slim-2026-10-01-v2.pack"}`);
const T = loadTranslations("/Users/mlacy/Downloads/workspace/data/wiktionary-translations");
const glossary = makeGlossary((l, w) => slim.entries(l, w), { translations: T }), synonymy = makeSynonymy({ lookup: (l, w) => slim.entries(l, w), translations: T });
const S = JSON.parse(fs.readFileSync(process.env.SET, "utf8"));
const pages = new Map(); for (const s of S) { const k = `${s.lang}\t${s.title}`; if (!pages.has(k)) pages.set(k, []); pages.get(k).push(s); }
const grammars = {}, out = { schema: "CorefMentions@1", pages: [] };
for (const [, items] of pages) {
  const lang = items[0].lang, last = items.reduce((a, b) => (b.previous.length > a.previous.length ? b : a)), all = [...last.previous, last.sentence];
  const g = lang === "en" ? { rowsOf: G.rowsOf } : (grammars[lang] ??= await loadGrammar(lang, { glossary }));
  const same = (a, b) => synonymy(lang, a, b, "NOUN").same;
  const R = resolvePage({ lang, title: items[0].title, sentences: all, rowsOf: g.rowsOf, pack: PACKS[lang] ?? null, same, lookup: (l, w) => slim.entries(l, w) });
  // the synonym pairs among every head seen on the page, once, so training needs no dictionary
  const heads = [...new Set([...R.sentences.flatMap((s) => s.mentions.flatMap((m) => [m.cues.head, m.cues.headNoun])), ...R.entities.flatMap((e) => e.kinds)].filter(Boolean))];
  const syn = []; for (let i = 0; i < heads.length; i++) for (let j = i + 1; j < heads.length; j++) if (same(heads[i], heads[j])) syn.push([heads[i], heads[j]]);
  out.pages.push({ lang, title: items[0].title, asked: items.map((it) => ({ sid: it.sid, si: it.previous.length })), entities: R.entities, syn,
    sentences: R.sentences.map((s) => ({ text: s.text, rows: s.rows.map((r) => ({ id: r.id, form: r.form, lemma: r.lemma, upos: r.upos, head: r.head, deprel: r.deprel, feats: r.feats ?? null, start: r.start, end: r.end })), mentions: s.mentions.map(({ ids, ...m }) => ({ ...m, ids })) })) });
  process.stderr.write(".");
}
fs.writeFileSync(process.argv[2], JSON.stringify(out));
console.log(`\n${out.pages.length} pages → ${process.argv[2]}`);
