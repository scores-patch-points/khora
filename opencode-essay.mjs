// opencode-essay.mjs — A LONG-FORM ESSAY AS A FILE, written section by section across model responses, like code.
//
// The essay is a file in the task's work tree; each section is a unit between two markers. The model is asked for ONE section at a time with a
// short prompt (that section's material, the sentence before it, nothing else), so the whole essay is never in a prompt and a small or local model
// is enough. What the model writes is applied to the file by the machine, by exact bytes, once; the section is then graded against its own
// material the way code is run against its tests (the grounding check is the test); a section that fails is repaired a capped number of
// rounds (REC: the frame changes, a redraw in the same frame is not repair), and what still fails is cut, never kept. Everything is written to
// the EOT log, and the essay file is a projection of it.
//
// The loop is a STEP MACHINE, because the model calls are the harness's, not the door's:
//   essayStart({ ask, topic, gathered })  -> { job, prompt }                    the first section's prompt
//   essayStep(job, modelText, { ground }) -> { next: { prompt }, ... } | { done: { text, path } }
//   essayRevise(job, sectionId, instruction) -> { next: { prompt } }            iterate on one section; the others are not touched
// A model, a grader and a clock are injected, so the invariants (short prompts, capped repair, exact edits) are tested without any of them.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as EOT from "./opencode-eot.mjs";
import { taskDir } from "./opencode-worknotes.mjs";

const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const sha = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
const slug = (s) => clean(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "essay";

export const LIMITS = Object.freeze({ maxRec: 2, minSupported: 0.6, linesPerSection: 10, lineChars: 320, promptChars: 6000, sectionWords: 220, minSections: 3, maxSections: 8 });

/** The default shape of an essay on a topic, when no outline was nominated: an opening, the parts the material itself is about, a close. */
export const defaultOutline = (topic, parts = []) => [
  { id: "s1", title: "Introduction" },
  ...parts.slice(0, LIMITS.maxSections - 2).map((p, i) => ({ id: `s${i + 2}`, title: clean(p) })),
  { id: `s${Math.min(parts.length, LIMITS.maxSections - 2) + 2}`, title: "Conclusion" },
];

/** A nominated outline is data: 3-8 titles, each short; anything else is refused and the default is used. */
export const validateOutline = (outline) => {
  if (!Array.isArray(outline)) return null;
  const titles = outline.map((t) => clean(typeof t === "string" ? t : t?.title));
  // all or nothing: an outline with one bad title is not trimmed into a different outline, it is refused
  if (titles.some((t) => !t || t.length > 80)) return null;
  return titles.length >= LIMITS.minSections && titles.length <= LIMITS.maxSections ? titles.map((title, i) => ({ id: `s${i + 1}`, title })) : null;
};

const words = (t) => clean(t).toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? [];

/** Each quoted line goes to the section it shares the most words with (ties to the earlier), so a section is asked to write only from what bears on it. */
export const assignMaterial = (outline, lines) => {
  const material = new Map(outline.map((s) => [s.id, []]));
  const titleWords = outline.map((s) => new Set(words(s.title)));
  const rest = [];
  for (const line of lines) {
    const lw = words(line);
    let best = -1, bestN = 0;
    titleWords.forEach((tw, i) => { const n = lw.filter((w) => tw.has(w)).length; if (n > bestN) { best = i; bestN = n; } });
    if (best >= 0 && material.get(outline[best].id).length < LIMITS.linesPerSection) material.get(outline[best].id).push(line);
    else rest.push(line);
  }
  // a line that matches no title is background for whichever section has the least so far, in reading order: every section gets something to write from
  for (const line of rest) {
    const target = outline.map((s) => s.id).sort((a, b) => material.get(a).length - material.get(b).length)[0];
    if (material.get(target).length < LIMITS.linesPerSection) material.get(target).push(line);
  }
  return material;
};

// ── the file: sections between markers, edited by exact bytes ──────────────────────────────────────────────────────────

const open = (id) => `<!-- section:${id} -->`;
const close = (id) => `<!-- /section:${id} -->`;
export const fileOf = (title, outline, texts = {}) => `# ${clean(title)}\n\n${outline.map((s) => `## ${s.title}\n\n${open(s.id)}\n${texts[s.id] ?? ""}\n${close(s.id)}\n`).join("\n")}`;

/** Replace one section's bytes, exactly once. A missing or doubled marker is refused, typed; the rest of the file is never touched. */
export const applySection = (file, id, text) => {
  const a = open(id), b = close(id);
  const count = (needle) => file.split(needle).length - 1;
  if (count(a) !== 1 || count(b) !== 1) return { ok: false, gap: { kind: count(a) + count(b) === 0 ? "unlocated" : "ambiguous", reason: `the markers for ${id} appear ${count(a)}/${count(b)} times` } };
  const i = file.indexOf(a) + a.length, j = file.indexOf(b);
  if (j < i) return { ok: false, gap: { kind: "malformed", reason: "the closing marker comes first" } };
  return { ok: true, file: `${file.slice(0, i)}\n${text}\n${file.slice(j)}` };
};
export const sectionText = (file, id) => { const a = open(id), b = close(id); const i = file.indexOf(a), j = file.indexOf(b); return i < 0 || j < i ? null : file.slice(i + a.length, j).trim(); };

// ── prompts: short, positive, one section ──────────────────────────────────────────────────────────────────────────────

const lineBlock = (lines) => lines.map((l) => `- ${clean(l).slice(0, LIMITS.lineChars)}`).join("\n");
const tail = (text) => clean(text).slice(-200);

/** A section is as long as its lines allow: a model asked for 220 words from two lines pads them by repeating them. */
export const wordsFor = (lines) => Math.max(40, Math.min(LIMITS.sectionWords, Math.round(lines.reduce((n, l) => n + clean(l).split(" ").length, 0) * 1.2)));

export const sectionPrompt = ({ topic, section, lines, before = null, words: w = wordsFor(lines) }) =>
  [
    `Write the section "${section.title}" of an essay on ${topic}, about ${w} words, as plain paragraphs with no heading.`,
    lines.length ? `Write from these lines, each quoted from a page:\n${lineBlock(lines)}` : `No page gave a line for this section; write one short paragraph that connects the sections around it, from what they say.`,
    before ? `The section before it ends: "${tail(before)}"` : "",
    `The section says what the lines say, once each.`,
  ].filter(Boolean).join("\n\n").slice(0, LIMITS.promptChars);

export const repairPrompt = ({ topic, section, lines, failed, round }) =>
  [
    `Write the section "${section.title}" of an essay on ${topic} again (attempt ${round + 1}), about ${wordsFor(lines)} words, as plain paragraphs with no heading.`,
    `Write from these lines, each quoted from a page:\n${lineBlock(lines)}`,
    failed.length ? `The previous attempt said these things, and the lines do not state them:\n${failed.slice(0, 5).map((f) => `- ${clean(f).slice(0, 160)}`).join("\n")}` : "",
    `The new section keeps to what the lines state, close to their own words.`,
  ].filter(Boolean).join("\n\n").slice(0, LIMITS.promptChars);

export const revisePrompt = ({ topic, section, lines, current, instruction }) =>
  [
    `Revise the section "${section.title}" of an essay on ${topic}.`,
    `The section now reads:\n${clean(current).slice(0, 1800)}`,
    `The change asked for: ${clean(instruction).slice(0, 300)}`,
    lines.length ? `Write from these lines, each quoted from a page:\n${lineBlock(lines)}` : "",
    `Return the whole revised section as plain paragraphs with no heading; what the lines do not state is left out.`,
  ].filter(Boolean).join("\n\n").slice(0, LIMITS.promptChars);

// ── the machine ───────────────────────────────────────────────────────────────────────────────────────────────────────

const sentences = (t) => clean(t).split(/(?<=[.!?])\s+(?=[\p{Lu}\p{N}"“(])/u).map((s) => s.trim()).filter(Boolean);
const once = (sents) => { const seen = new Set(); return sents.filter((x) => { const k = clean(x).toLowerCase(); if (seen.has(k) || /\b(?:the lines do not state|left out of the section|says what the lines say)\b/i.test(k)) return false; seen.add(k); return true; }); };
const bare = (t) => String(t ?? "").replace(/^```[a-z]*\n?|```$/gim, "").replace(/^#{1,6}\s.*$/gm, "").replace(/<!--[\s\S]*?-->/g, "").trim();

/** essayStart: the outline, the material per section, the file, and the first prompt. `gathered` is the door's gather result ({ passages, text, quotes }). */
export function essayStart({ ask, topic, gathered, outline: nominated = null, root = null, now = Date.now() }) {
  const lines = (gathered?.quotes ?? []).map(clean).filter(Boolean);
  const outline = validateOutline(nominated) ?? defaultOutline(topic, gathered?.parts ?? []);
  const material = assignMaterial(outline, lines);
  const id = `essay-${slug(topic)}-${sha(`${ask}|${now}`).slice(0, 8)}`;
  const dir = root ?? taskDir(id);
  if (!dir) return { gap: { kind: "bad-address", reason: "no work tree for this essay" } };
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "essay.md");
  const job = { id, ask, topic, outline, material: Object.fromEntries(outline.map((s) => [s.id, material.get(s.id)])), passages: gathered?.passages ?? [], file, idx: 0, round: 0, texts: {}, standing: {}, calls: 0, cut: [], gaps: [], startedAt: now };
  fs.writeFileSync(file, fileOf(`An essay on ${topic}`, outline));
  return { job, prompt: sectionPrompt({ topic, section: outline[0], lines: job.material[outline[0].id] }), section: outline[0] };
}

const record = (job, detail, now) => { try { EOT.append({ task: job.id, agent: "essay", stage: "reason", source: { kind: "tool", locator: `essay:${detail.section}:${detail.round}`, meta: { sha256: sha(JSON.stringify(detail)), exit: detail.accepted ? 0 : 1, judge: "ground" } }, unit: `${detail.section}:${detail.round}`, detail: { kind: "essay-section", ...detail }, now }); } catch { /* the log never blocks a draft */ } };

/** essayStep: the model's reply to the current prompt. Apply it, grade the section, accept / repair / cut, and say what is asked next. */
export async function essayStep(job, modelText, { ground, now = Date.now() } = {}) {
  const section = job.outline[job.idx];
  if (!section) return { done: finish(job) };
  job.calls++;
  const text = bare(modelText);
  const sents = once(sentences(text));
  const lines = job.material[section.id];
  // EVA: the section against its own material, sentence by sentence (the test the section must pass)
  const graded = sents.length ? await ground(text, [{ name: `material:${section.id}`, text: lines.join("\n") || job.outline.map((s) => s.title).join(". ") }, ...job.passages.filter((p) => /^research record/.test(p.name))]) : [];
  // a sentence's standing: the claim the grader made of it (the same text, or one that contains the other: a grader may trim a list marker); none found is unsupported
  const standingOf = (s) => { const t = clean(s); const c = graded.find((x) => clean(x.text) === t) ?? graded.find((x) => { const u = clean(x.text); return u.length >= 20 && (u.includes(t) || t.includes(u)); }); return c?.standing ?? "unsupported"; };
  const supportedSents = sents.filter((s) => standingOf(s) === "supported");
  const failed = sents.filter((s) => !supportedSents.includes(s));
  const share = sents.length ? supportedSents.length / sents.length : 0;
  const accepted = share >= LIMITS.minSupported || (job.round >= LIMITS.maxRec && supportedSents.length > 0);
  record(job, { section: section.id, round: job.round, sentences: sents.length, supported: supportedSents.length, accepted, ...(accepted ? {} : { failed: failed.slice(0, 5) }) }, now);
  if (!accepted && job.round < LIMITS.maxRec) {
    // REC: the frame changes (the failed claims are named, the material is restated); a redraw in the same frame is not repair
    job.round++;
    return { next: { prompt: repairPrompt({ topic: job.topic, section, lines, failed, round: job.round }), section: section.id, round: job.round } };
  }
  // accepted, or out of rounds: what failed is cut, never kept
  const kept = accepted ? supportedSents.join(" ") : "";
  if (failed.length) job.cut.push(...failed.map((f) => ({ section: section.id, sentence: f })));
  if (!kept) job.gaps.push({ section: section.id, kind: "no-supported-text", reason: `no sentence of ${job.round + 1} attempt(s) was stated by the section's material` });
  const body = kept || "(No page stated enough for this section.)";
  const applied = applySection(fs.readFileSync(job.file, "utf8"), section.id, body);
  if (!applied.ok) { job.gaps.push({ section: section.id, kind: applied.gap.kind, reason: applied.gap.reason }); } else fs.writeFileSync(job.file, applied.file);
  job.texts[section.id] = body;
  job.standing[section.id] = { sentences: sents.length, supported: supportedSents.length, rounds: job.round + 1, cut: failed.length };
  job.round = 0;
  if (job.revising) { job.revising = false; job.idx = job.outline.length; return { done: finish(job) }; } // a revision touches one section and stops
  job.idx++;
  const nextSection = job.outline[job.idx];
  if (!nextSection) return { done: finish(job) };
  return { next: { prompt: sectionPrompt({ topic: job.topic, section: nextSection, lines: job.material[nextSection.id], before: body }), section: nextSection.id, round: 0 } };
}

const finish = (job) => {
  const file = fs.readFileSync(job.file, "utf8");
  const text = [`# An essay on ${job.topic}`, ...job.outline.flatMap((s) => [`## ${s.title}`, sectionText(file, s.id) ?? ""])].join("\n\n");
  return { text, path: job.file, standing: job.standing, cut: job.cut, gaps: job.gaps, calls: job.calls, sections: job.outline.length };
};

/** essayRevise: ask for a change to ONE section. Its prompt carries that section and its material; every other section is untouched. */
export function essayRevise(job, sectionId, instruction) {
  const i = job.outline.findIndex((s) => s.id === sectionId);
  if (i < 0) return { gap: { kind: "unknown-section", reason: `no section ${sectionId}` } };
  const file = fs.readFileSync(job.file, "utf8");
  job.idx = i; job.round = 0;
  job.revising = true;
  return { next: { prompt: revisePrompt({ topic: job.topic, section: job.outline[i], lines: job.material[sectionId], current: sectionText(file, sectionId) ?? "", instruction }), section: sectionId, round: 0 } };
}
