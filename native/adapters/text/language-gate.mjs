// language-gate.mjs — which language is THIS message in, per message, and when the reader cannot say, a typed gap: never English by default (mechanic 5, nexus rule 8).
//
// THE MAN IN THE BOX: before he reads a line he asks what language it is. If he recognises it, he reads it, or says he has no dictionary for it. If he is not sure he says so ("it might be
// Welsh, but it is two words"); he does not read "kal milte hai yaar" as English because English is the language he knows, and he does not announce "Maltese" because a detector guessed.
// Two witnesses, neither a word list of ours:
//   1. the language identifier the reader already has (the-fold/langid.mjs, the janus POS priors). It is a closed-set classifier: on real chat it speaks on short Latin messages in languages it
//      holds no prior for (romanised Hindi, Bengali, Tamil come back as Wolof, Maltese, Dutch) and on English written the way people text it ("Hope u r bak frm baba" as Maltese). So its
//      non-English answer in LATIN script stands only after these checks (eval/chat-register/language-gate-ud.mjs, UD PUD, 12 Latin-script languages, and a second treebank per language):
//        the DUEL   the identifier is asked again with only English and its candidate to choose from; if English wins that contest the message is English (0 of 600+ foreign gold sentences lose
//                   to English in it; 12 of the 213 chat messages the identifier called foreign do).
//        the WORDS  a person who says "this is Welsh" has met the words as Welsh words. The share of the message's words that the CANDIDATE's own prior (its POS lexicon) knows must clear
//                   VOCABULARY_FLOOR, the 10th percentile of that share over the identifier's correct short answers on PUD gold. Romanised Hindi called Indonesian knows few Indonesian words.
//        the FLOOR  the candidate's margin over the runner-up must clear LATIN_MARGIN_FLOOR, the same percentile of the margins of those correct answers.
//        two words   one word never establishes which Latin-script language it is ("Der", "Come", "Wat").
//      Below any of them the answer is a CANDIDATE ("it might be Welsh"), never an assertion. Each dial is a measured percentile of correct answers, not a typed number.
//      A script that decides the language (Han, Cyrillic, Devanagari...) or the thread's own language needs neither: they are not guesses among Latin neighbours. A first version of this gate
//      demanded two function-word hits instead; held out on foreign gold it threw away a third of short Polish, Czech, Finnish and Turkish sentences, whose function words are not the signal.
//   2. whether the words of the message are ones the reader's own English prior knows, used only where the identifier did not decide. Names are set aside (a given name the giver knows, or a word the writer capitalised in mid-sentence that the English prior does not know: the same in every
//      language, so no evidence), a lone letter and a number tell nothing, the share must be a STRICT majority and at least one of the words an anchor the prior has met ANCHOR_COUNT times.
// Otherwise the answer is undetected, with the identifier's guess attached as `candidate` for whoever phrases the reply.
//   languageOf(text, { thread, countOf, knownIn, isName, identify }) -> { language: <stem>|null, evidence, detail, candidate?, readable, knownToEnglish }
//   readable = the message's words of two or more letters with no digit; knownToEnglish = how many of them the English POS prior has met (lets a caller tell "Hmm" from several foreign words)
//   evidence: "detector" | "english-words" | "script" | "thread" | "none"
//   identify(text, { stems }) is the language identifier (reading.js passes langid.mjs::identifyLanguage); the duel passes it stems: ["eng", candidate].
// It does not parse and does not load a codec: reading.js::readerFor does both and turns a missing codec into the gap { gap: "no_codec", language, evidence, detail } and an unestablished language into { gap: "no_language", language: null, evidence, detail, candidate? }.
import { tokenize } from "./english-parser.js";

// at least one readable word must be one the English prior has met this many times: "so" 539, "ok" 62, "hi" 27, "lol" 16, "loves" 10 against "hai" 2 and "kar" 1 (measured on the prior's own
// counts); a word met once or twice is as likely a foreign token or a name as English. A declared dial, with that reason.
export const ANCHOR_COUNT = 10;
// the margin a non-English Latin-script answer must clear: the 10th percentile of the margins of the identifier's CORRECT answers on UD PUD sentences of 3..8 words (n = 495 answers over fra deu spa
// ita por pol ces swe tur ind fin glg; eval/chat-register/language-gate-ud.mjs prints the figure it was read from, 11.21). Rounded down; rerun the eval if the priors change.
export const LATIN_MARGIN_FLOOR = 11;
// the share of the message's words that the candidate language's own prior knows: the 10th percentile over the identifier's correct answers on the same UD PUD sentences (0.50, n = 386;
// eval/chat-register/language-gate-ud.mjs prints the figure it reads). Both floors come from PUD alone; the second treebank per language (VAL) is where they are checked.
export const VOCABULARY_FLOOR = 0.5;
export const MIN_WORDS = 2;
const isLetter = (c) => c.toLowerCase() !== c.toUpperCase();

export function languageOf(text, { thread = null, countOf, knownIn = () => null, isName = () => false, identify } = {}) {
  const T = String(text ?? "");
  const d = identify(T), script = d.script ?? "Other";
  // the English witness
  let known = 0, unknown = 0, anchor = 0, names = 0, lead = true; const words = [];
  for (const t of tokenize(T)) {
    const raw = t.form, f = raw.toLowerCase(), chars = [...f], initial = lead;
    if (!chars.some(isLetter)) { if (raw === "." || raw === "?" || raw === "!" || raw === "…") lead = true; continue; }
    lead = false;
    if (chars.some((c) => c >= "0" && c <= "9") || chars.length < 2) continue;                                  // numbers and lone letters carry no language
    words.push(f);
    const n = countOf(f);                                                                                       // how often the English prior has met the word
    // a name is the same in every language and tells nothing: a given name the giver knows, or a word the writer capitalised in the middle of a sentence ("Defarge", "Okafor") that is not a word
    // the English prior knows; a capital that starts a sentence, or a word in capitals, is no such evidence
    const capitalised = !initial && raw !== f && raw !== raw.toUpperCase() && isLetter([...raw][0]);
    if (n > 0) { known++; if (n >= ANCHOR_COUNT) anchor++; } else if (isName(f) || capitalised) names++; else unknown++;
  }
  // the numbers the caller may need to tell a one-word fragment ("Hmm", "Noted.": nothing to read) from several words English does not know ("kal milte hai yaar"): words of two or more letters with no digit,
  // and how many of those the English prior has met
  const counts = { readable: words.length, knownToEnglish: known };
  const readable = known + unknown + names, share = known + unknown ? known / (known + unknown) : 0;
  const english = anchor > 0 && share > 0.5;
  const englishDetail = `${known} of ${known + unknown} readable words are known to the English prior`;
  const about = (x) => `${x.language} (${script}; margin ${(x.margin ?? 0).toFixed(1)}, ${x.hits ?? 0} function-word hits)`;
  if (d.confident && d.language) {
    if (d.language === "eng") return { ...counts, language: "eng", evidence: "detector", detail: `the language identifier is confident (eng, ${script})` };
    const scriptDecides = script !== "Latin" && script !== "Other", viaThread = !!thread && d.language === thread;
    if (scriptDecides || viaThread) return { ...counts, language: d.language, evidence: viaThread ? "thread" : "detector", detail: `the identifier says ${about(d)}${viaThread ? ", the thread's language" : ""}` };
    const duel = identify(T, { stems: ["eng", d.language] });                                                   // English against its candidate, nobody else
    if (duel.confident && duel.language === "eng") return { ...counts, language: "eng", evidence: "detector", detail: `the identifier first said ${d.language}, but asked to choose between English and ${d.language} it chooses English (margin ${(duel.margin ?? 0).toFixed(1)})` };
    let own = 0, ownKnown = true; for (const w of words) { const c = knownIn(w, d.language); if (c == null) { ownKnown = false; break; } if (c > 0) own++; }
    const vocab = words.length && ownKnown ? own / words.length : null;                                        // the share of the words that are words of the candidate language
    const why = [];
    if (words.length < MIN_WORDS) why.push(`${words.length} readable word${words.length === 1 ? "" : "s"} (< ${MIN_WORDS})`);
    if ((d.margin ?? 0) < LATIN_MARGIN_FLOOR) why.push(`margin ${(d.margin ?? 0).toFixed(1)} < ${LATIN_MARGIN_FLOOR}`);
    if (vocab == null) why.push(`no ${d.language} lexicon to check its words against`); else if (vocab < VOCABULARY_FLOOR) why.push(`only ${own} of ${words.length} words known to the ${d.language} prior (${vocab.toFixed(2)} < ${VOCABULARY_FLOOR})`);
    if (!why.length) return { ...counts, language: d.language, evidence: "detector", detail: `the identifier says ${about(d)}; ${own} of ${words.length} words known to the ${d.language} prior` };
    if (english) return { ...counts, language: "eng", evidence: "english-words", detail: `${englishDetail}; the identifier's ${d.language} does not stand: ${why.join("; ")}` };
    return { ...counts, language: null, evidence: "detector", candidate: d.language, detail: `the identifier guessed ${about(d)} but it does not stand: ${why.join("; ")}; ${englishDetail}: not read` };
  }
  // the identifier did not decide
  if (script !== "Latin" && script !== "Other") return { ...counts, language: null, evidence: "script", detail: `${script} script, and no language identified: ${d.gap ?? "undetected"}` };
  if (known + unknown > 0) {
    if (english) return { ...counts, language: "eng", evidence: "english-words", detail: `${englishDetail}; the identifier did not decide (${d.gap ?? "not confident"})` };
    return { ...counts, language: null, evidence: "detector", detail: `${englishDetail}${anchor ? "" : " and none of them an anchor it has met " + ANCHOR_COUNT + " times"}, and the identifier did not decide (${d.gap ?? "not confident"})` };
  }
  if (thread) return { ...counts, language: thread, evidence: "thread", detail: "nothing in the message can be read for a language; it is taken as the thread's" };
  return { ...counts, language: null, evidence: "none", detail: `nothing in the message can be read for a language (${d.gap ?? "no letters"})` };
}
