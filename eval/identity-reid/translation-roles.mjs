// EXPLORATORY: when a name's role disagrees between an English sentence and its Russian translation, is it OUR BINDING (the kāraka mapping), the
// parser, or the translation? War and Peace chapters 1-3 (Zenodotus aligned files). Paragraphs are aligned by cumulative length (mutual nearest);
// only paragraph pairs with the SAME number of sentences are kept, so sentence k is matched to sentence k. For each hand-picked name (gold from
// the author's reading) that occurs exactly once in both sentences, its role is compared at three levels:
//   base     the UD relation base (nsubj, obj, obl, nmod ...): parser level
//   kāraka   the `panini` label: the mapping level (our binding)
//   agent    kartṛ or not
// Disagreements are decomposed: base differs (parser or translation), base agrees but the kāraka label differs (OUR MAPPING), both differ.
// usage: KHORA_PRIORS_DIR=~/Documents/janus/priors node translation-roles.mjs [aligned dir = Zenodotus .../war-and-peace/aligned]
import fs from "node:fs";
const K = new URL("../../native/", import.meta.url).href;
const { rowsOfFor } = await import(K + "reading.js");
const { splitSentences } = await import(K + "adapters/text/spans.js");
const { priorsFor, abbreviationsFor } = await import(K + "the-fold/read-core.mjs");
const DIR = process.argv[2] ?? "/Users/mlacy/Downloads/workspace/Zenodotus/11-multi-language/war-and-peace/aligned";
const flat = (s) => { let o = ""; for (const ch of String(s).normalize("NFD")) { const c = ch.codePointAt(0); if (c < 0x300 || c > 0x36f) o += ch; } return o.toLowerCase(); };
const GOLD = [["Anna Pávlovna", "pavlovna", "павловна"], ["Vasíli", "vasili", "василий"], ["Pierre", "pierre", "пьер"], ["Andrew", "andrew", "андрей"], ["Hippolyte", "hippolyte", "ипполит"], ["Hélène", "helene", "элен"], ["Lise", "lise", "лиза"], ["Mortemart", "mortemart", "мортемар"], ["Morio", "morio", "морио"], ["Kurágin", "kuragin", "курагин"], ["Anna Mikháylovna", "mikhaylovna", "михайловна"], ["Borís", "boris", "борис"]];
const base = (d) => String(d ?? "").split(":")[0];
const paras = (f) => fs.readFileSync(f, "utf8").split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 40);   // regex-ok: paragraph breaks in a text file, a file format and not language
const en = paras(`${DIR}/en/pg2600-ch1-3-aligned.txt`), ru = paras(`${DIR}/ru/voyna-i-mir-ch1-3-aligned.txt`);
const mid = (ps) => { let t = 0; const tot = ps.reduce((a, p) => a + p.length, 0); return ps.map((p) => { const m = (t + p.length / 2) / tot; t += p.length; return m; }); };
const em = mid(en), rm = mid(ru), near = (m, arr) => arr.reduce((b, x, i) => (Math.abs(x - m) < Math.abs(arr[b] - m) ? i : b), 0);
const pairs = []; en.forEach((_, i) => { const j = near(em[i], rm); if (near(rm[j], em) === i) pairs.push([i, j]); });
const P = { eng: await rowsOfFor("eng"), rus: await rowsOfFor("rus") }, PR = { eng: priorsFor("eng"), rus: priorsFor("rus") };
const cut = (stem, t) => splitSentences(t, { abbreviations: abbreviationsFor(t, { priors: PR[stem], aliases: [], abbreviations: null }).set }).map((c) => c.text);
// a name's role is the role of its whole phrase: climb from the matched token through flat / compound parts and a one-step appositive title
// ("Князь Ипполит": the parser may make the title the head and the name its apposition) to the head of the phrase
const climb = (rows, r) => { const byId = new Map(rows.map((x) => [x.id, x])); let cur = r, n = 0; while (n++ < 4 && (["flat", "compound"].includes(base(cur.deprel)) || (base(cur.deprel) === "appos" && Math.abs(cur.head - cur.id) === 1))) { const h = byId.get(cur.head); if (!h || h.upos === "PUNCT") break; cur = h; } return cur; };
const mention = (rows, key, stem) => rows.filter((r) => r.upos === "PROPN" && (stem === "eng" ? flat(r.form) === key : flat(r.lemma ?? r.form) === key || flat(r.form) === key));
const tally = { n: 0, base: 0, kar: 0, agent: 0, baseDiff: 0, mapDiff: 0, both: 0 }, cases = { mapDiff: [], baseDiff: [] }, pairsBase = new Map();
let keptParas = 0;
for (const [i, j] of pairs) {
  const es = cut("eng", en[i]), rs = cut("rus", ru[j]); if (es.length !== rs.length) continue; keptParas++;
  es.forEach((e, k) => {
    const er = P.eng.rowsOf(e) ?? [], rr = P.rus.rowsOf(rs[k]) ?? [];
    for (const [nm, ek, rk] of GOLD) {
      const a = mention(er, ek, "eng"), b = mention(rr, rk, "rus"); if (a.length !== 1 || b.length !== 1) continue;
      const x = climb(er, a[0]), y = climb(rr, b[0]); tally.n++;
      const bs = base(x.deprel) === base(y.deprel), kr = x.panini === y.panini, ag = (x.panini === "kartṛ") === (y.panini === "kartṛ");
      if (bs) tally.base++; if (kr) tally.kar++; if (ag) tally.agent++;
      if (!bs) { tally.baseDiff++; const k2 = `${base(x.deprel)} | ${base(y.deprel)}`; pairsBase.set(k2, (pairsBase.get(k2) ?? 0) + 1); if (cases.baseDiff.length < 5) cases.baseDiff.push({ nm, e, r: rs[k], en: `${x.deprel}→${x.panini}`, ru: `${y.deprel}→${y.panini}` }); }
      else if (!kr) { tally.mapDiff++; if (cases.mapDiff.length < 6) cases.mapDiff.push({ nm, e, r: rs[k], en: `${x.deprel}→${x.panini}`, ru: `${y.deprel}→${y.panini}` }); }
    }
  });
}
const pct = (a) => `${a} of ${tally.n} (${(100 * a / Math.max(1, tally.n)).toFixed(0)}%)`;
console.log(`paragraphs: English ${en.length}, Russian ${ru.length}; mutual-nearest pairs ${pairs.length}; with equal sentence counts ${keptParas}`);
console.log(`names occurring once in both aligned sentences: ${tally.n}`);
console.log(`  UD relation base agrees:   ${pct(tally.base)}   (parser level)`);
console.log(`  kāraka label agrees:       ${pct(tally.kar)}   (our mapping level)`);
console.log(`  agent vs not agrees:       ${pct(tally.agent)}`);
console.log(`  base AGREES but kāraka differs (OUR MAPPING): ${tally.mapDiff};   base differs (parser or translation): ${tally.baseDiff}`);
console.log("most common base disagreements (English | Russian):", [...pairsBase].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => `${k} x${n}`).join("; "));
for (const [t, cs] of Object.entries(cases)) { console.log(`\n${t === "mapDiff" ? "OUR MAPPING: same relation, different kāraka" : "BASE DIFFERS: parser or translation"}:`); for (const c of cs) console.log(`  ${c.nm}: EN ${c.en} | RU ${c.ru}\n    EN: ${c.e.slice(0, 150)}\n    RU: ${c.r.slice(0, 150)}`); }
