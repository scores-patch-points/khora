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
