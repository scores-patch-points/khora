// relid-pocket.mjs — relation identity INDUCED over a pocket (the company's own filings), for the relation pairs the pre-registered set needs.
// A relation is a node; each statement of it is an occurrence whose features are its role-labelled ends (a0:, a1:, and an oblique's case word
// with its head, to:/from:/with:…). Two relations are tested as the SAME (features as read) and as CONVERSES (one side's roles swapped, under
// each swap that could turn one into the other). identity-induction (khora corpus-identity.js) decides; too little reading is a gap.
import fs from "node:fs"; import path from "node:path";
const W = new URL("../../native", import.meta.url).pathname;
const G = await import(`${W}/adapters/text/grammar-en.js`);
const { makeSameBeing } = await import(`${W}/adapters/text/corpus-identity.js`);
const dir = process.env.POCKET_DIR ?? path.join(W, "../../EO-terminal/data/narrative/0001370053");
const sents = fs.readdirSync(dir).flatMap((f) => fs.readFileSync(path.join(dir, f), "utf8").replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[A-Z])/)).filter((s) => s.length >= 30 && s.length <= 400);
const uniq = [...new Set(sents)];
console.error(uniq.length, "sentences");
const head = (e) => (e ? e.names?.at(-1) ?? e.head : null);
const CASES = new Set(["to", "from", "with", "for", "by", "under", "in", "of", "into", "on"]);
const occ = new Map(); let t0 = Date.now(), done = 0;
for (const s of uniq) {
  let claims; try { claims = G.claimsOf(s).filter((c) => c.rel !== "fig" && c.polarity === "+"); } catch { continue; }
  for (const c of claims) {
    const f = [];
    if (head(c.ARG0)) f.push(`a0:${head(c.ARG0)}`); if (head(c.ARG1)) f.push(`a1:${head(c.ARG1)}`);
    for (const o of c.OBL ?? []) { const w = (o.text ?? "").split(" ")[0].toLowerCase(); if (CASES.has(w) && head(o)) f.push(`${w}:${head(o)}`); }
    if (!f.length) continue;
    (occ.get(c.rel) ?? occ.set(c.rel, []).get(c.rel)).push(f);
  }
  if (++done % 2000 === 0) console.error(done, Math.round((Date.now() - t0) / 1000), "s");
}

const swaps = { same: {}, "a0<->a1": { a0: "a1", a1: "a0" }, "a0<->to": { a0: "to", to: "a0" }, "a0<->from": { a0: "from", from: "a0" }, "a0<->from,a1<->to": { a0: "from", from: "a0", a1: "to", to: "a1" }, "a0->from,a1->a0": { a0: "from", a1: "a0", from: "a0" } };
const remap = (feats, m) => feats.map((x) => { const [r, ...v] = x.split(":"); return `${m[r] ?? r}:${v.join(":")}`; });
const pairs = [["pay", "receive"], ["sell", "buy"], ["sell", "purchase"], ["purchase", "buy"], ["license", "out-license"], ["enter", "sign"], ["receive", "obtain"], ["pay", "declare"], ["enter", "terminate"], ["enter", "acquire"]];
const counts = Object.fromEntries(pairs.flat().map((r) => [r, occ.get(r)?.length ?? 0]));
console.log("occurrences in the pocket:", JSON.stringify(counts));
for (const [a, b] of pairs) {
  const row = [];
  for (const [name, m] of Object.entries(swaps)) {
    if (!occ.get(a) || !occ.get(b)) { row.push(`${name}:gap`); continue; }
    const rec = new Map([...occ].map(([k, v]) => [k, v.map((f) => f.map((x) => ({ f: x, hop: 1 })))]));
    rec.set(`${b}~`, occ.get(b).map((f) => remap(f, m).map((x) => ({ f: x, hop: 1 }))));
    const j = makeSameBeing().prepare(rec)(a, `${b}~`);
    row.push(`${name}:${j.same ? "SAME" : j.verdict}`);
  }
  console.log(`${a} ~ ${b}:`, row.join("  "));
}
