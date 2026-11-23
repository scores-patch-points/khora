// demo/fold-store.mjs — the fold as state: read a text into kāraka triples (append-only), then ask
// questions against the accumulated fold. This is the "add to the relevant fold" loop made concrete:
// every read APPENDS triples to the fold, every ask declares the void and narrows the fold to the
// answer, and the DMD trace names which triple matched and which were cut. The parser model is
// injected (the demo server owns loading it).
import { rowsOf } from "../adapters/text/ask-live.mjs";
import { questionDag } from "../adapters/text/ask.mjs";
import { fillGap } from "../adapters/text/gap-fill.js";
import { readQuestion } from "../adapters/text/question-grammar.en.js";
import { threadOf } from "../adapters/text/coherence.js";

const unwrap = (v) => (Array.isArray(v) && v.length === 1 ? v[0] : v);
const LEMMA = (row) => String(row.lemma ?? row.form ?? "").toLowerCase();
const tripleKey = (t) => JSON.stringify(Object.fromEntries(Object.entries(t).filter(([k]) => k !== "surface").map(([k, v]) => [k, Array.isArray(v) ? [...v].sort() : v]).sort(([a], [b]) => (a[0] < b[0] ? -1 : 1))));

// build one relation's triple with BOTH the lemma roles (for the DMD match) and the surface forms
// (for voicing). The surface is the parser's own forms with its determiners and case markers, so the
// mouth quotes the reading, never invents a word. A COPULAR root ("Today is tuesday": the root is the
// predicate nominal, "is" is a cop) becomes a "be" fact, not an action: be(subject, nominal).
function triplesWithSurface(rows) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const neg = rows.some((r) => /^(not|n't|never)$/i.test(r.form));
  return rows.filter((r) => r.head === 0 && r.upos !== "PUNCT").map((root) => {
    const cop = rows.find((r) => r.deprel === "cop" && r.head === root.id);
    if (cop && ["NOUN", "PROPN", "ADJ", "PRON", "NUM"].includes(root.upos)) {
      // the subject is the noun before the cop IN THIS SAME sentence (head-chain reaches this root),
      // not every noun earlier in a multi-sentence read.
      const subjRows = rows.filter((r) => {
        if (!["NOUN", "PROPN", "PRON"].includes(r.upos)) return false;
        if (r.id >= cop.id) return false;
        let n = r; while (n && n.id !== root.id) n = byId.get(n.head);
        return n === root;
      });
      const subj = subjRows.map((r) => r.form).join(" ");
      const t = { predicate: "be", neg, surface: { predicate: cop.form } };
      if (subj) { t.kartṛ = [subj.toLowerCase()]; t.surface.kartṛ = subj; }
      t.karman = [LEMMA(root)]; t.surface.karman = root.form;
      return t;
    }
    const t = { predicate: LEMMA(root), neg, surface: { predicate: root.form } };
    const attach = (row) => {
      const kase = rows.find((r) => r.deprel === "case" && r.head === row.id);
      const det = rows.find((r) => r.deprel === "det" && r.head === row.id);
      return ((kase ? kase.form + " " : "") + (det ? det.form + " " : "") + row.form).trim();
    };
    for (const r of rows) {
      if (r === root || !r.karaka) continue;
      let n = r; while (n && n.id !== root.id) n = byId.get(n.head);
      if (!n) continue;
      const v = LEMMA(r);
      if (t[r.karaka] === undefined) t[r.karaka] = [];
      t[r.karaka].push(v);
      if (t.surface[r.karaka] === undefined) t.surface[r.karaka] = attach(r);
    }
    return t;
  });
}

export function makeFold({ model }) {
  let triples = [];
  let turns = [];
  let cast = new Map(); // the beings the reading admitted: lemma -> surface (the referents of "who is X")
  let lastPersonRef = null; // the most recent person the fold held — what bare "he"/"she" refers to

  const read = (text) => {
    const rows = rowsOf(model, text);
    const newCast = [];
    for (const r of rows) if (r.upos === "PROPN") { const l = LEMMA(r); lastPersonRef = l; if (!cast.has(l)) { cast.set(l, r.form); newCast.push({ lemma: l, surface: r.form }); } }
    // a first-person statement ("I just told you") is a move in the conversation, not a world fact:
    // it is not read into the fold.
    const added = triplesWithSurface(rows).filter((t) => !(t.kartṛ ?? []).some((a) => a === "i" || a === "we"));
    // append-only: a triple already in the fold is not added twice (the fold is a set, not a bag).
    const seen = new Set(triples.map(tripleKey));
    const fresh = added.filter((t) => { const k = tripleKey(t); if (seen.has(k)) return false; seen.add(k); return true; });
    triples = triples.concat(fresh);
    const turn = { kind: "read", text, added: fresh.length, triples: fresh, cast: newCast, foldSize: triples.length };
    turns.push(turn);
    return turn;
  };

  // the relations a cast member stands in, as surface forms, so "who is Mina" is answered by her place
  // in the fold, not by the dictionary's generic senses.
  const referent = (name) => triples.filter((t) => Object.entries(t).some(([k, v]) => k !== "surface" && Array.isArray(v) && v.includes(name))).map((t) => t.surface);

  // attention: the most recent subject the fold held — what a bare "it" refers to next.
  const lastSubject = () => { for (let i = triples.length - 1; i >= 0; i--) { const a = triples[i].kartṛ; if (a && a.length) return a[0]; } return null; };

  // the most recent person the fold held — what a bare "he"/"she" refers to next.
  const lastPerson = () => lastPersonRef;

  // admit a referent (a person the reference layer resolved, or a being the read named), so pronouns
  // can resolve to it — the reference layer inscribes, it does not just look up.
  const personDescriptions = new Map();
  const admit = (name, surface = null, description = null) => { const l = String(name ?? "").toLowerCase(); if (!l) return; lastPersonRef = l; if (!cast.has(l)) cast.set(l, surface ?? l); if (description && !personDescriptions.has(l)) personDescriptions.set(l, description); };
  const describe = (name) => personDescriptions.get(String(name ?? "").toLowerCase()) ?? null;

  // resolve a pronoun in a filled role: "he"/"she" -> the last person, "it" -> the last subject.
  const resolvePronouns = (filled) => {
    const out = {};
    for (const [k, v] of Object.entries(filled)) {
      const lv = String(v).toLowerCase();
      out[k] = (lv === "he" || lv === "she") ? (lastPerson() ?? v) : (lv === "it" ? (lastSubject() ?? v) : v);
    }
    return out;
  };;

  const ask = (question) => {
    const qRows = rowsOf(model, question);
    const q = readQuestion(question, { model });
    const admits = q.admits;
    const words = q.words ?? [];
    const root = q.relation ?? null;
    // META: a question about the conversation itself ("are you sure?") reasons over the turns — what
    // has been said and answered — not over the fold's world-facts. The thread is the growing log.
    if (qRows.some((r) => (r.lemma ?? r.form ?? "").toLowerCase() === "sure")) {
      const last = [...turns].reverse().find((t) => t.kind === "ask");
      const grounded = !!(last && (last.voiced || last.answer || last.matched));
      const turn = {
        kind: "ask", type: "meta", question, admits, words,
        void: { kind: "meta", about: last?.question ?? null, layer: "significance" },
        answer: grounded ? "yes" : "no", lastVoiced: last?.voiced ?? null, lastQuestion: last?.question ?? null,
      };
      turns.push(turn);
      return turn;
    }
    // KIND: "what kind of X is that" / "what kind is X" -> the kind hierarchy (an existence tension).
    if (qRows.some((r) => (r.lemma ?? r.form ?? "").toLowerCase() === "kind")) {
      const target = root?.lemma ?? words.find((w) => w !== "kind") ?? null;
      const turn = { kind: "ask", type: "kind", question, target, admits, words, void: { kind: "kind", target, layer: "existence" } };
      turns.push(turn);
      return turn;
    }
    // TIME: the question asks for the PRESENT moment ("what day/time/date is it", "what is the date") —
    // the kāla kāraka, answered from the clock, not from the fold. "what is A date" (the fruit) is not
    // this: it carries no present-moment marker.
    const timeWord = ["day", "time", "date"].find((w) => words.includes(w));
    const presentMoment = qRows.some((r) => ["it", "the", "today", "now"].includes((r.lemma ?? r.form ?? "").toLowerCase()));
    if (q.form === "wh" && timeWord && presentMoment) {
      const turn = { kind: "ask", type: "time", question, admits: "time", words, timeWord, void: { kind: "time", word: timeWord, layer: "existence" } };
      turns.push(turn);
      return turn;
    }
    // LOCATION: "where am I" — the user's own place, answered from the clock's timezone (a code-giver).
    const hasI = qRows.some((r) => (r.lemma ?? r.form ?? "").toLowerCase() === "i");
    if (q.form === "wh" && admits === "place" && hasI) {
      const turn = { kind: "ask", type: "location", question, admits, words, void: { kind: "location", layer: "existence" } };
      turns.push(turn);
      return turn;
    }
    // a copular/equational WH question ("what is X", "who is X") is definitional, not relational: the
    // parser makes the nominal predicate the root, so the root is a noun/adjective/proper noun. A
    // "what does X mean" / "define X" is definitional too, with the target the non-verb content word.
    let definitional = false, target = null;
    if (q.form === "wh" && root) {
      if (["NOUN", "PROPN", "ADJ"].includes(root.upos)) { definitional = true; target = root.lemma; }
      else if (root.lemma === "mean" || root.lemma === "define") { definitional = true; target = words.find((w) => w !== root.lemma) ?? words[0] ?? null; }
    }
    // SIGNIFICANCE: a referent the reading already admitted outranks the dictionary's generic sense.
    // "who is Mina" names a being in the fold, so it is answered by her relations, not by the givers.
    if (definitional && target && cast.has(target)) {
      const turn = { kind: "ask", type: "identity", question, target, admits, relations: referent(target), void: { kind: "identity", target, layer: "existence" } };
      turns.push(turn);
      return turn;
    }
    // REFERENCE: "who is X" (a person) resolves to the THING in the world, not the word's etymology —
    // "who is Tolstoy" is the author, not "a transliteration of the surname".
    if (definitional && target && admits === "person") {
      const turn = { kind: "ask", type: "reference", question, target, admits, words, void: { kind: "reference", target, layer: "existence" } };
      turns.push(turn);
      return turn;
    }
    if (definitional && target) {
      const turn = { kind: "ask", type: "definitional", question, target, admits, words, void: { kind: "definition", target, layer: "existence" } };
      turns.push(turn);
      return turn;
    }
    // SELF: "what are you" / "who are you" — the question asks about the system itself. The answer is the
    // IDENTITY THREAD: every fact that coheres with `you` (the system), by the self-emergent coherence.
    const hasYou = qRows.some((r) => (r.lemma ?? r.form ?? "").toLowerCase() === "you");
    if (q.form === "wh" && hasYou && (qRows.some((r) => r.deprel === "cop") || root?.lemma === "do")) {
      const idThread = threadOf(triples, { predicate: "be", kartṛ: ["you"] });
      const turn = { kind: "ask", type: "self", question, admits, words, identity: idThread, void: { kind: "self", layer: "existence" } };
      turns.push(turn);
      return turn;
    }
    // copular question not already caught as definitional ("what day is it?", "what is it?"): fill the
    // "be" fact, resolving "it" to the most recent subject the fold held (attention to the cast).
    if (q.form === "wh" && qRows.some((r) => r.deprel === "cop")) {
      const itRow = qRows.find((r) => (r.lemma ?? r.form ?? "").toLowerCase() === "it");
      const nsubj = qRows.find((r) => r.deprel === "nsubj");
      const subj = itRow ? lastSubject() : (nsubj ? LEMMA(nsubj) : null);
      const filled = { predicate: "be", ...(subj ? { kartṛ: subj } : {}) };
      const r = fillGap({ gap: "karman", filled, triples });
      const turn = {
        kind: "ask", type: "relational", question, admits, gap: "karman", filled, words,
        void: { kind: "gap", role: "karman", admits: "thing", constraints: filled, layer: "structure" },
        answer: unwrap(r.answer), reason: r.reason, matched: r.matched ?? null, dmd: r.dmd,
        ...(itRow && subj ? { binding: { pronoun: "it", ref: subj } } : {}),
      };
      turns.push(turn);
      return turn;
    }
    // polar question: "is today wednesday?" — a yes/no over the fold: does it hold the proposition?
    if (q.form === "polar") {
      const cop = qRows.find((r) => r.deprel === "cop");
      const rootRow = qRows.find((r) => r.head === 0 && r.upos !== "PUNCT");
      if (cop && rootRow) {
        // in an aux-fronted polar question the subject sits BETWEEN the cop and the root ("Is today
        // wednesday?" -> Is / today / wednesday), not before the cop.
        const subjRows = qRows.filter((r) => r.id > cop.id && r.id < rootRow.id && ["NOUN", "PROPN", "PRON"].includes(r.upos));
        const subj = subjRows.map((r) => LEMMA(r)).join(" ").toLowerCase();
        const nominal = LEMMA(rootRow);
        const held = triples.find((t) => t.predicate === "be" && subj && (t.kartṛ ?? []).includes(subj));
        const yes = !!held && (held.karman ?? []).includes(nominal);
        const answer = yes ? "yes" : held ? "no" : "unknown";
        const turn = {
          kind: "ask", type: "polar", question, admits, words,
          void: { kind: "proposition", subject: subj, predicate: nominal, layer: "significance" },
          answer, matched: held ?? null,
        };
        turns.push(turn);
        return turn;
      }
    }
    // topic: the question asks about the discourse itself ("what is this about", "what happened",
    // "summarize") — a summary of the fold, not a relation or a definition.
    if (["summarize", "recap", "summarise", "happen"].includes(root?.lemma)) {
      const turn = { kind: "ask", type: "topic", question, admits, words, void: { kind: "topic", layer: "structure" } };
      turns.push(turn);
      return turn;
    }
    const forms = qRows.map((r) => String(r.lemma ?? r.form ?? "").toLowerCase());
    if (forms.includes("about") && ["this", "it", "that", "text", "story", "reading", "passage", "everything"].some((w) => forms.includes(w))) {
      const turn = { kind: "ask", type: "topic", question, admits, words, void: { kind: "topic", layer: "structure" } };
      turns.push(turn);
      return turn;
    }
    const { gap, filled } = questionDag(qRows, admits);
    const resolved = resolvePronouns(filled);
    const scope = threadOf(triples, resolved);
    const r = fillGap({ gap, filled: resolved, triples: scope.length ? scope : triples });
    const turn = {
      kind: "ask", type: "relational", question, admits, gap, filled: resolved, words,
      void: { kind: "gap", role: gap, admits, constraints: resolved, layer: "structure" },
      answer: unwrap(r.answer), reason: r.reason, matched: r.matched ?? null, dmd: r.dmd,
    };
    turns.push(turn);
    return turn;
  };

  return { read, ask, admit, describe, state: () => ({ triples, turns }) };
}
