// fold-gdrive.mjs — the same sealed EODB record as fold-matrix.mjs, kept in the user's
// Google Drive hidden app folder (scope drive.appdata: this app can see only its own
// files, never the rest of the Drive). Login is Google's device flow: the door shows a
// code and a URL, the user approves in any browser, no password ever reaches the door.
//
// Needs an OAuth client of type "TVs and Limited Input devices" from the user's own
// Google Cloud project: FOLD_GDRIVE_CLIENT_ID (+ FOLD_GDRIVE_CLIENT_SECRET, which Google
// issues for that type). Nothing is bundled; with neither set, every call answers a gap.
//
// Sealing key: FOLD_SYNC_PASSPHRASE if set, else the key the Matrix login derived, so
// one passphrase/login opens both places. Files are one sealed JSON per turn
// (`turn_<anchor>.json`, id-idempotent: a re-push replaces, never duplicates).
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { seal, unseal, deriveKey, operatorsFor, turnAnchor, foldEvents, NS } from "./fold-matrix.mjs";

const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const enc = encodeURIComponent;

export function connect({ state, fetchImpl = (...a) => globalThis.fetch(...a), env = process.env }) {
  const f = (n) => path.join(state, n);
  const read = (n) => { try { return JSON.parse(fs.readFileSync(f(n), "utf8")); } catch { return null; } };
  const write = (n, v) => { fs.mkdirSync(state, { recursive: true }); fs.writeFileSync(f(n), JSON.stringify(v, null, 2) + "\n", { mode: 0o600 }); fs.chmodSync(f(n), 0o600); };
  const queued = () => { try { return fs.readFileSync(f("gdrive-outbox.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } };
  const setQueue = (rows) => { fs.mkdirSync(state, { recursive: true }); fs.writeFileSync(f("gdrive-outbox.jsonl"), rows.map((r) => JSON.stringify(r) + "\n").join("")); };
  const form = (o) => new URLSearchParams(o).toString();
  const post = async (url, body) => { const r = await fetchImpl(url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: form(body), signal: AbortSignal.timeout(15000) }); let j = {}; try { j = await r.json(); } catch { /* empty */ } return { ok: r.ok, status: r.status, j }; };
  const sealKey = () => (env.FOLD_SYNC_PASSPHRASE ? deriveKey(env.FOLD_SYNC_PASSPHRASE, "fold-drive") : (read("matrix-session.json")?.key ?? null));
  const client = () => (env.FOLD_GDRIVE_CLIENT_ID ? { id: env.FOLD_GDRIVE_CLIENT_ID, secret: env.FOLD_GDRIVE_CLIENT_SECRET ?? "" } : null);

  // Step 1: ask Google for a code. Step 2 (poll): exchange once the user approved.
  async function loginStart() {
    const c = client(); if (!c) return { ok: false, gap: "no-client-id", why: "set FOLD_GDRIVE_CLIENT_ID (OAuth client type: TVs and Limited Input devices)" };
    const r = await post("https://oauth2.googleapis.com/device/code", { client_id: c.id, scope: SCOPE });
    if (!r.ok) return { ok: false, gap: "device-" + r.status, why: r.j.error_description ?? r.j.error };
    write("gdrive-pending.json", { device_code: r.j.device_code, interval: r.j.interval ?? 5, until: Date.now() + (r.j.expires_in ?? 600) * 1000 });
    return { ok: true, pending: true, user_code: r.j.user_code, verification_url: r.j.verification_url, note: "approve in a browser, then run login again" };
  }
  async function loginFinish() {
    const c = client(), p = read("gdrive-pending.json");
    if (!c || !p) return loginStart();
    if (Date.now() > p.until) { try { fs.rmSync(f("gdrive-pending.json")); } catch { /* gone */ } return loginStart(); }
    const r = await post("https://oauth2.googleapis.com/token", { client_id: c.id, client_secret: c.secret, device_code: p.device_code, grant_type: "urn:ietf:params:oauth:grant-type:device_code" });
    if (r.j.error === "authorization_pending" || r.j.error === "slow_down") return { ok: true, pending: true, note: "not approved yet" };
    if (!r.ok || !r.j.refresh_token) return { ok: false, gap: "token-" + r.status, why: r.j.error_description ?? r.j.error };
    write("gdrive-session.json", { refresh_token: r.j.refresh_token });
    try { fs.rmSync(f("gdrive-pending.json")); } catch { /* gone */ }
    return { ok: true, loggedIn: true };
  }
  const login = () => loginFinish();

  async function token() {
    const c = client(), s = read("gdrive-session.json");
    if (!c || !s) return null;
    const r = await post("https://oauth2.googleapis.com/token", { client_id: c.id, client_secret: c.secret, refresh_token: s.refresh_token, grant_type: "refresh_token" });
    return r.ok ? r.j.access_token : null;
  }
  const dapi = async (tok, method, url, body, headers = {}) => {
    const r = await fetchImpl(url, { method, headers: { authorization: "Bearer " + tok, ...headers }, body, signal: AbortSignal.timeout(20000) });
    let j = {}; try { j = await r.json(); } catch { /* empty */ }
    return { ok: r.ok, status: r.status, j };
  };
  const find = async (tok, name) => (await dapi(tok, "GET", `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name)&q=${enc(`name='${name}'`)}`)).j.files?.[0]?.id;

  function enqueue(row) { if (!read("gdrive-session.json")) return false; fs.mkdirSync(state, { recursive: true }); fs.appendFileSync(f("gdrive-outbox.jsonl"), JSON.stringify({ row }) + "\n"); return true; }

  async function push() {
    const key = sealKey(), tok = await token();
    if (!tok) return { ok: false, gap: "no-session", sent: 0 };
    if (!key) return { ok: false, gap: "no-key", why: "set FOLD_SYNC_PASSPHRASE (or log in to Matrix first)", sent: 0 };
    const rest = []; let sent = 0, bad = null;
    for (const item of queued()) {
      if (bad) { rest.push(item); continue; }
      const name = `turn_${turnAnchor(item.row)}.json`;
      const body = JSON.stringify({ v: 1, anchor: turnAnchor(item.row), ops: operatorsFor(item.row).map((o) => ({ op: o.op, ...seal(key, o.content), anchor: o.anchor })), ts: Date.parse(item.row.when) || Date.now() });
      const id = await find(tok, name);
      const meta = JSON.stringify(id ? { name } : { name, parents: ["appDataFolder"] });
      const b = "fold" + Math.random().toString(36).slice(2);
      const multipart = `--${b}\r\ncontent-type: application/json\r\n\r\n${meta}\r\n--${b}\r\ncontent-type: application/json\r\n\r\n${body}\r\n--${b}--`;
      const url = id ? `https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=multipart` : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
      const r = await dapi(tok, id ? "PATCH" : "POST", url, multipart, { "content-type": `multipart/related; boundary=${b}` });
      if (!r.ok) { bad = { gap: "upload-" + r.status }; rest.push(item); } else sent++;
    }
    setQueue(rest);
    return { ok: !bad, sent, pending: rest.length, ...(bad ?? {}) };
  }

  async function pull() {
    const key = sealKey(), tok = await token();
    if (!tok) return { ok: false, gap: "no-session" };
    if (!key) return { ok: false, gap: "no-key" };
    const list = await dapi(tok, "GET", "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&pageSize=1000&fields=files(id,name)");
    if (!list.ok) return { ok: false, gap: "list-" + list.status };
    const events = [];
    for (const file of list.j.files ?? []) {
      if (!/^turn_.*\.json$/.test(file.name)) continue;
      const g = await dapi(tok, "GET", `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`);
      if (!g.ok || !Array.isArray(g.j.ops)) continue;
      g.j.ops.forEach((o, i) => { const content = unseal(key, o); if (content) events.push({ type: `${NS}.${o.op}`, content, origin_server_ts: (g.j.ts ?? 0) + i }); });
    }
    const folded = foldEvents(events);
    const have = new Set();
    try { for (const l of fs.readFileSync(f("record.jsonl"), "utf8").split("\n").filter(Boolean)) { try { have.add(turnAnchor(JSON.parse(l))); } catch { /* skip */ } } } catch { /* none */ }
    const add = Object.entries(folded.entities).filter(([a, e]) => e._type === "turn" && !have.has(a)).map(([, e]) => { const { _type, _eva, ...row } = e; return row; }).sort((a, b) => String(a.when).localeCompare(String(b.when)));
    if (add.length) fs.appendFileSync(f("record.jsonl"), add.map((r) => JSON.stringify(r) + "\n").join(""));
    return { ok: true, events: events.length, added: add.length };
  }

  const status = () => ({ loggedIn: !!read("gdrive-session.json"), clientConfigured: !!client(), keyAvailable: !!sealKey(), pending: queued().length });
  const logout = () => { for (const n of ["gdrive-session.json", "gdrive-pending.json"]) { try { fs.rmSync(f(n)); } catch { /* none */ } } return { ok: true }; };
  return { login, push, pull, enqueue, status, logout };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const state = process.env.FOLD_OPENCODE_STATE ?? path.join(path.dirname(new URL(import.meta.url).pathname), "state", "opencode");
  const m = connect({ state });
  const cmd = process.argv[2];
  const out = cmd === "login" ? await m.login() : cmd === "pull" ? await m.pull() : cmd === "push" ? await m.push() : cmd === "logout" ? m.logout() : m.status();
  console.log(JSON.stringify(out, null, 2));
  process.exit(out.ok === false ? 1 : 0);
}
