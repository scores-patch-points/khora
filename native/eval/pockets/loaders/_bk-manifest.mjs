// loaders/_bk-manifest.mjs — builds EVERY bk pocket once, validates it, and writes loaders/books.manifest.json (pockets + everything skipped and why).
//   node loaders/_bk-manifest.mjs            (run it with nohup: ~2-4 minutes on a loaded machine)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validate, sha256 } from "../lib/pocket.mjs";
import { load, specIds, buildSpec } from "./books.mjs";
import { ETHOS, readText, stripFront, stripPG, scrub, tokenise } from "./_bkcore.mjs";
import { THIN, wpaSpecs } from "./_bksources.mjs";
import { toUnits, splitSentences } from "./_bkseg.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), rows = [], problems = [], ids = specIds();
if (new Set(ids).size !== ids.length) problems.push("duplicate pocket ids");
for (const id of ids) {
  const t0 = Date.now();
  try {
    const [p] = await load([id]), v = validate(p), L = p.units.map((u) => u.length).sort((a, b) => a - b);
    if (v.thin) problems.push(`${id}: thin (${v.tokens} tokens, ${v.docs} docs)`);
    if (v.overCap) problems.push(`${id}: over cap (${v.tokens})`);
    rows.push({ id, tokens: v.tokens, docs: v.docs, units: v.units, register: p.register, language: p.language, script: p.script, title: p.meta.title, author: p.meta.author, source: p.meta.source,
      tokensBeforeCap: p.meta.tokensBeforeCap, capped: p.meta.tokensBeforeCap > v.tokens, blockUnits: p.meta.blockUnits, meanUnitLength: +(v.tokens / v.units).toFixed(2), maxUnitLength: L.at(-1), notes: p.meta.notes, seconds: +((Date.now() - t0) / 1000).toFixed(1),
      fingerprint: sha256(JSON.stringify([p.units, p.docOf])).slice(0, 16) });
    console.error(`${id}: ${v.tokens} tokens ${v.docs} docs ok`);
  } catch (e) { problems.push(`${id}: FAILED ${e.message}`); console.error(`${id}: FAILED ${e.message}`); }
}
const tok = (rel) => { const t = scrub(stripPG(stripFront(readText(rel)).text)); return tokenise(t).length; };
const skipped = [], skip = (p, why, extra = {}) => skipped.push({ path: p, reason: why, ...extra });
const G = "01-literature-books/gutenberg/";
skip(G + "aesop-11339_The-Fox-and-the-Grapes.txt", "far below 20,000 tokens (a single fable)", { tokens: tok(G + "aesop-11339_The-Fox-and-the-Grapes.txt") });
skip(G + "pg11-alice-ch1.txt", "duplicate: chapter 1 of bk-alice", { tokens: tok(G + "pg11-alice-ch1.txt") });
skip(G + "pg37134_The_Elements_of_Style.txt", "below the 20,000-token floor and no sibling to merge with", { tokens: tok(G + "pg37134_The_Elements_of_Style.txt") });
skip(G + "pg345_Dracula.txt", "duplicate edition of 01-literature-books/gitenberg/pg345_Dracula.txt (bag-of-words L1 difference 1.4%); only the gitenberg copy is loaded as bk-dracula", { tokens: tok(G + "pg345_Dracula.txt") });
skip("01-literature-books/renaissance-poetry/wyatt-whoso-list-to-hunt.txt", "a single sonnet", { tokens: tok("01-literature-books/renaissance-poetry/wyatt-whoso-list-to-hunt.txt") });
for (const f of ["Abraham_Lincoln_s_Second_Inaugural_Address.txt", "Constitution_of_the_United_States_of_America.txt"]) skip("01-literature-books/wikisource/" + f, "far below 20,000 tokens; two legal/speech texts are too few to form a pocket", { tokens: tok("01-literature-books/wikisource/" + f) });
skip("20-first-person-voices/hurston-how-it-feels-to-be-colored-me.txt", "a single short essay, far below 20,000 tokens", { tokens: tok("20-first-person-voices/hurston-how-it-feels-to-be-colored-me.txt") });
for (const s of THIN) { const p = buildSpec(s), v = validate(p); skip(s.files[0], `${v.tokens} tokens after cleaning (< 20,000) and no sibling to merge with without mixing plays/eras`, { tokens: v.tokens, docs: v.docs }); }
// 18-childrens-books: counted file by file; every directory is a different language, the whole set is smaller than one pocket
const KIDS = "18-childrens-books", kid = {}, walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const SCRIPTS = { latn: /\p{Script=Latin}/gu, arab: /\p{Script=Arabic}/gu, deva: /\p{Script=Devanagari}/gu, jpan: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/gu, hang: /\p{Script=Hangul}/gu, cyrl: /\p{Script=Cyrillic}/gu, ethi: /\p{Script=Ethiopic}/gu, laoo: /\p{Script=Lao}/gu };
let kidTokens = 0, kidFiles = 0, kidEmpty = 0; const kidScripts = new Set(), kidLangs = new Set(); let unsegLetters = 0, unsegTokens = 0;
for (const f of walk(path.join(ETHOS, KIDS))) {
  if (!/\.(txt|md)$/.test(f) || /ATTRIBUTION|\.eot/.test(f)) continue;
  const rel = path.relative(ETHOS, f), parts = rel.split("/"), key = `${parts[1]}/${parts[2]}`;
  const raw = fs.readFileSync(f, "utf8").replace(/^\* (?:License|Text|Illustration|Translation|Language|Adaptation|Original)[^\n]*$/gm, "").replace(/^#+\s*$/gm, "");
  const n = tokenise(raw).length; kid[key] ??= { files: 0, tokens: 0 }; kid[key].files++; kid[key].tokens += n; kidTokens += n; kidFiles++; if (!fs.statSync(f).size) kidEmpty++;
  kidLangs.add(parts[2].split("-")[0]);
  const dom = Object.entries(SCRIPTS).map(([k, re]) => [k, (raw.match(re) || []).length]).sort((x, y) => y[1] - x[1])[0]; if (dom[1]) kidScripts.add(dom[0]);
  if (["ja", "lo"].includes(parts[2].split("-")[0])) { unsegLetters += (raw.match(/[\p{L}\p{M}]/gu) || []).length; unsegTokens += n; }
}
const kidMax = Math.max(...Object.values(kid).map((x) => x.tokens)), kidUpper = kidTokens - unsegTokens + unsegLetters;
skip(KIDS + "/", `all ${kidFiles} files (${kidEmpty} empty) in ${Object.keys(kid).length} language directories (${kidLangs.size} languages, ${kidScripts.size} scripts) total ${kidTokens} whitespace-delimited tokens; the largest single directory has ${kidMax}; even the whole set mixed together would be < 20,000 tokens (upper bound ${kidUpper} if the unsegmented ja and lo files were counted per letter), so no pocket was built`, { tokens: kidTokens, tokensUpperBoundIfJaLoPerLetter: kidUpper, languages: [...kidLangs].sort(), scripts: [...kidScripts].sort(), perLanguageDirectory: kid });
// WPA volume files whose names disagree with their text
const wpa = wpaSpecs(fs, path, ETHOS);
// determinism: rebuild three pockets and compare fingerprints
const det = [];
for (const id of ["bk-pride-prej", "bk-wpa-mo", "bk-cryptic"]) { const [p] = await load([id]); const fp = sha256(JSON.stringify([p.units, p.docOf])).slice(0, 16); det.push({ id, same: rows.find((r) => r.id === id)?.fingerprint === fp }); if (!det.at(-1).same) problems.push(`${id}: not deterministic`); }
const out = { group: "bk", generatedBy: "loaders/_bk-manifest.mjs", pockets: rows, totalPockets: rows.length, totalTokens: rows.reduce((a, r) => a + r.tokens, 0), skipped,
  mislabelledSources: [
    "01-literature-books/gutenberg/pg10671_The_Iliad__Greek_.txt is Erasmus Darwin's English poem The Botanic Garden part II (loaded as bk-botanic-garden, en)",
    "01-literature-books/gutenberg/pg135_Les_Mis_rables__French_.txt is the English translation by I. F. Hapgood (loaded as bk-lesmis, en)",
    "01-literature-books/gutenberg/pg59129_Leviathan_by_Hobbes.txt is E. M. Leonard, The Early History of English Poor Relief, 1900 (loaded as bk-poor-relief)",
    "20-first-person-voices/wollstonecraft-vindication.txt is William Godwin's 1798 Memoirs of Wollstonecraft, third person (loaded as bk-godwin-memoirs)",
    ...wpa.mislabelled.map((m) => "20-first-person-voices/slave-narratives-wpa/" + m + " (grouped by the state in the text)"),
    "WPA: no Iowa volume is present (wpa-vol-v-iowa-narratives-18485.txt holds Georgia part 4); Alabama (volume I) is present only inside wpa-vol-xvi-texas-narratives-part-5-36020.txt" ],
  determinismCheck: det, problems };
fs.writeFileSync(path.join(HERE, "books.manifest.json"), JSON.stringify(out, null, 1));
console.error(`wrote books.manifest.json: ${rows.length} pockets, ${out.totalTokens} tokens, ${problems.length} problems`);
