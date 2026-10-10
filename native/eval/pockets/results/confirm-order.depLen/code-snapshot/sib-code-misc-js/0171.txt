// handlers.mjs — the mountable door for the fold's composition root. This is
// what the fold's `locateOrgan` looks for (organ.mjs / handlers.mjs /
// src/handlers.mjs / index.mjs) so penelope can run IN-PROC inside a fold.
//
// It claims exactly ONE path — POST /v1/agenda/conduct — and everything else
// falls through (returns false) so the fold's route table owns the rest. The
// conduct is penelope's own generation (organs/agenda-conduct.mjs): the ladder
// hands it a purpose, and the code pipeline / weave run. A purpose that fails
// to parse is a typed 400, never a silent draw; a conduct that throws is a 200
// `ok:false` with the wall named — the ladder treats a held void as a result,
// not a crash.
//
// `run` may be injected (tests) so the door is verifiable without a model; the
// default is the real generation.

import { createAgendaConduct } from "./organs/agenda-conduct.mjs";

export const HANDLER_SCHEMA = "PenelopeHandlers@1";

function sendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(text), "cache-control": "no-store" });
  res.end(text);
}

export async function createPenelopeHandlers({ run, log = () => {} } = {}) {
  const conduct = createAgendaConduct({ run });

  async function handle(req, res) {
    if (!req?.url) return false;
    const url = new URL(req.url, "http://fold.invalid");
    const method = req.method ?? "GET";
    if (url.pathname !== "/v1/agenda/conduct") return false;
    if (method === "OPTIONS") { res.writeHead(204, { "allow": "POST, OPTIONS" }); res.end(); return true; }
    if (method !== "POST") { sendJson(res, 405, { error: "POST only" }); return true; }

    let body = "";
    for await (const chunk of req) body += String(chunk ?? "");
    let purpose = {};
    try { purpose = JSON.parse(body || "{}")?.purpose ?? {}; } catch { sendJson(res, 400, { ok: false, detail: "a JSON body with a `purpose` object is required" }); return true; }

    try {
      const outcome = await conduct(purpose);
      sendJson(res, 200, { ok: outcome.ok, detail: outcome.detail ?? null, evidence: outcome.evidence ?? null, rule: outcome.rule ?? null, pathos: outcome.pathos ?? [] });
      return true;
    } catch (e) {
      log(`agenda/conduct failed: ${String(e?.message ?? e).slice(0, 200)}`);
      sendJson(res, 200, { ok: false, detail: `the conduct threw: ${String(e?.message ?? e).slice(0, 200)}`, evidence: null });
      return true;
    }
  }

  return {
    schema: HANDLER_SCHEMA,
    name: "penelope",
    handle,
    status: () => ({ schema: "PenelopeStatus@1", lane: "agenda-conduct", generation: "code|prose" }),
    async close() {},
  };
}

export default { HANDLER_SCHEMA, createPenelopeHandlers };