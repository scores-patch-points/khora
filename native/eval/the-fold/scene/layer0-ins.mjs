// layer0-INS.mjs — RUNG INS: the being. Resolve inflected Greek nouns into BEINGS.
//   stem = the surface minus its longest confident CASE-ending (the case prior's
//   nominalEndings), with a disclosed accent-fold (η→ε, ω→ο, ι-variants) for the
//   MERGE key only (the forms are kept verbatim). Cluster by stem; require recurrence.
//   The root of the ninth layer: without these beings, no referent, no object-kind,
//   no script, no deviation that means anything. No model, no name list.
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const { nominalClass, stripDiacritics } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);
const posPrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-grc.json", "utf8"));
const casePrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/case-marking-grc.json", "utf8"));
const NE = casePrior.nominalEndings ?? {};

const strip = stripDiacritics;
const TOKEN = /[\p{L}\p{N}’']+|[.,;:!?—–()«»“”]/gu;
const NOMINAL = new Set(["NOUN", "PROPN", "ADJ", "PRON", "NUM"]);
const norm = (s) => strip(s).replace(/η|ῆ|ῃ/g, "ε").replace(/ω|ῶ/g, "ο").replace(/ΐ|ϊ|ί|ῖ/g, "ι");  // fold for the MERGE key only

const text = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-odyssey.txt", "utf8").replace(/^---[\s\S]*?\n---\n/, "").slice(0, Number(process.argv[2] || 90000));
const toks = [...text.matchAll(TOKEN)].filter((m) => /^\p{L}/u.test(m[0])).map((m) => ({ raw: m[0], w: m[0].toLowerCase(), at: m.index }));

// STEM: strip the longest confident case-ending the received prior votes
const stemOf = (w) => { for (let L = 3; L >= 1; L--) { const e = w.slice(-L); const t = NE[e]; if (t && t.ranked?.[0]?.share >= 0.5 && t.ranked[0].count >= 10) return w.slice(0, w.length - L); } return w; };
const aside = new Set(["ὁ","ἡ","οἱ","αἱ","τό","τά","τὸν","τήν","τοῦ","τῆς","τῶν","τῷ","τῇ","τοῖς","ταῖς","ὦ","εἶεν","δ'","δὲ","γὰρ","μὲν","καὶ","ἐν","ᾗ","ὣς","ὡς"]); // articles & particles, read off the text's own closed classes — never a name list

// THE RECEIVED LEMMA TABLE (janus one home — giver UD_Ancient_Greek-PROIEL): lemma = merge key
const LEMMAS = (JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/lemma/grc-lemma.json", "utf8"))).lemmas ?? {};
const mergeKey = (w) => { const k = strip(w).toLowerCase(); return LEMMAS[k] ?? norm(stemOf(k)); };

// cluster by EXACT merge key (lemma where the treebank documents it, else ending-strip+fold)
const grp = new Map();
for (const t of toks) {
  if (aside.has(t.w)) continue;
  const cls = nominalClass(t.w, posPrior);            // the prior's keys are ACCENTED lowercase
  const endVote = (() => { const k = strip(t.w).toLowerCase(); for (let L = 3; L >= 1; L--) { const e = k.slice(-L); const x = NE[e]; if (x && x.ranked?.[0]?.share >= 0.5 && x.ranked[0].count >= 10) return true; } return false; })();
  const isNominal = NOMINAL.has(cls) || (cls == null && endVote);   // the CASE prior attests the ending where the POS prior never saw the exact form
  if (!isNominal || cls === "PRON") continue;  // the pronouns are the tracking layer, not beings
  const key = mergeKey(t.w);
  if (!grp.has(key)) grp.set(key, []);
  grp.get(key).push(t);
}
const beings = [...grp.values()].map((g) => ({ stem: g[0].w, n: g.length, surfaces: [...new Set(g.map((t) => t.raw))].slice(0, 6), at: g[0].at })).filter((b) => b.n >= 2).sort((a, b) => b.n - a.n);

console.log(`ODYSSEY · first ${text.length} chars · ${toks.length} tokens · ${beings.length} recurring beings\n`);
console.log("═══ THE BEINGS (rung INS — inflected nouns resolved) ═══");
for (const b of beings.slice(0, 24)) console.log(`  ${String(b.n).padStart(4)}  ${(b.stem.slice(0, 16)).padEnd(16)} ${b.surfaces.map((s) => s.length > 14 ? s.slice(0, 14) + "…" : s).join(" · ")}`);
console.log(`\n═══ protagonists (full cast) ═══`);
const sT = (s) => strip(s).toLowerCase();
for (const b of beings) { const t = `${sT(b.stem)}·${b.surfaces.map(sT).join(" ")}`; if (/οδυσσε|αθην|τηλεμαχ|πηνελοπ|ζευσ/.test(t)) console.log(`  ${String(b.n).padStart(4)}  ${b.stem.padEnd(16)} ${b.surfaces.join(" · ")}`); }
console.log(`\n  (surface forms kept verbatim; the merge key is the ending-stripped accent-folded stem)`);