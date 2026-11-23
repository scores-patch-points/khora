// EXPLORATORY: a patronymic is a kin fact inside a name: its suffix gives the sex (-ich / -na), its root the father's first name
// ("Andréevich": son of Andrei). Suffix table: a declared given (Russian patronymic morphology), applied to capitalised tokens inside the
// forms of name referents; accents folded. Checks (1) does the patronymic's sex agree with the sex the book's own pronouns give the referent
// (decided by the exact sign test, not contested)? (2) which referents share a patronymic root (the same father: siblings)?
// usage: node patronymic-probe.mjs <parse.json>
import fs from "node:fs";
const K = new URL("../../native/", import.meta.url).href;
const { referentsInOrder } = await import(K + "adapters/text/referents-in-order.mjs");
const { priorsFor } = await import(K + "the-fold/read-core.mjs");
const { classifyWord } = await import(K + "adapters/text/wordclass.js");
const parse = JSON.parse(fs.readFileSync(process.argv[2], "utf8")), pr = priorsFor("eng");
const commonNoun = (t) => { const c = classifyWord(t, { posPrior: pr.posPrior }); if (!c?.found || !(c.total > 0)) return false; const n = (u) => c.candidates.filter((x) => x.upos === u).reduce((a, x) => a + x.count, 0); return n("NOUN") > n("PROPN"); };
const cast = referentsInOrder(parse, { commonNoun });
const flat = (s) => { let o = ""; for (const ch of String(s).normalize("NFD")) { const c = ch.codePointAt(0); if (c < 0x300 || c > 0x36f) o += ch; } return o.toLowerCase(); };
const SUFFIX = [["m", ["ovich", "evich", "yevich", "ich"]], ["f", ["ovna", "evna", "yevna", "ichna", "inichna"]]];   // the longest first within each sex
const patro = (tok) => { const t = flat(tok); if (t.length < 6) return null; for (const [sex, ends] of SUFFIX) for (const e of [...ends].sort((a, b) => b.length - a.length)) if (t.endsWith(e) && t.length - e.length >= 3) return { sex, root: t.slice(0, t.length - e.length) }; return null; };
const rows = [];
for (const b of cast.referents) {
  if (b.kind !== "name" || b.mentions < 8) continue;
  const toks = [...new Set(b.forms.flatMap(([f]) => f.split(" ")).filter((w) => /^\p{Lu}/u.test(w)))];   // regex-ok: a capital letter test on a name token, not language meaning
  const hits = toks.map((w) => ({ w, p: patro(w) })).filter((x) => x.p);
  if (hits.length) rows.push({ b, hits, sex: hits[0].p.sex, pron: b.proform && !b.proform.contested ? b.proform.cls : null });
}
const decided = rows.filter((r) => r.pron === "m" || r.pron === "f");
const agree = decided.filter((r) => r.pron === r.sex);
console.log(`name referents (>= 8 mentions) with a patronymic-looking token: ${rows.length}; of those the book's pronouns decide the sex for ${decided.length}`);
console.log(`the patronymic's sex agrees with the pronoun's: ${agree.length} of ${decided.length}${decided.length ? ` (${(100 * agree.length / decided.length).toFixed(0)}%)` : ""}`);
for (const r of decided.filter((r) => r.pron !== r.sex).slice(0, 6)) console.log(`  disagrees: ${r.b.forms[0][0]} (${r.b.mentions}): patronymic ${r.hits[0].w} says ${r.sex}, pronouns say ${r.pron}`);
console.log("\nsample (referent: patronymic → sex, father's root):");
for (const r of rows.sort((a, b) => b.b.mentions - a.b.mentions).slice(0, 14)) console.log(`  ${r.b.forms[0][0]} (${r.b.mentions}): ${r.hits.map((h) => `${h.w} → ${h.p.sex}, father ${h.p.root}-`).join("; ")} | pronouns: ${r.pron ?? "undecided"}`);
const byRoot = new Map(); for (const r of rows) for (const h of r.hits) { const m = byRoot.get(h.p.root) ?? new Set(); m.add(r.b.forms[0][0]); byRoot.set(h.p.root, m); }
console.log("\nthe same father (a shared patronymic root), so siblings or one person under two names:");
for (const [root, m] of [...byRoot].filter(([, m]) => m.size >= 2).slice(0, 8)) console.log(`  ${root}-: ${[...m].join("  |  ")}`);
