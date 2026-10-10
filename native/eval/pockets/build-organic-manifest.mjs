// eval/pockets/build-organic-manifest.mjs — load EVERY pocket of group "oc" (loaders/organic.mjs), validate each, and write loaders/organic.manifest.json.
//   node build-organic-manifest.mjs [--out loaders/organic.manifest.json]      (no Date, no randomness: re-running gives a byte-identical file)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validate, sha256 } from "./lib/pocket.mjs";
import { load, ircDayTokenCount, IRC_CHANNELS, listTxt } from "./loaders/organic.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), oi = argv.indexOf("--out");
const OUT = path.resolve(HERE, oi >= 0 ? argv[oi + 1] : "loaders/organic.manifest.json");
const pockets = await load();
const rows = [], problems = [];
for (const p of pockets) {
  let v; try { v = validate(p); } catch (e) { problems.push(`${p.id}: ${e.message}`); continue; }
  const m = p.meta;
  rows.push({
    id: p.id, tokens: v.tokens, docs: v.docs, units: v.units, register: p.register, language: p.language, script: p.script, family: m.family, era: m.era, thin: v.thin, overCap: v.overCap,
    meanUnitLen: +(v.tokens / v.units).toFixed(3), tokensBeforeCap: m.totalTokensBeforeCap, docsBeforeCap: m.totalDocsBeforeCap, tokenisation: m.tokenisation, docDef: m.docDef,
    source: m.source, counters: m.counters, contentSha256: sha256(JSON.stringify([p.units, p.docOf])),
  });
}
const ids = rows.map((r) => r.id);
if (new Set(ids).size !== ids.length) problems.push("duplicate pocket ids");
const capped = rows.filter((r) => r.tokensBeforeCap > r.tokens).map((r) => `${r.id}: kept ${r.tokens} of ${r.tokensBeforeCap} tokens (whole documents by sha256 order, cap 300000)`);
const en = rows.find((r) => r.id === "oc-enron")?.counters ?? {};
const skipped = [
  ...capped.map((s) => ({ what: "documents beyond the 300k-token cap", why: s })),
  { what: "IRC messages / SMS lines / chat lines with no token (emoticon-only, URL-only, punctuation-only, '??')", why: "a unit cannot be empty; counted per pocket in counters.emptyUnits" },
  { what: "URLs ('://' or leading 'www.'), brace/XML scrub placeholders ({{EMAIL}}, {{TWITTER}}, <#>), isolated ':p' ':d' ';o' faces", why: "not words of the language; dropped inside the message, counted per pocket (urlsDropped, bracePlaceholders, emoticonsDropped)" },
  { what: `Enron: ${en.emptyAfterClean ?? "?"} emails with no body left after removing headers/quotes/fenced blocks`, why: "empty unit lists are invalid; source bodies are truncated, many emails are header-only" },
  { what: `Enron: ${en.duplicates ?? "?"} exact duplicate emails (same header line and body)`, why: "the same message filed in several folders/mailboxes would inflate repetition statistics" },
  { what: "Enron: no split by mailbox or era", why: "after cleaning only ~34k tokens remain in total; no mailbox or era reaches the 20k-token minimum with sibling pockets also kept" },
  { what: "COSEM: conversations 17CF01/17CF02/17CF03 not made separate pockets", why: "17CF01+17CF02 are 10 files (<20 docs, <20k tokens); pooled into one pocket (file tags kept in meta.docSource)" },
  { what: "IRC xubuntu, ubuntu-es, ubuntu-de not split into eras; kubuntu 2009-2015 and ubuntu-server/ubuntu-it two eras only", why: "rule: split a channel into eras only while each era keeps >= 35k tokens (so each discover/confirm half keeps >= ~17k)" },
  { what: "README mentions pt and zh Ubuntu channels", why: "only ubuntu, kubuntu, xubuntu, ubuntu-server, ubuntu-de, ubuntu-es, ubuntu-it exist on disk" },
  { what: "NUS SMS: README says Singapore; the files carry contributor 'Tao Chen' only, country India (en, 25 files) and China (zh, 20 files)", why: "pockets are labelled by what the files say; this is one contributor's SMS, not a population sample" },
  { what: "LCCC: dialogue boundaries", why: "files concatenate ~37 dialogues without separators, so consecutive lines may belong to different dialogues" },
  { what: "Enron emails dated 1979-12-31 (kean-s, 1979-12-*.txt)", why: "a placeholder date in the source; the text is kept (it is real email), only the era label is approximate" },
];
const eraBasis = {};   // tokens per sampled channel-day: the evidence the hand-fixed era boundaries in loaders/organic.mjs were cut from
for (const ch of IRC_CHANNELS) eraBasis[ch] = listTxt(`ubuntu-irc/${ch}`).map((f) => [f.slice(0, 10), ircDayTokenCount(ch, f)]);
const manifest = {
  group: "oc", sourceRoot: "/Users/mlacy/Documents/3.0/ethos/19-organic-community", loader: "loaders/organic.mjs", pocketCount: rows.length,
  totalTokens: rows.reduce((a, r) => a + r.tokens, 0), thin: rows.filter((r) => r.thin).map((r) => r.id), problems, pockets: rows, skipped, eraBasis,
};
fs.writeFileSync(OUT, JSON.stringify(manifest, null, 1) + "\n");
console.error(`wrote ${OUT}: ${rows.length} pockets, ${manifest.totalTokens} tokens, ${problems.length} problems, ${manifest.thin.length} thin`);
