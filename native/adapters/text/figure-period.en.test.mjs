// figure-period.en.test.mjs — the period and the sign of a money figure, with the address of where each was read (adapters/text/figure-period.en.js).
//   node --test native/adapters/text/figure-period.en.test.mjs
//
// Every case below is constructed here (invented companies, round numbers); none is a sentence from a filing. The month names the binder uses come from
// TimePrior@1, so the unit cases hand it a small table of their own and one case hands it a deranged table, which must move the dates (a control built to
// fail: if the binder had its own month list, deranging the prior would change nothing). The reader hook is held byte-identical when the feature is off.
import test from "node:test";
import assert from "node:assert/strict";
import { figuresOf, periodsIn, monthTable } from "./figure-period.en.js";
import { readWith } from "../../the-fold/read-core.mjs";

const NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const prior = (order = NAMES) => ({ concepts: Object.fromEntries(order.map((en, i) => [`month:${i + 1}`, { class: "month", n: i + 1, en }])) });
const TP = prior();
const only = (text, opts = {}) => { const r = figuresOf(text, { timePrior: TP, ...opts }); return r.figures; };
const per = (f) => (f.period ? `${f.period.kind === "instant" ? "at" : f.period.months + "mo"} ${f.period.end}` : null);

test("a figure carries the period of its own clause, and the second figure of a comparison the one a year earlier", () => {
  const t = "Revenues were $15.0 million for the three months ended March 31, 2022 compared to $12.0 million for the three months ended March 31, 2021.";
  const [a, b] = only(t);
  assert.equal(per(a), "3mo 2022-03-31"); assert.equal(per(b), "3mo 2021-03-31");
  assert.equal(a.basis, "sentence"); assert.equal(b.basis, "sentence"); assert.equal(b.comparative, true);
  const [c, d] = only("Revenues were $15.0 million for the three months ended March 31, 2022 compared to $12.0 million a year ago.");
  assert.equal(per(c), "3mo 2022-03-31"); assert.equal(per(d), "3mo 2021-03-31"); assert.equal(d.basis, "comparative-shifted");
});

test("the address is where it was read: the span slices back to the figure, the period span to the words that gave the period", () => {
  const t = "Revenues were $15.0 million for the three months ended March 31, 2022 compared to $12.0 million a year ago.";
  const [a, b] = only(t);
  assert.equal(t.slice(...a.span), a.text); assert.match(a.text, /15\.0 million/);
  assert.match(t.slice(...a.periodSpan), /three months ended March 31, 2022/);
  assert.match(t.slice(...b.periodSpan), /three months ended March 31, 2022/, "the shifted period points at the words it was shifted from");
  assert.equal(a.stated, 15_000_000);
});

test("several durations and several figures pair by order ('the three and six months ended')", () => {
  const [a, b] = only("Net sales were $24.0 million and $46.0 million for the three and six months ended June 30, 2023, respectively.");
  assert.equal(per(a), "3mo 2023-06-30"); assert.equal(per(b), "6mo 2023-06-30");
});

test("an instant: a balance-sheet figure 'at' a date has no duration", () => {
  const [a] = only("Cash and cash equivalents were $8.0 million at December 31, 2022.");
  assert.equal(per(a), "at 2022-12-31");
});

test("a quarter named by ordinal and year, and a year, are read; the end of the quarter is marked as assumed from the calendar", () => {
  const [a] = only("Revenues for the second quarter of 2021 were $3.0 million.");
  assert.equal(per(a), "3mo 2021-06-30"); assert.equal(a.period.calendar, "assumed");
  const [b] = only("Revenues for 2020 were $9.0 million.");
  assert.equal(per(b), "12mo 2020-12-31");
});

test("the frame: a figure with no period of its own takes the heading above it", () => {
  const t = "Acme Reports First Quarter Ended March 31, 2018 Results\n\nNet income was $4.0 million.";
  const [a] = only(t);
  assert.equal(per(a), "3mo 2018-03-31"); assert.equal(a.basis, "frame"); assert.match(t.slice(...a.frameSpan), /First Quarter Ended March 31, 2018/);
});

test("a heading naming a quarter AND the full year is ambiguous: the figure carries both candidates and no choice", () => {
  const [a] = only("Acme Reports Fourth Quarter and Full Year 2021 Results\n\nNet income was $4.0 million.");
  assert.equal(a.period, null); assert.equal(a.basis, "ambiguous");
  assert.deepEqual(a.candidates.map((c) => c.months).sort((x, y) => x - y), [3, 12]);
});

test("'full year' in the sentence picks the twelve months ending where the frame ends", () => {
  const [a] = only("Acme Reports Fourth Quarter Ended December 31, 2021 Results\n\nFull year revenues of $6.0 million were higher than a year ago.");
  assert.equal(per(a), "12mo 2021-12-31");
});

test("a per-share figure beside a money figure does not displace the period of the loss", () => {
  const [a] = only("The company reported a net income per share of $1.23 and a net loss of $19.9 million for the twelve months ended September 30, 2020.");
  assert.equal(per(a), "12mo 2020-09-30"); assert.equal(a.polarity, "negative");
});

test("the sign: loss, parentheses and a coordinated figure are negative, income is positive, and none is said when no cue is there", () => {
  assert.equal(only("Net loss was $2.0 million in 2020.")[0].polarity, "negative");
  assert.equal(only("Net income was $2.0 million in 2020.")[0].polarity, "positive");
  assert.equal(only("Operating results were ($2.0 million) in 2020.")[0].polarity, "negative");
  const [x, y] = only("Net loss was $2.0 million and $3.0 million in 2020 and 2019.");
  assert.equal(x.polarity, "negative"); assert.equal(y.polarity, "negative");
  assert.equal(only("Revenues were $2.0 million in 2020.")[0].polarity, null);
});

test("a forward-looking sentence is flagged, not dropped", () => {
  const [a] = only("The company expects revenues of $10.0 million for the full year 2024.");
  assert.equal(a.forwardLooking, true); assert.equal(per(a), "12mo 2024-12-31");
});

test("a figure with no period and no frame has period null: a typed absence, never a guess", () => {
  const [a] = only("Revenues were $2.0 million.");
  assert.equal(a.period, null); assert.equal(a.basis, "none");
});

test("a detail with no period of its own in a sentence that has periods is left alone", () => {
  const f = only("Revenues were $15.0 million for the year ended December 31, 2022, including a $60.0 million amendment payment.");
  assert.equal(per(f[0]), "12mo 2022-12-31"); assert.equal(f[1].period, null); assert.equal(f[1].basis, "detail");
});

test("the control built to fail: the month names come from the prior, so a deranged prior moves the dates", () => {
  const t = "Revenues were $15.0 million for the three months ended March 31, 2022.";
  assert.equal(per(only(t)[0]), "3mo 2022-03-31");
  const swapped = prior([...NAMES.slice(2, 3), ...NAMES.slice(0, 2), ...NAMES.slice(3)]);   // March now numbered 1, January 2, February 3
  assert.equal(per(only(t, { timePrior: swapped })[0]), "3mo 2022-01-31", "March means whatever the prior says it means");
});

test("no TimePrior: periods that need a month name are not read, and the gap is typed", () => {
  const r = figuresOf("Revenues were $15.0 million for the three months ended March 31, 2022.", { timePrior: null });
  assert.equal(r.figures[0].period, null);
  assert.ok(r.gaps.some((g) => g.gap === "no_time_prior"));
});

test("three-letter month abbreviations are accepted only where the three letters name one month; a clash names none", () => {
  const m = monthTable(TP);
  assert.equal(m.get("sep"), 9); assert.equal(m.get("mar"), 3);
  const clash = monthTable(prior(["June", "July", ...NAMES.slice(2, 5), "Juno", ...NAMES.slice(6)]));
  assert.equal(clash.get("jun"), undefined, "June and Juno share 'jun', so the abbreviation names nothing");
  assert.equal(periodsIn("for the three months ended Sep. 30, 2023", m).length, 1);
});

test("the reader hook: with the feature off the entry is exactly what it was; on, it adds only `figures`", () => {
  const text = "Acme Corp. Reports First Quarter Ended March 31, 2018 Results\n\nRevenues were $15.0 million compared to $12.0 million. Net loss was $2.0 million.";
  const strip = (e) => { const { ms, figures, ...rest } = e; return rest; };
  const off = readWith(text, { language: "eng", minCharacters: 0 }), on = readWith(text, { language: "eng", minCharacters: 0, features: { figures: true } });
  assert.equal("figures" in off, false);
  assert.deepEqual(strip(on), strip(off));
  assert.ok(Array.isArray(on.figures.figures) && on.figures.figures.length === 3, "three money figures");
});

test("another language reads no figures and says so in a typed gap (the binder's closed classes are English)", () => {
  for (const [language, text] of [["jpn", "売上高は153億円でした。純損失は20億円でした。"], ["arb", "بلغت الإيرادات 153 مليون دولار في عام 2021."], ["deu", "Der Umsatz betrug 15,0 Millionen Euro im Jahr 2022."]]) {
    const e = readWith(text, { language, minCharacters: 0, features: { figures: true } });
    assert.deepEqual(e.figures.figures, [], language);
    assert.equal(e.figures.gaps[0].gap, "figures_english_only", language);
  }
});

test("deterministic: the same text gives the same figures", () => {
  const t = "Revenues were $15.0 million for the three months ended March 31, 2022 compared to $12.0 million a year ago. Net loss was $2.0 million.";
  assert.equal(JSON.stringify(figuresOf(t, { timePrior: TP })), JSON.stringify(figuresOf(t, { timePrior: TP })));
});
