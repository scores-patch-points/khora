// gym/essay-composed.mjs — THE ESSAY AS A COMPOSITION: the mouth's synthetic
// bookends (thesis + conclusion) over the grounded evidence, ordered into an
// argument. This works where a free-form mouth essay does not: the 1.5B writes
// apparatus when asked for flowing prose, but a THESIS and a CONCLUSION are
// short synthetic claims it can make — and the middle is the grounded facts,
// ordered so the evidence argues.
//
//   box      : grounded facts (real spans, addressed)
//   thesis   : the mouth's claim, GATED against the facts (supported, no overreach)
//   argument : the facts ordered by the void (definition -> range -> stakes) —
//              the movement, every line grounded
//   conclusion: the mouth's closing claim
//   archons  : ethos/logos/pathos + Gebser arrival + Houdini
//
//   node gym/essay-composed.mjs [subject]
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
const MODEL = process.env.ER7_BUILD_MODEL ?? "qwen2.5-coder:1.5b";
const subject = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "dolphins";
const key = subject.toLowerCase().replace(/s$/, "");
const OUT = process.env.ESSAY_OUT || path.join(HERE, "..", "apps", "weaves");
const SPECIES = /(atlantic|common|irrawaddy|ganges|bottlenose|humpback|river dolphin|spinner|orca|delphinus|tucuxi|amazon)/i;
const TOPIC = [[/reproduc|mate|gestation|breed|calf/i, "reproduction"], [/endanger|conserv|threat|protect|rescue|strand/i, "stakes"], [/behavio|intelligen|social|acrobat|feed|hunt|swim/i, "behaviour"], [/(atlantic|common|irrawaddy|ganges|bottlenose|humpback|river dolphin|delphinus|spinner|orca)/i, "species"], [/freshwater|lake|coast|ocean|sea|habitat|range|found/i, "range"], [/is|are|refers|belong|mammal|family|cetacea/i, "definition"]];

async function draw(prompt, maxTokens = 200) {
  try { const r = await fetch(DOOR, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, model: MODEL, kind: "chat", maxTokens, temperature: 0.3, priority: "batch", hop: 1 }), signal: AbortSignal.timeout(180000) }); const j = await r.json().catch(() => null); return (j?.ok && typeof j.text === "string") ? j.text : ""; } catch { return ""; }
}
const cleanOut = (t) => String(t).replace(/```[a-z]*\n?/gi, "").split(/\n/).map((l) => l.trim()).filter((l) => l && !/^(thesis|conclusion|title|argument|fact)\b/i.test(l)).join(" ").replace(/^["']|["']$/g, "").trim();

console.log(`\n═══ A COMPOSED ESSAY: "${subject}" ═══\n\n1. BOX — research`);
const web = liveWeb();
const s = await web.search(`${subject} habitat behaviour species facts conservation`);
const sources = [];
for (const r of (s.results ?? []).slice(0, 6)) { try { const f = await web.fetch(r.url); const text = String(f?.text ?? "").replace(/\s+/g, " ").trim(); if (text.length >= 300) sources.push({ url: r.url, text }); } catch { /* skip */ } }
const clean = (t) => /^[A-Z“"]/.test(t) && /[.!?]$/.test(t.trim()) && !/[:]/.test(t.slice(0, 45)) && !/^(skip|overview|faqs|menu|share|table of contents)/i.test(t) && !/ - |\bOverview\b|\bThreats\b|\bFAQs\b|Read more|Read on|Shop the|Editor,|Dolphin Shop/i.test(t);
const dehead = (t) => { const m = /^((?:[A-Z][a-z’']+|of|the|and|in)(?:\s+(?:[A-Z][a-z’']+|of|the|and|in)){1,6})\s+(?=[A-Z][a-z]+\s+[a-z])/.exec(t); return m ? t.slice(m[0].length).trim() : t; };
const sentenceOf = (t) => { const p = t.split(/(?<=[.!?])\s+/).map((x) => dehead(x.trim())); const g = p.filter((x) => new RegExp(`\\b${key}s?\\b`, "i").test(x) && /^[A-Z“"]/.test(x) && /[.!?]$/.test(x) && x.length >= 50); return (g.sort((a, b) => b.length - a.length)[0] ?? dehead(t)).trim(); };
const seen = new Set(); const facts = [];
for (const src of sources) for (const e of (engineRelationsFor([{ ref: src.url, text: src.text }]).edges ?? [])) for (const sp of (e.spans ?? [])) { const t = sentenceOf(sp.text); if (!new RegExp(`\\b${key}s?\\b`, "i").test(t) || !clean(t) || t.length < 60 || t.length > 300) continue; const k = t.toLowerCase().slice(0, 70); if (seen.has(k)) continue; seen.add(k); facts.push({ text: t, source: src.url, at: [sp.start, sp.end], topic: (TOPIC.find(([re]) => re.test(t)) ?? [null, "other"])[1] }); }
console.log(`   ${sources.length} sources -> ${facts.length} grounded facts`);

// ── thesis (gated) ──
const factList = facts.map((f, i) => `[${i + 1}] ${f.text}`).join("\n");
function gate(t) {
  const th = String(t).toLowerCase();
  const tw = new Set(th.match(/[a-z]{4,}/g) ?? []);
  // the predicate: the thesis's content words minus the subject itself
  const pred = [...tw].filter((w) => !new RegExp(`^${key}`).test(w) && !["dolphin", "dolphins", "marine", "mammal", "mammals", "facts", "provided", "support", "claim", "statement", "which", "includes", "belonging", "belong", "order", "cetacea", "highly"].includes(w));
  let best = null, bo = 0;
  for (const f of facts) { const fw = new Set(f.text.toLowerCase().match(/[a-z]{4,}/g) ?? []); const o = [...tw].filter((w) => fw.has(w)).length; if (o > bo) { bo = o; best = f; } }
  const ratio = tw.size ? bo / tw.size : 0;
  if (ratio < 0.25) return { ok: false, why: `unsupported (${(ratio * 100) | 0}%)`, best };
  const general = new RegExp(`\\b${key}s?\\b`, "i").test(th) && !SPECIES.test(th);
  // OVERREACH: the thesis generalizes to all dolphins, but every fact that
  // carries its PREDICATE is about a specific species (none states the general
  // claim). The predicate is what the thesis asserts, not just the best overlap.
  const predFacts = facts.filter((f) => { const fw = new Set(f.text.toLowerCase().match(/[a-z]{4,}/g) ?? []); return pred.some((w) => fw.has(w)); });
  if (general && pred.length && predFacts.length && predFacts.every((f) => SPECIES.test(f.text))) return { ok: false, why: `overreach: "${key}s" generalized, but every fact carrying its predicate (${pred.join(",")}) is about a specific species`, best };
  return { ok: true, best, support: (ratio * 100) | 0 };
}
console.log(`\n2. THESIS (gated)`);
let thesis = "", g = null;
for (let i = 0; i < 3; i += 1) { thesis = cleanOut(await draw(`Verified facts about ${subject}:\n${factList}${g ? `\nA prior thesis was refused: ${g.why}. Do not generalize; name the specific dolphins.` : ""}\n\nWrite ONE thesis sentence the facts SUPPORT. Return only the sentence.`, 100)); g = gate(thesis); console.log(`   try ${i + 1}: "${thesis.slice(0, 80)}" → ${g.ok ? "ACCEPTED" : "refused: " + g.why}`); if (g.ok) break; }
if (!g.ok) { thesis = (facts.find((f) => f.topic === "stakes") ?? facts[0]).text; g = { ok: true, derived: true }; console.log(`   fallback: grounded thesis from a fact.`); }

// ── conclusion (mouth) ──
const conclusion = cleanOut(await draw(`Thesis: ${thesis}\nFacts:\n${factList}\n\nWrite ONE closing sentence for an essay with this thesis — what it means, why it matters. Return only the sentence.`, 120)) || thesis;

// ── argument: the facts ordered by the void ──
const ORDER = ["definition", "species", "range", "behaviour", "reproduction", "stakes", "other"];
const body = [];
for (const t of ORDER) for (const f of facts.filter((x) => x.topic === t)) if (!body.some((b) => b.text === f.text)) body.push(f);
const bodyFacts = body.slice(0, 8);
console.log(`\n3. ARGUMENT — ${bodyFacts.length} grounded facts in the void's order: ${[...new Set(bodyFacts.map((f) => f.topic))].join(" → ")}`);

// ── archons ──
const sentences = [thesis, ...bodyFacts.map((f) => f.text), conclusion];
const piece = [{ id: "essay", pieces: sentences.map((t) => ({ text: t, carries: [] })) }];
const ctx = { piece, ground: facts.map((f) => f.text).join(" "), task: `an essay on ${subject}` };
const findings = [...(readPiece(ctx).findings ?? []), ...houdiniExclusivity(sentences.join(" "), ctx)];
const arrival = gebserArrival({ piece, findings });
console.log(`\n4. ARCHONS — ${findings.length} finding(s); Gebser arrival: ${arrival.arrived} (${arrival.basis.slice(0, 80)})`);
const byEd = new Map(); for (const f of findings) { byEd.set(f.editor, (byEd.get(f.editor) ?? 0) + 1); }
for (const c of GRID) if (typeof c.probe === "function") console.log(`   ${c.cell.padEnd(12)} ${c.editor.padEnd(26)} ${byEd.get(c.editor) ? "✗ " + byEd.get(c.editor) : "—"}`);

// ── ship ──
const essay = `${thesis}\n\n${bodyFacts.map((f) => `${f.text} ⟦${f.source}@${f.at[0]}-${f.at[1]}⟧`).join(" ")}\n\n${conclusion}`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject} — a composed essay</title>
<style>body{font:18px/1.75 Georgia,serif;max-width:680px;margin:0 auto;padding:48px 28px;background:#fbf8f1;color:#231d13}h1{font-size:28px;font-style:italic;border-bottom:2px solid #231d13;padding-bottom:14px}p{margin:0 0 1.1em}p.thesis{font-weight:600}p.close{font-style:italic}sup{font:9px ui-monospace;color:#a08d60}footer{margin-top:40px;border-top:1px solid #c9bda0;padding-top:14px;font:12px ui-monospace;color:#6b5b3a}</style></head>
<body><h1>${subject}</h1>
<p class="thesis">${thesis}</p>
<p>${bodyFacts.map((f) => `${f.text} <sup>[${f.source.replace(/^https?:\/\//, "").slice(0, 24)}@${f.at[0]}]</sup>`).join(" ")}</p>
<p class="close">${conclusion}</p>
<footer>a composed essay — the thesis and conclusion are the mouth's (thesis gated against the facts); the argument is ${bodyFacts.length} grounded facts, every line a verbatim span at its address. Archons: ${findings.length} finding(s); Gebser arrival: ${arrival.arrived}.</footer></body></html>`;
fs.mkdirSync(OUT, { recursive: true });
const slug = `${subject}-composed-${Date.now()}`;
fs.writeFileSync(path.join(OUT, `${slug}.html`), html);
console.log(`\n════════ THE COMPOSED ESSAY ════════\n`);
console.log(`THESIS: ${thesis}\n`);
console.log(bodyFacts.map((f) => f.text).join(" "));
console.log(`\nCONCLUSION: ${conclusion}`);
console.log(`\n→ ${OUT}/${slug}.html`);
