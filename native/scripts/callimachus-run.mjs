#!/usr/bin/env node
// callimachus-run.mjs — one research record, end to end, with no model: collect → Pinax → read up the ladder → refetch for fixity → lenses.
// IO lives here; every organ it calls is pure. Spec: CALLIMACHUS draft 1 §6 (collection), §5 (fixity), §9 (lenses).
//
//   node native/scripts/callimachus-run.mjs --question "…" --out DIR [--url U]... [--search N]
//
// --search N: round 0 (§6.1) — queries built from the question's own words (queriesFrom), sent to DuckDuckGo's HTML endpoint, parsed by
//   web.js parseSearchResults; the first N result URLs are collected. Increment E's later rounds (targeted, gap, saturation) are not built:
//   the record says so. --url adds operator-supplied seeds, recorded as `seed: "operator"`.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makePinax, checkFixity, quoteOf, makeSpan, parseAddress, SIGLA } from "../organs/pinax.js";
import { readCorpus, claimSheet, dossier, extractText, declaredOf, queriesFrom } from "../organs/callimachus.js";
import { answerLadder } from "../organs/answer-ladder.js";
import { questionVoid } from "../organs/question-void.js";
import { interpret, cubeTelling, renderMarkdown, renderPlain, readingOrder, LAWS } from "../organs/cube-telling.js";
import { parseSearchResults, WEB_UA, WEB_FETCH_TIMEOUT_MS, BLOCKED_STATUSES, looksLikeChallenge } from "../organs/web.js";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const all = (k) => args.flatMap((a, i) => (a === k ? [args[i + 1]] : []));
const question = opt("--question");
const out = resolve(opt("--out") ?? "callimachus-out");
const searchN = Number(opt("--search") ?? 0);
// --replay: rebuild every lens from the pinned layers already in --out (no fetching): the same bytes, so runs compare like with like.
const replay = args.includes("--replay");
// --lang: the grammar the telling is realized in (adapters/text/telling-grammar.<lang>.js). The record is the same in every language.
const langs = (opt("--lang") ?? "en").split(",");
if (!question) { console.error("--question is required"); process.exit(2); }
mkdirSync(join(out, "layers"), { recursive: true });

const webJs = readFileSync(join(here, "../organs/web.js"));
const EXTRACTOR = { name: "web.js#extractReadable", sha256: createHash("sha256").update(webJs).digest("hex") };
const UA = `${WEB_UA} callimachus`;

async function get(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), WEB_FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" }, redirect: "follow", signal: ctl.signal });
    const raw = new Uint8Array(await r.arrayBuffer());
    return { ok: r.ok, status: r.status, finalUrl: r.url, contentType: r.headers.get("content-type"), raw };
  } catch (err) { return { ok: false, status: 0, error: String(err.message ?? err) }; } finally { clearTimeout(t); }
}

const absences = [];
const seeds = all("--url").map((u) => ({ url: u, seed: "operator" }));
const records = [];
const retrievedAt = () => new Date().toISOString();
if (replay) {
  const prior = JSON.parse(readFileSync(join(out, "record.json"), "utf8"));
  absences.push(...(prior.absences ?? []));
  seeds.length = 0; // the record's own seeds, not this command line's
  seeds.push(...(prior.collection?.seeds ?? []));
  for (const s of prior.sources) {
    const raw = readFileSync(join(out, "layers", `${s.id}.raw`));
    const text = readFileSync(join(out, "layers", `${s.id}.txt`), "utf8");
    const rec = await makePinax({ url: s.url, finalUrl: s.final_url, retrievedAt: s.retrieved_at, fetch: s.fetch, raw: new Uint8Array(raw), text, extractor: EXTRACTOR });
    if (rec.entry.id !== s.id || rec.entry.text.sha256 !== s.text.sha256) { console.error(`replay: ${s.id} does not reproduce from its layers`); process.exit(3); }
    rec.declared = s.declared;
    records.push(rec);
  }
  console.error(`replayed ${records.length} pinned pages from ${out}`);
} else {
  if (searchN > 0) {
    for (const q of queriesFrom(question)) {
      const r = await get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`);
      const parsed = r.ok ? parseSearchResults(new TextDecoder().decode(r.raw)) : { blocked: true, results: [] };
      if (parsed.blocked || !parsed.results.length) absences.push({ type: parsed.blocked ? "bot_blocked" : "searched_absent", query: q, corpus: "duckduckgo html", detail: `status ${r.status}` });
      for (const res of parsed.results.slice(0, searchN)) if (!seeds.some((s) => s.url === res.url)) seeds.push({ url: res.url, seed: `round0:${q}` });
    }
  }

  for (const s of seeds) {
    const r = await get(s.url);
    if (!r.ok) { absences.push({ type: BLOCKED_STATUSES.includes(r.status) ? "bot_blocked" : "unreachable", url: s.url, detail: r.error ?? `HTTP ${r.status}` }); continue; }
    if (!/html|xml|text/i.test(r.contentType ?? "")) { absences.push({ type: "unadmitted", url: s.url, detail: `content-type ${r.contentType} needs another extractor` }); continue; }
    const html = new TextDecoder().decode(r.raw);
    const text = extractText(html);
    if (looksLikeChallenge({ title: html.match(/<title[^>]*>([^<]*)/i)?.[1] ?? "", textChars: text.length }) || text.length < 400) { absences.push({ type: "bot_blocked", url: s.url, detail: `challenge or shell page (${text.length} chars)` }); continue; }
    const rec = await makePinax({ url: s.url, finalUrl: r.finalUrl, retrievedAt: retrievedAt(), fetch: { status: r.status, content_type: r.contentType, via: "node fetch", seed: s.seed }, raw: r.raw, text, extractor: EXTRACTOR });
    rec.declared = declaredOf(html);
    records.push(rec);
    writeFileSync(join(out, "layers", `${rec.entry.id}.raw`), rec.layers.raw);
    writeFileSync(join(out, "layers", `${rec.entry.id}.txt`), rec.layers.text);
    console.error(`pinned ${rec.entry.id}  ${rec.entry.text.bytes}B  ${s.url}`);
  }


}
const store = Object.fromEntries(records.map((r) => [r.entry.id, r]));
const record = readCorpus(records, { question, absences });
const interp = interpret(record);
record.collection = { seeds, rounds_run: searchN > 0 ? 1 : 0, stop: "budget: round 0 only (targeted, gap and saturation rounds are increment E, not built)" };

// Fixity, live: refetch every source and check one span per source (its incipit) on both axes.
const verdicts = {};
for (const rec of records) {
  const r = await get(rec.entry.url);
  let current = null;
  if (r.ok) {
    const html = new TextDecoder().decode(r.raw);
    current = await makePinax({ url: rec.entry.url, retrievedAt: retrievedAt(), raw: r.raw, text: extractText(html), extractor: EXTRACTOR, supersedes: rec.entry.id });
  }
  const s = await makeSpan(rec, "text", rec.entry.incipit.start, rec.entry.incipit.end);
  verdicts[rec.entry.id] = await checkFixity(s, { store: current ? { ...store, [current.entry.id]: current } : store, current });
}
const atomVerdict = (a) => verdicts[a.pinax];

const slice = async (address) => {
  const p = parseAddress(address);
  const rec = store[p.pinax];
  if (!rec) return null;
  const sp = await makeSpan(rec, p.layer, p.start, p.end);
  if (sp.ok === false) return null;
  const q = await quoteOf(sp, rec);
  return q.ok ? q.text : null;
};
const sigilOf = (a) => atomVerdict(a)?.sigil ?? SIGLA.unchecked;

const sheet = await claimSheet(record, { slice, sigilOf });
const dos = await dossier(record, { slice, sigilOf, verdicts });
const grammars = Object.fromEntries(await Promise.all(langs.map(async (l) => [l, (await import(`../adapters/text/telling-grammar.${l}.js`)).default])));
for (const l of langs.slice(1)) {
  const t = await cubeTelling(record, { slice, interp, fixity: verdicts, grammar: grammars[l] });
  writeFileSync(join(out, `telling.${l}.txt`), renderPlain(t));
  writeFileSync(join(out, `telling.${l}.md`), renderMarkdown(t));
  console.error(`${l}: ${t.measures.sentences} sentences, lawful ${t.measures.lawful}, copied verified ${t.measures.source_segments_verified}, cells ${JSON.stringify(t.measures.cells)}`);
}
const telling = await cubeTelling(record, { slice, interp, fixity: verdicts, grammar: grammars[langs[0]] });
const M = telling.measures;
const tellingBody = renderMarkdown(telling);
const plain = renderPlain(telling);
// The telling is itself pinned: its plain text becomes a Pinax record, and every sentence gets a byte span in it, mapped to the source
// spans its segments were copied from. Output and input are addressed the same way.
const told = await makePinax({ url: `callimachus:telling/${record.question}`, retrievedAt: retrievedAt(), raw: plain, text: plain, extractor: { name: "cube-telling.js#renderPlain", sha256: createHash("sha256").update(readFileSync(join(here, "../organs/cube-telling.js"))).digest("hex") } });
const enc = new TextEncoder();
const addressed = [];
let cursor = 0;
for (const c of readingOrder(telling)) for (const s of c.sentences ?? []) {
  const at = plain.indexOf(s.text, cursor);
  if (at < 0) continue;
  cursor = at + s.text.length;
  const b0 = enc.encode(plain.slice(0, at)).length, b1 = b0 + enc.encode(s.text).length;
  addressed.push({ cell: c.key, terrain: c.terrain, stance: c.stance, at: `${told.entry.id}/text@${told.entry.text.sha256.slice(0, 12)}#b${b0}-${b1}`, text: s.text, grounds: s.grounds, segments: s.segs.map((x) => ({ kind: x.kind, text: x.t, ...(x.address ? { address: x.address } : {}) })) });
}
const ctx = {};
for (const s of addressed) for (const g of s.segments) if (g.address && !ctx[g.address]) {
  const p = parseAddress(g.address); const rec = store[p.pinax]; if (!rec) continue;
  const L = rec.layers[p.layer]; const dec = new TextDecoder();
  ctx[g.address] = { host: new URL(rec.entry.url).host, url: rec.entry.url, before: dec.decode(L.subarray(Math.max(0, p.start - 280), p.start)).replace(/^[\x80-\xBF]+/, ""), bytes: dec.decode(L.subarray(p.start, p.end)), after: dec.decode(L.subarray(p.end, Math.min(L.length, p.end + 280))) };
}
const statusLine = Object.entries(M.cells).map(([k, v]) => `${v} ${k}`).join(", ");
const tellingMd = [`# The record, told`, ``, `**Question:** ${question}`, ``,
  `<p class="note">Written with no model. Each sentence is addressed to one of the 27 cube cells (${statusLine}); its words are either declared frame words, values computed from the record, or bytes copied from a pinned page (underlined: click to see them in place). ${M.sentences} sentences · lawful ${M.lawful} · copied segments verified ${M.source_segments_verified} · words: ${M.words.source_bytes} copied, ${M.words.values} computed, ${M.words.frame} frame · ${telling.refused.length} candidates refused by the prose laws · model calls ${M.model_calls}. This telling is itself pinned: <code>${told.entry.id}</code>.</p>`, ``, tellingBody].join("\n");
writeFileSync(join(out, "telling.md"), tellingMd);
writeFileSync(join(out, "telling.txt"), plain);
writeFileSync(join(out, "telling.addressed.json"), JSON.stringify({ pinax: told.entry, laws: LAWS, measures: M, refused: telling.refused, sentences: addressed, cells: telling.cells.map(({ sentences, ...c }) => ({ ...c, sentences: sentences?.length ?? 0 })) }, null, 1));
writeFileSync(join(out, "telling.json"), JSON.stringify({ measures: M, interp: { facets: interp.facets.map((f) => ({ ...f, atoms: f.atoms.length })), grounds: interp.grounds, frames: interp.frames, kind_edges: interp.kind_edges } }, null, 1));
// ANSWERS: each --ask read by its language's grammar (NL → grammar → EOT), declared as a void, answered at every stage.
const asks = all("--ask").length ? all("--ask") : [question];
const answerMd = [];
const ladders = [];
let parserModel = null;
for (const ask of asks) {
  for (const l of langs) {
    const qg = (await import(`../adapters/text/question-grammar.${/^[¿¡]|[áéíóúñ]/i.test(ask) ? "es" : "en"}.js`)).default;
    if (qg.lang === "en" && !parserModel) { const { loadModel } = await import("../adapters/text/english-parser.js"); parserModel = loadModel(JSON.parse(readFileSync(join(here, "../priors/parser-eng-ewt.json"), "utf8"))); }
    const reading = qg.readQuestion(ask, { model: parserModel });
    const qv = questionVoid(reading, record);
    const t = l === langs[0] ? telling : await cubeTelling(record, { slice, interp, fixity: verdicts, grammar: grammars[l] });
    const lad = await answerLadder(record, { question: qv, slice, grammar: grammars[l], telling: t, fixity: verdicts });
    ladders.push({ ask, lang: l, ...lad, stages: lad.stages.map(({ sentences, ...st }) => ({ ...st, text: sentences.map((s) => s.text), segments: sentences.map((s) => s.segs.map((x) => ({ kind: x.kind, text: x.t, ...(x.address ? { address: x.address } : {}) }))) })) });
    for (const s of lad.stages.flatMap((st) => st.sentences)) for (const g of s.segs) if (g.address && !ctx[g.address]) {
      const p = parseAddress(g.address); const rec = store[p.pinax]; if (!rec) continue; const L = rec.layers[p.layer]; const dec = new TextDecoder();
      ctx[g.address] = { host: new URL(rec.entry.url).host, url: rec.entry.url, before: dec.decode(L.subarray(Math.max(0, p.start - 280), p.start)), bytes: dec.decode(L.subarray(p.start, p.end)), after: dec.decode(L.subarray(p.end, Math.min(L.length, p.end + 280))) };
    }
    const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const html = (s) => s.segs.map((x) => (x.kind === "source" ? `<span class="src" data-addr="${esc(x.address)}">${esc(x.t)}</span>` : x.kind === "value" ? `<span class="val">${esc(x.t)}</span>` : esc(x.t))).join("");
    answerMd.push(`## ${esc(ask)} <span class="note">(${l})</span>`, ``, `<p class="note">Read as <b>${lad.question.form}</b>, asking for <b>${lad.question.admits ?? "—"}</b>, modality ${lad.question.modality}; figures: ${(lad.question.focus ?? []).map((id) => record.entities.find((e) => e.id === id)?.name).filter(Boolean).join(", ") || "none named"}; undeclared void fields: ${lad.question.undeclared.join(", ")}. ${lad.candidates} candidate claims. <code>${qv.id}</code></p>`, ``);
    for (const st of lad.stages.slice(0, 3)) {
      const how = st.stage === 1 ? "perception only" : st.stage === 2 ? `+ logos · contest: ${st.contest.verdict} (margin ${st.contest.margin == null ? "—" : st.contest.margin.toFixed(2)} vs null bar ${st.contest.bar}) · cycles ${st.cycles}${st.moved ? ` · lead moved by ${st.moved.by.join(", ") || "re-ranking"}` : " · lead held"}` : `+ pathos · for ${st.experiencer.who} · strain ${st.strain} → ${st.sides} sides · rhythm ${st.rhythm.flatline ? "flatlined, re-picked" : "varied"} · curve unmeasured`;
      answerMd.push(`### ${st.stage}. ${st.size[0].toUpperCase() + st.size.slice(1)}`, `<p class="note">${how}</p>`, ``, `<p>${st.sentences.map(html).join(" ")}</p>`, ``);
    }
    answerMd.push(`### 4. Dossier`, `<p class="note">the whole cube: see the Telling tab · 5. Claim sheet: every claim, see its tab</p>`, ``);
  }
}
writeFileSync(join(out, "answers.json"), JSON.stringify(ladders, null, 1));
writeFileSync(join(out, "answers.md"), answerMd.join("\n"));
writeView(join(out, "view.html"), { Answers: answerMd.join("\n"), Telling: tellingMd, ...Object.fromEntries(langs.slice(1).map((l) => [`Telling (${l})`, readFileSync(join(out, `telling.${l}.md`), "utf8")])), Dossier: dos.text, "Claim sheet": sheet.text }, ctx);
const strip = (a) => { const { _sentence, _object, ...rest } = a; return rest; };
writeFileSync(join(out, "record.json"), JSON.stringify({ ...record, atoms: record.atoms.map(strip), fixity: verdicts }, null, 1));
writeFileSync(join(out, "claim-sheet.md"), sheet.text);
writeFileSync(join(out, "dossier.md"), dos.text);
const kinds = record.atoms.reduce((m, a) => ((m[a.kind] = (m[a.kind] ?? 0) + 1), m), {});
const standing = record.claims.reduce((m, c) => ((m[c.standing] = (m[c.standing] ?? 0) + 1), m), {});
console.log(JSON.stringify({ telling: M, out, sources: records.length, absences: absences.length, atoms: record.atoms.length, kinds, claims: record.claims.length, standing, entities: record.entities.length, fixity: Object.values(verdicts).reduce((m, v) => ((m[v.verdict] = (m[v.verdict] ?? 0) + 1), m), {}) }, null, 1));

function writeView(file, tabs, ctx = {}) {
  const j = (x) => JSON.stringify(x).replace(/</g, "\\u003c");
  const keys = Object.keys(tabs);
  writeFileSync(file, `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Callimachus record</title>
<style>:root{--bg:#fbfaf7;--fg:#1d1d1b;--mute:#6b6a65;--line:#e4e1da;--acc:#7a4b12}
@media (prefers-color-scheme:dark){:root{--bg:#161614;--fg:#e9e6df;--mute:#9a978f;--line:#2e2d29;--acc:#e0a95c}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 Georgia,serif}
nav{position:sticky;top:0;background:var(--bg);border-bottom:1px solid var(--line);padding:10px 16px;display:flex;gap:8px;font-family:system-ui;z-index:2}
nav button{border:1px solid var(--line);background:none;color:var(--fg);padding:5px 12px;border-radius:6px;cursor:pointer}
nav button.on{border-color:var(--acc);color:var(--acc)}
main{max-width:860px;margin:0 auto;padding:8px 16px 60px}main.wide{max-width:1150px}
h1,h2,h3{font-family:system-ui;line-height:1.25}h3{margin:28px 0 0}h3+p em:first-child{color:var(--mute);font-size:13px}
h2{border-top:1px solid var(--line);padding-top:18px;margin-top:30px}sup{color:var(--mute);font:10px system-ui;cursor:help}
a{color:var(--acc)}code{font-size:11px;color:var(--mute)}
table{border-collapse:collapse;font-size:13px;display:block;overflow-x:auto}td,th{border-bottom:1px solid var(--line);padding:4px 8px;vertical-align:top;text-align:left}
li{margin:4px 0}
.note{font:13px/1.5 system-ui;color:var(--mute)}.cube{margin:2px 0 0;font:11px system-ui;color:var(--mute);display:flex;gap:6px}
.cell{padding:1px 6px;border-radius:9px;border:1px solid var(--line)}.cell.voiced{color:var(--acc);border-color:var(--acc)}.cell.desert{text-decoration:line-through}.cell.gap{font-style:italic}
.src{text-decoration:underline;text-decoration-color:var(--acc);text-underline-offset:3px;cursor:pointer}.src:hover,.src.on{background:color-mix(in srgb,var(--acc) 14%,transparent)}
.val{border-bottom:1px dotted var(--mute)}
#ctx{position:fixed;right:16px;bottom:16px;max-width:min(520px,calc(100vw - 32px));max-height:50vh;overflow:auto;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px 14px;font:13px/1.5 Georgia,serif;box-shadow:0 6px 30px #0003;display:none}
#ctx .h{font:11px system-ui;color:var(--mute);margin-bottom:6px;word-break:break-all}#ctx mark{background:color-mix(in srgb,var(--acc) 25%,transparent);color:inherit}</style>
<div id="ctx"></div><nav>${keys.map((k, i) => `<button data-k="${i}"${i ? "" : ' class="on"'}>${k}</button>`).join("")}</nav><main id="m"></main>
<script src="https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js"></script>
<script>const S=${j(keys.map((k) => tabs[k]))};const m=document.getElementById("m");
function show(k){m.innerHTML=marked.parse(S[k]);m.classList.toggle("wide",k>0);document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("on",b.dataset.k==k));scrollTo(0,0)}
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>show(b.dataset.k));show(0);
const C=${j(ctx)};const box=document.getElementById("ctx");const esc=t=>t.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
m.addEventListener("click",e=>{const s=e.target.closest(".src");document.querySelectorAll(".src.on").forEach(x=>x.classList.remove("on"));if(!s){box.style.display="none";return}s.classList.add("on");const c=C[s.dataset.addr];if(!c)return;
box.innerHTML='<div class="h">'+esc(c.host)+' · '+esc(s.dataset.addr)+'</div>…'+esc(c.before)+'<mark>'+esc(c.bytes)+'</mark>'+esc(c.after)+'… <a href="'+c.url+'" target="_blank" rel="noreferrer">open page</a>';box.style.display="block"});</script>`);
}
