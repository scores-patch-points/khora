# Pins: defects to return to and find why the binding was wrong

Found 2026-11-23 (exploratory, War and Peace). 14 pins; each is also one pharos entry (kind `pin`, status open) in `~/.pharos/fold-demo`. Re-run `pins.mjs` on a saved parse to regenerate the evidence. Close a pin by setting its status and the cause.

## emperor-absorbed-by-rostov (binding, open)
**The bare word 'Emperor' is bound to Rostóv**

- node: Rostóv (789) [Emperor | Count Rostóv | Count | Cadet Rostóv]
- bound: 'Emperor' (a PROPN in a name run beside 'Rostóv') joined Rostóv's referent
- should be: the Emperor (Alexander or Napoleon, by context) is its own referent; Rostóv is not an emperor
- look first: CAUSE SEEN IN THE EVIDENCE: 'the Emperor' and 'Rostóv' are co-arguments of one verb ('his proximity to the Emperor shocked Rostóv'); a cannot-link (co-arguments of a verb are two people: 13 to 27 such clauses for different people against 0 to 2 for aliases, alias-probe.mjs) would have vetoed this merge. Then: referents-in-order.mjs: the side-by-side split and the title-alone rule (titleOf = the last being that carried the title); does the parser chain 'Rostóv … Emperor' as a flat name part, so the run is never split?
- repro: `node eval/identity-reid/pins.mjs <the saved parse of War and Peace>`
- evidence:
  - sentence 7994: The wounded soldier was so dirty , coarse , and revolting that his proximity to the Emperor shocked Rostóv .
  - sentence 7995: Rostóv saw how the Emperor ’s rather round shoulders shuddered as if a cold shiver had run down them , how his left foot began convulsively tapping the horse ’s side with the spur , and how the well-trained horse looked…
  - sentence 8000: said the Emperor apparently suffering more than the dying soldier , and he rode away .

## prince-absorbed-by-nicholas (binding, open)
**The bare title 'Prince' is bound to Nicholas**

- node: Nicholas (647) [Prince | Prince Nicholas | Chief | Nicholas Day]
- bound: bare 'Prince' (11+ mentions) lands in Nicholas's referent (Nicholas Rostóv, or Prince Nicholas Bolkónski, two people)
- should be: 'Prince' alone is the last prince in view (Andrew, Vasíli, Bagratión), never a fixed member of one referent
- look first: CAUSE SEEN IN THE EVIDENCE: two different Nicholases, Nicholas Rostóv and Prince Nicholas Andréevich Bolkónski (the old prince, sentences 2948 and 2949); the first-name short form 'Nicholas' is held whole by both longer names, and the patronymic (Andréevich against Rostóv's) and the old / young epithet are the discriminators. Also: titleOf keeps ONE being per title; the old prince (Nikolái Andréevich Bolkónski) and Nicholas Rostóv are both 'Nicholas'; a shared first name makes the fold ask one referent to be two people
- repro: `node eval/identity-reid/pins.mjs <the saved parse of War and Peace>`
- evidence:
  - sentence 2948: At Bald Hills , Prince Nicholas Andréevich Bolkónski ’s estate , the arrival of young Prince Andrew and his wife was daily expected , but this expectation did not upset the regular routine of life in the old prince ’s h…
  - sentence 2949: General in Chief Prince Nicholas Andréevich ( nicknamed in society , “ the King of Prussia ” ) ever since the Emperor Paul had exiled him to his country estate had lived there continuously with his daughter , Princess M…
  - sentence 6779: Prince Nicholas frowned , but said nothing .

## brothers-absorbed-by-petersburg (binding, open)
**'Brothers' (the Masons) is bound to Petersburg**

- node: Petersburg (247) [Brothers | Petersburg Brothers]
- bound: 'Brothers' and 'Petersburg Brothers' are forms of the city
- should be: 'Brothers' is a group, and 'Petersburg Brothers' a name run of a place and a group (two referents)
- look first: name runs of two capitalised nouns that are not both names; the side-by-side rule needs a common-noun test on the second word
- repro: `node eval/identity-reid/pins.mjs <the saved parse of War and Peace>`
- evidence:
  - sentence 13214: A solemn meeting of the lodge of the second degree was convened , at which Pierre promised to communicate to the Petersburg Brothers what he had to deliver to them from the highest leaders of their order .
  - sentence 13240: The majority of the Brothers , seeing in it dangerous designs of Illuminism , * met it with a coldness that surprised Pierre .
  - sentence 13255: Following this letter one of the Masonic Brothers whom Pierre respected less than the others forced his way in to see him and , turning the conversation upon Pierre ’s matrimonial affairs , by way of fraternal advice ex…

## denisov-two-people (binding, open)
**Two different Denísovs are one referent, and the hussar is split across two**

- node: Denísov (134) [Intendant General Kiríl Andréevich Denísov]
- bound: 'Intendant General Kiríl Andréevich Denísov' (a general in a letter) sits in the referent that carries most mentions
- should be: Vasíli Dmítrich Denísov (the hussar) is one referent; the general is another; patronymics Andréevich and Dmítrich are a deal-breaker for merging (one father each)
- look first: CAUSE SEEN IN THE EVIDENCE: 'What relation are you to Intendant General Kiríl Andréevich Denísov?' is a kin question between two people who share a surname: a kin question is itself a cannot-link. Then: the shared surname is the only link; a functional constraint (one patronymic per person) would split it. See patronymic-probe.mjs: Denísov carries Andréevich in one referent and Dmítrich in another
- repro: `node eval/identity-reid/pins.mjs <the saved parse of War and Peace>`
- evidence:
  - sentence 21978: “ What relation are you to Intendant General Kiríl Andréevich Denísov ? ”

## natasha-junk-forms (binding, open)
**'Natásha rose' and 'Natásha Natásha' are forms of Natásha**

- node: Natásha (1209) [Natásha rose | Natásha Natásha]
- bound: a verb ('rose') and a repeated name were read as part of the name
- should be: 'rose' is a verb after the name; the name is 'Natásha'
- look first: the parser tags 'rose' PROPN with a flat deprel to the name (a tagging error upstream); referents-in-order trusts PROPN + flat; a POS-prior check on the second word (rose is mostly a verb or common noun) would reject it
- repro: `node eval/identity-reid/pins.mjs <the saved parse of War and Peace>`
- evidence:
  - sentence 9361: And Natásha rose and went out of the room on tiptoe , like a ballet dancer , but smiling as only happy girls of fifteen can smile .

## andrew-absorbs-old-prince (binding, open)
**The old prince (father) is merged into Prince Andrew (son)**

- node: Prince Andrew (1765) [Andrew | Prince | Bolkónski | Prince Bolkónski]
- bound: forms 'Bolkónski', 'Prince Bolkónski', 'Andréevich' (the father's patronymic: Nikolái Andréevich) are Prince Andrew's
- should be: two referents: Andrew's own patronymic is Nikoláevich; 'Andréevich Bolkónski' is the old prince, his father
- look first: CAUSE SEEN IN THE EVIDENCE: sentence 10170 ('the young Prince Nicholas Andréevich was baptized') is Andrew's infant son; grandfather and grandson carry the SAME name and patronymic, so only the epithet (old / young) and kin separate three bearers (the old prince, Andrew, the infant). Then: the surname is shared by father and son and the string rule calls it one name; the kin fact (father) and the two patronymics say otherwise (Andréevich vs Nikoláevich point at each other); a cannot-link from kin would split them. This is the 'old Prince Bolkónski' click in the panel
- repro: `node eval/identity-reid/pins.mjs <the saved parse of War and Peace>`
- evidence:
  - sentence 2948: At Bald Hills , Prince Nicholas Andréevich Bolkónski ’s estate , the arrival of young Prince Andrew and his wife was daily expected , but this expectation did not upset the regular routine of life in the old prince ’s h…
  - sentence 2949: General in Chief Prince Nicholas Andréevich ( nicknamed in society , “ the King of Prussia ” ) ever since the Emperor Paul had exiled him to his country estate had lived there continuously with his daughter , Princess M…
  - sentence 10170: Another five days passed , and then the young Prince Nicholas Andréevich was baptized .
  - sentence 528: He is the well-known Prince Bolkónski who had to retire from the army under the late Emperor , and was nicknamed ‘ the King of Prussia . ’

## bezukhov-father-then-son (binding, open)
**'Count Bezúkhov' is the father until his death, then Pierre**

- node: Bezúkhov (78) [Count Bezúkhov | Vladímirovich | Vladímirovich Bezúkhov | Count Vladímirovich]
- bound: one referent called Bezúkhov / Count Bezúkhov (78)
- should be: the title passes at the father's death: before it, Count Bezúkhov is the father; after, Pierre. A dependency between facts (a death), invisible to strings and folds
- look first: needs a state-change fact (died / death) ordered in time: dead people do not act; later uses of the title attach to the heir (kin fact: Bezúkhov is Pierre's father, found by kin-probe.mjs)
- repro: `node eval/identity-reid/kin-probe.mjs <parse>`
- evidence:
  - sentence 572: This stout young man was an illegitimate son of Count Bezúkhov , a well-known grandee of Catherine ’s time who now lay dying in Moscow .
  - sentence 32755: Besides the Bezúkhov family , Nicholas ’ old friend the retired General Vasíli Dmítrich Denísov was staying with the Rostóvs this fifth of December .

## kin-wrong-ties (binding, open)
**Kin facts tied to the wrong name**

- node: possessed kin nouns tied to a name by apposition, predicate or title
- bound: Véra is Prince Andrew's sister; Speránski is Prince Andrew's son; Kutúzov is Anatole's father; Sónya is Borís's mother (and 'Father', 'Brother' as names)
- should be: Andrew's sister is Mary; Andrew's son is Nikolénka; Anatole's father is Prince Vasíli; Borís's mother is Anna Mikháylovna
- look first: which edge made the tie: an apposition across a comma, a predicate, or a title edge (the title rule ties a description to the last name that carried the head, within the horizon). Check each edge's first sentence; the title edge is the likeliest culprit
- repro: `node eval/identity-reid/kin-probe.mjs <parse>`
- evidence:
  - sentence 2116: This was Lieutenant Berg , an officer in the Semënov regiment with whom Borís was to travel to join the army , and about whom Natásha had teased her elder sister Véra , speaking of Berg as her “ intended . ”
  - sentence 13171: The fact that Speránski was the son of a village priest , and that stupid people might meanly despise him on account of his humble origin ( as in fact many did ) , caused Prince Andrew to cherish his sentiment for him t…
  - sentence 7177: When your father writes to tell me that you are behaving well I will give you my hand to kiss .
  - sentence 16875: “ Look , there ’s Alénina , ” said Sónya , “ with her mother , is n’t it ? ”

## kin-derived-sibling-wrong (binding, open)
**Mary and Natásha derived as siblings**

- node: parent-converse composition
- bound: Mary ~ Natásha share a tied parent
- should be: they are not siblings (Mary Bolkónskaya, Natásha Rostóva); one wrong tie became one wrong derived fact
- look first: both 'father' nominals are tied to the same vocative referent named 'Father' (a form, not a person); a vocative must not be a name referent, or must be resolved to the addressee's relative
- repro: `node eval/identity-reid/kin-probe.mjs <parse>`

## giver-wife-not-kin (giver, open)
**'wife' is not under kin in the hyperlexicon**

- node: hyperlexicon noun node for 'wife'
- bound: no hypernym path of 3 steps to relative / spouse / kin
- should be: wife is a spouse
- look first: the wiktionary hypernym edges for 'wife' (relations op on its noun node); a missing hyper edge in the giver, not a reader fault; wife (131 possessed mentions) is the commonest kin noun left out
- repro: `node eval/identity-reid/kin-probe.mjs <parse>  (wife has no K)`

## titles-absorb-persons (binding, open)
**Title referents carry named persons' patronymics**

- node: Emperor (232) [Alexander | Emperor Alexander | Kaiser Alexander | Prince Alexander]
- bound: the 'Emperor' referent holds Timoféevich; the 'Majesty' referent holds Fëdorovna
- should be: a title is not a person; a patronymic marks a named person (Timoféevich: Timokhin; Fëdorovna: the Empress Márya Fëdorovna)
- look first: the title-alone rule sends a bare title to the last being that carried it, and the form list then collects that being's other names; a patronymic-bearing form inside a title-led referent is a signal of a mis-merge (patronymic-probe.mjs)
- repro: `node eval/identity-reid/patronymic-probe.mjs <parse>`

## alias-fold-register-bound (design, open)
**Aliases do not share a fold (Napoleon ~ Bonaparte cosine 0.06)**

- node: Bonaparte / Buonaparte vs Napoleon
- bound: fold similarity ranks the alias 7th to 47th of 130, below close associates
- should be: an alias should rank near the top, and associates (Natásha ~ Sónya) should not
- look first: alias use is register-bound (the salon says 'Bonaparte', the narration 'Napoleon'), so the partners are partly the speakers; drop agents of say from the fold, or compare verbs and roles instead of partners
- repro: `node eval/identity-reid/alias-probe.mjs <parse>`

## twins-and-hubs (design, open)
**Twins and hubs defeat re-identification by partners**

- node: Sónya ~ Natásha, God / Mademoiselle Bourienne ~ Natásha
- bound: Sónya's nearest B-half fold is Natásha's (0.16 own against 0.19)
- should be: own fold nearest
- look first: hubs overlap everyone's partners (use PMI instead of tf-idf); twins need the edges family (role:verb:partner) as a tie-break by backoff
- repro: `node eval/identity-reid/identity-reid.mjs <parse>`

## pronouns-contested-share (design, open)
**64% of the pronouns bound across clauses are contested**

- node: referentsInOrder pass B
- bound: 38,507 bound, 24,778 contested, no gold scored
- should be: measure on the fixed giver (the CorefUD scorer) before this becomes canonical
- look first: the fallback (the most recent present being with no evidence leaning the other way); the subject-last touch order and the given-name lean improved short texts only (a chat), neutral on the book
- repro: `see eval/reading-baseline/CHANGES.md`
