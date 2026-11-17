// reasoning-lint-identity.test.mjs — the identity partition reported per holon is the whole of what identity
// contributes to a lintGfp verdict. Seeded property test (experiment: PREREG.md, sha256 95ee5ece…, in the pharos
// identity work). It is written to FAIL on a reporter that is scope-blind or that reports only a count, and on a
// lint that reports no partition at all.
import test from "node:test";
import assert from "node:assert/strict";
import { gfpClaim, ancestry, contains } from "../kernel/gfp-claim.js";
import { lintGfp } from "./reasoning-lint.js";

const OPTS = { functional: [{ rel: "p", role: "ARG1", giver: "test" }], identityRels: ["same-as"] };
const claim = (ground, rel, a, b, id, polarity = "+") => gfpClaim({ ground, rel, roles: { ARG0: a, ARG1: b }, polarity, id });
const identityOf = (r, at) => r.holons.find((h) => h.at === at)?.identity;

test("identity is reported per holon, scoped to where the same-as claim reaches", () => {
  const r = lintGfp([
    claim("/p1", "died-in", "Twain", "1910", "k1"), claim("/p1/2", "died-in", "Clemens", "1911", "k2"), claim("/p2", "died-in", "Twain", "1910", "k3"),
    claim("/p1", "same-as", "Twain", "Clemens", "i1"),
  ], OPTS);
  assert.deepEqual(identityOf(r, "/p1"), [["Clemens", "Twain"]]);
  assert.deepEqual(identityOf(r, "/p1/2"), [["Clemens", "Twain"]]); // below the claim's ground: it reaches
  assert.deepEqual(identityOf(r, "/p2"), []);                        // a sibling: an alias stated in /p1 does not merge there
  assert.deepEqual(identityOf(r, "/"), []);                          // above it: it does not reach up either
});

// ---- seeded property: the partition is sufficient and necessary -----------------------------------------------
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const GROUNDS = ["/", "/1", "/2", "/1/1", "/1/2", "/2/1", "/1/1/1"], POOL = ["a", "b", "c", "d", "v0", "v1"];
const verdict = (r) => JSON.stringify({ ok: r.ok, counts: r.counts, unjudged: r.unjudged, apart: r.apart, findings: r.findings.map((f) => `${f.kind}|${f.at}|${f.severity}|${(f.claims || []).join(",")}`).sort() });

test("same content: partitions equal at every content holon <=> identical verdict (300 seeded trials)", () => {
  const rng = mulberry32(20261117), int = (n) => Math.floor(rng() * n), pick = (xs) => xs[int(xs.length)];
  const pair = () => { const a = pick(POOL); let b = pick(POOL); while (b === a) b = pick(POOL); return [a, b]; };
  const ids = (xs, tag) => xs.map((x, i) => claim(x.g, "same-as", x.a, x.b, `${tag}${i}`));
  let equalDiffClaims = 0, differing = 0;
  for (let t = 0; t < 300; t++) {
    const content = Array.from({ length: 4 + int(5) }, (_, i) => { const rel = rng() < 0.55 ? "p" : "q"; return claim(pick(GROUNDS), rel, pick(POOL), pick(POOL), `c${i}`, rel === "q" && rng() < 0.4 ? "-" : "+"); });
    const one = Array.from({ length: int(6) }, () => { const [a, b] = pair(); return { a, b, g: pick(GROUNDS) }; });
    let two = one.map((x) => ({ ...x }));
    const r = rng();
    if (r < 0.4) { // restate: swap roles, re-state one alias deeper, duplicate, reorder; the partition should not move
      two = two.map((x) => (rng() < 0.5 ? { a: x.b, b: x.a, g: x.g } : x));
      for (const x of one) { const kids = GROUNDS.filter((g) => g !== x.g && contains(x.g, g)); if (kids.length && rng() < 0.5) two.push({ ...x, g: pick(kids) }); if (rng() < 0.2) two.push({ ...x }); }
      two.reverse();
    } else if (r < 0.65 || !two.length) { const [a, b] = pair(); two.push({ a, b, g: pick(GROUNDS) });
    } else if (r < 0.8) two.splice(int(two.length), 1);
    else { const i = int(two.length), [a, b] = pair(); two[i] = { a, b, g: two[i].g }; }
    const A = lintGfp([...content, ...ids(one, "iA")], OPTS), B = lintGfp([...content, ...ids(two, "iB")], OPTS);
    const CH = new Set(content.flatMap((c) => ancestry(c.ground)));
    for (const res of [A, B]) for (const h of CH) assert.ok(Array.isArray(identityOf(res, h)), `holon ${h} reports its identity partition`);
    const diffH = [...CH].filter((h) => JSON.stringify(identityOf(A, h)) !== JSON.stringify(identityOf(B, h)));
    if (!diffH.length) {
      if (JSON.stringify(one) !== JSON.stringify(two)) equalDiffClaims++;
      assert.equal(verdict(A), verdict(B), "equal partitions must give equal verdicts (sufficiency)");
    } else { // necessity: a pair one system merges and the other does not is witnessed by a probe at that holon
      differing++;
      const h = diffH[0], ca = identityOf(A, h), cb = identityOf(B, h), names = [...new Set([...ca.flat(), ...cb.flat()])];
      const merged = (cls, x, y) => cls.some((g) => g.includes(x) && g.includes(y));
      let found = null;
      for (const x of names) { for (const y of names) if (x < y && merged(ca, x, y) !== merged(cb, x, y)) { found = [x, y, merged(ca, x, y)]; break; } if (found) break; }
      assert.ok(found, "a differing partition names a pair that one side merges and the other does not");
      const probe = [claim(h, "pr", found[0], "o", "pr1"), claim(h, "pr", found[1], "o", "pr2", "-")];
      const PA = lintGfp([...content, ...probe, ...ids(one, "iA")], OPTS), PB = lintGfp([...content, ...probe, ...ids(two, "iB")], OPTS);
      const has = (r) => r.findings.some((f) => f.kind === "polarity_contradiction" && f.at === h && (f.claims || []).includes("pr1"));
      assert.ok(found[2] ? has(PA) && !has(PB) : has(PB) && !has(PA), "only the system that merges the pair sees the contradiction (necessity)");
    }
  }
  assert.ok(equalDiffClaims >= 20, `non-vacuous: equal partitions reached by different identity claims (${equalDiffClaims})`);
  assert.ok(differing >= 20, `non-vacuous: differing partitions probed (${differing})`);
});
