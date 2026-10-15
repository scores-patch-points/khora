import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { connect } from "../fold-gdrive.mjs";

function fakeGoogle() {
  const files = new Map(); let approved = false, n = 0;
  const j = (s, b) => ({ ok: s < 400, status: s, json: async () => b });
  const fetchImpl = async (url, o = {}) => {
    const u = new URL(url);
    if (u.pathname === "/device/code") return j(200, { device_code: "dc", user_code: "ABCD-1234", verification_url: "https://google.com/device", expires_in: 600 });
    if (u.pathname === "/token") {
      const p = new URLSearchParams(o.body);
      if (p.get("grant_type").includes("device_code")) return approved ? j(200, { refresh_token: "rt" }) : j(428, { error: "authorization_pending" });
      return p.get("refresh_token") === "rt" ? j(200, { access_token: "at" }) : j(400, {});
    }
    if (o.headers?.authorization !== "Bearer at") return j(401, {});
    if (u.pathname === "/drive/v3/files" && (o.method ?? "GET") === "GET") {
      const q = u.searchParams.get("q"); const m = q && q.match(/name='(.*)'/);
      return j(200, { files: [...files].filter(([, v]) => !m || v.name === m[1]).map(([id, v]) => ({ id, name: v.name })) });
    }
    if (u.pathname.startsWith("/upload/drive/v3/files")) {
      const body = o.body.split("\r\n"); const meta = JSON.parse(body[3]), data = JSON.parse(body[7]);
      const id = u.pathname.split("/")[5] || "f" + n++; files.set(id, { name: meta.name ?? files.get(id).name, data }); return j(200, { id });
    }
    if (u.searchParams.get("alt") === "media") return j(200, files.get(u.pathname.split("/").pop()).data);
    return j(404, {});
  };
  return { fetchImpl, files, approve: () => { approved = true; } };
}
const dir = () => fs.mkdtempSync(path.join(os.tmpdir(), "fg-"));
const env = { FOLD_GDRIVE_CLIENT_ID: "cid", FOLD_GDRIVE_CLIENT_SECRET: "cs", FOLD_SYNC_PASSPHRASE: "pp" };
const row = { when: "2026-10-15T10:01:00.000Z", sessionID: "s", address: "a", ask: "secret ask", settled: true, kind: "instance" };

test("without a client id the drive answers a gap, never a guess", async () => {
  const d = connect({ state: dir(), env: {}, fetchImpl: async () => { throw new Error("no network expected"); } });
  assert.equal((await d.login()).gap, "no-client-id");
});

test("device login, sealed upload, and resume on a second machine", async () => {
  const g = fakeGoogle(), A = dir(), B = dir();
  const a = connect({ state: A, env, fetchImpl: g.fetchImpl });
  const s = await a.login();
  assert.equal(s.user_code, "ABCD-1234");
  assert.equal((await a.login()).note, "not approved yet");
  g.approve();
  assert.equal((await a.login()).loggedIn, true);
  assert.equal(fs.statSync(path.join(A, "gdrive-session.json")).mode & 0o777, 0o600);
  assert.ok(a.enqueue(row));
  assert.equal((await a.push()).sent, 1);
  assert.ok(!JSON.stringify([...g.files.values()]).includes("secret ask"));
  await a.enqueue(row); await a.push();
  assert.equal(g.files.size, 1, "a re-push replaces the file");

  fs.copyFileSync(path.join(A, "gdrive-session.json"), (fs.mkdirSync(B, { recursive: true }), path.join(B, "gdrive-session.json")));
  const b = connect({ state: B, env, fetchImpl: g.fetchImpl });
  const got = await b.pull();
  assert.equal(got.added, 1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(B, "record.jsonl"), "utf8")).ask, "secret ask");
  assert.equal((await b.pull()).added, 0);
});
