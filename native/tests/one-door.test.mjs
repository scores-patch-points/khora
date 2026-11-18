// one-door.test.mjs — THERE IS NO WRONG DOOR (2026-11-18).
// The loop this closes: a session reads through a door that is not the canonical one (reading.js::readDocument used to skip the pronoun, name and case-marked options), or through no priors at all
// (the reader returned empty rows and typed gaps instead of failing), and concludes the system "cannot read". Three claims, each with a falsifier beside it:
//   1. the two front doors give the same canonical read (equal on a probe; a door that drops the options fails);
//   2. a read with no priors is REFUSED under Node, naming what is missing and where it looked, unless the caller asks to be degraded;
//   3. the set of shipping source files that take the reader's primitive from read-core.mjs is a named list (native/tests/door-allowlist.json): a new door cannot appear without a line saying why.
// Needs the priors (KHORA_PRIORS_DIR or ~/Documents/janus/priors) for claims 1 and 2; claim 3 needs nothing.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)); const ROOT = path.resolve(HERE, "..", "..");
const PRI = process.env.KHORA_PRIORS_DIR ?? path.join(os.homedir(), "Documents", "janus", "priors"); const HAVE = fs.existsSync(path.join(PRI, "pos-eng.json")); if (HAVE) process.env.KHORA_PRIORS_DIR ??= PRI;
const EN = "Anna walked to the market on Monday. Anna bought bread and apples there. She carried them home along the river. Boris met Anna at the gate. He asked Anna about the market. Anna told him the bread was good. She smiled at Boris and went inside the house. The house was warm and the fire was lit. Boris waited outside for a while. Then he left for the station.".repeat(3);
const bound = (w) => JSON.stringify(w.pronounsPresence ?? null);

test("1. reading.js::readDocument and read-process.mjs::readToWeft give the same canonical read", { skip: !HAVE, timeout: 600000 }, async () => {
  const { readToWeft } = await import("../the-fold/read-process.mjs"); const { readDocument } = await import("../reading.js");
  const a = readToWeft(EN, { language: "eng" }); const b = await readDocument(EN, { language: "eng", lexicon: false });
  assert.ok(Array.isArray(a.pronounsPresence) && a.pronounsPresence.length > 0, "the canonical read bound pronouns on the probe (else this test proves nothing)");
  assert.equal(bound(b), bound(a), "the two front doors bind the same pronouns");
  assert.deepEqual(b.cast?.map?.((c) => c.id ?? c.name) ?? b.cast, a.cast?.map?.((c) => c.id ?? c.name) ?? a.cast, "and read the same cast");
  // falsifier: a door that drops the canonical options reads differently, so this test would notice
  const weak = await readDocument(EN, { language: "eng", lexicon: false, readerOptions: { pronounPresence: null } });
  assert.notEqual(bound(weak), bound(a), "switching the rung off changes the read (the comparison has teeth)");
});

test("2. a read with no priors is refused loudly under Node, and allowed only when the caller says so", { timeout: 600000 }, async () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "khora-no-priors-"));
  const probe = `
    import { readToWeft } from ${JSON.stringify(path.join(ROOT, "native/the-fold/read-process.mjs"))};
    import { readDocument } from ${JSON.stringify(path.join(ROOT, "native/reading.js"))};
    const T = ${JSON.stringify(EN)}; const out = {};
    try { readToWeft(T, { language: "eng" }); out.toWeft = "read"; } catch (e) { out.toWeft = String(e.message); }
    try { await readDocument(T, { language: "eng", lexicon: false }); out.doc = "read"; } catch (e) { out.doc = String(e.message); }
    try { const w = readToWeft(T, { language: "eng", allowDegraded: true }); out.allowed = (w.gaps ?? []).map((g) => g.gap); } catch (e) { out.allowed = "threw: " + e.message; }
    console.log(JSON.stringify(out));`;
  const { spawnSync } = await import("node:child_process");
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", probe], { env: { ...process.env, KHORA_PRIORS_DIR: empty, KHORA_ALLOW_DEGRADED: "" }, encoding: "utf8", timeout: 580000, cwd: ROOT });
  const out = JSON.parse(r.stdout.trim().split("\n").pop());
  for (const k of ["toWeft", "doc"]) { assert.match(out[k], /khora read refused/, `${k}: refused`); assert.match(out[k], /no_pos_prior/, `${k}: names the missing prior`); assert.ok(out[k].includes(empty), `${k}: names where it looked`); }
  assert.ok(Array.isArray(out.allowed) && out.allowed.includes("no_pos_prior"), "allowDegraded: true still reads, with the typed gaps, knowingly");
});

test("3. every source file that takes the reader's primitive from read-core.mjs is on the allowlist, with a reason", () => {
  const allow = JSON.parse(fs.readFileSync(path.join(HERE, "door-allowlist.json"), "utf8")).importers;
  // eval/ and tests/ are exempt on purpose: a control arm needs the raw reader. Anything that SHIPS (native/, cli/, the root) is not.
  const skipDir = new Set(["node_modules", ".git", "legacy-ported", "vendor", "eval", "tests", "identity", "assay", "gym"]);
  const TAKES = /(?:import|export)\s*\{[^}]*\b(readWith|makeReader|readDocument)\b[^}]*\}\s*from\s*["'][^"']*read-core\.mjs["']/;
  const found = [];
  (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!skipDir.has(e.name)) walk(path.join(d, e.name)); continue; }
    if (!/\.m?js$/.test(e.name) || /\.test\.m?js$/.test(e.name)) continue;
    const f = path.join(d, e.name); if (TAKES.test(fs.readFileSync(f, "utf8"))) found.push(path.relative(ROOT, f));
  } })(ROOT);
  const unlisted = found.filter((f) => !(f in allow)); const stale = Object.keys(allow).filter((f) => !found.includes(f));
  assert.deepEqual(unlisted, [], `a new door takes the raw reader from read-core.mjs: read through read-process.mjs::readToWeft or reading.js::readDocument, or add the file to native/tests/door-allowlist.json WITH a reason. Unlisted: ${unlisted.join(", ")}`);
  assert.deepEqual(stale, [], `the allowlist names files that no longer import the raw reader: remove them. Stale: ${stale.join(", ")}`);
  for (const [f, why] of Object.entries(allow)) assert.ok(typeof why === "string" && why.length > 20, `${f}: a reason is required`);
  // falsifier: the pattern really matches the doors we know (a regex that matches nothing would pass this test forever)
  assert.ok(found.includes("native/the-fold/read-process.mjs") && found.includes("native/reading.js"), "the scan finds the canonical door and the front door");
});
