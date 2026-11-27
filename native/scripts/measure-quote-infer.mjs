#!/usr/bin/env node
// native/scripts/measure-quote-infer.mjs — MEASURE inferQuoteTable on Genesis editions (--genesis <json of { name: { iso, verses } }>).
//   agreement  where the edition's language has a BUILT-IN table, does the inferred table contain that table's primary pair (or toggle)?  (a hand-written table is the reference; it is not proof the edition follows it)
//   null       the same text with its quotation marks PERMUTED among the mark positions: the inferred table must disappear (falsifier: if tables are still found, balance is not evidence)
import fs from "node:fs"; const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
const { inferQuoteTable, QUOTE_TABLES } = await import("../adapters/text/quote-frames.js");
const all = JSON.parse(fs.readFileSync(arg("genesis"), "utf8")), N = Number(arg("verses", 600)), MARK = /["“”„‟«»‹›「」『』]/;
let seed = 20261126; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const permute = (t) => { const pos = [], ch = []; [...t].forEach((c, i) => { if (MARK.test(c)) { pos.push(i); ch.push(c); } }); for (let i = ch.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ch[i], ch[j]] = [ch[j], ch[i]]; } const a = [...t]; pos.forEach((p, k) => { a[p] = ch[k]; }); return a.join(""); };
const rows = []; for (const [n, L] of Object.entries(all)) { const t = Object.values(L.verses).slice(0, N).join(" "), nm = (t.match(new RegExp(MARK.source, "g")) || []).length; if (nm < 6) continue;
  const r = inferQuoteTable(t), nr = inferQuoteTable(permute(t)), ref = QUOTE_TABLES[L.iso] ?? (L.iso === "cmn" ? QUOTE_TABLES.zho : null), has = (T, pr) => !!T && (T.pairs.some(([o, c]) => o === pr[0] && c === pr[1]) || T.toggle.includes(pr[0]));
  rows.push({ n, iso: L.iso, nm, found: !!r.table, nullFound: !!nr.table, nullToggleOnly: !!nr.table && nr.table.pairs.length === 0, agree: ref ? ref.pairs.some((pr) => has(r.table, pr)) || ref.toggle.some((x) => has(r.table, [x])) : null, table: r.table ? [...r.table.pairs.map((p) => p.join("")), ...r.table.toggle.map((t) => t + "×")].join(" ") : null, ev: r.evidence.slice(0, 2).map((e) => `${e.style} ${e.marks}/${e.balance.toFixed(2)}`).join(" ; ") }); }
const f = (a) => a.length; const withRef = rows.filter((r) => r.agree !== null);
console.log(`editions with >= 6 quotation marks: ${f(rows)}`); console.log(`table INFERRED: ${f(rows.filter((r) => r.found))} of ${f(rows)}   |   under the permuted-marks NULL: ${f(rows.filter((r) => r.nullFound))} of ${f(rows)} (falsifier: should be near 0); of those, toggle-only: ${f(rows.filter((r) => r.nullToggleOnly))} (a single repeated mark cannot be permuted: its null is the same text, so this is not a leak but a null with no power)`);
console.log(`agreement with a built-in language table (n ${f(withRef)}): ${f(withRef.filter((r) => r.agree))} agree`); console.log("disagree:", withRef.filter((r) => !r.agree).map((r) => `${r.n}[${r.iso}] inferred ${r.table ?? "none"} | ${r.ev}`).join("\n  ") || "none");
console.log("not found:", rows.filter((r) => !r.found).map((r) => `${r.n}(${r.nm} marks; ${r.ev})`).join("\n  ") || "none");
const by = {}; for (const r of rows) if (r.table) by[r.table] = (by[r.table] ?? 0) + 1; console.log("tables found:", JSON.stringify(by));
