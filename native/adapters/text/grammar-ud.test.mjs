// grammar-ud.test.mjs — a source read with its page: a pronoun takes the nearest earlier subject, a dropped subject the page's own; a naming
// is an identity. Uses the French and Spanish priors (janus priors/); skipped where they are not on disk.
//   node --test native/adapters/text/grammar-ud.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { loadGrammar } from "./grammar-ud.js";
import { claimsOf } from "./grammar-en.js";
import { verdict } from "../../kernel/eot-claim-match.js";

const fr = await loadGrammar("fr"), es = await loadGrammar("es");

test("a pronoun subject takes the page's topic", { skip: !fr && "French priors not on disk" }, () => {
  const ctx = { title: "Loire", previous: ["La Loire est le plus long fleuve de France."] };
  const [c] = fr.claimsOf("Elle se jette dans l'océan Atlantique.", { context: ctx });
  assert.deepEqual(c.ARG0?.names, ["loire"]);
  assert.equal(fr.claimsOf("Elle se jette dans l'océan Atlantique.")[0]?.ARG0?.names?.length ?? 0, 0, "without the page, the pronoun names nobody");
});

test("a dropped subject takes the page's own subject (its title)", { skip: !es && "Spanish priors not on disk" }, () => {
  const ctx = { title: "Lago Titicaca", previous: ["El lago Titicaca es el lago navegable más alto del mundo."] };
  const cs = es.claimsOf("Se encuentra en los Andes centrales.", { context: ctx });
  assert.ok(cs.some((c) => (c.ARG0?.names ?? []).includes("titicaca") || (c.ARG1?.names ?? []).includes("titicaca")), JSON.stringify(cs.map((c) => [c.rel, c.ARG0?.text, c.ARG1?.text])));
});

test("a naming is an identity, both ways", () => {
  const v = (a, b) => verdict(claimsOf(a), claimsOf(b)).v;
  assert.ok(claimsOf("The southern sector is known as Lake Menor.").some((c) => c.rel === "be" && c.alias));
  assert.equal(v("The Calvin cycle takes place in the stroma.", "The light-independent stage, also known as the Calvin cycle, takes place in the stroma."), "E");
});
