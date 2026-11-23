// EXPLORATORY: can two names that share NO word be merged from the graph alone? Same fold (cosine over who it is with, whole book) and a
// cannot-link (the two are co-arguments of one verb in one clause: an entity does not act on itself, so they are two people).
// Pairs are the owner-knowable aliases of War and Peace (gold from my own knowledge of the book, stated as such); controls are siblings
// and lovers, which are different people who share a neighbourhood.
import fs from "node:fs";
const K = new URL("../../native/", import.meta.url).href;
const { karakaRows, KARAKAS } = await import(K + "adapters/text/karaka-total.mjs");
const { referentsInOrder } = await import(K + "adapters/text/referents-in-order.mjs");
const { priorsFor } = await import(K + "the-fold/read-core.mjs");
const { classifyWord } = await import(K + "adapters/text/wordclass.js");
const parse = JSON.parse(fs.readFileSync(process.argv[2], "utf8")), pr = priorsFor("eng");
const commonNoun = (t) => { const c = classifyWord(t, { posPrior: pr.posPrior }); if (!c?.found || !(c.total > 0)) return false; const n = (u) => c.candidates.filter((x) => x.upos === u).reduce((a, x) => a + x.count, 0); return n("NOUN") > n("PROPN"); };
const cast = referentsInOrder(parse, { commonNoun });
const R = new Map(cast.referents.map((b) => [b.ref, b])), isName = (r) => R.get(r)?.kind === "name";
const fold = new Map(), co = new Map();   // ref → Map(partner → n); "a|b" → co-argument clauses
const add = (a, b) => { let m = fold.get(a); if (!m) fold.set(a, (m = new Map())); m.set(b, (m.get(b) ?? 0) + 1); };
for (const p of parse) {
  const rows = karakaRows(p.rows, { stem: "eng" }), kids = new Map(); for (const r of rows) { const a = kids.get(r.head); if (a) a.push(r); else kids.set(r.head, [r]); }
  for (const v of rows) {
    if (v.upos !== "VERB") continue;
    const refs = [...new Set((kids.get(v.id) ?? []).filter((c) => KARAKAS.includes(c.karaka)).map((c) => cast.mentionOf[`${p.order}.${c.id}`]).filter(Boolean))];
    for (const a of refs) for (const b of refs) if (a !== b) { if (isName(a) && (isName(b) || (R.get(b)?.mentions ?? 0) > 3)) add(a, b); if (a < b && isName(a) && isName(b)) co.set(`${a}|${b}`, (co.get(`${a}|${b}`) ?? 0) + 1); }
  }
}
const names = [...R.values()].filter((b) => b.kind === "name" && b.mentions >= 25);
const df = new Map(); for (const b of names) for (const k of fold.get(b.ref)?.keys() ?? []) df.set(k, (df.get(k) ?? 0) + 1);
const vec = (r) => { const v = new Map(); for (const [k, c] of fold.get(r) ?? []) v.set(k, Math.log(1 + c) * Math.log(1 + names.length / (df.get(k) ?? 1))); return v; };
const cos = (a, b) => { let d = 0, na = 0, nb = 0; for (const [k, x] of a) { na += x * x; const y = b.get(k); if (y) d += x * y; } for (const y of b.values()) nb += y * y; return na && nb ? d / Math.sqrt(na * nb) : 0; };
const lab = (b) => b.forms.slice(0, 2).map((f) => f[0]).join(" / ") + " (" + b.mentions + ")";
const find = (tok) => names.filter((b) => b.forms.some(([f]) => f.split(" ").includes(tok))).sort((a, b) => b.mentions - a.mentions)[0];
const sharesWord = (x, y) => { const w = (b) => new Set(b.forms.flatMap(([f]) => f.toLowerCase().split(" "))); const a = w(x), c = w(y); return [...a].some((t) => c.has(t) && t.length > 3 && !["prince", "count", "princess", "countess", "emperor", "monsieur"].includes(t)); };
const rankOf = (x, y) => { const vx = vec(x.ref); const sc = names.filter((n) => n.ref !== x.ref).map((n) => [n.ref, cos(vx, vec(n.ref))]).sort((a, b) => b[1] - a[1]); return sc.findIndex((s) => s[0] === y.ref) + 1; };
console.log(`names with >= 25 mentions: ${names.length}`);
const pairs = [["ALIAS", "Bonaparte", "Napoleon"], ["ALIAS", "Buonaparte", "Napoleon"], ["ALIAS", "Bezúkhov", "Pierre"], ["ALIAS", "Drubetskáya", "Mikháylovna"], ["ALIAS", "Bezúkhova", "Hélène"], ["ALIAS", "Drubetskóy", "Borís"], ["ALIAS", "Ilariónovich", "Kutúzov"], ["ALIAS", "Bolkónski", "Andrew"], ["DIFFERENT", "Anatole", "Hippolyte"], ["DIFFERENT", "Natásha", "Sónya"], ["DIFFERENT", "Mary", "Natásha"], ["DIFFERENT", "Dólokhov", "Anatole"], ["DIFFERENT", "Kutúzov", "Napoleon"]];
for (const [kind, a, b] of pairs) {
  const x = find(a), y = find(b); if (!x || !y) { console.log(`${kind.padEnd(9)} ${a} / ${b}: not found as a name`); continue; }
  if (x.ref === y.ref) { console.log(`${kind.padEnd(9)} ${a} / ${b}: already ONE referent (${lab(x)}), merged by the string rule`); continue; }
  const k = x.ref < y.ref ? `${x.ref}|${y.ref}` : `${y.ref}|${x.ref}`;
  console.log(`${kind.padEnd(9)} ${lab(x)}  ~  ${lab(y)} | same word: ${sharesWord(x, y)} | fold cosine ${cos(vec(x.ref), vec(y.ref)).toFixed(2)} | rank of each as the other's nearest fold: ${rankOf(x, y)} / ${rankOf(y, x)} of ${names.length - 1} | co-argument clauses (cannot-link): ${co.get(k) ?? 0}`);
}
