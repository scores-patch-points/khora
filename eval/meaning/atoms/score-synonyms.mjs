import fs from "node:fs";
const N = "/private/tmp/claude-501/khora-wt/native";
const { openSlim } = await import(`${N}/organs/wikt-slim.js`), { makeSynonymy, loadTranslations } = await import(`${N}/organs/wikt-gloss.js`);
const P = openSlim(process.env.HOME + "/.cache/live_priors/wiktionary/" + (process.env.PACK ?? "wiktionary-slim-2026-10-01.pack")), T = loadTranslations("/Users/mlacy/Downloads/workspace/data/wiktionary-translations");
const same = makeSynonymy({ lookup: (l, w) => P.entries(l, w), translations: T });
const G = JSON.parse(fs.readFileSync(process.env.GOLD ?? "/private/tmp/claude-501/khora-wt/eval/meaning/atoms/gold.json", "utf8")).synonyms;
let right = 0; const byLang = {}, wrong = [], miss = [];
let nearN = 0, nearSame = 0, synN = 0, synHit = 0;
for (const p of G) {
  const r = same(p.lang, p.a, p.b, p.pos), ok = r.same === p.same; right += ok;
  (byLang[p.lang] ??= { n: 0, ok: 0 }); byLang[p.lang].n++; byLang[p.lang].ok += ok;
  if (p.same) { synN++; synHit += r.same; } else { nearN++; nearSame += r.same; }
  if (!ok) (p.same ? miss : wrong).push(`${p.lang} ${p.a}~${p.b} [${p.kind}] → ${r.same ? "same" : "not"}: ${r.why}`);
}
console.log(JSON.stringify({ pairs: G.length, accuracy: +(100 * right / G.length).toFixed(1), synonymsFound: `${synHit}/${synN}`, nearMissesJudgedSame: `${nearSame}/${nearN}`, byLang: Object.fromEntries(Object.entries(byLang).map(([l, v]) => [l, +(100 * v.ok / v.n).toFixed(0)])) }));
console.log("NEAR MISSES JUDGED SAME:\n " + wrong.join("\n "));
console.log("SYNONYMS MISSED:\n " + miss.join("\n "));
