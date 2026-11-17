// the canonical read binds pronouns by presence in English, files a typed gap (not silence) in any other language, and can be switched off.
// A real read: needs the priors (KHORA_PRIORS_DIR or ~/Documents/janus/priors); skipped without them. The first read loads the priors (about a minute).
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import os from "node:os"; import path from "node:path";
const PRI = process.env.KHORA_PRIORS_DIR ?? path.join(os.homedir(), "Documents", "janus", "priors"); const HAVE = fs.existsSync(PRI); if (HAVE) process.env.KHORA_PRIORS_DIR ??= PRI;
const EN = "Anna walked to the market on Monday. Anna bought bread and apples there. She carried them home along the river. Boris met Anna at the gate. He asked Anna about the market. Anna told him the bread was good. She smiled at Boris and went inside the house. The house was warm and the fire was lit. Boris waited outside for a while. Then he left for the station.";
const ES = "Ana caminó al mercado el lunes por la mañana. Ana compró pan y manzanas en el mercado de la ciudad. Ella llevó todo a casa por el río. Boris encontró a Ana en la puerta de la casa. Boris le preguntó a Ana por el mercado y el pan. Ana le dijo que el pan estaba muy bueno. Ella sonrió a Boris y entró en la casa. La casa estaba caliente y el fuego estaba encendido.";
test("English: pronounsPresence is on by default, bound by the default dials; switch-off removes it", { skip: !HAVE, timeout: 600000 }, async () => {
  const { readToWeft } = await import("./read-process.mjs"); const w = readToWeft(EN.repeat(3), { language: "eng" });
  assert.ok(Array.isArray(w.pronounsPresence), "the rung ran"); const off = readToWeft(EN.repeat(3), { language: "eng", readerOptions: { pronounPresence: null } });
  assert.ok(off.pronounsPresence === undefined || off.pronounsPresence === null, "switched off");
});
test("a language with no register: no silent English binding; the typed gap pronoun_presence_no_register is filed", { skip: !HAVE, timeout: 600000 }, async () => {
  const { readToWeft } = await import("./read-process.mjs"); const w = readToWeft(ES.repeat(2), { language: "spa" });
  assert.equal(w.pronounsPresence, undefined); assert.ok((w.gaps ?? []).some((g) => g.gap === "pronoun_presence_no_register"), JSON.stringify(w.gaps));
});
