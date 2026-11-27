import fs from "node:fs";
const K = "/home/user/khora/native/"; const { shapeOf } = await import(K + "the-fold/pharos-roles.mjs"); const { grammarFor, readingRows } = await import(K + "the-fold/pharos-reading.mjs");
const items = JSON.parse(fs.readFileSync("items.json", "utf8")), NEG = new Set(["not", "n't", "never", "no", "nobody", "nothing", "ne", "pas", "jamais", "personne", "n'"]), v1 = [], v2 = [], pos = [], flags = [];
for (const it of items) {
  const g = await grammarFor(it.lang); let rows = []; if (!g.gap) rows = readingRows(g, it.text).filter((r) => r.s === 0);
  const v = rows.find((r) => r.upos === "VERB"), nom = (r) => ["NOUN", "PROPN", "PRON"].includes(r.upos), before = v ? rows.filter((r) => r.id < v.id && nom(r)).at(-1) : null, after = v ? rows.find((r) => r.id > v.id && nom(r)) : null;
  pos.push({ id: it.id, negated: rows.some((r) => NEG.has(String(r.form).toLowerCase())), form: it.text.trim().endsWith("?") ? "question" : "statement", agent: v ? (before?.lemma?.toLowerCase() ?? null) : "ABSTAIN", patient: v ? (after?.lemma?.toLowerCase() ?? null) : "ABSTAIN" });
  const sh = await shapeOf(it.text, { language: it.lang }); if (sh.gap) { const a = { id: it.id, negated: "ABSTAIN", form: "ABSTAIN", agent: "ABSTAIN", patient: "ABSTAIN", gap: sh.gap }; v1.push(a); v2.push(a); continue; }
  const root = rows.find((r) => r.deprel === "root"), role = (k) => { const x = sh.roles.rows.find((r) => r.s === 0 && r.karaka === k && rows.find((y) => y.id === r.id)?.head === root?.id); return x ? rows.find((y) => y.id === x.id).lemma.toLowerCase() : null; };
  const q = sh.question?.sentences?.find((x) => x.s === 0), a = { id: it.id, negated: root ? sh.polarity.negated.some((n) => n.s === 0 && n.id === root.id) : "ABSTAIN", form: q ? (q.form === "statement" ? "statement" : "question") : "ABSTAIN", agent: root ? role("kartṛ") : "ABSTAIN", patient: root ? role("karman") : "ABSTAIN" };
  v1.push(a); const c = sh.roles.sentences.find((x) => x.s === 0) ?? { unknown: {}, gaps: [] };
  v2.push({ ...a, ...(c.unknown.polarity ? { negated: "ABSTAIN" } : {}), ...(c.unknown.roles ? { agent: "ABSTAIN", patient: "ABSTAIN" } : {}) }); flags.push({ id: it.id, polarity: !!c.unknown.polarity, roles: !!c.unknown.roles, gaps: c.gaps.map((x) => x.gap) });
}
for (const [n, d] of [["fold-v1", v1], ["fold-v2", v2], ["position", pos], ["flags", flags]]) fs.writeFileSync(`arms/${n}.json`, JSON.stringify(d, null, 1)); console.log("written", v1.length);
