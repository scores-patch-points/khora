import test from "node:test";
import assert from "node:assert/strict";
import { splitRegion, foldGrain } from "./grain.js";
import { foldWithWhom } from "./whom-standing.js";

let n = 0;
const mk = (side, [subj, pred, obj, polarity = "+", activation = 1]) => {
  const i = n++;
  return { id: `${side}${i}`, address: `px_${side.toLowerCase()}/text@h#b${i * 100}-${i * 100 + 40}`, text: `${subj} ${polarity === "-" ? "did not " : ""}${pred} ${obj}.`, side, claim: { subj, pred, obj, polarity }, activation };
};
const FILL = [["Priya Nair", "visited", "the harbor"], ["Tom Weld", "wrote", "a letter"], ["Iris Vale", "painted", "the fence"], ["Omar Reed", "repaired", "the pump"], ["Lena Cho", "sold", "the orchard"], ["Ben Ash", "carried", "the ladder"], ["Ruth Doyle", "sang", "a ballad"], ["Kofi Mensah", "measured", "the field"]];
const fixture = () => {
  const same = mk("U", ["Maria Lopez", "approved", "the hiring freeze", "+", 9]);        // the reader holds exactly this claim
  const other = mk("U", ["Maria Lopez", "approved", "the depot lease", "+", 8]);          // same subject and verb, another object
  const contested = mk("U", ["Daniel Reyes", "opposed", "the fare increase", "+", 7]);     // the reader holds the NEGATION
  const unrelated = mk("U", ["Anna Cole", "chairs", "the committee", "+", 6]);
  const region = [same, other, contested, unrelated, ...FILL.map((f, i) => mk("U", [...f, "+", 5 - i * 0.1]))];
  const whom = [
    mk("W", ["Maria Lopez", "approved", "the hiring freeze", "+"]),
    mk("W", ["Daniel Reyes", "opposed", "the fare increase", "-"]),
    ...FILL.map((f) => mk("W", [...f, "+"])),
  ];
  return { region, whom, same, other, contested, unrelated };
};

test("default is the original rule: held omitted equals held:'arrangement', and the different claim is H", () => {
  const { region, whom, other } = fixture();
  const a = splitRegion(region, whom);
  const b = splitRegion(region, whom, { held: "arrangement" });
  assert.deepEqual(a.H.map((u) => u.id), b.H.map((u) => u.id));
  assert.ok(a.H.some((u) => u.id === other.id), "arrangement mode holds the other object (the defect L58 names)");
  assert.equal(a.related, undefined, "no `related` outside claim mode");
});

test("H2/H3: held means the claim; a different object is A, shown, and typed `related`", () => {
  const { region, whom, same, other } = fixture();
  const s = splitRegion(region, whom, { held: "claim" });
  assert.ok(s.H.some((u) => u.id === same.id));
  assert.ok(!s.H.some((u) => u.id === other.id));
  assert.ok(s.A.some((u) => u.id === other.id));
  const r = s.related.find((x) => x.id === other.id);
  assert.equal(r.kind, "same-subject-predicate");
  assert.equal(r.address, other.address);
});

test("H7: the opposite polarity of a held claim is contested, never held", () => {
  const { region, whom, contested } = fixture();
  const s = splitRegion(region, whom, { held: "claim" });
  assert.ok(!s.H.some((u) => u.id === contested.id));
  assert.equal(s.related.find((x) => x.id === contested.id).kind, "opposite-polarity");
  // in arrangement mode the same span is wrongly H
  assert.ok(splitRegion(region, whom).H.some((u) => u.id === contested.id));
});

test("H4: items that show a related span carry related:true and its kind; nothing else changes", () => {
  const { region, whom, other } = fixture();
  const f = foldGrain({ region, whom, held: "claim" });
  assert.deepEqual(f.related.map((r) => r.kind).sort(), ["opposite-polarity", "same-subject-predicate"]);
  const shownRelated = f.modes.flatMap((m) => m.items).filter((it) => it.related);
  assert.ok(shownRelated.length >= 1);
  assert.ok(shownRelated.every((it) => ["same-subject-predicate", "opposite-polarity"].includes(it.relatedKind)));
  assert.ok(f.modes.flatMap((m) => m.items).some((it) => (it.spans ?? []).includes(other.address)), "the different claim is shown");
  assert.equal(f.closure.closed, true);
  assert.equal(f.closure.mouthConfined, true);
});

test("H1: foldGrain without `held` is the original fold, item for item", () => {
  const { region, whom } = fixture();
  const a = foldGrain({ region, whom });
  const b = foldGrain({ region, whom, held: "arrangement" });
  const sig = (f) => JSON.stringify([f.grain, f.distance, f.modes.map((m) => m.items.map((i) => i.spans))]);
  assert.equal(sig(a), sig(b));
  assert.equal(a.related, undefined);
  assert.ok(a.modes.flatMap((m) => m.items).every((it) => it.related === undefined));
});

test("the whom layer passes `held` through (claim mode: related spans typed on the fold)", () => {
  const { region, whom, other } = fixture();
  const wFull = region.map((u) => ({ ...u, side: "W" }));
  const prov = whom.map((w) => ({ ...w, provenance: { kind: "turn", ref: "t" } }));
  const arr = foldWithWhom({ region, whom: prov, wFull });
  const clm = foldWithWhom({ region, whom: prov, wFull, held: "claim" });
  assert.equal(arr.related, undefined);
  assert.ok(clm.related.some((r) => r.id === other.id));
  assert.equal(clm.closure.closed, true);
});

test("(c) an opposite-polarity pair is CONTRADICTED and surfaces as a refusal under the default AND under held:'claim'", () => {
  const { region, whom, contested } = fixture();
  const wNeg = whom.find((w) => w.claim.polarity === "-");
  const refusalPair = (f) => f.modes.flatMap((m) => m.items).filter((it) => (it.spans ?? []).includes(wNeg.address) && (it.spans ?? []).includes(contested.address));
  for (const held of ["arrangement", "claim"]) {
    const f = foldGrain({ region, whom, held });
    assert.equal(f.contacts.find((c) => c.w === wNeg.address).case, "CONTRADICTED", `${held}: the contact verdict is kept`);
    assert.ok(refusalPair(f).length >= 1, `${held}: the refusal pair is surfaced by a cell`);
  }
  const pairsOf = (f) => JSON.stringify(f.contacts.map((c) => [c.w, c.case, c.holds, c.refused, c.undetermined]));
  assert.equal(pairsOf(foldGrain({ region, whom })), pairsOf(foldGrain({ region, whom, held: "claim" })), "every cell sees exactly the pairs it saw before");
});

test("(b) a related entry names the W spans it is about and, if contested, the ones it opposes; the item shows the pair", () => {
  const { region, whom, contested, other } = fixture();
  const wNeg = whom.find((w) => w.claim.polarity === "-");
  const wSame = whom.find((w) => w.claim.obj === "the hiring freeze");
  const f = foldGrain({ region, whom, held: "claim" });
  const c = f.related.find((r) => r.id === contested.id);
  assert.deepEqual(c.against, [wNeg.address]);
  assert.deepEqual(c.about, [wNeg.address]);
  const o = f.related.find((r) => r.id === other.id);
  assert.deepEqual(o.about, [wSame.address]);
  assert.deepEqual(o.against, []);
  const item = f.modes.flatMap((m) => m.items).find((it) => it.related && it.relatedKind === "opposite-polarity");
  assert.deepEqual(item.against, [wNeg.address]);
  assert.ok(item.relatedAbout.includes(wNeg.address));
});

test("an unknown polarity is neither the same claim nor a contested one: it is typed unknown-polarity (UNDETERMINED)", () => {
  const u = (pol) => mk("U", ["Maria Lopez", "approved", "the hiring freeze", pol, 9]);
  const w = (pol) => mk("W", ["Maria Lopez", "approved", "the hiring freeze", pol]);
  const filler = FILL.map((f) => mk("U", [...f, "+", 1]));
  const wfill = FILL.map((f) => mk("W", [...f, "+"]));
  // U unknown, W "+": not held, not contested
  let region = [u(null), ...filler], s = splitRegion(region, [w("+"), ...wfill], { held: "claim" });
  assert.ok(!s.H.some((x) => x.claim.obj === "the hiring freeze"));
  assert.equal(s.related[0].kind, "unknown-polarity");
  // U "+", W unknown: not held, and NOT a spurious opposite-polarity
  region = [u("+"), ...filler]; s = splitRegion(region, [w("unknown"), ...wfill], { held: "claim" });
  assert.ok(!s.H.some((x) => x.claim.obj === "the hiring freeze"));
  assert.equal(s.related[0].kind, "unknown-polarity");
  assert.deepEqual(s.related[0].against, []);
  // unknown vs unknown is not the same claim either
  region = [u(null), ...filler]; s = splitRegion(region, [w(null), ...wfill], { held: "claim" });
  assert.ok(!s.H.some((x) => x.claim.obj === "the hiring freeze"));
  // the default rule is untouched by any of this
  assert.ok(splitRegion([u(null), ...filler], [w("+"), ...wfill]).H.some((x) => x.claim.obj === "the hiring freeze"));
});

test("an invalid `held` is a typed error, not a silent default", () => {
  const { region, whom } = fixture();
  assert.throws(() => splitRegion(region, whom, { held: "similar" }), /held must be/);
});
