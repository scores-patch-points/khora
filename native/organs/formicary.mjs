// organs/formicary.mjs — THE FORMICARY: the user-bound PATTERN layer (the owner, 2026-11-24: "the Corpus, the scholia, and the formicary"; ground = the source files, figure = the scholia (Ýlir-One's readings), pattern = attention).
// Aliases the owner gave: the log, the shadow, the impression, the trails, the pheromone trails. Canonical name in code and files: formicary.
//
// WHAT IT IS. One colony per user: a small, fading record of WHERE THAT USER'S QUESTIONS WERE ANSWERED, laid as pheromone trails over the ADDRESSES of the other two layers: a document by the sha256 of its bytes
// (`doc:<sha256>`), a sentence in it (`doc:<sha256>#<k>`, k = the address the scholia's `at` and `sentences()` use), a word (`lemma:<lang>:<word>`). It holds no text and no values. It is built on the kernel's stigmergy
// (kernel/stigmergy.js) and the trail store (organs/trail-store.mjs): a head (the marks of the question, never its words) is the place, a target address is the route, and the store gives the learned order.
//
// THE LAW IT KEEPS (eodb-clone/facade/SIG.md, pharos/eoql/SIG-ANSWER.md; the numbers are in those files):
//   1. A trail is a pointer with no value. It may change what is READ FIRST and what that costs; it may never change an answer. `order()` returns a PERMUTATION of the candidates it was given: nothing added, nothing dropped.
//   2. Presence can only cause more looking; absence proves nothing. An address with no trail is not "unlikely", it is untried, and untried candidates keep the caller's order after the earned ones.
//   3. Deposit only on a VERIFIED use (the sentence was cut from the file and its sha256 checked, or the answer was accepted): `lay` refuses without `verified: true`. Most things are used once; marking every lookup is waste.
//   4. An alarm (a wrong answer) forgets what the route had deposited before it.
//   5. The fade is the measured power law (kernel `law: "power"`, alpha 1.2), not a hand-set half-life.
//   6. A head is MARKS, not text: a string with whitespace or longer than 160 characters is refused (HEAD_IS_TEXT). The formicary never stores a question's words.
//   7. The user can forget everything: `forgetAll()` deletes the file.
// NOT BUILT HERE (stated, not hidden): promotion of a trail to a synapse or an expressway (it needs the held-out check in pharos/docs/PROPOSAL-SIG-FOLD.md); forgetting one head; wiring into the hunt (fork 2's organs call `order` and `lay`).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeTrailStore } from "./trail-store.mjs";
import { TRAIL_POWER_ALPHA } from "../kernel/stigmergy.js";

export const FORMICARY_SCHEMA = "Formicary@1";
export class FormicaryError extends Error { constructor(code, message) { super(message); this.code = code; this.name = "FormicaryError"; } }
const USER = /^[A-Za-z0-9._-]+$/, SHA = /^[0-9a-f]{64}$/;   // regex-ok: an identifier and a hash, not language

/** The address of a target. A string is taken as an address already (doc:…, lemma:…); an object is { doc | hash, k? } or { lemma, lang }. */
export function addrOf(t) {
  if (typeof t === "string") { if (!/^(doc:[0-9a-f]{64}(#\d+)?|lemma:[a-z]{2,3}:\S+)$/.test(t)) throw new FormicaryError("BAD_ADDRESS", `not an address of the scholia: ${String(t).slice(0, 80)}`); return t; }   // regex-ok: the shape of an address
  if (t && (t.doc ?? t.hash) !== undefined) { const h = String(t.doc ?? t.hash); if (!SHA.test(h)) throw new FormicaryError("BAD_ADDRESS", "a document is addressed by the sha256 of its bytes (64 hex)"); return Number.isInteger(t.k) ? `doc:${h}#${t.k}` : `doc:${h}`; }
  if (t && t.lemma !== undefined) { if (!t.lang) throw new FormicaryError("BAD_ADDRESS", "a word is addressed with its language: { lemma, lang }"); return `lemma:${t.lang}:${t.lemma}`; }
  throw new FormicaryError("BAD_ADDRESS", "a target is an address string, { doc, k? } or { lemma, lang }");
}
/** A head from the marks of a question (its content lemmas and roles, in any order): sorted and joined. Never the question's words as a sentence. */
export function headOf(marks) {
  const m = (Array.isArray(marks) ? marks : [marks]).map((x) => String(x ?? "").trim()).filter(Boolean);
  if (!m.length) throw new FormicaryError("HEAD_IS_TEXT", "a head needs at least one mark");
  if (m.some((x) => /\s/.test(x))) throw new FormicaryError("HEAD_IS_TEXT", "a head is marks (lemmas, roles), not text: a mark with a space is a phrase");   // regex-ok: whitespace in an identifier, not language
  const h = [...new Set(m)].sort().join("+"); if (h.length > 160) throw new FormicaryError("HEAD_IS_TEXT", "a head longer than 160 characters is text"); return h;
}
const headKey = (head) => (Array.isArray(head) ? headOf(head) : typeof head === "string" && /^\S{1,160}$/.test(head) ? head : (() => { throw new FormicaryError("HEAD_IS_TEXT", "a head is one token of marks (use headOf([...]))"); })());   // regex-ok: no whitespace, not language

/** One user's formicary. `onMark(mark)` (optional, e.g. trail-store's pharosMarkWriter) is offered every deposit, alarm and mark with `user` added. */
export function openFormicary({ user, dir = path.join(os.homedir(), ".khora", "formicary"), now = () => Date.now(), law = "power", alpha = TRAIL_POWER_ALPHA, onMark = null, explore = 0.1 } = {}) {
  if (!user || !USER.test(String(user))) throw new FormicaryError("BAD_USER", "a formicary is opened for a user named with letters, digits, . _ -");
  const file = path.join(dir, `${user}.formicary.json`), sink = onMark ? Object.assign((m) => onMark({ ...m, user }), { status: () => onMark.status?.() ?? { on: true }, flush: () => onMark.flush?.() ?? Promise.resolve() }) : null;
  const make = () => makeTrailStore({ name: `formicary:${user}`, file, now, law, alpha, onMark: sink });
  let store = make();
  return {
    schema: FORMICARY_SCHEMA, user, file, law, alpha,
    /** a VERIFIED use: the target answered this head. Refused unless `verified: true` (the caller cut the sentence and checked the sha256, or the answer was accepted). */
    lay(head, target, { verified = false, ms = 0 } = {}) { if (verified !== true) throw new FormicaryError("NOT_VERIFIED", "a trail is laid only on a verified use: pass { verified: true } after the span was cut and its sha256 checked"); store.deposit(headKey(head), addrOf(target), true, ms); },
    /** an attempt that did not answer: it earns nothing, it only marks the target as tried */
    tried(head, target, { ms = 0 } = {}) { store.deposit(headKey(head), addrOf(target), false, ms); },
    /** a wrong answer from this target for this head: what it had deposited before no longer counts */
    alarm(head, target, why = null) { store.veto(headKey(head), addrOf(target), why); },
    /** the candidates in the learned order for this head: earned (strongest first), then untried (as given), then dead; a scout may go first. ALWAYS a permutation of the input. */
    order(head, candidates, { explore: e = explore, rng = Math.random } = {}) {
      const h = headKey(head), items = [...candidates], keys = items.map((c) => addrOf(c)), uniq = [...new Set(keys)], ordered = store.orderFor(h, uniq, { explore: e, rng }), rank = new Map(ordered.map((a, i) => [a, i]));
      return items.map((it, i) => ({ it, i, r: rank.get(keys[i]) })).sort((a, b) => a.r - b.r || a.i - b.i).map((x) => x.it);
    },
    strength(head, target) { return store.stats(headKey(head), [addrOf(target)])[0]?.strength ?? 0; },
    known(head) { return store.known(headKey(head)); },
    snapshot() { return store.snapshot(); },
    pharos() { return store.pharos(); }, flush() { return store.flush(); },
    /** the user's right to be forgotten: the file is deleted and the colony starts empty */
    forgetAll() { try { fs.rmSync(file, { force: true }); } catch { /* none */ } store = make(); return true; },
  };
}
