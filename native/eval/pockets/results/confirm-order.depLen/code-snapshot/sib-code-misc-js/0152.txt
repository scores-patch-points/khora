// gym/essay-grounded.mjs — A REAL, GROUNDED ESSAY.
//
// A real essay has a VOICE (the author's prose) AND is GROUNDED (every factual
// claim traced to a source). The two are in tension: voice is the mouth's, truth
// is the box's. The resolution is a GATE between them:
//
//   box     : grounded facts (real spans, addressed)
//   thesis  : the mouth's claim, gated (supported, no overreach)
//   essay   : the mouth writes prose in its own voice over the facts, citing
//             each factual claim; the reasoning (the author's connective voice)
//             is uncited by design
//   gate    : a sentence that makes a FACTUAL claim (a number, a named species,
//             a statistic) without a citation is DROPPED; grounded factual
//             claims and pure reasoning/voice are KEPT. The result reads as an
//             essay and asserts nothing ungrounded.
//   archons : ethos/logos/pathos + Gebser + Houdini judge the kept essay
//
//   node gym/essay-grounded.mjs [subject] [--model M]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ER7 = path.resolve(HERE, "..", "..", "eoreader7");
const { liveWeb } = await import(path.join(ER7, "native/the-fold/surf.js"));
const { engineRelationsFor } = await import(path.join(ER7, "native/the-fold/reader-bundle.js"));
const { readPiece, GRID } = await import(path.join(ER7, "native/the-fold/revision-spiral.js"));
const { gebserArrival, houdiniExclusivity } = await import(path.join(ER7, "native/the-fold/archon-rules.js"));

const DOOR = process.env.ER7_GENERATION_DOOR ?? "http://127.0.0.1:8137/api/generate";
const arg = (f, fb) => { const i = process.argv.indexOf(f); return i > 0 ? process.argv[i + 1] : fb; };
const MODEL = arg("--model", process.env.ER7_ESSAY_MODEL ?? "gemma2:2b");
const subject = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "dolphins";
const key = subject.toLowerCase().replace(/s$/, "");
const OUT = process.env.ESSAY_OUT || path.join(HERE, "..", "apps", "weaves");
const SPECIES = /(atlantic|common|irrawaddy|ganges|bottlenose|humpback|river dolphin|spinner|orca|delphinus|tucuxi|amazon|risso)/i;

async function draw(prompt, maxTokens = 700, temperature = 0.4) {
  try { const r = await fetch(DOOR, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, model: MODEL, kind: "chat", maxTokens, temperature, priority: "batch", hop: 1 }), signal: AbortSignal.timeout(240000) }); const j = await r.json().catch(() => null); return (j?.ok && typeof j.text === "string") ? j.text : ""; } catch { return ""; }
}
const strip = (t) => String(t).replace(/```[a-z]*\n?/gi, "").replace(/^\s*(title|thesis|conclusion|essay)\s*:\s*/gim, "").trim();

// ── 1. BOX ──────────────────────────────────────────────────────────────────
console.log(`\n═══ A REAL, GROUNDED ESSAY: "${subject}" (mouth: ${MODEL}) ═══\n\n1. BOX — research`);
const web = liveWeb();
const s = await web.search(`${subject} habitat behaviour species facts conservation`);
const sources = [];
for (const r of (s.results ?? []).slice(0, 6)) { try { const f = await web.fetch(r.url); const text = String(f?.text ?? "").replace(/\s+/g, " ").trim(); if (text.length >= 300) sources.push({ url: r.url, text }); } catch { /* skip */ } }
const clean = (t) => /^[A-Z“"]/.test(t) && /[.!?]$/.test(t.trim()) && !/[:]/.test(t.slice(0, 45)) && !/^(skip|overview|faqs|menu|share|table of contents)/i.test(t) && !/ - |\bOverview\b|\bThreats\b|\bFAQs\b|Read more|Read on|Shop the|Editor,|Dolphin Shop|Explore the full/i.test(t);
const dehead = (t) => { const m = /^((?:[A-Z][a-z’']+|of|the|and|in)(?:\s+(?:[A-Z][a-z’']+|of|the|and|in)){1,6})\s+(?=[A-Z][a-z]+\s+[a-z])/.exec(t); return m ? t.slice(m[0].length).trim() : t; };
const sentenceOf = (t) => { const p = t.split(/(?<=[.!?])\s+/).map((x) => dehead(x.trim())); const g = p.filter((x) => new RegExp(`\\b${key}s?\\b`, "i").test(x) && /^[A-Z“"]/.test(x) && /[.!?]$/.test(x) && x.length >= 50); return (g.sort((a, b) => b.length - a.length)[0] ?? dehead(t)).trim(); };
const seen = new Set(); const facts = [];
for (const src of sources) for (const e of (engineRelationsFor([{ ref: src.url, text: src.text }]).edges ?? [])) for (const sp of (e.spans ?? [])) { const t = sentenceOf(sp.text); if (!new RegExp(`\\b${key}s?\\b`, "i").test(t) || !clean(t) || t.length < 60 || t.length > 320) continue; const k = t.toLowerCase().slice(0, 70); if (seen.has(k)) continue; seen.add(k); facts.push({ text: t, source: src.url, at: [sp.start, sp.end] }); }
console.log(`   ${sources.length} sources -> ${facts.length} grounded facts`);

// ── 2. THESIS (gated) ───────────────────────────────────────────────────────
const factList = facts.map((f, i) => `[${i + 1}] ${f.text}`).join("\n");
function gate(t) {
  const th = String(t).toLowerCase(); const tw = new Set(th.match(/[a-z]{4,}/g) ?? []);
  const pred = [...tw].filter((w) => !new RegExp(`^${key}`).test(w) && !["dolphin", "dolphins", "marine", "mammal", "mammals", "facts", "provided", "support", "claim", "statement", "which", "includes", "belonging", "order", "cetacea", "highly", "social"].includes(w));
  let best = null, bo = 0; for (const f of facts) { const fw = new Set(f.text.toLowerCase().match(/[a-z]{4,}/g) ?? []); const o = [...tw].filter((w) => fw.has(w)).length; if (o > bo) { bo = o; best = f; } }
  const ratio = tw.size ? bo / tw.size : 0; if (ratio < 0.25) return { ok: false, why: `unsupported (${(ratio * 100) | 0}%)`, best };
  const general = new RegExp(`\\b${key}s?\\b`, "i").test(th) && !SPECIES.test(th);
  const predFacts = facts.filter((f) => { const fw = new Set(f.text.toLowerCase().match(/[a-z]{4,}/g) ?? []); return pred.some((w) => fw.has(w)); });
  if (general && pred.length && predFacts.length && predFacts.every((f) => SPECIES.test(f.text))) return { ok: false, why: `overreach: "${key}s" generalized, but every fact carrying its predicate is about a specific species`, best };
  return { ok: true, best, support: (ratio * 100) | 0 };
}
console.log(`\n2. THESIS (gated)`);
let thesis = "", g = null;
for (let i = 0; i < 3; i += 1) { thesis = strip(await draw(`Verified facts about ${subject}:\n${factList}${g ? `\nA prior thesis was refused: ${g.why}. Do not generalize; name the specific dolphins.` : ""}\n\nWrite ONE thesis sentence these facts SUPPORT. Return only the sentence, no label.`, 120)); g = gate(thesis); console.log(`   try ${i + 1}: "${thesis.slice(0, 80)}" → ${g.ok ? "ACCEPTED" : "refused: " + g.why}`); if (g.ok) break; }
if (!g.ok) { thesis = (facts.find((f) => /endanger|conserv/i.test(f.text)) ?? facts[0]).text; g = { ok: true, derived: true }; console.log(`   fallback: grounded thesis from a fact.`); }

// ── 3. ESSAY (the mouth's voice, over the facts, each factual claim cited) ──
console.log(`\n3. ESSAY — the mouth writes prose over the facts`);
const raw = await draw(`You are writing a short essay on ${subject} for a general reader. Thesis: ${thesis}\n\nUse these verified facts as your evidence (cite the number in brackets at the end of any sentence that states one of them):\n${factList}\n\nWrite 4 flowing paragraphs in your own voice that argue the thesis, WEAVING IN the specific facts — name the species, the numbers, the places exactly as the facts give them. Rules: do NOT list the facts; do NOT write "this fact", "the text says", or any sentence about the facts; write as an author making an argument. Never state a fact not in the list. End each factual sentence with its number like [2]. Open with the thesis; close with what it means.`, 800, 0.5);
const essay = strip(raw);
console.log(`   (${essay.length} bytes)`);

// ── 4. GATE — keep voice + grounded claims; ground FACTUAL claims by CONTENT
// (the model's citation is unreliable; the box grounds the mouth's claim by
// matching it to a real fact, and drops a factual claim no fact supports) ──
console.log(`\n4. GATE — ground each factual claim against the box`);
const isFactual = (sen) => /(\d[\d,.]*\s*(%|percent|individuals|years|months|species|km|miles)?|\b\d{3,}\b)/i.test(sen) || SPECIES.test(sen) || /\b(order cetacea|family delphinidae|genus delphinus|iucn|red list|echolocation|gestation)\b/i.test(sen);
const matchFact = (sen) => { const sw = new Set(sen.toLowerCase().match(/[a-z]{4,}/g) ?? []); let best = null, bo = 0; for (const f of facts) { const fw = new Set(f.text.toLowerCase().match(/[a-z]{4,}/g) ?? []); const o = [...sw].filter((w) => fw.has(w)).length; const r = sw.size ? o / sw.size : 0; if (r > bo) { bo = r; best = f; } } return { best, ratio: bo }; };
const kept = [], dropped = [];
for (const sen of essay.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean)) {
  if (isFactual(sen)) {
    const { best, ratio } = matchFact(sen);
    if (best && ratio >= 0.4) kept.push({ sen, grounded: true, source: best.source, at: best.at });
    else dropped.push({ sen, why: `no fact supports it (best match ${(ratio * 100) | 0}%)` });
  } else kept.push({ sen, grounded: false }); // pure reasoning / voice — the author's
}
console.log(`   kept: ${kept.length} (${kept.filter((k) => k.grounded).length} grounded, ${kept.filter((k) => !k.grounded).length} voice)  ·  dropped: ${dropped.length}`);
for (const d of dropped.slice(0, 5)) console.log(`   ✗ dropped: ${d.sen.slice(0, 68)} (${d.why})`);
const finalEssay = kept.map((k) => k.sen).join(" ");

// ── 4b. REFINE TO ARRIVAL — clear the ethos objections, mechanically ────────
// The archons name the exact defect: Caro flags a sentence with no word in the
// material (drop it); Zinsser flags a word the material never uses that the
// prose REPEATS (keep one occurrence, drop the rest). Re-judge until Gebser
// arrives (origin present, nothing lost, no editor objecting) or no progress.
function judgeText(text) {
  const sents = text.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);
  const pc = [{ id: "essay", pieces: sents.map((t) => ({ text: t, carries: [] })) }];
  const c = { piece: pc, ground: facts.map((f) => f.text).join(" "), task: `an essay on ${subject}` };
  const f = [...(readPiece(c).findings ?? []), ...houdiniExclusivity(text, c)];
  return { sents, findings: f, arrival: gebserArrival({ piece: pc, findings: f }) };
}
console.log(`\n4b. REFINE TO ARRIVAL — clear the archon objections`);
let essayText = finalEssay.replace(/\s*\[\d+\]/g, ""); // strip the mouth's citation markers
for (let step = 0; step < 14; step += 1) {
  const { sents, findings, arrival } = judgeText(essayText);
  const objs = [...new Set(findings.map((f) => f.editor))];
  console.log(`   pass ${step}: ${findings.length} finding(s) [${objs.join(", ")}] · Gebser arrived: ${arrival.arrived}`);
  if (findings.length === 0 && arrival.arrived) break;
  const drop = new Set();
  // Caro: an ungrounded sentence; Clark: a restatement or splice (no job);
  // Houdini: an apparatus leak — all DROP the sentence.
  for (const f of findings) if (["unverified", "restatement", "splice", "apparatus_leak"].includes(f.kind) && f.sentence) drop.add(f.sentence);
  // Zinsser: a word the material never uses, REPEATED — keep one, drop the rest.
  const byWord = new Map();
  for (const f of findings) if (f.kind === "tic" && f.sentence) for (const w of f.words ?? []) { if (!byWord.has(w)) byWord.set(w, []); byWord.get(w).push(f.sentence); }
  for (const [, ss] of byWord) { const uniq = [...new Set(ss)].sort((a, b) => b.length - a.length); for (const s of uniq.slice(1)) drop.add(s); }
  const next = sents.filter((s) => !drop.has(s));
  if (next.length === sents.length || next.length < 3) break; // no progress / would gut the essay
  essayText = next.join(" ");
}
const finalArrival = judgeText(essayText).arrival;
const finalFindings = judgeText(essayText).findings;

// ── 5. ARCHONS — the nine editors judge the REFINED essay ───────────────────
const j = judgeText(essayText);
const findings = j.findings, arrival = j.arrival;
const apparatus = findings.filter((f) => f.kind === "apparatus_leak");
console.log(`\n5. ARCHONS — the nine editors judge the refined essay (ethos · logos · PATHOS)`);
const byEd = new Map(); for (const f of findings) byEd.set(f.editor, (byEd.get(f.editor) ?? 0) + 1);
for (const appeal of ["ethos", "logos", "pathos"]) {
  console.log(`   ── ${appeal.toUpperCase()} ──`);
  for (const c of GRID.filter((x) => x.appeal === appeal)) {
    if (typeof c.probe !== "function") { console.log(`   ${c.cell.padEnd(12)} ${c.editor.padEnd(26)} (untaught — no measurement)`); continue; }
    const hits = byEd.get(c.editor);
    console.log(`   ${c.cell.padEnd(12)} ${c.editor.padEnd(26)} ${hits ? "✗ " + hits + " finding(s)" : "clean"}`);
  }
}
console.log(`   Gebser arrival: ${arrival.arrived} — ${arrival.basis.slice(0, 100)}`);
console.log(`   Houdini apparatus leaks: ${apparatus.length}`);

// ── SHIP ────────────────────────────────────────────────────────────────────
const paras = essayText.split(/(?<=[.!?])\s+/).reduce((acc, sen, i) => { const p = Math.floor(i / 3); (acc[p] ??= []).push(sen); return acc; }, []).map((p) => `<p>${p.join(" ")}</p>`).join("\n");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject} — a grounded essay</title>
<style>body{font:18px/1.75 Georgia,serif;max-width:680px;margin:0 auto;padding:48px 28px;background:#fbf8f1;color:#231d13}h1{font-size:28px;font-style:italic;border-bottom:2px solid #231d13;padding-bottom:14px;margin-bottom:26px}p{margin:0 0 1.15em}footer{margin-top:40px;border-top:1px solid #c9bda0;padding-top:14px;font:12px ui-monospace;color:#6b5b3a}</style></head>
<body><h1>${subject}</h1>
${paras}
<footer>a grounded essay — the mouth's voice over ${facts.length} grounded facts; ethos/logos/pathos archons: ${findings.length} finding(s); Gebser arrival: ${arrival.arrived}.</footer></body></html>`;
fs.mkdirSync(OUT, { recursive: true });
const slug = `${subject}-arrived-${Date.now()}`;
fs.writeFileSync(path.join(OUT, `${slug}.html`), html);
console.log(`\n════════ THE GROUNDED ESSAY ════════\n`);
console.log(essayText);
console.log(`\n→ ${OUT}/${slug}.html`);
