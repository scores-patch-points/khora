// grammar-ud-codec.test.mjs — the Isthmus: a language's codec is read from the committed priors or from this machine's codec cache
// (pointed-at codecs, vendored on use by janus); a codec that is pointed at and not held names its source; a language with a codec
// but no closed-class pack still decodes.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadGrammar, codecStatus } from "./grammar-ud.js";

const PRIORS = new URL("../../priors", import.meta.url).pathname;
const deu = fs.existsSync(PRIORS) ? fs.readdirSync(PRIORS).filter((f) => f === "ud-parser-deu-gsd.json.gz" || f === "ud-tokenizer-deu.json.gz") : [];
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));

test("a codec in the cache is read when the priors do not hold it", { skip: deu.length < 2 && "needs the German codec in the priors" }, async () => {
  const priors = tmp("gud-priors-"), cache = tmp("gud-cache-");
  try {
    for (const f of deu) fs.copyFileSync(path.join(PRIORS, f), path.join(cache, f));
    assert.equal(await loadGrammar("de", { priors, cache: tmp("gud-none-") }), null, "FALSIFIER: read with no codec anywhere");
    const g = await loadGrammar("de", { priors, cache });
    assert.ok(g && typeof g.rowsOf === "function");
    assert.ok(g.rowsOf("Der Hund schläft.").length > 0);
  } finally { fs.rmSync(priors, { recursive: true, force: true }); fs.rmSync(cache, { recursive: true, force: true }); }
});

test("a codec with no closed-class pack decodes, and says what it lacks", { skip: deu.length < 2 && "needs a codec to rename" }, async () => {
  const priors = tmp("gud-priors-"), cache = tmp("gud-cache-");
  try {
    fs.copyFileSync(path.join(PRIORS, "ud-parser-deu-gsd.json.gz"), path.join(cache, "ud-parser-xxa-test.json.gz"));
    fs.copyFileSync(path.join(PRIORS, "ud-tokenizer-deu.json.gz"), path.join(cache, "ud-tokenizer-xxa.json.gz"));
    const g = await loadGrammar("xxa", { priors, cache });
    assert.ok(g, "FALSIFIER: a held codec was refused for want of a pack");
    assert.match(g.packGap, /no closed-class pack/);
    assert.ok(g.rowsOf("Der Hund schläft.").length > 0);
  } finally { fs.rmSync(priors, { recursive: true, force: true }); fs.rmSync(cache, { recursive: true, force: true }); }
});

test("a pointed-at codec that is not held names its source and the vendoring command, never a guess", () => {
  const priors = tmp("gud-priors-");
  try {
    fs.writeFileSync(path.join(priors, "ud-codecs.json"), JSON.stringify({ schema: "UDCodecManifest@1", codecs: { xxb: { code: "xxb", treebank: "UD_Test-X", licence: "CC BY-NC-SA 4.0", redistribute: false, source: { repo: "UniversalDependencies/UD_Test-X" } } } }));
    const st = codecStatus("xxb", { priors, cache: tmp("gud-none-") });
    assert.equal(st.held, false);
    assert.equal(st.pointed, true);
    assert.match(st.why, /pointed at \(CC BY-NC-SA 4\.0, not redistributed\).*vendor-ud-codec\.mjs xxb/);
  } finally { fs.rmSync(priors, { recursive: true, force: true }); }
});
