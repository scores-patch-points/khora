// pharos-gate.test.mjs — khora WORKS ONLY IF IT FLOWS THROUGH PHAROS (2026-11-18). The rules are held in pharos; khora carries holon.json and refuses when the gate fails.
// Needs a pharos checkout that has lib/gate.mjs (PHAROS_HOME, or one beside this repo); the tests that need it SKIP with a named reason when there is none. Needs the priors for the "may read" test.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { spawnSync } from "node:child_process";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PH = [process.env.PHAROS_HOME, path.join(ROOT, "..", "pharos")].filter(Boolean).map((p) => path.resolve(p)).find((p) => fs.existsSync(path.join(p, "lib", "gate.mjs")));
const PRI = process.env.KHORA_PRIORS_DIR ?? path.join(os.homedir(), "Documents", "janus", "priors"); const HAVE_PRI = fs.existsSync(path.join(PRI, "pos-eng.json"));
const EN = "Anna walked to the market on Monday. Anna bought bread and apples there. She carried them home along the river. Boris met Anna at the gate. He asked Anna about the market. Anna told him the bread was good.".repeat(2);
const probe = (env, body) => { const code = `import { readToWeft } from ${JSON.stringify(path.join(ROOT, "native/the-fold/read-process.mjs"))}; import { readDocument } from ${JSON.stringify(path.join(ROOT, "native/reading.js"))}; const T=${JSON.stringify(EN)}; const out={}; ${body}; console.log(JSON.stringify(out));`;
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", code], { env: { ...process.env, KHORA_NO_PHAROS_GATE: "", ...env }, encoding: "utf8", timeout: 580000, cwd: ROOT }); const last = r.stdout.trim().split("\n").pop(); try { return JSON.parse(last); } catch { return { crash: r.stderr.slice(0, 400) }; } };
const BOTH = `try { readToWeft(T, { language: "eng" }); out.toWeft = "read"; } catch (e) { out.toWeft = e.message; } try { await readDocument(T, { language: "eng", lexicon: false }); out.doc = "read"; } catch (e) { out.doc = e.message; }`;

test("holon.json declares the one door, what it needs, and acknowledges pharos' current rules", { skip: !PH && "no pharos checkout with lib/gate.mjs (PHAROS_HOME)" }, async () => {
  const { gate } = await import(path.join(PH, "lib", "gate.mjs")); const chatterDir = fs.mkdtempSync(path.join(os.tmpdir(), "khora-ch-"));
  const r = gate(ROOT, { chatter: false, chatterDir, pharosDir: fs.mkdtempSync(path.join(os.tmpdir(), "khora-log-")) });
  // the priors need may fail on a machine without them: that is the PRIMED rule working, not a defect of this file
  assert.deepEqual(r.failures.filter((f) => f.rule !== "PRIMED"), [], "ONE-DOOR and RULES-CURRENT hold for khora's holon.json");
});

test("no pharos: BOTH front doors refuse, name where they looked and the clone command", () => {
  const out = probe({ PHAROS_HOME: path.join(os.tmpdir(), "no-such-pharos") }, BOTH);
  for (const k of ["toWeft", "doc"]) { assert.match(out[k], /khora refused: pharos was not found/, k); assert.match(out[k], /no-such-pharos/, `${k} names where it looked`); assert.match(out[k], /gh repo clone scores-patch-points\/pharos/, `${k} names the clone command`); }
});

test("a stale acknowledgement of the rules: both doors refuse by name, and pharos is left a chatter line", { skip: !PH && "no pharos" }, () => {
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), "pharos-copy-")); fs.cpSync(PH, copy, { recursive: true, filter: (s) => !s.includes(`${path.sep}.git${path.sep}`) && !s.endsWith(`${path.sep}.git`) });
  const rf = path.join(copy, "rules", "rules.json"); fs.writeFileSync(rf, fs.readFileSync(rf, "utf8").replace("ONE-DOOR", "ONE-DOOR "));   // pharos changed a rule; khora has not acknowledged it
  const chatter = fs.mkdtempSync(path.join(os.tmpdir(), "khora-chatter-"));
  const out = probe({ PHAROS_HOME: copy, PHAROS_CHATTER: chatter }, BOTH);
  for (const k of ["toWeft", "doc"]) { assert.match(out[k], /refused by pharos' gate \(.*RULES-CURRENT/, k); assert.match(out[k], /pharos ack/, `${k} says how to re-acknowledge`); }
  const lines = fs.readdirSync(chatter).flatMap((f) => fs.readFileSync(path.join(chatter, f), "utf8").trim().split("\n")).map((l) => JSON.parse(l));
  assert.ok(lines.some((l) => l.what === "gate_refused" && l.where === "khora" && l.detail.rules.includes("RULES-CURRENT")), "the refusal left a chatter line");
});

test("a missing need (no priors) is refused BY PHAROS' gate, naming the need and where it looked", { skip: !PH && "no pharos" }, () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "khora-nopri-"));
  const out = probe({ PHAROS_HOME: PH, KHORA_PRIORS_DIR: empty, PHAROS_CHATTER: fs.mkdtempSync(path.join(os.tmpdir(), "khora-chatter-")) }, BOTH);
  for (const k of ["toWeft", "doc"]) { assert.match(out[k], /PRIMED/, k); assert.match(out[k], /the English priors/, k); assert.ok(out[k].includes(empty), `${k} names where it looked`); }
});

test("with pharos found and the rules acknowledged, both doors read", { skip: (!PH && "no pharos") || (!HAVE_PRI && "no priors") }, () => {
  const out = probe({ PHAROS_HOME: PH, KHORA_PRIORS_DIR: PRI, PHAROS_CHATTER: fs.mkdtempSync(path.join(os.tmpdir(), "khora-chatter-")) }, BOTH);
  assert.deepEqual(out, { toWeft: "read", doc: "read" }, JSON.stringify(out));
});

test("the off switch is explicit (KHORA_NO_PHAROS_GATE=1) and is the only way to read without pharos", () => {
  const out = probe({ PHAROS_HOME: path.join(os.tmpdir(), "no-such-pharos"), KHORA_NO_PHAROS_GATE: "1", KHORA_PRIORS_DIR: HAVE_PRI ? PRI : "" }, BOTH);
  if (HAVE_PRI) assert.deepEqual(out, { toWeft: "read", doc: "read" }); else assert.ok(!/pharos was not found/.test(out.toWeft ?? ""), "the pharos gate did not fire");
});

const acts = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".jsonl")).flatMap((f) => fs.readFileSync(path.join(dir, f), "utf8").trim().split("\n")).map((l) => JSON.parse(l)).filter((e) => e.kind === "act") : [];
const tmpd = (n) => fs.mkdtempSync(path.join(os.tmpdir(), n));
const READY = { skip: (!PH && "no pharos") || (!HAVE_PRI && "no priors") };

test("WRITES-TO-PHAROS: every read writes one entry into pharos (what was read by hash, never the text), with its capacities", READY, () => {
  const log = tmpd("khora-log-"); const out = probe({ PHAROS_HOME: PH, KHORA_PRIORS_DIR: PRI, PHAROS: log, PHAROS_CHATTER: tmpd("khora-ch-") }, BOTH);
  assert.deepEqual(out, { toWeft: "read", doc: "read" }, JSON.stringify(out));
  const khoraDir = path.join(log); const a = acts(khoraDir); assert.equal(a.length, 2, "one entry per read, one per front door");
  assert.deepEqual(a.map((e) => e.body.door).sort(), ["native/reading.js#readDocument", "native/the-fold/read-process.mjs#readToWeft"]);
  for (const e of a) { assert.match(e.addr, /^sha256:[0-9a-f]{64}$/); assert.deepEqual(e.body.capacities.missing, []); assert.ok(e.body.capacities.used.includes("pronoun-binding") && e.body.capacities.used.includes("name-ruling")); assert.equal(e.body.degraded, false); assert.ok(!JSON.stringify(e).includes("Anna walked"), "the text itself is never written"); }
});

test("FULL-CAPACITY: a read that leaves an available capacity out (pronoun binding switched off) is REFUSED by pharos; knowingly, it is written marked degraded", READY, () => {
  const log = tmpd("khora-log-"); const ch = tmpd("khora-ch-"); const env = { PHAROS_HOME: PH, KHORA_PRIORS_DIR: PRI, PHAROS: log, PHAROS_CHATTER: ch };
  const off = `try { readToWeft(T, { language: "eng", readerOptions: { pronounPresence: null } }); out.refused = "read"; } catch (e) { out.refused = e.message; } try { readToWeft(T, { language: "eng", allowDegraded: true, readerOptions: { pronounPresence: null } }); out.knowing = "read"; } catch (e) { out.knowing = e.message; }`;
  const out = probe(env, off);
  assert.match(out.refused, /refused: .*pronoun-binding.* not used/, out.refused); assert.equal(out.knowing, "read");
  const a = acts(log); assert.equal(a.length, 1, "the refused read wrote nothing; the knowing one wrote one entry"); assert.equal(a[0].body.degraded, true); assert.ok(a[0].body.capacities.missing.includes("pronoun-binding"));
  const lines = fs.readdirSync(ch).flatMap((f) => fs.readFileSync(path.join(ch, f), "utf8").trim().split("\n")).map((l) => JSON.parse(l)); assert.ok(lines.some((l) => l.what === "capacity_missing" && l.level === "error") && lines.some((l) => l.what === "capacity_missing" && l.level === "warn"), "both left chatter");
});

test("WRITES-TO-PHAROS: if pharos cannot be written, the read is refused (nothing is done off the record)", READY, () => {
  const f = path.join(tmpd("khora-x-"), "a-file"); fs.writeFileSync(f, "x");
  const out = probe({ PHAROS_HOME: PH, KHORA_PRIORS_DIR: PRI, PHAROS: path.join(f, "under"), PHAROS_CHATTER: tmpd("khora-ch-") }, BOTH);
  for (const k of ["toWeft", "doc"]) assert.match(out[k], /WRITES-TO-PHAROS|cannot be written|Nothing is done off the record/, `${k}: ${out[k]}`);
});
