// opencode-janus.mjs — WHAT FOLLOWS FROM THE NUMBERS, decided by Janus (cli/reason.mjs: equations by mathjs), not by this file.
//
// The Fold's judge (vendor/the-fold/fold-chat-falsify-answer.js) reads words, names, figures and polarity. It does not read ORDER
// ("after 1900") or COUNT ("won two prizes", an aggregate over several facts). Both are arithmetic over numbers the source itself
// states, so they are handed to Janus as equations and the verdict is Janus's own finding ("the declared oracle refutes it" /
// "confirms it"), never this file's comparison. This file only (1) READS the numbers out of the claim and out of the source's own
// sentences, mechanically, and (2) carries the finding back with the source sentences it counted.
//
// An operator that cannot read a number refuses (returns null) and the claim keeps the Fold's verdict. A count the source does not
// reach (it lists fewer than the claim says) is NOT a refutation: the source is silent on the rest — it is flagged, never convicted.
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const REASON = path.join(here, "cli", "reason.mjs");
// Janus writes a reasoning record under $HOME/.claude/eo-reason; the grounding check keeps its own home so the person's is untouched.
const HOME = process.env.FOLD_JANUS_HOME ?? path.join(os.homedir(), ".cache", "fold-research", "janus-home");

const NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, twice: 2, thrice: 3 };
const STOP = new Set("the a an and or of in to with by for on at from as is are was were be been has have had it its this that these those which who".split(" "));
const stem = (w) => String(w).toLowerCase().replace(/(?:ing|ed|es|s|ly|ion|ions)$/u, "").slice(0, 5);
const wordsOf = (t) => String(t ?? "").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
const sentencesOf = (t) => String(t ?? "").replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[\p{Lu}\p{N}"“(])/u).map((s) => s.trim()).filter((s) => s.length > 3);

const ORDER = /\b(after|before|since|until|prior to)\s+(?:the\s+year\s+)?(\d{4})\b/i;

/** "after 1900" read from the claim: the bound and the direction. null when it is not an ordered claim. */
export function orderOf(claim) {
  const m = ORDER.exec(claim);
  if (!m || (String(claim).match(/\b\d{4}\b/g) ?? []).length !== 1) return null;
  return { bound: Number(m[2]), after: /after|since/i.test(m[1]), word: m[1].toLowerCase() };
}

/** "won two Nobel Prizes": the count the claim states and the thing it counts (the noun after it, by stem), or null. */
export function countOf(claim) {
  const m = /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d{1,3})\s+(?:[a-z-]+\s+){0,2}?([a-z]{4,})\b/i.exec(String(claim));
  if (!m) return null;
  const n = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMW[m[1].toLowerCase()];
  if (!Number.isFinite(n) || n < 2 || n > 99) return null; // "one"/1 is a presence claim, not an aggregate
  const noun = m[2].toLowerCase();
  if (STOP.has(noun) || /^(years?|times?|days?|months?|people)$/.test(noun)) return null;
  // a year in the claim scopes the count to that year; the operator does not read scoped counts
  if (/\b(1\d{3}|20\d{2})\b/.test(claim)) return null;
  return { n, noun, nounStem: stem(noun), exact: !/\b(at least|more than|over|up to|nearly|about)\b/i.test(claim) };
}

/** The subject's own sentences: those naming every word of the claim's lead name (or its surname) and the claim's verb stem. */
function relevantSentences(claim, subject, passages) {
  const subj = wordsOf(subject).filter((w) => !STOP.has(w));
  const verbs = wordsOf(claim).filter((w) => !STOP.has(w) && !subj.includes(w) && !NUMW[w] && !/^\d+$/.test(w) && w.length > 2).map(stem);
  const out = [];
  for (const p of passages) {
    for (const s of sentencesOf(p.text)) {
      const sw = wordsOf(s);
      if (subj.length && !subj.some((x) => sw.includes(x))) continue;
      const have = new Set(sw.map(stem));
      if (verbs.filter((v) => have.has(v)).length < 2) continue;
      out.push({ text: s, source: p.name });
    }
  }
  return out;
}

/** The equations a claim yields over its source's own numbers: { ref, statement, kind, label, evidence[] } or null. */
export function equationsFor(claim, passages) {
  const subject = claim.beings?.[0] ?? "";
  const order = orderOf(claim.text);
  if (order) {
    const rows = relevantSentences(claim.text, subject, passages).map((s) => ({ ...s, years: [...new Set((s.text.match(/\b(1\d{3}|20\d{2})\b/g) ?? []).map(Number))] })).filter((s) => s.years.length);
    if (!rows.length) return null;
    const row = rows[0];
    // the source's own year, against the claim's bound: "after 1900" is `year > 1900` for the year the source gives
    const year = order.after ? Math.max(...row.years) : Math.min(...row.years);
    return { kind: "order", statement: order.after ? `${year} > ${order.bound}` : `${year} < ${order.bound}`, label: `the source gives ${row.years.join(", ")}; the claim says ${order.word} ${order.bound}`, evidence: [row] };
  }
  const count = countOf(claim.text);
  if (count) {
    // aggregate: every distinct mention of the counted thing across the subject's own sentences, qualifier-deduped
    // ("the Nobel Prize in Physics" and "the Nobel Prize in Chemistry" are two; the same prize said twice is one)
    const seen = new Map();
    const evidence = [];
    const relevant = relevantSentences(claim.text, subject, passages);
    for (const s of relevant) {
      const toks = s.text.match(/[\p{L}\p{N}]+/gu) ?? [];
      toks.forEach((w, i) => {
        if (stem(w) !== count.nounStem) return;
        const qualifier = /^(in|of|for)$/i.test(toks[i + 1] ?? "") ? toks.slice(i + 1, i + 3).join(" ").toLowerCase() : `${s.source}:${i}`;
        if (!seen.has(qualifier)) { seen.set(qualifier, s.text); if (!evidence.some((e) => e.text === s.text)) evidence.push(s); }
      });
    }
    // A count the source STATES ("the first person to win two Nobel Prizes"): the number word right before the counted noun in a
    // sentence naming the WHOLE subject (not "the Curie family", not "she and Pierre"). That is the source's own total. Two
    // different stated counts, or none: the source is not clear and the operator refuses.
    const whole = wordsOf(subject).filter((w) => !STOP.has(w));
    const stated = new Map();
    for (const s of relevantSentences(claim.text, subject, passages)) {
      const sw = wordsOf(s.text);
      if (whole.length && !whole.every((w) => sw.includes(w))) continue;
      const m = new RegExp(`\\b(${Object.keys(NUMW).join("|")})\\s+(?:[a-z-]+\\s+){0,2}${count.noun.slice(0, 5)}[a-z]*`, "i").exec(s.text);
      if (m && !stated.has(NUMW[m[1].toLowerCase()])) stated.set(NUMW[m[1].toLowerCase()], { s, m });
    }
    if (stated.size > 1) return null;
    if (stated.size === 1) {
      const [[total, { s: row, m }]] = [...stated.entries()];
      return { kind: "count", statement: `${total} == ${count.n}`, label: `the source says ${total} (“${m[0]}”); the claim says ${count.n}`, evidence: [row], found: total, claimed: count.n, stated: true };
    }
    // no stated total: the subject's own listed mentions are a LOWER BOUND, and only where the source is short enough to list them
    if (relevant.length > 8) return null;
    if (!seen.size) return null;
    const k = seen.size;
    return { kind: "count", statement: `${k} >= ${count.n}`, label: `the source lists ${k} (${[...seen.keys()].join("; ")}); the claim says ${count.n}`, evidence, found: k, claimed: count.n };
  }
  return null;
}

/** Janus's verdict on equations: Map ref → { holds, finding }. One process for all of them. */
export function reasonEquations(equations, { timeoutMs = 15_000 } = {}) {
  if (!equations.length) return Promise.resolve(new Map());
  fs.mkdirSync(HOME, { recursive: true });
  return new Promise((resolve) => {
    const out = [];
    const child = spawn(process.execPath, [REASON, "--json", "--compact"], { env: { ...process.env, HOME }, stdio: ["pipe", "pipe", "ignore"] });
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.stdout.on("data", (d) => out.push(d));
    child.on("close", () => {
      clearTimeout(timer);
      const verdicts = new Map();
      try {
        const report = JSON.parse(Buffer.concat(out).toString("utf8"));
        for (const f of report.findings ?? []) {
          if (f.kind === "claim_fails_oracle") verdicts.set(f.at, { holds: false, finding: f.detail });
          else if (f.kind === "claim_holds") verdicts.set(f.at, { holds: true, finding: f.detail });
        }
      } catch { /* janus gave no report: no verdicts, never a guess */ }
      resolve(verdicts);
    });
    child.stdin.end(JSON.stringify({ claims: [], declare: {}, equations: equations.map((e) => ({ ref: e.ref, statement: e.statement })) }));
  });
}

/** The claims the Fold's judge left unsupported, re-judged by arithmetic over their source's own numbers, by Janus. */
export async function janusPass(claims, passages) {
  const todo = claims.flatMap((c, i) => (c.standing === "unsupported" ? [{ c, i, eq: equationsFor(c, passages) }] : [])).filter((x) => x.eq);
  if (!todo.length) return claims;
  const refs = todo.map((x, n) => ({ ...x, ref: `${x.eq.kind}${n}` }));
  const verdicts = await reasonEquations(refs.map((x) => ({ ref: x.ref, statement: x.eq.statement })));
  return claims.map((c, i) => {
    const x = refs.find((y) => y.i === i);
    const v = x && verdicts.get(x.ref);
    if (!x || !v) return c;
    const first = x.eq.evidence[0];
    const evidence = { source: first.source, ref: first.source, text: x.eq.evidence.map((e) => e.text).join(" ").slice(0, 320) };
    const checked = [...(c.searched ?? []), `janus: ${x.eq.statement}`];
    // a count the source does not reach is the source's silence, not a refutation
    if (x.eq.kind === "count" && !x.eq.stated && !v.holds) return { ...c, why: `${x.eq.label} — the source does not reach it`, evidence, searched: checked, janus: { statement: x.eq.statement, finding: v.finding } };
    // one clause's arithmetic does not carry a compound claim: "two councillors argued, and the council approved it" is not
    // supported by counting the councillors. Janus can still REFUTE any clause; it supports only a claim that is one clause.
    const compound = /[,;]|\b(?:and|but|while|whereas|although)\b/i.test(c.text.replace(/\b(?:and|between|among)\s+\d/gi, ""));
    if (v.holds && compound) return { ...c, why: `${x.eq.label} — that part checks out; the rest of the sentence is not stated by the source`, searched: checked, janus: { statement: x.eq.statement, finding: v.finding } };
    return v.holds
      ? { ...c, standing: "supported", evidence, why: x.eq.label, searched: checked, janus: { statement: x.eq.statement, finding: v.finding } }
      : { ...c, standing: "contradicted", evidence, why: x.eq.label, searched: checked, janus: { statement: x.eq.statement, finding: v.finding } };
  });
}
