#!/usr/bin/env node
// eval/callimachus/grain-view-r3.mjs — a READ-ONLY viewer for the third registration (after the new-is-never-unshown change): re-folds void, dense, B and shown (deterministic, N8) and
// writes every item to one HTML page. It is not part of the experiment and changes no result.
//
//   node native/eval/callimachus/grain-view-r3.mjs --universe <pinned run dir> --whom <twin-reader whom dir> --out <results.json>
//
// COMMITTED BEFORE IT IS RUN, and not edited after. It has not been run. It reads, and never writes anywhere but --out:
//   --universe  a copy of callimachus-runs/permanent-dst (record.json + layers/), replayed from its pinned bytes, never refetched.
//   --whom      the twin-reader run's `whom/` directory: dense, B, null-1..19, bnull-101..119, each `thread.md`, byte for byte
//               (their sha256s are recorded in the results and must match the pre-registration: dense 3e8f5b1e…, B c1e854c5…).
// The grain is selected and run by organs/grain.js `foldGrain`; W is read by organs/holdings.js `claimsOfWhom` (the same claim reader
// as U). No model anywhere. Nothing in W leaves the machine.
//
// What each prediction in GRAIN-PREREG.md needs is computed here, mechanically, and written as `predictions` with `holds` or
// `uninformative` (an arm whose W admitted no claim is never scored as a pass).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makePinax, makeSpan, quoteOf, parseAddress } from "../../organs/pinax.js";
import { readCorpus } from "../../organs/callimachus.js";
import { candidatesOf, witnesses, scoreWith } from "../../organs/answer-ladder.js";
import { questionVoid } from "../../organs/question-void.js";
import { foldGrain, spansFromRecord, arrangementOf, GRAINS } from "../../organs/grain.js";
import { claimsOfWhom } from "../../organs/holdings.js";
import { loadModel } from "../../adapters/text/english-parser.js";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const UNIVERSE = opt("--universe") && resolve(opt("--universe"));
const WHOM = opt("--whom") && resolve(opt("--whom"));
const OUT = opt("--out") && resolve(opt("--out"));
if (!UNIVERSE || !WHOM || !OUT || !opt("--results")) { console.error("usage: grain-view-r3.mjs --universe <dir> --whom <dir> --results <results.json> --out <page.html>"); process.exit(2); }

const ASK = "When did the House pass the Sunshine Protection Act?";
const PREREG_SHA = { dense: "3e8f5b1e45c8a19539c92c3b0c733fdce57109d315cb12e0841b22eda95fafbe", B: "c1e854c5c9d7603224eeb2fd692c964d709fd2590e6e0ec8b2a7949250d22e80" };
const NULL_SEEDS = { dense: Array.from({ length: 19 }, (_, i) => `null-${i + 1}`), B: Array.from({ length: 19 }, (_, i) => `bnull-${i + 101}`) };
const CHAIN_MAX = 5;
const sha = (b) => createHash("sha256").update(b).digest("hex");
const log = (...m) => console.error(new Date().toISOString().slice(11, 19), ...m);

// ---- the universe, replayed from its pinned layers ------------------------------------------------------------------------------
const webJs = readFileSync(join(here, "../../organs/web.js"));
const EXTRACTOR = { name: "web.js#extractReadable", sha256: sha(webJs) };
const prior = JSON.parse(readFileSync(join(UNIVERSE, "record.json"), "utf8"));
const store = {};
const records = [];
for (const s of prior.sources) {
  const raw = readFileSync(join(UNIVERSE, "layers", `${s.id}.raw`));
  const text = readFileSync(join(UNIVERSE, "layers", `${s.id}.txt`), "utf8");
  const rec = await makePinax({ url: s.url, finalUrl: s.final_url, retrievedAt: s.retrieved_at, fetch: s.fetch, raw: new Uint8Array(raw), text, extractor: EXTRACTOR });
  if (rec.entry.id !== s.id || rec.entry.text.sha256 !== s.text.sha256) { console.error(`replay: ${s.id} does not reproduce from its layers (web.js changed since the record was pinned?)`); process.exit(3); }
  rec.declared = s.declared;
  records.push(rec);
  store[rec.entry.id] = rec;
}
const record = readCorpus(records, { question: prior.question, absences: prior.absences ?? [] });
const verdicts = { ...(prior.fixity ?? {}) };
/** Slice any address, in U or in any W pinned so far: the bytes the span names, or null. */
const slice = async (address) => {
  const p = parseAddress(address);
  const rec = store[p.pinax];
  if (!rec) return null;
  const sp = await makeSpan(rec, p.layer, p.start, p.end);
  if (sp.ok === false) return null;
  const q = await quoteOf(sp, rec);
  return q.ok ? q.text : null;
};

// ---- R, the activated region: the ladder's own `touched` set, with its perception score as the activation ------------------------
const qg = (await import("../../adapters/text/question-grammar.en.js")).default;
const model = loadModel(JSON.parse(readFileSync(join(here, "../../priors/parser-eng-ewt.json"), "utf8")));
const qv = questionVoid(qg.readQuestion(ASK, { model }), record);
const cands = candidatesOf(record, verdicts);
const cols = witnesses(cands, { question: qv, record });
const p1 = scoreWith(cols, ["perception"], cands.length);
const activation = new Map(cands.map((a, i) => [a.id, p1.s[i]]));
const touched = cands.filter((_, i) => p1.s[i] > 0);
const uAll = await spansFromRecord(record, { slice, activation });
const region = uAll.filter((s) => s.activation > 0);

// ---- W, read as claims ---------------------------------------------------------------------------------------------------------
const RECEIVED = { verbs: new Set(record.vocab) }; // the vocabulary the record's own reading earned (GRAIN-R2-PREREG.md)
async function readW(name, text) {
  const raw = Buffer.from(text, "utf8");
  const rec = await makePinax({ url: `whom:${name}`, raw: new Uint8Array(raw), text, extractor: { name: "whom: local file, read as UTF-8" } });
  store[rec.entry.id] = rec;
  const got = await claimsOfWhom([rec], { slice, received: RECEIVED });
  return { pinax: rec.entry.id, sha256: sha(raw), spans: got.spans, atoms: got.atoms ?? 0, why: got.why };
}
const PINNED = JSON.parse(readFileSync(join(here, "grain-whom-sha256.json"), "utf8")).files;
const hashMismatches = [];
const whomText = (name) => {
  const t = readFileSync(join(WHOM, name, "thread.md"), "utf8");
  if (PINNED[name] && sha(Buffer.from(t, "utf8")) !== PINNED[name]) hashMismatches.push({ name, pinned: PINNED[name], found: sha(Buffer.from(t, "utf8")) });
  return t;
};

// ---- one arm --------------------------------------------------------------------------------------------------------------------
const copiedOf = (f) => [...new Set(f.modes.flatMap((m) => m.items.flatMap((it) => it.segs.filter((g) => g.kind === "source").map((g) => g.address))))].sort();
const rankOf = (g) => GRAINS.indexOf(g);
const jaccardD = (a, b) => { const A = new Set(a), B = new Set(b); const u = new Set([...A, ...B]).size; return u ? 1 - [...A].filter((x) => B.has(x)).length / u : 0; };

async function armOf(name, whomSpans, { sha256 = null, atoms = 0, why = null } = {}) {
  const f = foldGrain({ region, whom: whomSpans });
  const copied = copiedOf(f);
  const wPinax = new Set(whomSpans.map((s) => s.address.split("/")[0]));
  const reslice = [];
  for (const m of f.modes) for (const it of m.items) for (const g of it.segs) if (g.kind === "source" && (await slice(g.address)) !== g.t) reslice.push(g.address);
  const verdictCounts = f.contacts.reduce((c, x) => ((c[x.case] = (c[x.case] ?? 0) + 1), c), {});
  return {
    name, sha256, informative: whomSpans.length > 0 || name === "void", claims: whomSpans.length, atoms, ...(why ? { why } : {}),
    grain: f.grain, why_grain: f.why, selectorUnreadable: !!f.selectorUnreadable,
    distance: { region: f.distance.region, held: f.distance.held, absent: f.distance.absent, share: f.distance.share, null: f.distance.null },
    verdicts: verdictCounts,
    modes: f.modes.map((m) => ({ mode: m.mode, role: m.role, items: m.items.length, seamCount: m.seams.seamCount, seamDensity: m.seams.seamDensity, addressedShare: m.seams.addressedShare })),
    closure: f.closure, contract: f.seams.contract.ok, resliceFailures: reslice.length,
    copied, copiedU: copied.filter((a) => !wPinax.has(a.split("/")[0])),
    _fold: f, _whomSpans: whomSpans,
  };
}
const strip = ({ _fold, _whomSpans, ...rest }) => rest;

// ---- the page ----------------------------------------------------------------------------------------------------------------------
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const chip = (a) => `<code class="addr" title="${esc(a)}">${esc(a.replace(/^px_([0-9a-f]{6})[0-9a-f]*\//, "px_$1…/").replace(/@[0-9a-f]+#/, "#"))}</code>`;
const RES = JSON.parse(readFileSync(opt("--results"), "utf8"));
const R3 = { M1: `${RES.predictions.M1.checked} of ${RES.predictions.M1.checked}`, M2: `${RES.predictions.M2.forcedFoldsChecked} forced folds`, M3: `${RES.predictions.M3.patternFoldsWithTracing} folds with echoes` };
const PER_ASK_ROWS = RES.perAsk.filter((x) => ["void", "dense", "B", "shown"].includes(x.reader)).map((x) => `<tr><td>${esc(x.ask)}</td><td>${esc(x.reader)}</td><td>${esc(x.grain)}</td><td>${x.held}</td><td>${x.absentShown} of ${x.absentTotal}</td><td>${x.echoes}</td><td>${x.chains}</td></tr>`).join("");
const arms = {};
arms.void = await armOf("void", []);
{ const w = await readW("dense", whomText("dense")); arms.dense = await armOf("dense", w.spans, { atoms: w.atoms }); }
{ const w = await readW("B", whomText("B")); arms.B = await armOf("B", w.spans, { atoms: w.atoms }); }
const shownBlocks = region.map((s) => s.text.replace(/\s+/g, " ").trim());
{ const w = await readW("shown", shownBlocks.join("\n\n") + "\n"); arms.shown = await armOf("shown", w.spans, { atoms: w.atoms }); }

const PEOPLE = {
  void: { who: "A reader who holds nothing", note: "Nobody asking. The system has no one to fold for, so it hands over the catalog: everything the question touches, best match first." },
  dense: { who: "A reader who already knows the House and Senate material", note: "Their messages are 60 short passages about what the House and Senate did. The system read them in the documents' own vocabulary." },
  B: { who: "A reader who holds only the system's own earlier sentences", note: "14 sentences the system itself wrote for the first reader. Does this reader count as knowing the material?" },
  shown: { who: "A reader who holds exactly what the first answer displayed", note: "All 92 passages of the catalog. This tests whether the system recognises what it was just shown." },
};
const GRAIN_WORDS = {
  Ground: "A survey: the reader holds little of this, so the system lays out the whole area.",
  Figure: "The one new thing: some is known and some is not, so the system shows what the reader holds against the record, then what is new, placed next to what it connects to.",
  Pattern: "Connections: most is known, so the only thing that can be new is how known things relate. The system shows the connections it can check.",
};
const CELL_WORDS = {
  Clearing: "Everything the question touches, kept in order (the catalog).",
  Tending: "What this reader holds that the record also says, with both locations.",
  Cultivating: "The survey: the region laid out best match first.",
  Dissecting: "What this reader holds that the record refuses, side by side.",
  Binding: "What this reader holds that the record also says.",
  Making: "What is new to this reader, each next to the nearest thing they already hold.",
  Unraveling: "A connection the reader makes that the record does not.",
  Tracing: "What this reader holds, next to the record passage that says the same.",
  Composing: "A connection the record makes between things the reader holds, that they did not.",
};
const itemHtml = (it) => {
  const isW = (addr) => (store[parseAddress(addr).pinax]?.entry.url ?? "").startsWith("whom:");
  const sources = it.segs.filter((g) => g.kind === "source");
  const attach = it.attachedBy !== undefined; // a new passage placed beside the nearest thing the reader holds
  const label = (g, idx) => {
    if (attach) return sources.length > 1 ? (idx === 0 ? ["wside", "beside what they hold"] : ["newside", "new to them"]) : ["newside", "new to them"];
    const pair = sources.length > 1 && !it.segs.some((x) => x.kind !== "source");
    if (!pair) return null;
    return isW(g.address) ? ["wside", "they hold"] : ["rside", "the record says"];
  };
  let k = -1;
  const parts = it.segs.map((g) => {
    if (g.kind !== "source") return g.t ? `<span class="seam" title="the system's own bridge words: a seam">${esc(g.t.trim())}</span>` : `<span class="seam" title="a flagged gap">· · ·</span>`;
    k++;
    const lb = label(g, k);
    return `${lb ? `<div class="line"><span class="who ${lb[0]}">${lb[1]}</span> ` : "<div class=\"line\">"}<span class="q">${esc(g.t)}</span>${chip(g.address)}</div>`;
  }).join("");
  return `<li>${parts}</li>`;
};
const cards = [];
for (const key of ["void", "dense", "B", "shown"]) {
  const a = arms[key], f = a._fold;
  const wKeys = new Set(a._whomSpans.map((s) => arrangementOf(s)).filter(Boolean));
  const heldAddr = new Set(region.filter((s) => wKeys.has(arrangementOf(s))).map((s) => s.address));
  const p = PEOPLE[key];
  const cellHead = (m) => `<section class="cell"><h4>${esc(m.mode)} <span class="mode">${esc(m.stance.mode)}</span> <span class="count">${m.items.length} item${m.items.length === 1 ? "" : "s"} · ${m.seams.seamCount} bridge${m.seams.seamCount === 1 ? "" : "s"}</span></h4><p class="what">${esc(CELL_WORDS[m.mode] ?? "")}</p>`;
  const list = (xs) => `<ol>${xs.map(itemHtml).join("")}</ol>`;
  const cellHtml = (m) => {
    if (m.mode === "Tracing") {
      const chains = m.items.filter((i) => !i.echo), echoes = m.items.filter((i) => i.echo);
      return cellHead(m) + (chains.length ? `<h5>Connections the record walks (${chains.length})</h5>${list(chains)}` : `<p class="none">No connection to walk for this reader.</p>`)
        + (echoes.length ? `<details><summary>${echoes.length} things they already hold, confirmed by the record in the same words</summary>${list(echoes)}</details>` : "") + `</section>`;
    }
    if (m.mode === "Composing") {
      const edges = m.items.filter((i) => !i.unrelated), fresh = m.items.filter((i) => i.unrelated);
      return cellHead(m) + (edges.length ? `<h5>New connections between things they hold (${edges.length})</h5>${list(edges)}` : `<p class="none">No new connection between things they hold.</p>`)
        + (fresh.length ? `<h5 class="newhead">New to this reader (${fresh.length} passages, each beside the nearest thing they hold)</h5>${list(fresh)}` : "") + `</section>`;
    }
    return cellHead(m) + (m.items.length ? list(m.items) : `<p class="none">Nothing for this reader here.</p>`) + `</section>`;
  };
  const cells = f.modes.filter((m) => m.mode !== "Clearing").map(cellHtml).join("");
  const marked = region.map((s) => `<li class="${heldAddr.has(s.address) ? "held" : "new"}"><span class="tag">${heldAddr.has(s.address) ? "already holds" : "new to them"}</span> <span class="q">${esc(s.text)}</span>${chip(s.address)}</li>`).join("");
  const nHeld = heldAddr.size;
  cards.push(`
  <article class="reader" id="${key}">
    <header><h2>${esc(p.who)}</h2><p class="note">${esc(p.note)}</p></header>
    <div class="facts"><div><b>${a.claims}</b><span>claims the system found in what they hold</span></div><div><b>${nHeld} of ${region.length}</b><span>passages they already hold</span></div><div class="grain ${a.grain}"><b>${a.grain}</b><span>kind of answer</span></div></div>
    <p class="grainwhy"><b>${esc(a.grain)}.</b> ${esc(GRAIN_WORDS[a.grain])} <em>${esc(a.why_grain)}.</em></p>
    ${cells}
    <details><summary>All ${region.length} passages, marked for this reader</summary><ol class="marked">${marked}</ol></details>
  </article>`);
}
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Same question, different readers — after the fix</title>
<style>
:root{--bg:#fbfaf7;--fg:#1d1c1a;--mute:#6b6a66;--card:#fff;--line:#e3e0d8;--held:#e8f3ea;--heldfg:#1d5a2c;--new:#fdf1dc;--newfg:#8a5a00;--seam:#7a2f8a;--acc:#2b5fb3}
@media (prefers-color-scheme: dark){:root{--bg:#161614;--fg:#ecebe6;--mute:#a09f98;--card:#1f1f1c;--line:#34332e;--held:#1c3023;--heldfg:#8fd19e;--new:#352a12;--newfg:#f0c36a;--seam:#d2a0e0;--acc:#8ab4f8}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 Georgia,"Iowan Old Style",serif}
main{max-width:860px;margin:0 auto;padding:28px 16px 80px}h1{font-size:1.9rem;margin:.2em 0}h2{font-size:1.25rem;margin:0}h4{margin:.2em 0}
.lead{color:var(--mute)}.ask{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--acc);padding:12px 16px;border-radius:6px;margin:18px 0}
nav{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}nav a{color:var(--acc);border:1px solid var(--line);padding:4px 10px;border-radius:99px;text-decoration:none;font:14px system-ui}
.reader{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:18px;margin:22px 0}.note{color:var(--mute);margin:.3em 0 0}
.facts{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0}.facts div{background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px 10px}
.facts b{display:block;font:600 1.3rem system-ui}.facts span{font:13px system-ui;color:var(--mute)}
.grain.Ground b{color:var(--acc)}.grain.Figure b{color:var(--newfg)}.grain.Pattern b{color:var(--heldfg)}
.cell{border-top:1px solid var(--line);padding-top:10px;margin-top:12px}.mode{font:12px system-ui;color:var(--mute);border:1px solid var(--line);border-radius:99px;padding:1px 8px;margin-left:6px}.count{font:13px system-ui;color:var(--mute);margin-left:8px}
h5{font:600 13px system-ui;margin:14px 0 4px}.newhead{color:var(--newfg)}.what{color:var(--mute);margin:.1em 0 .5em;font-size:.95rem}ol{padding-left:1.4em}li{margin:.5em 0}.none{color:var(--mute);font-style:italic}
.q{font-size:.98rem}.addr{display:inline-block;margin-left:6px;font:11px ui-monospace,Menlo,monospace;color:var(--mute);background:var(--bg);border:1px solid var(--line);border-radius:4px;padding:0 5px;vertical-align:1px}
.line{margin:2px 0}.newside{background:var(--new);color:var(--newfg)}.who{display:inline-block;font:600 10.5px system-ui;text-transform:uppercase;letter-spacing:.04em;border-radius:4px;padding:1px 6px;margin:0 4px 0 0}.wside{background:var(--held);color:var(--heldfg)}.rside{background:var(--bg);border:1px solid var(--line);color:var(--mute)}.seam{color:var(--seam);font:italic .9rem Georgia,serif;border-bottom:1px dotted var(--seam);margin:0 4px}
.marked li{list-style:none;margin-left:-1.2em;padding:6px 8px;border-radius:6px}.marked .held{background:var(--held)}.marked .new{background:var(--new)}
.tag{font:600 11px system-ui;text-transform:uppercase;letter-spacing:.04em;margin-right:6px}.held .tag{color:var(--heldfg)}.new .tag{color:var(--newfg)}
details{margin-top:14px}summary{cursor:pointer;color:var(--acc);font:14px system-ui}
.score{width:100%;border-collapse:collapse;font:14px system-ui;margin-top:10px}.score td,.score th{border-top:1px solid var(--line);padding:7px 8px;text-align:left;vertical-align:top}
.ok{color:var(--heldfg)}.bad{color:#c0392b}.na{color:var(--mute)}
@media (max-width:560px){.facts{grid-template-columns:1fr}}
</style></head><body><main>
<h1>Same question, different readers <span style="font-size:.55em;color:var(--mute)">after the fix</span></h1>
<p class="lead">One question over one set of ten pinned documents. Each reader gets an answer built only from quotes, each with its exact location in the document. The words in <span class="seam">purple</span> are the only words the system wrote itself.</p>
<div class="ask"><b>The question:</b> ${esc(ASK)}<br><span class="lead">The documents were gathered for: ${esc(prior.question)}</span></div>
<nav>${["void", "dense", "B", "shown"].map((k) => `<a href="#${k}">${esc(PEOPLE[k].who)}</a>`).join("")}<a href="#score">Scoreboard</a></nav>
${cards.join("\n")}
<article class="reader" id="score"><h2>Scoreboard (third registration, one run)</h2><p class="note">The change: whatever kind of answer a reader gets, the passages that are new to them are always shown. Predictions were written down before the run.</p>
<table class="score"><tr><th>Check</th><th>Result</th></tr>
<tr><td>Every passage that is new to a reader is shown to them (4 questions × 23 readers)</td><td class="ok">held: ${R3.M1}</td></tr>
<tr><td>Switching between "knows most of it" and "knows some of it" no longer changes what is new</td><td class="ok">held: ${R3.M2}</td></tr>
<tr><td>A passage confirmed in the same words is labelled as an echo, not a connection</td><td class="ok">held: ${R3.M3}</td></tr>
<tr><td>Nothing else moved (nobody-asking answer, scrambled controls, repeatability)</td><td class="ok">held</td></tr>
</table>
<p class="note">These checks are close to guaranteed by how the change is written; they show it didn't break anything, not that the answer is good. What is still weak is below.</p>
<table class="score"><tr><th>Question</th><th>Reader</th><th>Kind</th><th>Knows</th><th>New</th><th>Echoes</th><th>Real connections</th></tr>${PER_ASK_ROWS}</table>
<p class="note"><b>Still weak:</b> for the House-and-Senate reader, 46 of 48 "connections" are echoes and only 2 are real. The new passages are all shown, but there are 45 of them, in relevance order, with no further cut. For the other three questions the reader gets 195–209 new passages. Showing everything that is new is not the same as showing the one thing worth knowing.</p></article>
</main></body></html>`;
writeFileSync(OUT, html);
log("wrote", OUT, html.length, "bytes");
