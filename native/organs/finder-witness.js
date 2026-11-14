// finder-witness.js — a reader of questions for the text finder. Pure: it
// builds the messages and reads the answers; the caller owns the one crossing
// to a model and hands it in as `draw(messages, schema)`. In khora that
// crossing is the mouth (native/kernel/mouth.js); nothing here reaches a model
// by itself.
//
// The reader is a witness, never an oracle (khora native/organs/testimony.js:
// "classification was taken away from the model entirely"). Every question is
// binary. What the answers mean is derived by the finder, mechanically.
//
// The WORDS of each question are not here. They are the baseline, and the
// baseline belongs to the ground: every call carries `questions`, taken by the
// finder from the ground's baseline event. A call without them is refused.

export const FINDER_WITNESS_SCHEMA = Object.freeze({ type: 'object', properties: { answer: { type: 'string', enum: ['yes', 'no'] } }, required: ['answer'] });

export function buildFinderMessages(kind, args) {
  const { passage, sentence, part, figure, kind: named, questions: Q } = args;
  if (!Q || typeof Q.system !== 'string' || typeof Q[kind === 'says' && part != null ? 'part' : kind] !== 'string') throw new Error(`buildFinderMessages: no wording for "${kind}" (the words of a question come from the ground's baseline)`);
  let user;
  if (kind === 'says') user = part == null ? `PASSAGE: ${passage}\n\nSENTENCE: ${sentence}\n\n${Q.says}` : `PASSAGE: ${passage}\n\nSENTENCE: ${sentence}\n\nPART: ${part}\n\n${Q.part}`;
  else if (kind === 'figure') user = `PASSAGE: ${passage}\n\nPART: ${part}\n\nFIGURE: ${figure}\n\n${Q.figure}`;
  else if (kind === 'mentions') user = `PASSAGE: ${passage}\n\nPART: ${part}\n\n${Q.mentions}`;
  else if (kind === 'denies') user = `PASSAGE: ${passage}\n\nSENTENCE: ${sentence}\n\n${Q.denies}`;
  else if (kind === 'about') user = `PASSAGE: ${passage}\n\nSENTENCE: ${sentence}\n\n${Q.about}`;
  else if (kind === 'kind') user = `PASSAGE: ${passage}\n\nKIND: ${named}\n\n${Q.kind}`;
  else throw new Error(`buildFinderMessages: unknown question "${kind}"`);
  return [{ role: 'system', content: Q.system }, { role: 'user', content: user }];
}

// The completed text back from the crossing → 'yes' | 'no' | null. Anything
// that is not one of the two words is a typed gap, never a guess.
export function readFinderAnswer(raw) {
  if (raw == null) return null;
  let v = raw;
  if (typeof raw === 'string') { try { v = JSON.parse(raw); } catch { return null; } }
  const a = typeof v?.answer === 'string' ? v.answer.trim().toLowerCase() : null;
  return a === 'yes' || a === 'no' ? a : null;
}

// `draw(messages, schema)` → the completed text (or object). `by` names the
// reader for the record: model, settings, and the door it was reached by.
export function finderWitness({ draw, by } = {}) {
  if (typeof draw !== 'function') throw new Error('finderWitness: a draw function is required (the caller owns the crossing)');
  if (!by) throw new Error('finderWitness: `by` is required (a reader is named on the record)');
  const cache = new Map();
  let draws = 0;
  const ask = (kind) => async (args) => {
    const messages = buildFinderMessages(kind, args);
    const key = `${messages[0].content}\u0000${messages[1].content}`;
    if (cache.has(key)) return cache.get(key);
    draws++;
    let answer = null;
    try { answer = readFinderAnswer(await draw(messages, FINDER_WITNESS_SCHEMA)); } catch { answer = null; }
    if (answer !== null) cache.set(key, answer); // only an answer is kept: a failed or unreadable draw may be asked again
    return answer;
  };
  return { by, get draws() { return draws; }, says: ask('says'), figure: ask('figure'), mentions: ask('mentions'), denies: ask('denies'), about: ask('about'), kind: ask('kind') };
}
