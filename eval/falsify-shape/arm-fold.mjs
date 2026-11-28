import fs from "node:fs";
const K = "/home/user/khora/native/"; const { shapeOf } = await import(K + "the-fold/pharos-roles.mjs"); const { grammarFor, readingRows } = await import(K + "the-fold/pharos-reading.mjs");
const items = JSON.parse(fs.readFileSync("items.json", "utf8")), NEG = new Set(["not", "n't", "never", "no", "nobody", "nothing", "ne", "pas", "jamais", "personne", "n'"]), fold = [], pos = [];
for (const it of items) {
  const g = await grammarFor(it.lang); let rows = []; if (!g.gap) rows = readingRows(g, it.text).filter((r) => r.s === 0);
  // POSITION twin
  const v = rows.find((r) => r.upos === "VERB"), nom = (r) => ["NOUN", "PROPN", "PRON"].includes(r.upos), before = v ? rows.filter((r) => r.id < v.id && nom(r)).at(-1) : null, after = v ? rows.find((r) => r.id > v.id && nom(r)) : null;
  pos.push({ id: it.id, negated: rows.some((r) => NEG.has(String(r.form).toLowerCase())), form: it.text.trim().endsWith("?") ? "question" : "statement", agent: v ? (before?.lemma?.toLowerCase() ?? null) : "ABSTAIN", patient: v ? (after?.lemma?.toLowerCase() ?? null) : "ABSTAIN" });
  // FOLD
  const sh = await shapeOf(it.text, { language: it.lang }); if (sh.gap) { fold.push({ id: it.id, negated: "ABSTAIN", form: "ABSTAIN", agent: "ABSTAIN", patient: "ABSTAIN", gap: sh.gap }); continue; }
  const root = rows.find((r) => r.deprel === "root"), role = (k) => { const x = sh.roles.rows.find((r) => r.s === 0 && r.karaka === k && rows.find((y) => y.id === r.id)?.head === root?.id); return x ? rows.find((y) => y.id === x.id).lemma.toLowerCase() : null; };
  const q = sh.question?.sentences?.find((x) => x.s === 0);
  fold.push({ id: it.id, negated: root ? sh.polarity.negated.some((n) => n.s === 0 && n.id === root.id) : "ABSTAIN", form: q ? (q.form === "statement" ? "statement" : "question") : "ABSTAIN", agent: root ? role("kartṛ") : "ABSTAIN", patient: root ? role("karman") : "ABSTAIN", gaps: sh.gaps.map((x) => x.gap) });
}
fs.writeFileSync("arms/fold.json", JSON.stringify(fold, null, 1)); fs.writeFileSync("arms/position.json", JSON.stringify(pos, null, 1)); console.log("fold and position arms written", fold.length, pos.length);
