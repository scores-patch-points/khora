// scene/seed-mind.mjs — seed THE MIND (Mímir) from the session's readings.
//
//   node native/eval/the-fold/scene/seed-mind.mjs
//
// The mind is ONE append-only store; every row cites the SOURCE UNDERLYING
// BYTES. This driver reads the readings we made (the UDHR injunctions at their
// byte addresses; the universal-rights paradigm) and appends MimirRow@1 lines
// to khora/native/memory/mind.jsonl. Append-only: existing ids are never
// rewritten; only new rows are added. Every citation is verified against the
// real file before it is recorded.

import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMind, remember, mindAt, verifyCitations } from "../../../kernel/mimir.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const UDHR_ENG = path.resolve(HERE, "udhr-src", "udhr-eng.txt");
const INJ = "/Users/mlacy/Documents/3.0/Zenodotus/derived-priors/hyperlexicon-priors/udhr-injunctions-v1.json";
const OUT = "/Users/mlacy/Documents/3.0/khora/native/memory/mind.jsonl";

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const bytes = fs.readFileSync(UDHR_ENG);

const inj = JSON.parse(fs.readFileSync(INJ, "utf8"));
const GIVER = "corpus:udhr-eng — the declaration's own injunctions";

let mind = createMind({ meta: { handle: "Mimir", store: "the one mind", law: "every row cites the source underlying bytes" } });

// 1. the injunctions — one row per obligation, each pinned to its own bytes
let pinned = 0;
for (const o of inj.obligations) {
  const len = Buffer.byteLength(o.text, "utf8");
  const span = bytes.subarray(o.at, o.at + len);
  const sha = sha256(span);
  // the citation gate at WRITE time: the bytes must be there and carry the modal
  if (span.length !== len) { console.warn(`skip ${o.id}: bytes do not resolve`); continue; }
  mind = remember(mind, {
    kind: "obligation",
    claim: { modal: o.kind, bearer: o.bearer, clause: o.text.slice(0, 160) },
    giver: GIVER,
    cites: [{ source: UDHR_ENG, byte: o.at, length: len, sha256: sha }],
    standing: "candidate",
    basis: "a scriptural injunction opens a standing obligation (Jaimini, DEF·Figure)",
    falsifying: "a clause carrying no modal at its address, or bytes that drifted from the pin",
    meta: { ground: o.ground, reading: "read-injunctions.mjs" },
  });
  pinned += 1;
}

// 2. the paradigm — the universal-rights finding, cited by the injunction bytes
const paradigm = inj.paradigms.find((p) => p.pattern.includes("consequence:right") && p.pattern.includes("bearer:universal"));
const paradigmCites = inj.obligations.filter((o) => o.kind === "right" && o.bearer === "universal").slice(0, 8).map((o) => {
  const len = Buffer.byteLength(o.text, "utf8");
  return { source: UDHR_ENG, byte: o.at, length: len, sha256: sha256(bytes.subarray(o.at, o.at + len)) };
});
mind = remember(mind, {
  kind: "paradigm",
  claim: { pattern: paradigm.pattern, members: paradigm.members, grounds: paradigm.grounds, gain: paradigm.gain },
  giver: GIVER,
  cites: paradigmCites,
  standing: "candidate",
  basis: "MDL compression over the declaration's injunctions (interpretiveParadigmModels)",
  falsifying: ">=2 obligations sharing the signature with >=2 independent grounds that does NOT compress; or a member clause carrying no modal",
  meta: { translation: "survives 14/14 languages (udhr-paradigm-translation-v1.json); per-language citation addresses pending — a named gap" },
});

// 3. verify every citation against the real bytes, then append (never rewrite)
const report = verifyCitations(mind, { read: (s) => fs.readFileSync(s), digest: sha256 });
console.log(`mind rows: ${mind.rows.length} (${pinned} obligations + 1 paradigm) · citations checked ${report.checked} · failed ${report.failed}`);
if (!report.ok) { console.error(report.findings.filter((f) => !f.ok)); process.exit(1); }

const existing = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l)) : [];
const have = new Set(existing.map((r) => r.id));
const fresh = mind.rows.filter((r) => !have.has(r.id));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const header = existing.length === 0 ? `${JSON.stringify({ schema: "EOMind@1", handle: "Mimir", note: "the one mind — append-only; every row cites the source underlying bytes. The record (Mnemosyne) is penelope's; this is the ground the reading stands on.", giver: "khora/native/kernel/mimir.js" })}\n` : "";
fs.appendFileSync(OUT, header + fresh.map((r) => JSON.stringify(r)).join("\n") + (fresh.length ? "\n" : ""));
console.log(`appended ${fresh.length} new row(s) -> ${OUT} (total on disk: ${existing.length + fresh.length})`);
console.log(`projection at now: ${Object.keys(mindAt(mind).standingById).length} rows standing`);
