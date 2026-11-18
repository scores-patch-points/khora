# The Lighthouse Reads a Sentence Backwards

*On the khora reading program, written 18 November 2026 from its own records. Every figure here is in a result file, a commit, or an agent's report; where I am describing a framing rather than a measurement, I say so.*

---

## 0. A small, strange question

Take two sentences.

> Gloria's eczema flared up in the cold. She scratched it until it bled.

A reader, human or otherwise, has to decide what *she* is and what *it* is. *She* is Gloria, not the eczema, though the eczema is the grammatical subject of the first clause and *Gloria's* is only a possessor inside it. *It*, twice, is the eczema, but the second *it* might be the cold. Nothing in the sentence says so. The facts that settle it live elsewhere: in what eczemas do, in what people do to their skin, in who can be *she* at all. A pronoun, it turns out, is a small hole in a sentence through which the rest of the world falls in.

The question we spent this season on was embarrassingly narrow: when the system reads *he* or *she*, does it fall into the right hole? On 125 documents the answer was right 69% of the time, on about half the pronouns it dared to answer. Nobody was proud of that number. What follows is an account of what we did about it, and the stranger things we discovered while doing it: that the problem has a shape, that the shape has a name in the cube we built, that two of our best ideas failed in public, and that the library we kept accidentally building around the problem is the more lasting result.

---

## 1. The rules of the house

There is a method, and it is the real subject of this essay, so it goes first.

We state the claim before the run, stamp it with a hash and a UTC time, and freeze the code before the test data is opened. We keep the failures, in the same file as the successes, in the same type size. No language model sits in the loop: readers, rulings and scores are mechanical, and when an embedding model appears it is a frozen codec, a function from strings to vectors, not an oracle. Numbers are not typed in by hand. A threshold must be the sign of something, a percentile of a null, a unit of a reference's own spread, or a declared dial with its reason attached.

These rules are not decoration. They were tested this week by the person who wrote them, which is to say by me. In round 14 I ran an evaluation harness on the development and test sets as a "smoke test" before I had written the freeze file. I saw the numbers. The moment I saw them, those two sets stopped being able to confirm anything about that hypothesis. The honest move was not to hide it and not to re-roll until pleased. It was to write the deviation down (it is `PREREG-ROUND14-NOTE-1.md`), stamp it, switch to 66 documents nobody had evaluated, rebuild the table without them, and run once. The result is smaller than the sighted numbers were. That gap is the cost of the slip, and it is the most useful measurement in the whole record, because it is what peeking is worth.

A program like this lives or dies on whether its failures are easier to find than its successes. Ours are.

---

## 2. Why pronouns are not a small problem

Linguists call it anaphora, and it is the thing that makes language *compressed*. A text that said every name every time would be unreadable, so we say *she* and trust you to know. The trust is the engineering problem. The decoder has to reconstruct, from a few words and a lot of context, who the speaker meant.

Our decoder is a "presence rung": it walks the text left to right, keeps a decaying activation over every being it has met (heard names, recent subjects), and when a *he* or *she* arrives, binds it to the most active candidate that clears a floor and a margin. It is a physics of attention, a bucket of heat that cools sentence by sentence. It is also, we learned, wrong in a very specific way. Of its wrong bindings, 69% went to something that was not a person at all: a place, an organisation, a topic that happened to be warm. A further 25% went to a person, just the wrong one, more salient than the right one. About 5% went to someone who had not been mentioned yet. One and a half percent got the gender wrong.

That diagnosis was worth more than any fix, because it said the problem was not *attention*. The decoder's physics was mostly fine. Its ontology was missing: it did not know what kind of thing a *she* can be.

And the confidence signal was useless. Margin, the gap between the best and second-best candidate, did not separate right bindings from wrong ones. A decoder that cannot tell when it is guessing is a decoder you cannot supervise.

---

## 3. Guards: making regression loud

Before improving anything we made the old failure impossible to repeat silently. The rule, in the user's words, was: "we've solved all this, make sure this never happens again."

A baseline file records the hash of every reading-critical file and the numbers the read was measured at. A test fails if the code changes and the record does not. We proved it by tampering with a file and watching the test fall over. A language whose pronoun register has not been *measured* does not bind pronouns at all; it files a typed gap, `pronoun_presence_unmeasured`, instead of silently running English's dials on Greek. A read with no ruling about non-persons files `pronoun_presence_no_nonpersonal_ruling`. Languages now carry their own names in their own scripts, 183 autonyms from CLDR or declared overrides: ελληνική, संस्कृतम्, 國語, with English aliases second. These are small, grey changes. They are why the next regression, whenever it arrives, will have to announce itself.

A silent drop is the worst kind, because it looks like success. A pipeline that quietly stops binding looks, to every downstream consumer, exactly like a text with few pronouns.

---

## 4. The cube, and a sentence read backwards

Here is the first weird part.

The system has a cube: nine operators in three families (Existence: NUL, SIG, INS; Structure: SEG, CON, SYN; Interpretation: DEF, EVA, REC), crossed with three grains (Ground, Figure, Pattern). Twenty-seven phase posts, a strict dependency chain, domain-major. When we laid the *reading pipeline* over the cube, we found it ran in the wrong order. Pronouns were being bound (CON at Figure grain) before the clauses were parsed (SEG at Figure grain). The reader committed to *she* before it had finished understanding the sentence she stood in.

People do not do that. The user's observation was: "we resolve a pronoun sometimes *after* we finish the sentence." Sometimes halfway through a paragraph you realise who *he* has been all along, and the realisation reaches backward and makes the earlier sentences less surprising. In the vocabulary of this program, surprise is a change to the reader, and competence is the thing that would have made past surprise smaller if only it had been known sooner. The reader is a lighthouse that sometimes sees the ship after it has passed.

So round 13 built the reader the cube said it should be. First the clauses (SEG), then personhood from what the sentence's verbs say about their subjects (DEF into NUL: a thing that *occurs* or *lies* is not a thing that *smiles* or *said*), then pronouns resolved at sentence close (CON), then late binding (REC: a pronoun that cleared no floor stays pending, and the next few sentences get to vote), then gender repair (EVA into REC: if one being has been bound to both *he* and *she*, the minority bindings are retracted, never deleted, returned with the reason).

And then the pasted design, from a different project entirely, about asset trackers: inclusion by at least *k* independent voices; exclusion only by a *named cause*; two pipelines chasing each other, one proposing, one excluding, until nothing changes; a contested remainder reported rather than forced; backward flow so later evidence can overturn earlier calls. We built that for pronouns. Five voices (salience, role, personhood, gender, continuity), three named exclusions (non-person, gender mismatch, reflexive non-subject), a fixpoint, a retraction ledger, and a "contested set": the pronouns the chase could not settle, with the reason.

The user had a sentence for the contested set. *A line is where two colors meet.* The width of the line is the uncertainty. A binder should report not only what it decided, but how wide the line was where it decided it.

It was a beautiful design. It did not win.

---

## 5. The embarrassment ledger

Reporting failures first, as the house rules require:

**The chase.** On 125 training documents the chase beat the default: 452 right and 136 wrong, against 443 right and 200 wrong. Precision 0.769 to 0.689. On the frozen test it came in at 0.845 against the default's 0.897 on 219 answerable pronouns. The interval on the difference ran from -0.185 to +0.067. Zero sat comfortably inside. The test slice happened to be easy; the default scored 0.897 where it usually scores 0.69, so there was little left to gain and some to lose. The chase is committed, labelled experimental, and unwired.

**The line does not predict the errors.** The most seductive claim of the design was that errors cluster near the contested pronouns. On the development set it looked supportive, and on 125 training documents it reversed. On the test the near and far wrong rates were 0.200 against 0.143: weak, in the original direction, on tiny counts. As a predictor it fell apart. Still a good *concept*, I think. A poor *instrument*.

**Personhood from verbs.** A table built from GUM's gold entity types, counting which verbs take person subjects, separates persons from non-persons beautifully in isolation (AUC 0.956 on gold). Used as a veto on the pronoun binder it first made things much worse (precision 0.78 to 0.53) because weak evidence vetoed too eagerly; after a repair that demanded strong evidence only, it became inert: on the test it changed nothing. The knowledge was real. It simply was not where the errors were.

**Embedding the context.** This was the user's idea, and the user's idea about *why* was exactly right: a string alone means nothing, only in context. So rounds 15 and 16 built centroids (a person centroid and a not-person centroid) over the string, over its role frame ("subj of say: Bert"), over its sentence with the mention marked, and over windows of one, two, four and eight sentences. The window itself was to be *measured*, not chosen: the kernel's own `dmdWindow` finds the shallowest span such that dropping everything beyond it changes no conclusion. On 66 held-out documents these rulings held precision around 0.91 and cost 6 to 8 points of coverage, because they cast out real people along with the places. They failed three preregistered bars: precision gain, coverage, and beating the simple table. The most-used window radius turned out to be zero: for most beings, the sentence they stand in is all the context the conclusion needs.

The ledger is long. It is supposed to be.

---

## 6. The one that held: a table of words

What worked is the plainest thing we tried.

From UD English GUM's training documents we counted, for every word that appears in a mention, how often the gold calls the mention a person and how often something else. A being whose mention words carry more not-person than person evidence, with at least two observations, is not offered as a referent for *he* or *she*. That is all. No embedding, no model. On 66 documents that no earlier slice had touched (552 answerable pronouns), precision went from 0.874 to 0.911 at unchanged coverage. Of the 18 bindings the ruling changed, 83% were wrong, against 12.6% overall (permutation p = 0.0001). Twenty tables with their labels shuffled gave no gain. And the caveats, because they belong: the interval's lower end on the precision gain is +0.002, which is as close to zero as an honest "yes" can get. The table knows only words GUM has seen. And I looked at the sighted development and test sets before the freeze, where it did better (right bindings 96 to 119 on dev, 130 to 146 on test), which is the number the peeking was worth.

This is now in the canonical English read. The read-core gained a hook, `namePersonhood`, a function of the language stem; the English read passes it; every other language gets `null` and keeps its typed gap. The baseline was re-recorded in the same commit, with a note saying why the reading changed. A reading change that cannot say why is a reading change you should distrust.

---

## 7. The fast smell, and the library that remembers

Then the user said something that reorganised the work: *the point of embeddings is that they get assigned to POS norms*. Use what we can identify, build standard centroids, and sniff the rest.

There is a deeper story under that remark. The idea of a **smell** was already in the janus repo, written by an earlier session: `smell.mjs`, `Smell@1`. Its doctrine is almost a creed. An embedding *proposes*; it has no authority. It is pure and synchronous, it holds only vectors it was given, and when it lacks one it raises `NeedVectors`, naming exactly the texts it needs, so nothing is embedded that the walk did not reach. Its bound is a *null*: the 95th percentile of the nearness of random other spans. A proposal stands only by its consequences. The user's reaction, "we've done this before," was correct, and I had been about to rebuild it badly. My person rulings used the sign of a cosine difference with no null. That is probably part of why they over-ruled.

So we built the missing foundation, and it is the most durable thing of the week: a **vector library**. It is a binary, append-only file, one per model digest and prefix. Each record is a 32-byte hash key and a float vector; opening it is a single scan; appends take a lock and re-read whatever another process wrote; a torn last record is dropped and not trusted; a file built for a different model refuses to open. Embedding the 23,254-word vocabulary took 32 minutes the first time. Asking again takes a millisecond. The earlier JSON cache had grown to 186 MB and was rewritten on every save, which is the sort of thing you do exactly once.

On top of it sits the **static smell**: a being's string, its role and its sentence windows built by *averaging stored word vectors*. No model call at read time; 141 milliseconds a document. Against the embedding ruling it agreed on 89% of beings, as well as the embedding agrees with itself across two disjoint halves of its own training data (88.8%). It was not better. It was the same judgement, with no model in the loop. That is how a measure should travel: slowly built, quickly used.

---

## 8. Parts of speech: Thrax and the null

A part of speech is a kind of smell. A noun is the company that nouns keep. So round 17 took the POS prior (UD English treebank counts for 16,654 word forms, 14,538 of which carry exactly one tag) and built a centroid for each of seventeen classes from the forms that are identified unambiguously. Then we asked what the centroids say about words the prior has never seen.

On 5,203 such tokens in GUM's test set, the nearest-centroid guess is right 62.6% of the time, against 18.6% for guessing the commonest class; with labels shuffled, 5.5%. Proper nouns, the class the pronoun problem cares about most, are recalled 61% of the time at 81% precision; the usual confusion is with ordinary nouns. And where the prior *does* know the word, the prior wins, 91.2% to 50.4%. A sniffer for the gaps, not a replacement for the map.

Two results here are worth the whole run. First: blending in the sentence made the guess *worse* (62.6% to 58.2%, interval for the loss from 2 to 7 points). The user's conviction that nothing means anything out of context is true of strings but, in this static form, context did not add part of speech. Second, and weirder: when we clustered the words no class claimed, using the same null as the join bound, we got six hundred and fifty-one clusters of *topics*. Linguistics and phonetics. Symphonies and violins. Barack, Reagan, presidency. Rain, floods, humidity. Embeddings of single words, it turns out, are almost entirely about what a word is *about*, not what it *does*. The "emergent parts of speech" were semantic fields wearing the costume of syntax. A syntactic representation would look at the *frames* a word occupies, the places it can stand, and our own complementary-distribution kernel is the thing to try.

And the name. Every part-of-speech reading in this repository answers to an **archon**: a named handle with a dossier that discloses where our use bends the original author's argument. There are eighty-three. For parts of speech the archon is Dionysius Thrax, the Alexandrian grammarian whose *Tekhne* (supposedly) fixed the eight. His dossier says we bend him in four ways, and the bends matter: he defined classes by properties of words, whereas we call it a reading; he used no counts, and we use counts; he folded the adjective into the noun; and the passage we quote may be a later compiler's. The POS smell is credited, in its own header, as *a measured reading, ours not his*. A credit line that leaves out its bends lets a name stand in for an argument it never made.

There is something quietly funny in the geography of all this. Zenodotus, the first librarian of Alexandria, is our corpus of dated, located sources. Callimachus, who catalogued it, is the lane of research records. Pharos, the lighthouse, is the live log. Thrax, the grammarian, sits over the word classes. I do not know whether the city was planned or whether the names kept arriving from the same place. It is a library of Alexandria rebuilt out of mechanical readers, and it argues with its own dossiers.

---

## 9. Other tongues, other holes

The pronoun problem looks different in different languages, and the differences are the lesson.

**Ancient Greek** (PROIEL gospels, where antecedent links exist): the shipped register binds at 0.53 precision at 57% coverage; a hold-out register plus a case-fold gets 0.59 against a random null of 0.46 on 1,181 answerable pronouns in Matthew, Mark and Luke. The old register bound *articles* as if they were pronouns (74% of its bindings landed on tokens the gold does not call a third-person pronoun), which is what a quiet misclassification looks like at scale. Nearly half of the gold pronouns are never reached at all: Greek has null subjects. The *he* is in the verb ending. The pronoun you are trying to resolve is not on the page.

**Sanskrit** drops its subjects even more thoroughly: only 12.1% of finite third-person verbs in the UFAL treebank have an overt pronoun subject, so a pronoun binder touches at most one subject in eight. And running text is sandhied: the word that the treebank writes *saḥ*, the Pañcatantra writes *so* 160 times to 7. The agent's register has to carry the sound changes. Binding is 15% of what the finder finds, by eye a majority of those bindings land on a being that is not a character (`nāma`, "named", `tataś`, "then"), and there is no coreference gold anywhere to count it with. Devanagari remains unread: 195 sentences, zero beings, zero bindings. The system does not pretend otherwise; each of those is a typed gap.

**Mandarin** has *tā*. 他 and 她 are pronounced identically; the gender lives only in the character, a distinction that was popularised, in writing, in the early twentieth century. The pipeline works end to end, with names *discovered* (repetition against a shuffled null, a lexicon, a treebank context prior) because Chinese has no capital letters to announce a name. It has no gold. Its precision is unmeasured. The agent asked to download a Chinese coreference corpus; I did not take that as permission and it remains your decision.

A pronoun system is a dialect of attention, and the question *who is he?* has an answer in a different place in each language: on the page, in the verb, in the character, or only in the speaker's head.

---

## 10. They, thee, and what a pronoun really is

The most important correction of the season was the user's, and it was not about code.

I had been treating *he* and *she* as the problem. The user pointed at *they*: the singular they, which in GUM refers to a grammatically singular entity about a fifth of the time (1,294 *they/them* mentions; the singular share is 19% for persons, 54% for organisations and 59% for places, and 31% in podcasts against 3% in academic prose). And then something larger: *pronouns need to be discovered for what they really are: stable basins for aliases that open activation channels that evolve in use over time.* Thee and thine and thou.

Look at it that way and the architecture turns inside out. A pronoun is not a rule that points; it is a basin, a region of use that attracts. It has a **channel** in it, an activation pathway that opens when the word is spoken. The basin *moves*. *Thou* was the singular, intimate form; *you* was plural and then polite and then everything, until *thou* retreated into scripture, poetry and dialect. Singular *they* is centuries old and has surged and been scolded and surged again. The "pronoun" is a trajectory.

This is why Zenodotus holds dated, located sources and measured priors sliced by period and place, and why `date_basis` is a field with three honest values: stated in the text, from source metadata, or unknown, and the unknown slice is never pooled with the dated ones. A reading of a 1600 text and a reading of a 2010 podcast should not be reading with the same prior, and the system should say which prior, which slice, which hash.

The proposal is a measurement. Take four slices (about 1600, the eighteenth century, the nineteenth, the modern); discover the pronoun basins from what *distributes* like what, using the complementary-distribution kernel, in which two expressions that pick out one referent share scenes and avoid sharing a frame; ask whether *thou, thee, thine* form their own basin in the 1600 slice and thin out of the later ones; ask how singular *they* changes by period and by register. Score the English basins against UD's PRON tags first. Then, for every reading, write into the pharos entry its `basis`: the hash of the prior slice used, the document's date and its basis, the three clocks (the document's time, the reading's time, the prior's time). That experiment is preregistered in outline and not yet run.

---

## 11. Pharos, Zenodotus, and the clocks

Here is the design the last few weeks have been circling.

**Zenodotus** is the immutable given. It is the sources and the measured priors, sliced by date and place, snapshot-versioned. Nothing a reading does can change it. **Pharos** is the live record: append-only, holding readings, thoughts, retractions, basin revisions. Together they give a reading three clocks. The *document's* time is when the text was written. The *reading's* time is when this read happened. The *prior's* time is the slice of Zenodotus the read leaned on. A reading that records all three can be *replayed*, and can be *re-judged* when a prior is superseded, with a `prior-superseded` event instead of a silent rewrite. A text can even be dated by its basin fit: the prior slice that makes it least surprising is a guess at when it was written.

This is also where the **thoughts** live. A thought, in this program's sense, is a recorded act of hindsight: *had I known this earlier, the earlier reading would have been less surprising.* The system keeps a ledger of such thoughts in pharos, with a meta-policy it learns from which kinds of thought pay off. That is competence, as the user defined it: the closing of a gap between what was surprising then and what would have been unsurprising had the right idea been available. We measured it honestly. With default dials it is 8 to 11%. An earlier figure of 24% was inflated by chosen dials and a circular pronoun rule, and the correction is in the record.

The wider framings that sit under this are the user's, and they are not metaphors to me so much as design constraints. *A pixel is the company it keeps.* A holograph is the system's hypothesis of what things are, a scale-versus-position tracker for assets. *Synapses are both expressways and the INS of induced kinds*; for great distances the expressway is most useful, and for really great distances it needs to be a *wormhole*. Pheromones become synapses become stable basins of connections: first a trace, then a path, then a place. I have not measured any of those into existence, and I want to be clear that they remain a direction. What exists is the bookkeeping that would let them be measured: the pharos ledger, the basin-discovery kernel, the library of vectors.

---

## 12. What the work is *for*

There is a version of this essay that ends on the number: 0.874 to 0.911. It is a real number, honestly bounded, and it is in the English read now. But I think the number is the least interesting thing that happened.

What the program is learning to do is **know how much it knows**. A reader that binds *she* and files a typed gap when it cannot. A read that says "no ruling about non-persons" rather than quietly behaving as though it had one. A smell that proposes and a null that disposes. An archon whose dossier lists the places we bent him. A table of words that is better than an embedding and a fast embedding that is no worse than a slow one. A language that is not bound until its own evidence says it can be. A guard that fails when the reading changes without a note. These are all the same move: refusing to let a missing piece of knowledge masquerade as a result.

The weirdest and most hopeful thing I can say about it is that **the failures were the research**. The chase failing taught us that the test slice was easy and the training gain was not real. The embeddings failing taught us that wide context over-rules the people it should protect and that a measured window is mostly zero. The emergent classes failing taught us that word vectors are about topics, and that syntax needs frames. The line failing to predict errors taught us that the idea of a contested width is good and the instrument is not. A program that only records its wins is writing a brochure.

---

## 13. What is open

On the user's word:

- **Push `main`**, and **merge the three language branches** (Mandarin, Greek, Sanskrit), each from an older main, each needing a merge and a baseline re-record.
- **Download a Chinese coreference corpus** so that Mandarin precision can finally be measured.
- **Where the non-personal lexicon comes from** for languages without a name table. A perfect Wiktionary-style ruling would raise English precision to about 0.875 at 39% coverage; that is a calculation, not a result.

On the work:

- **Basin discovery on dated slices**, with thou, thee, thine, singular they, the pharos `basis`, and the three clocks.
- **Per-language POS centroids**: the builder exists for any language whose POS prior is on disk, but it needs an embedding model that reads that language, and quality outside English is unmeasured.
- **A syntactic representation** for emergent classes, built on frames and not on word vectors.
- **Late binding**, the one stage of round 13 that looked good on its own (19 right, 3 wrong), preregistered by itself on fresh data.
- **The substitution smell**: replace the pronoun in its sentence with each candidate, and ask which substitution is the most person-shaped. Registered, not run.
- **Coverage**, the quiet one. The default binds about 63% of the answerable pronouns on the confirmatory set. The rest remain open. A decoder that says "I don't know" is a feature, but 37% is a lot of unknown.

---

## 14. Coda: the lighthouse

The Pharos of Alexandria was a lighthouse that was also, according to the stories, a landmark you could see from the sea long before you reached the harbour. What a lighthouse does is not to *show you the ship*. It tells the ship where the shore is, so that the ship can decide what to do.

That is what we have been building, I think: not a reader that understands, which is a claim I will not make and cannot measure, but a reader that *marks the shore*. Here are the places where a *she* can fall. Here is how often it falls in the right one. Here is what it did when it was not sure, and here is the note that says so. And in the library behind it, the books and the catalogue and the keeper of the light, all of it written down so that the next reader, or the same reader a year from now, can check it.

The sentence we started with still has a hole in it. *She* is Gloria. *It* is the eczema. The decoder now gets the first right more often than it did, because it knows that a place cannot scratch. It still does not know what the cold is for. Neither, quite, do we. That is the next stretch of coast.
