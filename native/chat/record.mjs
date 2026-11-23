// native/chat/record.mjs — EVERYTHING THE CHAT DOES IS WRITTEN TO PHAROS.
// A statement writes its read: the facts it added (the kāraka frames) and the cast (every referent with its forms, and the identity edges).
// A question writes the nine-operator turn through foldcode's own weave (demo/record.mjs: void, thought, candidate, verdict, utterance or
// empty), so a later system reads the same marks and behaves the same. The text itself is written only as the user's own sentences in
// this thread's log (the chat's own record), never to the khora gate's log.
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import { weaveAsk } from "../demo/record.mjs";

const here = new URL(".", import.meta.url).pathname;
const pharosHome = process.env.PHAROS_HOME ? path.resolve(process.env.PHAROS_HOME) : path.resolve(here, "..", "..", "..", "pharos");
const P = await import(pathToFileURL(path.join(pharosHome, "lib", "pharos.mjs")).href);

export const LOG_DIR = process.env.CHAT_PHAROS_DIR || path.join(os.homedir(), ".pharos", "fold-demo");   // the same log foldcode's demo writes to
export function openLog() {
  const h = P.open("fold-demo", { dir: LOG_DIR, writer: "khora-chat" });
  for (const [name, cell] of [["utterance", "REC·Figure"], ["statement", "INS·Figure"], ["referent", "INS·Figure"], ["identity", "SYN·Pattern"], ["frame", "SYN·Pattern"], ["void", "DEF·Ground"], ["thought", "INS·Figure"], ["candidate", "SEG·Pattern"], ["binding", "CON·Figure"], ["verdict", "EVA·Figure"], ["empty", "NUL·Figure"]]) {
    try { P.weave(h, { cell: "DEF·Figure", kind: "kind", addr: `kind:${name}`, body: { name, cell } }); } catch { /* already declared */ }
  }
  return h;
}

/** a statement: the sentence as said (the thread's own log), the frames it added, the cast so far; one weaveMany */
export function weaveSay(h, threadId, text, r, cast) {
  const batch = [{ cell: "INS·Figure", kind: "statement", addr: `${threadId}:s${r.sentences}:${Date.now()}`, body: { thread: threadId, text, sentences: r.sentences } }];
  r.facts.forEach((f, i) => batch.push({ cell: "SYN·Pattern", kind: "frame", addr: `${threadId}:o${f.order}:${f.action}:${i}`, body: { thread: threadId, action: f.action, order: f.order, roles: f.roles.map((x) => ({ role: x.role, text: x.text })) } }));
  for (const b of cast?.referents ?? []) if (b.kind !== "nominal" || b.mentions > 1) batch.push({ cell: "INS·Figure", kind: "referent", addr: `${threadId}:${b.ref}`, body: { thread: threadId, kind: b.kind ?? "name", forms: (b.forms ?? []).slice(0, 12), mentions: b.mentions ?? 0, contested: b.contested ?? 0, first: b.first ?? null, last: b.last ?? null, pronouns: (b.pronouns ?? []).slice(0, 8), proform: b.proform ? { cls: b.proform.cls, contested: !!b.proform.contested } : null } });
  for (const e of cast?.edges ?? []) if (e.type !== "same-head") batch.push({ cell: "SYN·Pattern", kind: "identity", addr: `${threadId}:${e.a}~${e.b}:${e.type}`, body: { thread: threadId, a: e.a, b: e.b, type: e.type, n: e.n ?? 1 } });
  P.weaveMany(h, batch);
  return batch.length;
}

/** a question: the nine-operator turn (foldcode's weave) from the thread's answer */
export function weaveQuestion(h, r) {
  const turn = {
    question: r.question, type: r.type, void: { kind: r.type, layer: r.type === "relational" || r.type === "answer" ? "structure" : "existence" }, admits: null,
    thought: { layer: null, steps: r.trace ?? [] }, answer: r.handled ? r.text : undefined, reason: r.handled ? undefined : (r.gap ?? "no grounded answer"),
    ...(r.ref ? { binding: { pronoun: null, ref: r.ref } } : {}),
  };
  return weaveAsk(h, turn, r.handled ? r.text : null);
}
