# Conversation router, pre-registration (written before the router)
Question: can an ask be routed, before any model call, to the handling that fits it, and where does the routing break?
Router: khora/opencode-route.mjs routeOf(ask, { history }) -> { kind, research, why }. `research` is true for kinds account and search. Reads the ask with the received
UD English parser (native parser-eng-ewt: the root's lemma, the objects, the subject, the question shape) and declares what is LEXICAL: the genre nouns that mark an
invented work (poem, story, ...) and an account (essay, report, ...), and the small verb classes the battery uses. Declared lexical parts are named in the file and
measured, not defended.
Battery: eval/route/battery.mjs, 55 asks over 7 kinds, 7 marked `adv` (paraphrases without the tell-tale words). Hash in battery.sha; frozen.
Scoring: ROUTED RIGHT = kind equals label; ROUTED WRONG = another kind; GAP = router returns a typed gap (no kind), never a guess.
Bars: R1 right-routing >= 80% overall; R2 the costly confusions are rare: an account or search ask routed to creative, chat, followup or mechanical (research skipped) <= 1; a
creative, chat, followup or mechanical ask routed to account or search (research wasted, "unsupported" noise) <= 2; R3 every GAP carries a typed reason; R4 adv items >= 50%.
Reported per kind with the confusion matrix. A failed bar is reported as failed.
Held-out set: eval/route/battery-held.mjs (40 asks, hash in battery-held.sha), written before the router and not used while building it. The router is fixed against
battery.mjs (dev); battery-held.mjs is measured ONCE after, and its result is the one reported against bars R1–R4 (dev results are reported as dev).

## Result 1 (router v1, measured once on the held-out set)
Dev (battery.mjs, 53 asks; the router was built and fixed against it, so 53/53 means little): 53/53. **Held-out: 33/39 right (85%), 3 GAP.** R1 holds (85%), R2 holds (research
skipped 1, wasted 2), R3 holds (every GAP typed), R4 holds (adv 3/4). Breaks, named: A07 "I want to understand how octopuses camouflage themselves" (the accounting verb is in an
embedded clause, not the root); W01 "make the login form validate email addresses" (work in domain words, no code-shaped token or work noun); M04 "how much is 20% off 85 dollars?"
(arithmetic in words, no mechanism); H04 "what's your favorite color?" (an addressee possessive, the rule looked only at subjects); F02 "shorter please" and F03 "rewrite that in a
friendlier tone" (a followup whose pronoun is demonstrative, and a bare ADJ). The fixes that follow were made AFTER seeing these, so the held-out set is spent: the post-fix numbers on
it are reported as dev. A fresh falsification set (battery-adv.mjs) was written before the fixes were run against it.

## Result 2 (router v2: regex removed, fixes made after seeing Result 1; written after, said plainly)
v1 contained regexes (code-shaped tokens, the question mark, dependency-label matching); the user ruled regex out, so v2 reads tokens by character tests and the parser's own fields only.
Fixes made after seeing the held-out failures and the adversarial set: an anaphoric pronoun object (it, that, this, them: any pronoun that is not I or you) marks a followup; a
causative request whose object carries an embedded verb with its own object ("make the login form validate email addresses") is work; wh-words are read by PronType Int or Rel (the
parser tags "who" as Rel); a polite or indirect ask ("can you explain", "do you know who") is decided by its verb and referent BEFORE the addressee rule, so it is an account, not chat; a
possessive "my" on the topic makes an account ask creative (nothing in the world to read); a compound ask (an invented work plus an account) is an account with `also: creative`; live
data words route to search; "get" seeks only as an imperative; an evaluation of the previous turn needs a non-verb root.
Numbers, same battery files: dev 53/53; the held-out set is SPENT (its 39/39 is reported as dev, not as held-out; its one clean measurement was Result 1: 33/39, 85%); adversarial 17/18
(94%). The adversarial set was written before these fixes ran against it, but the fixes targeted its known breaks, so its number is also dev.
**Still broken, named:** X18 "what is 3 plus 4, and who discovered zero?": a compound of an arithmetic question and a world question routes to mechanical only, so the world half gets no research.
Not measured: any ask outside these three sets; non-English asks (the parser prior is English); a conversation whose previous turn changes what "it" means; the lexical sets in
LEXICAL (a word outside them falls to a structural default). The router decides; wiring it into the plugin (fold.ts) so an account ask is gathered before the model writes is not done here.

## Result 3 (omnilingual router v3; written as it was measured)
Instruction: the router must steer by intent, omnilingually. v3 separates STRUCTURE (Unicode word segmentation, numbers, the question marks of every script, code-shaped tokens, shortness, a previous
turn) from KINDS (a per-language dictionary of attested surfaces kept as data in opencode-route-kinds.json: invented work, genre, accounting verb, seek, compute, arithmetic, fresh, view, greeting, work noun,
interrogative). The code names no word. English adds the English parser's facts; there is no parser for the other languages here, which is the measured wall.
Baseline (v2, English-only lexicon and parser) on battery-multi.mjs (the same 15 intents in en es fr de ru zh ja ar, written before): en 15/15; es 6, fr 6, de 7, ru 6, zh 6, ja 6, ar 6 of 15; research skipped 2–5 of 5.
v3 on battery-multi.mjs: 15/15 in every language. THAT NUMBER IS CIRCULAR: the dictionary was authored with those exact translations in view, so it is dev, not evidence.
Evidence: battery-multi-held.mjs, 12 NEW intents x 8 languages (96 asks, different asks, not translations of dev items, frozen before it was run). **First measure: 87/96 right (91%): en 12, es 11, fr 8, de 9, ru 12, zh 12,
ja 12, ar 11; research-needing asks skipped: 0; research wasted: 6 (fr 3, de 2, es 1).** Breaks, named: (1) a plain-ASCII French or German ask ("tu aimes la musique ?", "bonsoir !") is taken for English because the
undecided fallback assumed English; (2) dictionary gaps: fr "aujourd'hui", es "entre" (division), de "guten Abend", ar "مساء الخير"; (3) "histoire" / "Geschichte" mean both story and history: "write a short
story about a dragon" is routed as an account (research wasted) in fr and as account-also-creative in de. (3) is not a dictionary gap: it is an ambiguous noun that only the topic can settle.
Translations are the author's, not a native speaker's: a wrong battery item would be a battery flaw, and the held-out numbers carry that doubt.
After the fixes (a plain-ASCII ask is read by the Latin dictionary that reads it best, not assumed English; the four dictionary gaps filled): the 96-ask set reads 94/96, but it is now SPENT, so that
is dev. Still broken, named: "histoire"/"Geschichte" (story or history) in "write a short story about a dragon": fr routes it as an account (research wasted), de as an account that also invents; X18, a
compound of arithmetic and a world question (mechanical only). NOT covered: any language outside en es fr de ru zh ja ar; inflected or compounded forms the dictionary's prefixes do not reach; an ask that
mixes languages; the English parser's facts (the model's own state, a causative, a pronoun object, writing about the speaker's own thing) have no counterpart in the other languages, so a "chat" ask
without a greeting or a view verb ("tu es fatigué ?") is a typed gap there, not a guess. A native speaker's review of the dictionary and of the translations is the next measurement worth making.
