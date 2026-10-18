// fold-matrix.mjs — the door's record, kept as an EODB event log in a Matrix room,
// so a machine that logs into the same Matrix account resumes with the same fold.
//
// Format (the eodb wire, see eodb/USE_ME.md §2): one private room per account is the
// base; every settled turn is appended as operators under the namespace
// `io.fold.opencode` — INS (session, turn), CON (turn → session), SEG (partition),
// EVA (settled / not). State is never stored: foldEvents() derives it, and pull()
// folds it back into record.jsonl on a machine that has not seen those turns.
//
// Sealing: plain REST has no Olm/Megolm, so payloads are sealed on the machine with
// AES-256-GCM under a key derived (scrypt) from the Matrix password + user id at
// login. The homeserver sees operator types, anchors and ciphertext, never an ask
// or an answer. The same login on any machine derives the same key; the password
// is never written to disk, only the derived key and the access token (mode 0600).
// A password change changes the key: run `login` again with the OLD password's key
// via FOLD_MATRIX_KEY, or accept that earlier events stay sealed.
//
// Fails open everywhere: with no session, no network or a bad answer, the door
// behaves exactly as before and the outbox keeps what has not been sent.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

export const NS = "io.fold.opencode";
export const OPS = { ins: 2, seg: 3, con: 4, def: 6, eva: 7 };
const HERE = path.dirname(fileURLToPath(import.meta.url));
const enc = encodeURIComponent;
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");

const paths = (state) => ({
  session: path.join(state, "matrix-session.json"),
  outbox: path.join(state, "matrix-outbox.jsonl"),
  record: path.join(state, "record.jsonl"),
});

// ── sealing ──────────────────────────────────────────────────────────────
export const deriveKey = (password, userId) =>
  crypto.scryptSync(String(password), "fold-eodb:" + userId, 32).toString("base64");

export function seal(key, obj) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", Buffer.from(key, "base64"), iv);
  const ct = Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final(), c.getAuthTag()]);
  return { __sealed: 1, n: iv.toString("base64"), c: ct.toString("base64") };
}

export function unseal(key, box) {
  if (!box || box.__sealed !== 1) return box ?? null;
  try {
    const raw = Buffer.from(box.c, "base64");
    const d = crypto.createDecipheriv("aes-256-gcm", Buffer.from(key, "base64"), Buffer.from(box.n, "base64"));
    d.setAuthTag(raw.subarray(raw.length - 16));
    return JSON.parse(Buffer.concat([d.update(raw.subarray(0, raw.length - 16)), d.final()]).toString("utf8"));
  } catch { return null; } // wrong key or tampered: skipped, never thrown
}

// ── the operators for one finished turn ──────────────────────────────────
// Anchors are content-addressed, so the same turn from two machines is one entity.
export const sessionAnchor = (sessionID) => "session_" + sha(String(sessionID)).slice(0, 16);
export const turnAnchor = (row) => "turn_" + sha([row.sessionID, row.when, row.address].join("\0")).slice(0, 16);

export function operatorsFor(row) {
  const t = turnAnchor(row), s = sessionAnchor(row.sessionID);
  return [
    { op: "ins", anchor: s, content: { anchor: s, entity_type: "session", payload: { sessionID: row.sessionID } } },
    { op: "ins", anchor: t, content: { anchor: t, entity_type: "turn", payload: row } },
    { op: "con", anchor: t, content: { source_anchor: t, target_anchor: s, relation_type: "in_session" } },
    { op: "seg", anchor: t, content: { anchor: t, partition: row.settled ? "settled" : "open" } },
    { op: "eva", anchor: t, content: { anchor: t, criterion: "settled", result: row.settled ? "pass" : "fail", note: row.title ?? "" } },
  ];
}

// ── the fold ─────────────────────────────────────────────────────────────
// events: [{ type, content, origin_server_ts }] already unsealed. Permissive, like
// eodb's fold: unknown or out-of-order operators are recorded in _violations.
export function foldEvents(events) {
  const st = { entities: {}, connections: [], partitions: {}, _violations: [] };
  const sorted = [...events].sort((a, b) => (a.origin_server_ts ?? 0) - (b.origin_server_ts ?? 0));
  for (const e of sorted) {
    const op = String(e.type).startsWith(NS + ".") ? String(e.type).slice(NS.length + 1) : null;
    const c = e.content;
    if (!op || !c) continue;
    if (op === "ins") st.entities[c.anchor] ??= { _type: c.entity_type, ...c.payload };
    else if (!st.entities[c.anchor ?? c.source_anchor]) st._violations.push({ op, anchor: c.anchor ?? c.source_anchor, why: "missing_ins" });
    else if (op === "seg") st.partitions[c.anchor] = c.partition;
    else if (op === "con") st.connections.push({ from: c.source_anchor, to: c.target_anchor, rel: c.relation_type });
    else if (op === "eva") st.entities[c.anchor]._eva = { ...(st.entities[c.anchor]._eva ?? {}), [c.criterion]: c.result };
    else if (op === "def") st.entities[c.anchor][c.path] = c.value;
  }
  return st;
}

// ── the crossing: plain Matrix client-server REST ───────────────────────
export function connect({ state, fetchImpl = (...a) => globalThis.fetch(...a) }) {
  const p = paths(state);
  const readSession = () => { try { return JSON.parse(fs.readFileSync(p.session, "utf8")); } catch { return null; } };
  const writeSession = (s) => {
    fs.mkdirSync(state, { recursive: true });
    fs.writeFileSync(p.session, JSON.stringify(s, null, 2) + "\n", { mode: 0o600 });
    fs.chmodSync(p.session, 0o600);
  };

  async function api(sess, method, route, body) {
    const r = await fetchImpl(sess.base.replace(/\/+$/, "") + "/_matrix/client/v3" + route, {
      method,
      headers: { ...(sess.token ? { authorization: "Bearer " + sess.token } : {}), ...(body !== undefined ? { "content-type": "application/json" } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    let j = {}; try { j = await r.json(); } catch { /* empty body */ }
    return { status: r.status, ok: r.ok, j };
  }

  // Log in with the Matrix account's password; derive the sealing key; keep neither password nor plaintext.
  async function login({ base, user, password }) {
    const r = await api({ base }, "POST", "/login", {
      type: "m.login.password", identifier: { type: "m.id.user", user }, password: String(password),
      initial_device_display_name: "openfold (" + (process.env.HOSTNAME || "machine") + ")",
    });
    if (!r.ok) return { ok: false, gap: "login-" + r.status, why: r.j.error ?? "login failed" };
    const sess = { base, userId: r.j.user_id, deviceId: r.j.device_id, token: r.j.access_token, key: deriveKey(password, r.j.user_id) };
    writeSession(sess);
    const room = await ensureRoom(sess);
    return room.ok ? { ok: true, userId: sess.userId, roomId: room.roomId } : room;
  }

  // The base: one room per account, found by alias on any machine, created on the first.
  async function ensureRoom(sess) {
    if (sess.roomId) return { ok: true, roomId: sess.roomId };
    const local = "fold-opencode-" + sess.userId.slice(1).split(":")[0].replace(/[^a-z0-9._=-]/gi, "_").toLowerCase();
    const server = sess.userId.split(":").slice(1).join(":");
    const alias = `#${local}:${server}`;
    let r = await api(sess, "GET", `/directory/room/${enc(alias)}`);
    let roomId = r.ok ? r.j.room_id : null;
    if (roomId) { const j = await api(sess, "POST", `/join/${enc(roomId)}`, {}); if (!j.ok) return { ok: false, gap: "join-" + j.status, why: j.j.error }; }
    else {
      r = await api(sess, "POST", "/createRoom", {
        name: "opencode fold record", room_alias_name: local, preset: "private_chat", visibility: "private",
        creation_content: { type: "io.fold.opencode.workspace" },
        initial_state: [{ type: NS + ".meta", state_key: "", content: { namespace: NS, v: 1 } }],
      });
      if (!r.ok) return { ok: false, gap: "create-" + r.status, why: r.j.error };
      roomId = r.j.room_id;
    }
    writeSession({ ...sess, roomId });
    return { ok: true, roomId };
  }

  // ── outbox: nothing is lost when the network is away ──
  const queued = () => { try { return fs.readFileSync(p.outbox, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } };
  const setQueue = (rows) => { fs.mkdirSync(state, { recursive: true }); fs.writeFileSync(p.outbox, rows.map((r) => JSON.stringify(r) + "\n").join("")); };

  function enqueue(row) {
    if (!readSession()) return false; // not logged in: the door is simply local
    fs.mkdirSync(state, { recursive: true });
    fs.appendFileSync(p.outbox, JSON.stringify({ row }) + "\n");
    return true;
  }

  async function push() {
    const sess = readSession();
    if (!sess) return { ok: false, gap: "no-session", sent: 0 };
    const room = await ensureRoom(sess);
    if (!room.ok) return { ...room, sent: 0 };
    const rest = []; let sent = 0, failed = null;
    for (const item of queued()) {
      if (failed) { rest.push(item); continue; }
      for (const o of operatorsFor(item.row)) {
        // txn id from the operator + anchor: a retry or a second machine's copy is the same event.
        const txn = sha(JSON.stringify(o)).slice(0, 24);
        let r;
        try { r = await api({ ...sess }, "PUT", `/rooms/${enc(room.roomId)}/send/${enc(NS + "." + o.op)}/${txn}`, { ...seal(sess.key, o.content), anchor: o.anchor, v: 1 }); }
        catch { r = { ok: false, status: 0 }; }
        if (!r.ok) { failed = { gap: "send-" + r.status }; break; }
      }
      if (failed) rest.push(item); else sent++;
    }
    setQueue(rest);
    return { ok: !failed, sent, pending: rest.length, ...(failed ?? {}) };
  }

  // ── resume: read the log back, fold it, add the turns this machine lacks ──
  async function pull() {
    const sess = readSession();
    if (!sess) return { ok: false, gap: "no-session" };
    const room = await ensureRoom(sess);
    if (!room.ok) return room;
    const events = []; let from = "";
    for (let page = 0; page < 500; page++) {
      const r = await api(sess, "GET", `/rooms/${enc(room.roomId)}/messages?dir=f&limit=200${from ? "&from=" + enc(from) : ""}`);
      if (!r.ok) return { ok: false, gap: "messages-" + r.status, why: r.j.error };
      for (const e of r.j.chunk ?? []) if (String(e.type).startsWith(NS + ".")) {
        const content = unseal(sess.key, e.content);
        if (content) events.push({ type: e.type, content, origin_server_ts: e.origin_server_ts });
      }
      if (!r.j.end || r.j.end === from || !(r.j.chunk ?? []).length) break;
      from = r.j.end;
    }
    const folded = foldEvents(events);
    const have = new Set();
    try { for (const l of fs.readFileSync(p.record, "utf8").split("\n").filter(Boolean)) { try { have.add(turnAnchor(JSON.parse(l))); } catch { /* skip */ } } } catch { /* none yet */ }
    const add = [];
    for (const [anchor, e] of Object.entries(folded.entities)) {
      if (e._type !== "turn" || have.has(anchor)) continue;
      const { _type, _eva, ...row } = e;
      add.push(row);
    }
    add.sort((a, b) => String(a.when).localeCompare(String(b.when)));
    if (add.length) { fs.mkdirSync(state, { recursive: true }); fs.appendFileSync(p.record, add.map((r) => JSON.stringify(r) + "\n").join("")); }
    return { ok: true, events: events.length, added: add.length, sessions: Object.values(folded.entities).filter((e) => e._type === "session").length, violations: folded._violations.length };
  }

  const status = () => { const s = readSession(); return { loggedIn: !!s, userId: s?.userId ?? null, roomId: s?.roomId ?? null, pending: queued().length }; };
  const logout = () => { try { fs.rmSync(p.session); } catch { /* none */ } return { ok: true }; };

  return { login, push, pull, enqueue, status, logout, foldEvents };
}

// ── CLI: node fold-matrix.mjs login <homeserver> <user> | pull | push | status | logout ──
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const state = process.env.FOLD_OPENCODE_STATE ?? path.join(HERE, "state", "opencode");
  const m = connect({ state });
  const [cmd, a, b] = process.argv.slice(2);
  const out = cmd === "login" ? await m.login({ base: a, user: b, password: process.env.FOLD_MATRIX_PASSWORD ?? "" })
    : cmd === "pull" ? await m.pull() : cmd === "push" ? await m.push() : cmd === "logout" ? m.logout() : m.status();
  console.log(JSON.stringify(out, null, 2));
  process.exit(out.ok === false ? 1 : 0);
}
