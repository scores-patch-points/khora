// English-only language stub. The full multilingual detector (fold-chat-langid.js) needs the 8MB language priors
// (built from the khora's Universal Dependencies POS priors, sourced from Zenodotus). Those load live, not here.
export const DECLARED = Object.freeze({ minReplyLetters: 24, threadTurns: 6 });
export const LANG_NAMES = Object.freeze({ en: 'English' });
export const FAMILIES = [];
export const sameFamily = (a, b) => a === b;
export function proseOf(t) { return String(t ?? ''); }
export function threadLanguage() { return 'en'; }
export function detectLang() { return { lang: 'en', script: 'Latin', hits: 1, name: 'English', confident: true, inherited: false, margin: 0 }; }
export function sameLanguage() { return { same: true }; }
export function languageInstruction() { return 'Reply in English.'; }
export function restateMessages() { return []; }
export function languageNotice() { return null; }
