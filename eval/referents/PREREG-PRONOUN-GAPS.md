# PRONOUNS: the unbound ones, typed on the entry — pre-registration, written before the option is implemented and before the confirmation slice is read

Date: 2026-10-27. Agent: cc-cast-initial. Asked by `P-…-referent-read-23` ("the pronouns are where the mass is": on the 30 GUM test documents the pronoun golden has 266 answerable
pronouns, 256 unbound, none of them typed on the entry). Follows khora#79's pronoun golden (`pronoun-golden.mjs`).

## The defect (read in the code at khora main 0287222, nothing measured yet)

`adapters/text/pronouns.js::resolvePronouns` returns `{ bindings, gaps, regime }`, but `organs/hypergraph.js::pronounBindingsFor` keeps only `bindings`
(returns `{ bindings, bestSurface }`), so a gap the resolver files never reaches `entry.pronouns` or anything beside it. Three more silent paths:

1. In the default REFUSED regime a frame that carries a name beside the pronoun is **not read at all** and files no per-pronoun item (only `regime.framesCoPresent`).
2. A passage with no discovered referent returns before the resolver runs: no item.
3. The English class is `he him his himself she her hers herself`. "it/its/itself" are never looked at: no resolver gap can cover them.

## The change (one option, default off)

`readerOptions.pronounGaps: true` makes the read file, on the entry, `entry.pronounGaps`: one typed item for every pronoun of the resolver's own class that the read did not bind:

`{ pronoun, at: [start, end], sentence, reason, regime, candidates: [{ ref, surface, score }], detail }` — `at` and `sentence` are the entry's own addresses, as in `entry.pronouns`.

`reason` is one of the resolver's own (`pronoun_no_candidate`, `pronoun_below_floor`, `pronoun_no_margin`, the contested ones) or one of two new ones the option adds:
`frame_not_read` (the refused regime did not read the frame because a name is co-present; `candidates` are the names in the frame) and `no_referent_discovered`
(the passage had no being for a pronoun to bind to; `candidates` empty). `regime` is the resolver's (`refused`, `adjudicated`, `unsupported_language`) or `none`.
`candidates` are the referents the resolver scored for that pronoun (all, no cap) or, for an unread frame, those named in it. The pronoun hits come from the resolver's own
matcher (`findThirdPersonSingular`), so no second reader is assembled. Option absent or false: the resolver, the reader and the entry are untouched.

## Sets

| set | what | role |
|---|---|---|
| B | the pronoun golden's slice B (seed 20261120) | DEVELOPMENT (read for the pronoun work already; the option's shape is worked out on it) |
| G | all 30 documents of the GUM dev split (`en_gum-ud-dev.conllu`, sha256 `61d02ce27a143e9749118b1b9c314ac3da40f64ec17a6aaff5fc7b42704f7910`), each of at least 20 sentences | CONFIRMATION: not read by this session; scored once. Whether another session read the dev split is not known. |

## Terms (the golden's own, `pronoun-golden.mjs::scoreDocument`)

An **answerable** pronoun is a gold third-person-singular personal pronoun whose gold entity has a PROPN mention the cast covers. It is **unbound** when no
`entry.pronouns` row overlaps its span. It is **in-class** when its lower-cased form is one of the eight above.

## Bars (numbers decided now; each reported held / failed / untestable with its number)

On G, option on:
- **P1 typed**: of the unbound answerable in-class pronouns, 100% have an item in `entry.pronounGaps` whose `at` overlaps the pronoun's span. Untestable if fewer than 20.
- **P2 no false item**: 0 items overlap a bound pronoun, and 0 items cover a span that is not a pronoun of the class.
- **P3 identity (C2)**: (a) option off (the default), every one of the 30 documents reads to an entry deep-equal (excluding `ms`) to the one khora main (0287222, a second checkout)
  reads; (b) option on, the entry minus `pronounGaps` is deep-equal to option off.
- **P4 typed completely**: every item has `reason`, `regime`, a `candidates` array and `detail`, and `reason` is one of the five named families above.

Descriptive, no bar (the plain control the request asked for): the **room**, i.e. of the unbound answerable in-class pronouns, the share whose gold antecedent entity is a being among the
item's `candidates` (a being counts for the entity when its own cast spans overlap a gold mention of it, the golden's rule); the reasons' distribution; the unbound answerable pronouns
that are out of class (for instance "it") and so have no item, counted by form.

## Controls (built to fail)

- **K1** the resolver's own gaps only (no `frame_not_read`, no `no_referent_discovered`): must FAIL P1.
- **K2** an item for every pronoun of the class, bound or not: must FAIL P2.

## What this can and cannot show

It can show that every unbound pronoun the resolver's class covers gets a typed, addressed, reasoned item, and that nothing else on the entry moves. It cannot show that a pronoun is
bound correctly (this binds nothing), that the `candidates` of an unread frame (the names in it) contain the antecedent (the room control reports it, and it may be low), or anything
about the pronouns the class does not cover: those get no item and are counted by form, so "all of them" is all of the resolver's class, not all of the golden's. Rule and opinion
alike get something to attach to; whether either would bind better is not tested here. G's freshness is as far as this session knows.
