// EXPLORATORY. Does the recaser (native/adapters/text/recase.mjs) give back the capitals, and does it invent any? Measured on UD English-EWT DEV, which the truecase table was NOT
// counted from (its train split was), so this is held out from the table; the given-name giver (Wikidata) is independent of EWT. Two runs:
//   lowered   every message lowercased: of the proper nouns that are not sentence-initial, how many come back with exactly their casing (recall), and of the words recased how many are
//             proper nouns in the gold (precision). A proper noun the givers do not know (a surname, a place, a title) cannot come back: that is the gap this number shows.
//   original  the text as written: every word the recaser changes is a lowercase word the writer chose to leave lowercase, so each change is a false recase unless the gold calls it PROPN
//             (web text in EWT does lowercase names). Reported per 1000 words, with the forms that recase most.
//   node eval/chat-register/recase-check.mjs [en_ewt-ud-dev.conllu] [--table=<a Truecase@1 json, to compare dials>]
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { fileURLToPath, pathToFileURL } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", "..");
const { recaseEnglish } = await import(pathToFileURL(path.join(ROOT, "native", "adapters", "text", "recase.mjs")).href);
const tableArg = process.argv.find((a) => a.startsWith("--table="))?.slice(8), table = tableArg ? JSON.parse(fs.readFileSync(tableArg, "utf8")) : undefined, opt = table ? { table } : {};
const file = process.argv.find((a) => a.endsWith(".conllu")) || path.join(os.homedir(), "Documents", "janus-experiments", "ud", "UD_English-EWT", "en_ewt-ud-dev.conllu");
const raw = fs.readFileSync(file, "utf8");
const sents = raw.split("\n\n").map((b) => { const lines = b.split("\n"), text = lines.find((l) => l.startsWith("# text = "))?.slice(9); const toks = lines.filter((l) => l && !l.startsWith("#")).map((l) => l.split("\t")).filter((c) => !c[0].includes("-") && !c[0].includes(".")).map((c) => ({ form: c[1], upos: c[3] })); return text && toks.length ? { text, toks } : null; }).filter(Boolean);
const count = (xs) => { const m = new Map(); for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1); return m; };
const overlap = (a, b) => { let n = 0; for (const [k, c] of a) n += Math.min(c, b.get(k) ?? 0); return n; };
const by = {}, wrong = {}; let candTotal = 0, candHit = 0, iCount = 0, goldPropn = 0, changed = 0, hit = 0, tokens = 0, hitAsPropn = 0;
for (const s of sents) {
  tokens += s.toks.length;
  // gold: proper nouns that are not the first word (the first word's casing is positional)
  let lead = true; const gold = []; for (const t of s.toks) { if (t.upos === "PUNCT") continue; if (lead) { lead = false; continue; } if (t.upos === "PROPN") gold.push(t.form); }
  goldPropn += gold.length;
  const r = recaseEnglish(s.text.toLowerCase(), opt); changed += r.changes.filter((c) => c.cased !== "I").length; iCount += r.changes.filter((c) => c.cased === "I").length; for (const c of r.changes) if (c.cased !== "I") by[c.by] = (by[c.by] ?? 0) + 1;
  const got = count(r.changes.filter((c) => c.cased !== "I").map((c) => c.cased)), want = count(gold); hit += overlap(got, want);
  { const rest = new Map(want); for (const [k, c] of got) rest.set(k, Math.max(0, (rest.get(k) ?? 0) - c)); const cs = count((r.candidates ?? []).map((c) => c.cased)); candTotal += (r.candidates ?? []).length; candHit += overlap(cs, rest); }
  { const left = new Map(want); for (const c of r.changes.filter((c) => c.cased !== "I")) { if ((left.get(c.cased) ?? 0) > 0) left.set(c.cased, left.get(c.cased) - 1); else { const k = `${c.by}:${c.typed}`; wrong[k] = (wrong[k] ?? 0) + 1; } } }
  const propnForms = new Set(s.toks.filter((t) => t.upos === "PROPN").map((t) => t.form)); hitAsPropn += r.changes.filter((c) => c.cased !== "I" && propnForms.has(c.cased)).length;
}
console.log(`lowered   ${sents.length} sentences, ${tokens} words, ${goldPropn} non-initial proper nouns; recased ${changed} words (${JSON.stringify(by)}), of which "i" to "I" ${iCount}`);
console.log(`          recall ${(hit / goldPropn).toFixed(3)} (a proper noun back with exactly its casing), precision ${(hit / changed).toFixed(3)} (a recased word is that proper noun), recased word is some PROPN of the sentence ${(hitAsPropn / changed).toFixed(3)}`);
console.log(`          nominated, not recased (a name only the giver knows): ${candTotal} words, ${(candHit / Math.max(1, candTotal)).toFixed(3)} of them the proper noun at that place; recall if every nomination were taken as a name: ${((hit + candHit) / goldPropn).toFixed(3)}`);
console.log(`          recased but not a proper noun at that place (by giver:word): ${Object.entries(wrong).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, n]) => `${k} ${n}`).join(", ")}`);
const fp = new Map(); let falseRe = 0, fromOriginal = 0;
for (const s of sents) { const r = recaseEnglish(s.text, opt); fromOriginal += r.changes.length; const propnLower = new Set(s.toks.filter((t) => t.upos === "PROPN" && t.form === t.form.toLowerCase()).map((t) => t.form)); for (const c of r.changes) { if (c.cased === "I") continue; if (!propnLower.has(c.typed)) { falseRe++; fp.set(`${c.typed}->${c.cased}`, (fp.get(`${c.typed}->${c.cased}`) ?? 0) + 1); } } }
console.log(`original  the text as written: ${fromOriginal} words recased, ${falseRe} of them not a proper noun in the gold (${(1000 * falseRe / tokens).toFixed(2)} per 1000 words); most frequent: ${[...fp].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => `${k} ${n}`).join(", ")}`);
