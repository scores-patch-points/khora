// loaders/_bkcuts.mjs — per-pocket start/end cuts and extra scrub patterns (front/back matter that is not running text). Decided from a head/tail audit of every built pocket.
// start/end are regexes on the text AFTER Gutenberg-header and front-matter removal; endLast: cut at the last match. Everything not listed is used from its first to its last line.
export const CUTS = {
  "bk-dracula": { end: /\n[ \t]*THE END[ \t]*\n/ },                                   // publisher adverts and the transcriber's typo list follow
  "bk-origin-species": { start: /when on board h\.m\.s\./i },                         // skips the Gutenberg edition list, title pages and the two tables of contents
  "bk-hen4-modern": { start: /\nACT I\n\s*SCENE I\./ },                               // skips contents and dramatis personae
  "bk-hen4-de": { start: /Erster Aufzug/, end: /\nEnde dieses Projekt/ },             // skips the etext preamble and the cast list
  "bk-hen4-fr": { start: /ACTE PREMIER/, extra: [/\[Note \d+:[^\]]*\]/g] },           // skips the translator's notice and cast list; drops long editorial footnotes
};
