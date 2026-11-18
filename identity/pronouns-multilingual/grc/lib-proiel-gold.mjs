// lib-proiel-gold.mjs — read a PROIEL XML (greek-nt.xml or hdt.xml) into books: running text with character offsets per token, and (NT) the coreference entities
// from the treebank's own antecedent-id links. One reader of the XML; no model, no word list.
//   parseProiel(file, { bookOf }) -> [{ code, text, tokens: [{ id, form, lemma, pos, morph, ante, a, b, sentence }] , entityOf: Map(tokenId -> entityId) }]
import fs from "node:fs";

const attr = (line, k) => { const m = line.match(new RegExp(`\\b${k}="([^"]*)"`)); return m ? m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&apos;/g, "'") : null; };

export function parseProiel(file, { bookOf }) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const books = new Map(); let sent = null, sentNo = 0;
  const order = [];
  let curDiv = null;
  for (const ln of lines) {
    if (ln.includes("<title>")) { const m = ln.match(/<title>([^<]*)<\/title>/); if (m) curDiv = m[1]; }
    if (ln.includes("<sentence ")) { sent = { toks: [], after: attr(ln, "presentation-after") ?? "", before: attr(ln, "presentation-before") ?? "", div: curDiv }; sentNo++; continue; }
    if (ln.includes("</sentence>")) {
      if (sent && sent.toks.length) {
        const code = bookOf(sent.toks[0], sent.div);
        if (!books.has(code)) { books.set(code, { code, text: "", tokens: [] }); order.push(code); }
        const B = books.get(code);
        B.text += sent.before;
        for (const t of sent.toks) { B.text += t.before; t.a = B.text.length; B.text += t.form; t.b = B.text.length; B.text += t.after; t.sentence = sentNo; B.tokens.push(t); }
        B.text += sent.after === "" ? " " : sent.after;
      }
      sent = null; continue;
    }
    if (sent && ln.includes("<token ")) {
      sent.toks.push({ id: attr(ln, "id"), form: attr(ln, "form") ?? "", lemma: attr(ln, "lemma"), pos: attr(ln, "part-of-speech"), morph: attr(ln, "morphology"), rel: attr(ln, "relation"), ante: attr(ln, "antecedent-id"), cit: attr(ln, "citation-part"), before: attr(ln, "presentation-before") ?? "", after: attr(ln, "presentation-after") ?? "", empty: attr(ln, "empty-token-sort") });
    }
  }
  return order.map((c) => books.get(c));
}

/** entities from antecedent-id: union-find over token ids (a token and the token its antecedent-id names are one entity). */
export function entitiesOf(book) {
  const parent = new Map(); const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  for (const t of book.tokens) parent.set(t.id, t.id);
  const all = new Map(book.tokens.map((t) => [t.id, t]));
  for (const t of book.tokens) if (t.ante && parent.has(t.ante)) { const a = find(t.id), b = find(t.ante); if (a !== b) parent.set(a, b); }
  const ent = new Map(); for (const t of book.tokens) ent.set(t.id, find(t.id));
  return { ent, all };
}

export const ntBookOf = (tok) => (tok.cit ?? "").split(" ")[0];
export const hdtBookOf = (tok, div) => { const m = String(div ?? "").match(/Book (\d+)/); return m ? "HDT" + m[1] : "HDT?"; };
// PROIEL morphology positions: 1 person, 2 number, 3 tense, 4 mood, 5 voice, 6 gender, 7 case, 8 degree, 9 strength, 10 inflection
export const morphOf = (m) => ({ person: m?.[0], number: m?.[1], gender: m?.[5], case: m?.[6] });
