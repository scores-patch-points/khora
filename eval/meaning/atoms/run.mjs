// run.mjs — the system's atoms and coreference for the 100 held-out sentences (sentences.json), read page by page in page order:
// each page's sentences up to the last one asked about are read with coref.js (title first), each asked sentence atomized (atoms.js).
//   node eval/meaning/atoms/run.mjs <out.json> [--slim <pack>] [--translations <dir>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), N = path.join(HERE, "../../../native");
const G = await import(`${N}/adapters/text/grammar-en.js`), { loadGrammar } = await import(`${N}/adapters/text/grammar-ud.js`), { PACKS } = await import(`${N}/adapters/text/grammar-packs.js`);
const { resolvePage } = await import(`${N}/organs/coref.js`), { atomize, realize } = await import(`${N}/organs/atoms.js`);
const { openSlim } = await import(`${N}/organs/wikt-slim.js`), { makeGlossary, loadTranslations } = await import(`${N}/organs/wikt-gloss.js`);
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
const out = process.argv[2] ?? "system.json";
const slim = openSlim(arg("slim", `${process.env.HOME}/.cache/live_priors/wiktionary/wiktionary-slim-2026-10-01.pack`));
const T = loadTranslations(arg("translations", "/Users/mlacy/Downloads/workspace/data/wiktionary-translations"));
const glossary = makeGlossary((l, w) => slim.entries(l, w), { translations: T });
const S = JSON.parse(fs.readFileSync(path.join(HERE, "sentences.json"), "utf8"));
const pages = new Map(); for (const s of S) { const k = `${s.lang}\t${s.title}`; if (!pages.has(k)) pages.set(k, []); pages.get(k).push(s); }
const grammars = {};
const result = { schema: "SystemAtoms@1", built: new Date().toISOString(), sentences: [] };
for (const [k, items] of pages) {
  const lang = items[0].lang, last = items.reduce((a, b) => (b.previous.length > a.previous.length ? b : a));
  const all = [...last.previous, last.sentence];
  const g = lang === "en" ? { rowsOf: G.rowsOf, claimsOf: (t, rows) => G.claimsOf(t, rows) } : (grammars[lang] ??= await loadGrammar(lang, { glossary }));
  const R = resolvePage({ lang, title: items[0].title, sentences: all, rowsOf: g.rowsOf, pack: PACKS[lang] ?? null });
  const name = (id) => R.entities.find((e) => e.id === id)?.name ?? null;
  for (const it of items) {
    const i = it.previous.length, sr = R.sentences[i];
    if (!sr || sr.text !== it.sentence) { result.sentences.push({ sid: it.sid, error: "sentence not found in its page reading" }); continue; }
    const claims = g.claimsOf(sr.text, sr.rows);
    const atoms = atomize({ claims, rows: sr.rows, mentions: sr.mentions, entities: R.entities, text: sr.text });
    result.sentences.push({ sid: it.sid, lang, title: it.title, sentence: it.sentence,
      mentions: sr.mentions.map((m) => ({ text: m.text, at: m.at, how: m.how, entity: m.entity, entityName: name(m.entity) })),
      atoms: atoms.map((a) => ({ ...a, text: realize(a), span: a.start != null ? sr.text.slice(a.start, a.end) : null })) });
  }
}
fs.writeFileSync(out, JSON.stringify(result, null, 1));
const n = result.sentences.reduce((a, s) => a + (s.atoms?.length ?? 0), 0);
console.log(`${result.sentences.length} sentences, ${n} atoms, ${result.sentences.filter((s) => s.error).length} errors → ${out}`);
