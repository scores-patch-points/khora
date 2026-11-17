// Sanskrit (san) in the canonical read: the pipe is the danda of Latin-script Sanskrit (a sentence stop in san only), the register is shipped, the cast comes from heard nominals with a frame prior,
// and no other language changes. A real read: needs the priors (KHORA_PRIORS_DIR or ~/Documents/janus/priors); skipped without them. The frame prior is the one this work builds (identity/pronouns-multilingual/san/priors/frame-san.json), laid over the priors in a temp folder.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRI = process.env.KHORA_PRIORS_DIR ?? path.join(os.homedir(), "Documents", "janus", "priors"); const HAVE = fs.existsSync(path.join(PRI, "pos-san.json"));
const FRAME = path.join(HERE, "../../identity/pronouns-multilingual/san/priors/frame-san.json");
if (HAVE) { const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "san-priors-")); for (const f of fs.readdirSync(PRI)) { try { fs.symlinkSync(path.join(PRI, f), path.join(tmp, f)); } catch { /* skip */ } } if (fs.existsSync(FRAME) && !fs.existsSync(path.join(tmp, "frame-san.json"))) fs.symlinkSync(FRAME, path.join(tmp, "frame-san.json")); process.env.KHORA_PRIORS_DIR = tmp; }
const SAN = "tatra hiraṇyako nāma mūṣikarājaḥ prativasati sma | tasya mitraṃ laghupatanako nāma vāyasaḥ | hiraṇyakaṃ dṛṣṭvā laghupatanakaḥ prahṛṣṭo 'bhavat | sa tam avadat | hiraṇyakasya vacanaṃ śrutvā so 'pi tuṣṭaḥ | tatas tau mitre babhūvatuḥ | hiraṇyako 'pi laghupatanakena saha vane vyacarat | atha kadācid vāyasaḥ sa mūṣikarājaṃ prāha | ";
test("san: the pipe splits sentences in san and only in san", { skip: !HAVE, timeout: 600000 }, async () => {
  const { readToWeft } = await import("./read-process.mjs");
  const w = readToWeft(SAN.repeat(3), { language: "san" });
  assert.ok(w.sentences.length >= 20, `san sentences ${w.sentences.length}`);
  const e = readToWeft("It rained | and then it stopped | and the sun came out over the hills today. Nobody minded the rain or the sun at all, they said. ".repeat(3), { language: "eng" });
  assert.ok(e.sentences.length <= 8 && e.sentences.some((s) => s.text.includes("|")), `eng keeps the pipe inside its sentence: ${e.sentences.length}`);
});
test("san: the register is shipped, the typed gap is gone, and the rung runs on a cast of heard nominals", { skip: !HAVE, timeout: 600000 }, async () => {
  const { readToWeft } = await import("./read-process.mjs");
  const w = readToWeft(SAN.repeat(4), { language: "san" });
  assert.ok(!(w.gaps ?? []).some((g) => g.gap === "pronoun_presence_no_register"), JSON.stringify(w.gaps));
  assert.ok(Array.isArray(w.pronounsPresence), "the rung ran");
  assert.equal(w.cast.length, 0, "no capital tier in Latin-script lower-case Sanskrit");
  assert.ok(w.presenceInputs.mentions.length > 0, "the heard nominals are the beings of the rung");
});
