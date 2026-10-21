// eot-janus.js — the EOT layer's second judge: janus (khora cli/reason.mjs), over EOT claims turned into GFP claims, one ground per pair.
// Referents get one id per being (the ends the EOT linker joins), so janus compares beings, not strings. What janus is told is DECLARED here
// over the neutral keys, each with its giver; janus decides, and only a standing contradiction it reports counts.
import { spawnSync } from "node:child_process";
import { linked } from "../kernel/eot-claim-match.js";
import { fileURLToPath } from "node:url";
const REASON = fileURLToPath(new URL("../../cli/reason.mjs", import.meta.url));
// DECLARED (giver: "one maker per made thing" — a discovery, invention, work or founding has one agent in a reading of one event)
const ONE_MAKER = ["discover", "invent", "write", "found", "compose", "design", "paint", "author", "direct", "build", "create", "name"];
// DECLARED (giver: a being has one value of each of these states at a time): neutral keys grouped into value sets
const STATES = { "volcano-status": ["extinct", "dormant", "active"], "open-state": ["open", "closed", "close"], "life-state": ["alive", "dead", "extinct", "extant"] };
const stateOf = (k) => Object.entries(STATES).find(([, vs]) => vs.includes(k))?.[0] ?? null;

/** pairs: [{ id, C: claims, S: claims }] → Set of pair ids janus finds a standing contradiction in, between a claim claim and a source claim */
export function janusContradictions(pairs) {
  const claims = [];
  for (const { id, C, S } of pairs) {
    const ends = [];
    const idOf = (e) => { if (!e) return null; const hit = ends.find((x) => linked(x.e, e)); if (hit) return hit.id; const nid = `b${ends.length + 1}`; ends.push({ e, id: nid }); return nid; };
    const emit = (side, k, c) => {
      const a0 = idOf(c.ARG0), a1 = idOf(c.ARG1);
      if (a0 && a1) claims.push({ ground: `/p${id}`, rel: c.rel, roles: { ARG0: a0, ARG1: a1 }, polarity: c.polarity, id: `${side}${id}.${k}` });
      // a superlative has one holder in its group ("the smallest planet in our solar system"): who holds it is one-valued
      if (c.rel === "be" && c.ARG1?.sup && a0) claims.push({ ground: `/p${id}`, rel: `most:${c.ARG1.sup}:${c.ARG1.head}`, roles: { ARG0: a0, ARG1: c.ARG1.head }, polarity: c.polarity, id: `${side}${id}.${k}m` });
      const st = c.rel === "be" && c.ARG1 ? stateOf(c.ARG1.head) : null;
      if (st && a0) claims.push({ ground: `/p${id}`, rel: `state:${st}`, roles: { ARG0: a0, ARG1: c.ARG1.head }, polarity: c.polarity, id: `${side}${id}.${k}s` });
    };
    S.forEach((c, k) => emit("s", k, c)); C.forEach((c, k) => emit("c", k, c));
  }
  const most = [...new Set(claims.filter((c) => c.rel.startsWith("most:")).map((c) => c.rel))];
  const declare = { functional: [...most.map((rel) => ({ rel, role: "ARG0", giver: "declared: a superlative has one holder in its group" })), ...ONE_MAKER.map((rel) => ({ rel, role: "ARG0", giver: "declared: one maker per made thing" })), ...Object.keys(STATES).map((st) => ({ rel: `state:${st}`, role: "ARG1", giver: "declared: one value of a state at a time" }))] };
  const r = spawnSync(process.execPath, [REASON, "--json"], { input: JSON.stringify({ claims, declare }), encoding: "utf8", maxBuffer: 1 << 26, timeout: 120000 });
  const out = new Set();
  try { for (const f of JSON.parse(r.stdout).findings ?? []) if (f.kind === "standing_contradiction") { const ids = f.claims ?? []; if (ids.some((x) => x.startsWith("c")) && ids.some((x) => x.startsWith("s"))) out.add(ids[0].slice(1).split(".")[0]); } } catch { /* janus gave nothing readable: no contradiction is claimed */ }
  return out;
}
