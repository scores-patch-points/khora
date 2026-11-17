# AMENDMENT 1 to NOVELS-PREREG.md (data source), written before any question is matched to any text

Found 2026-11-17 while downloading, before any reader or answerer ran:
1. `www.gutenberg.org` answers 503 (Retry-After 3600). The books are fetched from the official mirror `gutenberg.pglaf.org` (same ebook ids). Recorded per book in `books-manifest.json` (`mirror_url`).
2. NarrativeQA's `story_start`/`story_end` are token-spaced snippets (e.g. `new eBooks .`), so markers are matched as token sequences with free whitespace. The cut is from the start marker to the
   Gutenberg line `*** END OF` (the footer is removed, as the prereg says); the NarrativeQA story_word_count includes the footer, so the integrity check below uses the cut by NarrativeQA's own markers.
3. DATA-INTEGRITY RULE (new): NarrativeQA's story_url for some books names a different ebook than the book the questions were written about (found: document 4a92bf27 "The Wonderful Toymaker"
   resolves to Evelyn Sharp's "All the Way to Fairyland", 41,283 words against a stated 46,942). A downloaded book is USED only if the word count of its text cut by NarrativeQA's own markers is within 3% of the stated
   story_word_count. A book failing it is dropped and replaced by the next in the seeded order, and reported. This uses no question, no answer, and no reader output.

## 1b (2026-11-17, same day, still before any question is matched to any text or any reader is run)
The first run of rule 3 dropped every book that has a start and end marker, with whitespace-word counts 12-24% BELOW the stated counts: NarrativeQA's counts are of its tokenised text (punctuation separate). With a
`\w+|[^\w\s]` token count the five books that matched markers were 5.5% to 9.3% ABOVE stated (ratios 1.063, 1.083, 1.093, 1.055, 1.074), a stable band, so those are the same books (a different book would not land in a 4-point
band) and rule 3 was mis-specified. Rule 3 is replaced by: the token count of the text between the markers must be within 15% of the stated story_word_count (the band above plus room for edition differences; chosen from counts alone,
not from any question, answer or reader output). Where the mirror's newer edition lacks the NarrativeQA start marker, the start is the end of the line `*** START OF`; where it lacks the end marker, the end is the line `*** END OF`.
The Gutenberg title is NOT used as an identity check (NarrativeQA's wiki_title differs from the Gutenberg title for 4a92bf27: "The Wonderful Toymaker" vs Evelyn Sharp's "All the Way to Fairyland"); this is disclosed in the results, and the questions' Q3 filter (answer must occur in the text) is what guards against a book whose questions were written about another text.
