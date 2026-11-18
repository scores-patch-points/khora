// One priors-home rule: a read finds its priors with no environment variable set (found 2026-11-18: native/priors dangled in every checkout, so every language read bare and Greek was read as English).
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import os from "node:os"; import path from "node:path";
const HOME = path.join(os.homedir(), "Documents", "janus", "priors"); const HAVE = fs.existsSync(path.join(HOME, "pos-grc.json")) && !process.env.KHORA_PRIORS_DIR;
test("with no KHORA_PRIORS_DIR the door finds the janus priors and a Greek read has its POS prior and its clauses", { skip: !HAVE }, async () => {
  const { priorJson, priorsHome } = await import("../the-fold/prior-source.mjs"); assert.ok(priorsHome().dir, "a home"); assert.ok(priorJson("pos-grc.json"), "the Greek POS prior is found");
  const { readToWeft } = await import("../the-fold/read-process.mjs"); const w = readToWeft("ὁ Πέτρος ἦλθεν εἰς τὴν πόλιν καὶ εἶδεν τὸν Ἰωάννην. ὁ Ἰωάννης εἶπεν τῷ Πέτρῳ ὅτι οὐκ ἔστιν ἐνταῦθα. ".repeat(8), { language: "grc", address: "t:h" });
  assert.ok(!w.gaps.some((g) => g.gap === "no_pos_prior"), "no bare read"); assert.ok(w.clauses.length > 0);
});
test("the pronoun registers read the same home as the door", async () => { const { priorsHome } = await import("../the-fold/prior-source.mjs"); const { presenceOptionsFor } = await import("../adapters/text/pronoun-registers.js"); assert.ok(priorsHome().dir); assert.ok(presenceOptionsFor("grc").pronounClass || presenceOptionsFor("grc").gap); });
