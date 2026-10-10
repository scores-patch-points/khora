// conformance/archon-dossiers.test.mjs — AntiStrauss's disclosure rule, pinned. A name must never stand in for an argument the author did
// not make: every archon has a dossier, every non-justified verdict carries its bends, a nomination is never credited as scholarship,
// and the credit line a response carries includes the disclosure.
import test from "node:test";
import assert from "node:assert/strict";
import { ARCHONS, creditedQuote, disclosureOf, matchArchons, ARCHON_COMPENDIUM } from "../organs/archon-compendium.js";
import { ARCHON_DOSSIERS, ARCHON_DOSSIERS_DIGEST } from "../organs/archon-dossiers.js";

test("every archon has exactly one dossier, and no dossier is orphaned", () => {
  const handles = new Set(ARCHONS.map((a) => a.handle));
  for (const h of handles) assert.ok(ARCHON_DOSSIERS[h], `archon "${h}" has no dossier: a credit would carry an author's authority undisclosed`);
  for (const h of Object.keys(ARCHON_DOSSIERS)) assert.ok(handles.has(h), `dossier "${h}" has no archon`);
});

test("verdict and bends agree: justified lists none, partial/fails list at least one", () => {
  for (const [h, d] of Object.entries(ARCHON_DOSSIERS)) {
    assert.ok(["justified", "partial", "fails"].includes(d.verdict), `${h}: verdict`);
    if (d.verdict === "justified") assert.equal(d.bends.length, 0, `${h}: justified but lists bends`);
    else if (d.standing !== "nomination") assert.ok(d.bends.length > 0, `${h}: ${d.verdict} without bends`);
    for (const b of d.bends) assert.ok(b.ours && b.theirs && b.kind, `${h}/${b.id}: a bend names both ours and theirs`);
  }
});

test("a nomination, or a failed verdict, is never credited as scholarship", () => {
  for (const [h, d] of Object.entries(ARCHON_DOSSIERS)) {
    if (d.standing === "nomination" || d.verdict === "fails") assert.equal(d.creditAsScholarship, false, h);
  }
});

test("the credit line carries the disclosure whenever the use is not simply justified", () => {
  for (const a of ARCHONS) {
    const d = disclosureOf(a.handle);
    const line = creditedQuote(a.handle);
    assert.ok(line.startsWith(a.credit), a.handle);
    if (d.disclosure) assert.ok(line.includes(d.disclosure), `${a.handle}: credit omits its disclosure`);
    else assert.equal(line, a.credit);
  }
});

test("standing corrections the dossiers found stay corrected", () => {
  const by = Object.fromEntries(ARCHONS.map((a) => [a.handle, a]));
  assert.notEqual(by.dai.pdStatus, "public-domain");
  assert.equal(by.kleeneUp.pdStatus, "nomination");
  assert.match(by.wigmore.source, /Principles of Judicial Proof \(1913/);
});

test("matched archons carry verdict and disclosure, and the compendium names its dossier digest", () => {
  const hits = matchArchons("a claim must be grounded in what the eyes and ears can witness");
  assert.ok(hits.length > 0);
  for (const h of hits) assert.ok("verdict" in h && "disclosure" in h && "creditAsScholarship" in h, h.handle);
  assert.equal(ARCHON_COMPENDIUM.dossiersDigest, ARCHON_DOSSIERS_DIGEST);
});

test("no organ header speaks in an author's voice: generated commentary is labelled as ours", async () => {
  const fs = await import("node:fs"); const path = await import("node:path");
  const root = path.resolve(new URL("..", import.meta.url).pathname);
  const bad = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(m?js)$/.test(e.name) && !e.name.endsWith(".test.mjs") && /^\/\* .+ speaks:/m.test(fs.readFileSync(p, "utf8").slice(0, 400))) bad.push(path.relative(root, p));
    }
  })(root);
  assert.deepEqual(bad, [], "a header block opens '<Name> speaks:' — generated text must not carry an author's voice");
});
