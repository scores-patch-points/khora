// gym/essay-dolphins.mjs — RESEARCH -> EOT -> REASON -> GROUNDED ESSAY.
//
// 1. RESEARCH: search + fetch real sources (the live web, no model).
// 2. EOT: parse each source into byte-addressed observations (the reader's own
//    relations: end1 / label / end2 with the exact span and offset).
// 3. REASON: fold the EOT at the subject (dolphins) — keep the claims that name
//    it, rank them, order them; every kept line is a verbatim span of a real
//    source with its address, never written.
// 4. SHIP: the essay + the EOT ledger.
//
//   node gym/essay-dolphins.mjs ["dolphins"] [--n 5]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ER7 = path.resolve(HERE, "..", "..", "eoreader7");
const { liveWeb } = await import(path.join(ER7, "native/the-fold/surf.js"));
const { engineRelationsFor } = await import(path.join(ER7, "native/the-fold/reader-bundle.js"));

const subject = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "dolphins";
const N = (() => { const i = process.argv.indexOf("--n"); return i > 0 ? Number(process.argv[i + 1]) : 5; })();
const OUT = process.env.ESSAY_OUT || path.join(HERE, "..", "apps", "weaves");

console.log(`\n═══ RESEARCH → EOT → REASON → ESSAY: "${subject}" ═══\n`);

// ── 1. RESEARCH ────────────────────────────────────────────────────────────
const web = liveWeb();
const s = await web.search(`${subject} habitat behavior species facts`);
const results = (s.results ?? []).slice(0, 6);
console.log(`1. RESEARCH — searched, ${results.length} candidate sources`);
const sources = [];
for (const r of results) {
  try {
    const f = await web.fetch(r.url);
    const raw = String(f?.text ?? "");
    const text = raw.replace(/\s+/g, " ").trim();
    if (text.length < 300) { console.log(`   · skip (short): ${r.url.slice(0, 50)}`); continue; }
    sources.push({ url: r.url, title: r.title, text });
    console.log(`   · fetched ${text.length}B  ${r.url.slice(0, 60)}`);
  } catch (e) { console.log(`   · skip (${String(e.message).slice(0, 30)}): ${r.url.slice(0, 50)}`); }
}
if (!sources.length) { console.log("no sources fetched — the field is empty, and that is a disclosed gap."); process.exit(1); }

// ── 2. EOT — parse each source into byte-addressed observations ─────────────
console.log(`\n2. EOT — parsing ${sources.length} sources into byte-addressed relations`);
const eot = [];
for (const src of sources) {
  const r = engineRelationsFor([{ ref: src.url, text: src.text }]);
  for (const e of (r.edges ?? [])) {
    for (const sp of (e.spans ?? [])) {
      eot.push({ schema: "EOTObservation@1", source: src.url, title: src.title, at: [sp.start, sp.end], text: sp.text, rel: e.label, roles: { ARG0: e.end1, ARG1: e.end2 }, polarity: e.polarity, refs: e.refs });
    }
  }
}
console.log(`   ${eot.length} observations across ${sources.length} sources`);

// ── 3. REASON — fold at the subject: keep claims naming it, rank, order ────
const key = subject.toLowerCase().replace(/s$/, ""); // dolphin
const cleanSentence = (t) => /^[A-Z“"]/.test(t) && /[.!?]$/.test(t.trim()) && !/[:]/.test(t.slice(0, 45)) && !/^(skip|overview|faqs|menu|share|table of contents|advertisement)/i.test(t) && !/ - |\bOverview\b|\bThreats\b|\bFAQs\b/.test(t);
const named = eot.filter((o) => new RegExp(`\\b${key}s?\\b`, "i").test(o.text) && cleanSentence(o.text) && o.text.length >= 60 && o.text.length <= 300);
// dedupe by normalized text
const seen = new Set();
const distinct = named.filter((o) => { const k = o.text.toLowerCase().slice(0, 80); if (seen.has(k)) return false; seen.add(k); return true; });
// rank: a claim that names the subject AND carries a relation (a real predicate) first, then by source spread
const bySource = new Map();
for (const o of distinct) bySource.set(o.source, (bySource.get(o.source) ?? 0) + 1);
const ranked = distinct.map((o) => ({
  o,
  score: (/dolphin/i.test(o.roles.ARG0 ?? "") ? 3 : 0)
    + (/dolphin/i.test(o.roles.ARG1 ?? "") ? 1 : 0)
    + (/\b(is|are|was|were|has|have|can|live|eat|use|swim|hunt|communicate|feed|travel|grow|reach|include|known|found|considered|range|weigh|measure|social|intelligen)\b/i.test(o.text) ? 2 : 0),
})).sort((a, b) => b.score - a.score || a.o.text.length - b.o.text.length).map((x) => x.o);
console.log(`\n3. REASON — ${named.length} name "${subject}", ${distinct.length} distinct; kept ${Math.min(N, ranked.length)}`);

const kept = ranked.slice(0, N);
for (const o of kept) console.log(`   ⟦${o.source.split("/").pop().slice(0, 20)}@${o.at[0]}⟧ ${o.text.slice(0, 80)}`);

// ── 4. SHIP — the essay: the kept spans verbatim, each addressed ────────────
// a span may carry a heading before its sentence; keep the clean sentence that
// names the subject (a verbatim substring of the span, never rewritten).
const sentenceOf = (o) => {
  const parts = o.text.split(/(?<=[.!?])\s+/).map((s) => s.trim());
  const good = parts.filter((s) => new RegExp(`\\b${key}s?\\b`, "i").test(s) && /^[A-Z“"]/.test(s) && /[.!?]$/.test(s) && s.length >= 50);
  return (good.sort((a, b) => b.length - a.length)[0] ?? o.text).trim();
};
const lines = kept.map((o) => ({ text: sentenceOf(o), source: o.source, at: o.at }));
const essay = lines.map((l) => `${l.text} ⟦${l.source}@${l.at[0]}-${l.at[1]}⟧`).join("\n\n");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject} — a grounded essay</title>
<style>body{font:18px/1.7 Georgia,serif;max-width:680px;margin:0 auto;padding:48px 28px;background:#fbf8f1;color:#231d13}h1{font-size:30px;font-style:italic}p{margin:0 0 1.1em}sup{font:10px ui-monospace;color:#8a7a52}footer{margin-top:40px;border-top:1px solid #c9bda0;padding-top:14px;font:12px ui-monospace;color:#6b5b3a}</style></head>
<body><h1>${subject}</h1>
${lines.map((l) => `<p>${l.text} <sup>[${l.source.replace(/^https?:\/\//, "").slice(0, 30)}@${l.at[0]}]</sup></p>`).join("\n")}
<footer>a grounded essay — every line a verbatim span of a real source, addressed. ${lines.length} claims from ${new Set(lines.map((l) => l.source)).size} sources. No model wrote a sentence.</footer>
</body></html>`;

fs.mkdirSync(OUT, { recursive: true });
const slug = `dolphins-${Date.now()}`;
fs.writeFileSync(path.join(OUT, `${slug}.html`), html);
fs.writeFileSync(path.join(OUT, `${slug}.eot.jsonl`), eot.map((o) => JSON.stringify(o)).join("\n") + "\n");
console.log(`\n4. SHIP — ${OUT}/${slug}.html  (${kept.length} grounded claims, ${eot.length} observations on the EOT)`);
console.log(`\n════════ THE ESSAY ════════\n`);
console.log(essay);
