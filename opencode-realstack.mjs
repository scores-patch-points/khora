// opencode-realstack.mjs — PROTOTYPE wiring (experiment, not shipped): an opencode session's turns read through the
// stack's own organs instead of opencode-surf's lexical ladder.
//   READ    khora native/adapters/code/edges.js::readEdges   the orders the code states (calls/imports), with byte spans
//   WEFT    native/the-fold/weft.js                           append-only passes, cloth projected at a cursor, reopen by address
//   SPIRAL  janus organs/reasoning-spiral.js                  claims with standing; withdrawal suspends dependants
// Nothing here reasons by itself: it maps edits -> passes, asks -> pointers, claims -> spiral events, as claude-code-spiral.mjs does.
import { readEdges, keywordsFor, resolveLanguage } from "./native/adapters/code/edges.js";
import { emptyWeft, appendPass, clothAt, reopen } from "./native/the-fold/weft.js";
import { appendReasoning, reasoningAt } from "../janus/native/organs/reasoning-spiral.js";

const BY = "khora:adapters/code/edges.js#readEdges";
const tokensOf = (id) => String(id).replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const askTerms = (ask) => new Set((String(ask).toLowerCase().match(/[a-z0-9]{3,}/g) ?? []));

export function createSession() {
  let weft = emptyWeft(), seqOfTurn = new Map(), log = [], turn = 0;
  const versions = new Map(); // `${file}@${turn}` -> text
  const read = (source) => versions.get(source) ?? null;

  function ingest({ n, edits = [] }) {
    turn = n;
    for (const { file, text } of edits) {
      const language = resolveLanguage(null, file); if (!language) continue;
      const r = readEdges({ text, language, fileName: file, keywords: keywordsFor(language)?.keywords ?? null });
      const address = `${file}@${n}`; versions.set(address, text);
      weft = appendPass(weft, {
        address, file, turn: n,
        cast: r.declared.map((d) => ({ ref: d.name, surface: d.name, mentionsAt: [d.at] })),
        relations: r.calls.map((c) => ({ relation: "calls", at: c.at, end: c.end, participants: [{ surface: c.caller, standing: "referent" }, { surface: c.callee, standing: "referent" }] })),
      });
    }
    seqOfTurn.set(n, weft.length - 1);
  }

  /** The weft's passes a reader would trust at turn `asOf`: the LATEST pass per file (clothAt itself cannot retract). */
  function livePasses(asOf = Infinity) {
    const last = new Map();
    for (const p of weft) if (p.turn <= asOf) last.set(p.file, p);
    return [...last.values()].sort((a, b) => a.seq - b.seq);
  }
  function edgesAt(asOf = Infinity) {
    const out = [];
    for (const p of livePasses(asOf)) {
      const cloth = clothAt(Object.freeze([p]));
      for (const rel of cloth.relations) {
      const r = p.relations.find((x) => x.participants[0].surface === rel.participants[0] && x.participants[1].surface === rel.participants[1]);
      out.push({ caller: rel.participants[0], callee: rel.participants[1], address: rel.address, span: `${p.address}#${r.at}-${r.end}`, file: p.file, turn: p.turn });
      }
    }
    return out;
  }
  /** Pointers for an ask: edges whose identifiers share a term with the ask, plus `hops` of callees (the dependencies the ask does not name). */
  function find(ask, { asOf = Infinity, hops = 1, max = 8 } = {}) {
    const terms = askTerms(ask), edges = edgesAt(asOf);
    const hit = (e) => [...tokensOf(e.caller), ...tokensOf(e.callee), e.caller.toLowerCase(), e.callee.toLowerCase()].some((t) => terms.has(t));
    let picked = edges.filter(hit), frontier = new Set(picked.map((e) => e.callee));
    for (let h = 0; h < hops; h++) {
      const more = edges.filter((e) => frontier.has(e.caller) && !picked.includes(e));
      picked = picked.concat(more); frontier = new Set(more.map((e) => e.callee));
    }
    return picked.slice(0, max).map((e) => ({ ...e, pointer: e.address, bytes: reopen(e.address, { read, span: 80 }).text ?? null }));
  }

  // ── claims: standing is read off the code, never edited ──
  const claimed = new Map();
  function claim({ id, agent, caller, callee, premises = [], cite = null, asOf = Infinity }) {
    const edge = edgesAt(asOf).find((e) => e.caller === caller && e.callee === callee);
    const witnesses = cite ? [cite] : edge ? [edge.span] : [];
    log = appendReasoning(log, { kind: "propose", id, forWhom: agent, relation: { subject: caller, verb: "calls", object: callee }, witnesses, ...(premises.length ? { premises } : {}) });
    log = appendReasoning(log, edge
      ? { kind: "assess", id, verdict: "supported", method: premises.length ? "deduction" : "testimony", by: BY, basis: "call edge present", license: "rule:edge", witnesses }
      : { kind: "assess", id, verdict: "refuted", method: "deduction", by: BY, basis: "no call edge in the live file", license: "rule:edge" });
    claimed.set(id, { caller, callee, agent });
    return standing(id);
  }
  const standing = (id, asOfSeq = Infinity) => reasoningAt(log, { asOf: asOfSeq }).claims.find((c) => c.id === id)?.standing ?? null;
  /** Re-test every claim against the live code at `asOf`; a claim whose edge has gone is withdrawn (its dependants suspend). */
  function retest(asOf = Infinity) {
    const edges = edgesAt(asOf);
    for (const [id, c] of claimed) {
      const now = reasoningAt(log).claims.find((x) => x.id === id);
      if (now?.standing === "supported" && !edges.some((e) => e.caller === c.caller && e.callee === c.callee))
        log = appendReasoning(log, { kind: "withdraw", id, basis: `call edge gone at turn ${asOf}` });
    }
  }
  return { ingest, find, edgesAt, claim, standing, retest, reopen: (a) => reopen(a, { read, span: 80 }), get weft() { return weft; }, get log() { return log; }, get turn() { return turn; }, claims: () => reasoningAt(log).claims };
}
