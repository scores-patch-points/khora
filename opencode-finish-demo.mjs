// opencode-finish-demo.mjs — a local browser demo of THE MECHANICAL STEP.
// `node opencode-finish-demo.mjs [port]` serves a page that runs the REAL
// opencode-finish.mjs over your material + a model's draft and renders the
// ground trace: per sentence, MATERIAL (with the byte ref it rests on) or
// SELF:MODEL (the mouth's own). No model runs; the typing is the holograph
// organ's, paraphrase-invariant (ends through the fold).
import http from "node:http";
import { finish } from "./opencode-finish.mjs";

const PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>the fold — show the ground</title>
<style>
  :root{color-scheme:dark}
  body{font:15px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;background:#0e0f12;color:#e8e8ea;margin:0;padding:28px;max-width:1100px}
  h1{font-size:16px;font-weight:600;letter-spacing:.02em;margin:0 0 4px}
  .sub{color:#8b8f98;margin:0 0 20px;font-size:13px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  label{display:block;font-size:12px;color:#9aa0aa;margin:0 0 6px}
  textarea{width:100%;box-sizing:border-box;background:#15171c;color:#e8e8ea;border:1px solid #2a2d34;border-radius:8px;padding:10px;font:13px/1.5 ui-monospace,Menlo,monospace;resize:vertical}
  button{margin-top:14px;background:#3b6ef0;color:#fff;border:0;border-radius:8px;padding:9px 16px;font:600 13px ui-monospace,Menlo,monospace;cursor:pointer}
  button:disabled{opacity:.5;cursor:default}
  #out{margin-top:24px}
  .sent{border-left:3px solid #2a2d34;padding:8px 12px;margin:8px 0;border-radius:0 6px 6px 0;background:#14161b}
  .sent.material{border-color:#3ddc97}
  .sent.model{border-color:#e0a34a}
  .tag{font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#8b8f98}
  .ref{color:#7fd0ff;font-size:12px}
  .carry{color:#8b8f98;font-size:11px}
  .meta{color:#8b8f98;font-size:12px;margin:6px 0 18px;white-space:pre-wrap}
  .pill{display:inline-block;font-size:11px;padding:2px 7px;border-radius:99px;margin-right:6px}
  .pill.material{background:#12351f;color:#7ff0b0}
  .pill.model{background:#3a2a12;color:#f0c98a}
</style></head>
<body>
  <h1>the fold · the mechanical step — show the ground</h1>
  <p class="sub">The model's text is one step. Its sentences are typed against the material's ground — MATERIAL (rests on a fact, with its address) or SELF:MODEL (the mouth's own). No model runs here.</p>
  <div class="grid">
    <div><label>material (the ground — the holograph is built from this)</label><textarea id="material" rows="7">Marie Curie discovered radium in 1898. She won the Nobel Prize. Radium is a radioactive element.</textarea></div>
    <div><label>model output (the draw — one step)</label><textarea id="draft" rows="7">Curie discovered radium. She won a Nobel Prize. The element radium glows in the dark.</textarea></div>
  </div>
  <button id="run">show the ground</button>
  <div id="out"></div>
<script>
const $ = (id) => document.getElementById(id);
async function run() {
  $("run").disabled = true;
  $("out").innerHTML = "<p class='sub'>reading…</p>";
  try {
    const r = await fetch("/api/finish", { method:"POST", headers:{"content-type":"application/json"},
      body: JSON.stringify({ ask:"write a note about the ruling", material:$("material").value, draft:$("draft").value }) });
    render(await r.json());
  } catch (e) { $("out").innerHTML = "<p class='sub'>"+String(e)+"</p>"; }
  $("run").disabled = false;
}
function render(r) {
  if (!r || !r.ok) { $("out").innerHTML = "<p class='sub'>"+(r&&r.gap||"no result")+"</p>"; return; }
  const t = r.grounded || [];
  const nG = t.filter(s=>s.standing==="grounded").length, nS = t.length - nG;
  let html = "<div class='meta'><span class='pill material'>"+nG+" grounded</span><span class='pill model'>"+nS+" self:model</span>  lane="+r.lane+" · eot records="+r.eot+"\\n"+r.disclosure+"</div>";
  html += "<div class='sub'>the mechanically grounded output — the model's text is one step:</div>";
  for (const s of t) {
    const cls = s.standing==="grounded" ? "material":"model";
    const ground = s.standing==="grounded"
      ? (s.beings && s.beings.length ? "↳ resolved to the being “"+escape(s.beings.join(", "))+"”" : "")
        + (s.ref ? " · rests on "+escape(s.ref)+(s.fact?" — “"+escape(s.fact)+"”":"") : "")
      : "↳ the mouth's own — no being or fact grounds it";
    html += "<div class='sent "+cls+"'><div class='tag'>"+s.standing+"</div><div>"+escape(s.text)+"</div><div class='"+(s.standing==="grounded"?"ref":"carry")+"'>"+ground+"</div></div>";
  }
  $("out").innerHTML = html;
}
const escape = (s)=>String(s).replace(/[&<>]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
$("run").onclick = run;
</script>
</body></html>`;

const port = Number(process.argv[2]) || 8161;
http
  .createServer(async (req, res) => {
    if (req.method === "GET") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(PAGE);
      return;
    }
    if (req.method === "POST" && req.url === "/api/finish") {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      let body = {};
      try { body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch {}
      let out = {};
      try { out = await finish({ ask: String(body.ask ?? "write a note"), draft: String(body.draft ?? ""), material: String(body.material ?? "") }); }
      catch (e) { out = { ok: false, gap: String(e?.message ?? e) }; }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(out));
      return;
    }
    res.writeHead(404); res.end();
  })
  .listen(port, "127.0.0.1", () => console.error(`finish demo on http://127.0.0.1:${port}`));
