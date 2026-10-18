// opencode-layers.mjs — THE PROJECTED REALITY, AS TOGGLEABLE LAYERS.
//
// Everything is a projection of the one store (the EOT + the worknotes medium). The same turn appears at five grains,
// and they are VIEWS OF ONE RECORD, not five rewrites — which is why a surface can toggle between them honestly:
//
//   L0 prompt      the exact bytes the model was sent (content-addressed, `prompt#<sha>`)
//   L1 projection  the fold-index the model actually read (mechanical/said/trail) — client-computed
//   L2 answer      the reply, sentence-tagged: [S# addr] grounded · [S# addr·asserted] · [M] the mouth's own
//   L3 sources     each [S#] resolved to verbatim bytes (snip)
//   L4 record      the EOT chain: events, standings, releases
//
// No model. `layers()` assembles the grains from what is persisted; `renderLayersHtml()` is a self-contained view
// with one global grain switch and per-node pins. Where a grain is not yet persisted it is a TYPED GAP, never a guess.
import fs from "node:fs";
import path from "node:path";
import { turnsOf, root as notesRoot, scentsOf } from "./opencode-worknotes.mjs";
import { groundCheck, read as eotRead } from "./opencode-eot.mjs";

/** L0 — the exact prompt, by content address (the last one sent for this task/agent). */
function promptOf({ task, agent = null } = {}) {
  const idir = path.join(notesRoot(), task, "prompts");
  let lines = [];
  try { lines = fs.readFileSync(path.join(idir, "index.jsonl"), "utf8").split("\n").filter(Boolean); } catch { return { gap: "not_disclosed", note: "no prompt has been captured for this task yet" }; }
  const rows = lines.flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } }).filter((r) => !agent || r.agent === agent);
  const last = rows.at(-1);
  if (!last) return { gap: "not_disclosed" };
  let body = null;
  try { body = fs.readFileSync(path.join(idir, `${last.sha}.txt`), "utf8"); } catch { /* bytes gone; the address stands */ }
  return { ref: last.ref, sha: last.sha, bytes: last.bytes, model: last.model ?? null, when: last.when, body, note: last.note ?? "" };
}

export function layers({ task, agent = null, root = null, now = Date.now() } = {}) {
  const turns = turnsOf({ task }).filter((t) => !agent || t.agent === agent);
  const last = turns.at(-1) ?? null;
  const facing = last?.text ? groundCheck({ task, text: last.text, root }) : null;
  const { events } = eotRead(task);
  const prompt = promptOf({ task, agent });
  return {
    task,
    agent,
    turn: last?.n ?? null,
    ask: last?.ask ?? null,
    // L0
    prompt,
    // L1 — the fold-index the model actually read (the client sends it with the turn); a typed gap until it does
    projection: prompt.note
      ? { note: prompt.note }
      : { gap: "not_persisted", note: "the fold-index the model read is computed client-side; send it with the turn (event:prompt) to disclose this grain" },
    // L2 / L3 — the answer, ground-checked on demand, each sentence carrying its address (or [M])
    answer: {
      text: last?.text ?? null,
      tools: last?.tools ?? [],
      sentences: facing?.sentences ?? [],
      summary: facing?.summary ?? null,
    },
    // L4 — the record chain
    record: events.slice(-12).map((e) => ({ stage: e.stage, standing: e.standing, agent: e.agent, unit: e.unit ?? null, when: e.ts })),
    scents: scentsOf({ task, now }),
  };
}

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** A self-contained viewer: one global grain switch (as said · sourced · prompt · record) + per-node pins.
 *  Same-origin fetch to /v1/hooks/opencode/layers (JSON) and /v1/hooks/opencode (snip). No build, no model. */
export function renderLayersHtml(L, { task = "", agent = "" } = {}) {
  const seed = JSON.stringify(L).replace(/</g, "\\u003c");
  return `<!doctype html><html><head><meta charset="utf-8"><title>layers · ${esc(task)}</title>
<style>
 :root{--ink:#e8e6e3;--dim:#9a958e;--bg:#14130f;--panel:#1d1b16;--line:#33302a;--ok:#8fbf7f;--said:#c9a86a;--mech:#7fb0c9}
 body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}
 header{position:sticky;top:0;background:var(--panel);border-bottom:1px solid var(--line);padding:10px 16px;display:flex;gap:12px;align-items:center}
 .seg button{background:transparent;color:var(--dim);border:1px solid var(--line);padding:4px 10px;cursor:pointer;font:inherit}
 .seg button.on{color:var(--bg);background:var(--ink)}
 .grain{padding:14px 16px;border-bottom:1px solid var(--line)}
 .grain h2{margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--dim)}
 .card{background:var(--panel);border:1px solid var(--line);padding:10px 12px;white-space:pre-wrap;overflow:auto;max-height:44vh}
 .tag{cursor:pointer;border-bottom:1px dotted var(--said);color:var(--said)}
 .tag.m{color:var(--dim);border-color:var(--dim)}
 .src{margin-top:8px;border-left:2px solid var(--mech);padding-left:10px;color:var(--mech)}
 .gap{color:#c98a7f}
 .hide{display:none}
 .hint{color:var(--dim);font-size:12px}
</style></head><body>
<header>
 <b>layers</b><span class="hint">${esc(task)}${agent ? " · " + esc(agent) : ""} · turn ${L.turn ?? "?"}</span>
 <span class="seg" id="seg">
  <button data-g="said" class="on">as said</button>
  <button data-g="sourced">sourced</button>
  <button data-g="prompt">prompt</button>
  <button data-g="record">record</button>
 </span>
 <span class="hint">click a <span class="tag">[S#]</span> to pin that node to its source</span>
</header>
<div id="root"></div>
<script>
const L = ${seed};
const S = L.answer.sentences || [];
const tag = (s,i) => s.type === "grounded" ? '<span class="tag" data-ref="'+s.ref+'">[S'+(i+1)+' '+s.ref+']</span>'
  : s.type === "asserted" ? '<span class="tag" data-ref="'+s.ref+'">[S'+(i+1)+' '+s.ref+'·asserted]</span>'
  : '<span class="tag m">[M]</span>';
const answerHtml = S.length ? S.map((s,i)=>esc(s.text)+" "+tag(s,i)).join(" ") : esc(L.answer.text || "(no answer persisted)");
const promptHtml = L.prompt && L.prompt.body ? esc(L.prompt.body) : '<span class="gap">('+(L.prompt.gap||"empty")+') '+esc(L.prompt.note||"")+'</span>';
const projHtml = L.projection.gap ? '<span class="gap">('+esc(L.projection.gap)+') '+esc(L.projection.note)+'</span>' : esc(L.projection.note||"");
const recHtml = (L.record||[]).map(e=>esc(e.stage)+" · "+esc(e.standing)+" · "+esc(e.agent)+" "+(e.unit?("· "+esc(e.unit)):"")).join("\\n") || "(empty)";
const grains = {
  said:   [{t:"ask", h:esc(L.ask||"(none)")},{t:"answer", h:answerHtml}],
  sourced:[{t:"sources — resolve a tag", h:'<span class="hint">click any [S#] above; the verbatim bytes replace the sentence</span>'}],
  prompt: [{t:"the exact bytes the model was sent", h:promptHtml}],
  record: [{t:"the EOT chain", h:esc(recHtml)}],
};
const root = document.getElementById("root");
let grain = "said";
function render(){
  const parts = [{t:"L1 projection", h:projHtml}].concat(grains[grain]||[]);
  root.innerHTML = parts.map(g=>'<section class="grain"><h2>'+g.t+'</h2><div class="card">'+g.h+'</div></section>').join("");
  for (const el of root.querySelectorAll(".tag[data-ref]")) el.onclick = async () => {
    const r = await fetch("/v1/hooks/opencode",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({event:"snip",task:L.task,agent:L.agent,ref:el.dataset.ref})}).then(r=>r.json()).catch(()=>({ok:false}));
    const box = document.createElement("div"); box.className="src";
    box.textContent = r.ok ? (r.bytes||"") : ("("+(r.gap||"unresolved")+")");
    el.replaceWith(box);
  };
}
document.getElementById("seg").onclick = (e) => { const b=e.target.closest("button"); if(!b) return; grain=b.dataset.g; for(const x of e.currentTarget.children) x.classList.toggle("on",x===b); render(); };
render();
</script></body></html>`;
}
