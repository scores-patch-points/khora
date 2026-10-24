// opencode-battery.mjs — an ADVERSARIAL battery for the profile: every case has a ground truth a person can check, and the
// run reports WHERE the machine is wrong (missed falsification, false alarm, false support), not whether it passes.
//   node opencode-battery.mjs [--research]     (research off by default: deterministic, no network)
import { finish } from "./opencode-finish.mjs";
import { warm } from "./opencode-lane.mjs";

const research = process.argv.includes("--research");
const MAT = [{ name: "curie.md", text: "Marie Curie and Pierre Curie discovered radium in 1898. Marie Curie died in 1934 of aplastic anemia, likely caused by radiation exposure. Pierre Curie died in 1906 when a horse-drawn wagon ran him over in Paris. Marie Curie won the Nobel Prize in Physics in 1903 and the Nobel Prize in Chemistry in 1911. Marie Curie did not win a Nobel Prize in 1900." }];
const RETRY = [{ name: "src/net/retry.ts", text: "export function withRetry<T>(fn: () => Promise<T>, opts: { attempts: number; delayMs: number }): Promise<T> {\n  for (let i = 0; i < opts.attempts; i++) {}\n}\nexport const DEFAULT_ATTEMPTS = 3" }];

// want: the standing the SENTENCE (matched by `at`) must end with. "ok" = supported/found; "bad" = contradicted/not_found;
// "flag" = unsupported (shown to the person, not a verdict of falsehood); "skip" = argument/question/heading (not checked).
const C = [
  // ── prose that is true ────────────────────────────────────────────────────────────────────────────────────────────
  { id: "true-verbatim", text: "Marie Curie discovered radium in 1898.", at: "discovered radium", want: "ok", why: "baseline" },
  { id: "true-paraphrase", text: "Marie Curie's discovery of radium came in 1898.", at: "discovery of radium", want: "ok", why: "paraphrase of a stated fact" },
  { id: "true-pronoun", text: "Marie Curie was a physicist. In 1934 she died of aplastic anemia.", at: "she died", want: "ok", why: "pronoun carries the subject" },
  { id: "true-words-count", text: "Marie Curie won two Nobel Prizes.", at: "won two", want: "ok", why: "a count the material states only as two separate prizes", hard: true },
  // ── prose that is false, and the material says so ─────────────────────────────────────────────────────────────────
  { id: "false-year", text: "Marie Curie discovered radium in 1899.", at: "1899", want: "bad", why: "wrong year" },
  { id: "false-negation", text: "Marie Curie did not discover radium.", at: "did not discover", want: "bad", why: "negation flip" },
  { id: "false-negation-2", text: "Marie Curie never won a Nobel Prize in Chemistry.", at: "never won", want: "bad", why: "negation flip with never" },
  { id: "false-subject-swap", text: "Pierre Curie died in 1934 of aplastic anemia.", at: "Pierre Curie died", want: "bad", why: "the predicate belongs to Marie, not Pierre", hard: true },
  { id: "false-cause", text: "Pierre Curie died in 1906 of radiation exposure.", at: "radiation exposure", want: "bad", why: "the material gives a different cause", hard: true },
  { id: "false-place", text: "Pierre Curie died in 1906 when a train ran him over in Paris.", at: "train", want: "bad", why: "wagon, not train", hard: true },
  { id: "false-number", text: "Marie Curie won three Nobel Prizes in 1903.", at: "three", want: "bad", why: "one prize in 1903", hard: true },
  { id: "false-negated-fact", text: "Marie Curie won a Nobel Prize in 1900.", at: "1900", want: "bad", why: "the material says she did NOT" },
  // ── prose the material does not cover (flag it; never call it false, never call it true) ──────────────────────────
  { id: "uncovered-fact", text: "Marie Curie was born in Warsaw.", at: "born in Warsaw", want: "flag", why: "not in the material" },
  { id: "uncovered-quote", text: "Marie Curie said \"nothing in life is to be feared, it is only to be understood\" in 1930.", at: "nothing in life", want: "flag", why: "a quote the material never has" },
  { id: "uncovered-hedge", text: "Marie Curie may have discovered radium in 1899, some historians say.", at: "may have", want: "flag", why: "a hedge is not an assertion; either flag or skip, never ok", alt: ["skip", "flag", "bad"] },
  // ── claims with no capital letter, number or quote: the checkable gate's blind spot ───────────────────────────────
  { id: "lowercase-false", text: "the discovery of radium took place well after 1900.", at: "well after", want: "bad", why: "a lowercase temporal claim", hard: true },
  { id: "lowercase-fact", text: "radium was discovered by two people working together.", at: "radium was", want: "flag", why: "a checkable claim with no name or number in it", alt: ["flag", "ok", "bad"], hard: true },
  // ── pronouns and carry ────────────────────────────────────────────────────────────────────────────────────────────
  { id: "pronoun-order", text: "Pierre Curie met Marie Curie in Paris. She died in 1934 of aplastic anemia.", at: "She died", want: "ok", why: "she is Marie though Pierre is named first", hard: true },
  { id: "pronoun-wrong-he", text: "Pierre Curie met Marie Curie. He died in 1934.", at: "He died", want: "bad", why: "he is Pierre, who died in 1906", hard: true },
  // ── splitting and shape ───────────────────────────────────────────────────────────────────────────────────────────
  { id: "split-abbrev", text: "Dr. Marie Curie discovered radium in 1898 e.g. with her husband. She won a Nobel Prize in 1903.", at: "She won", want: "ok", why: "sentence splitting across Dr. and e.g.", hard: true },
  { id: "split-decimal", text: "Radium decays with a half-life of about 1600 years. Marie Curie discovered radium in 1898.", at: "Marie Curie discovered", want: "ok", why: "decimal/number sentence neighbours" },
  { id: "list-item", text: "Key facts:\n\n- Marie Curie discovered radium in 1898\n- Marie Curie died in 1934 of aplastic anemia\n- Marie Curie won the Nobel Prize in 1920", at: "1920", want: "flag", why: "a bullet is a sentence; the third is not in the material", alt: ["flag", "bad"] },
  { id: "table-row", text: "| Person | Died |\n|---|---|\n| Marie Curie | 1934 |\n| Pierre Curie | 1910 |", at: "1910", want: "bad", why: "a table row is a claim, and wrong", alt: ["bad", "flag"], hard: true },
  // ── circularity and echo ──────────────────────────────────────────────────────────────────────────────────────────
  { id: "echo-self", text: "Marie Curie invented the telephone in 1876.", at: "telephone", want: "flag", why: "the model's own earlier text, read back as a tool result, is not evidence", echo: true },
  // ── non-English ───────────────────────────────────────────────────────────────────────────────────────────────────
  { id: "lang-es", text: "Marie Curie descubrió el radio en 1898. Marie Curie murió en 1940.", at: "1940", want: "bad", why: "Spanish, wrong year", alt: ["bad", "flag"], hard: true },
];

const CODE = [
  { id: "code-key-bad", text: "```ts\nwithRetry(fn, { attempts: 3, backoffMs: 200 })\n```", name: "backoffMs", kind: "key", want: "bad", why: "not in the signature" },
  { id: "code-key-ok", text: "```ts\nwithRetry(fn, { attempts: 3, delayMs: 200 })\n```", name: "delayMs", kind: "key", want: "ok", why: "in the signature" },
  { id: "code-import-alias", text: "```ts\nimport { withRetry as retry } from \"./net/retry\"\nretry(fn, { attempts: 3, delayMs: 1 })\n```", name: "withRetry", kind: "call", want: "ok", why: "an alias of a real export; flagging it is a false alarm", hard: true },
  { id: "code-path-bad", text: "Edit `src/net/backoff.ts`.", name: "src/net/backoff.ts", kind: "path", want: "bad", why: "no such file" },
  { id: "code-nested-key", text: "```ts\nwithRetry(fn, { attempts: 3, hooks: { onRetry: () => {} } })\n```", name: "onRetry", kind: "key", want: "none", why: "a nested object's keys are not the signature's keys", hard: true },
  { id: "code-method", text: "```ts\nconst r = await client.fetchUser(id)\n```", name: "fetchUser", kind: "call", want: "none", why: "a method on an object this turn never read is unknown, not 'not found'", hard: true },
  { id: "code-python-kw", text: "```py\nwith_retry(fn, attempts=3, backoff_ms=200)\n```", name: "backoff_ms", kind: "key", want: "none", why: "python keyword args are not parsed; no verdict is better than a wrong one", alt: ["none", "unchecked"], hard: true },
  { id: "code-const", text: "Set `DEFAULT_ATTEMPTS` and `DEFAULT_TIMEOUT` before calling it.", name: "DEFAULT_TIMEOUT", kind: "mention", want: "bad", why: "a constant the file does not define", hard: true },
  { id: "code-shadow", text: "```ts\nconst withRetry = (fn: any) => fn()\nwithRetry(() => 1, { nonsense: 1 })\n```", name: "nonsense", kind: "key", want: "none", why: "the answer redefines withRetry; the file's signature does not apply", hard: true },
];

const std = (u) => u?.standing;
function verdictOf(profile, c) {
  const u = profile.claims.find((x) => x.text.includes(c.at));
  return u ? { standing: std(u), u } : { standing: "missing" };
}
const bucket = (s) => (s === "supported" || s === "found" || s === "own" ? "ok" : s === "contradicted" || s === "not_found" ? "bad" : s === "unsupported" ? "flag" : s === "unchecked" ? "unchecked" : s === "missing" ? "missing" : "skip");

await warm();
const rows = [];
for (const c of C) {
  const passages = c.echo ? [...MAT, { name: "tool-output", text: c.text }] : MAT;
  const r = await finish({ ask: "write about Curie", draft: c.text, passages, research, own: c.echo ? [c.text] : [] });
  const v = verdictOf(r.profile, c);
  const got = bucket(v.standing);
  const okWant = [c.want, ...(c.alt ?? [])];
  const hit = okWant.includes(got);
  const kind = hit ? "pass" : got === "ok" && c.want !== "ok" ? "FALSE-SUPPORT" : got === "skip" && (c.want === "bad" || c.want === "flag") ? "MISSED (called argument)" : got === "bad" && c.want === "ok" ? "FALSE-ALARM" : got === "flag" && c.want === "bad" ? "MISSED (only flagged)" : got === "flag" && c.want === "ok" ? "UNDER-SUPPORT" : "WRONG";
  rows.push({ id: c.id, area: "prose", kind, want: c.want, got: `${v.standing}${v.u?.why ? ` (${v.u.why})` : ""}`, why: c.why, hard: !!c.hard });
}
for (const c of CODE) {
  const r = await finish({ ask: "add a retry", draft: c.text, passages: RETRY, research });
  const mention = r.profile.symbols.find((s) => s.name === c.name && (c.kind === "mention" ? true : s.kind === c.kind));
  const got = mention ? bucket(mention.standing) : "none";
  const okWant = [c.want, ...(c.alt ?? [])];
  const hit = okWant.includes(got) || (c.want === "none" && !mention);
  const kind = hit ? "pass" : got === "ok" && c.want !== "ok" ? "FALSE-SUPPORT" : got === "bad" && c.want !== "bad" ? "FALSE-ALARM" : got === "none" && c.want === "bad" ? "MISSED (no verdict)" : "WRONG";
  rows.push({ id: c.id, area: "code", kind, want: c.want, got: mention ? `${mention.standing}${mention.why ? ` (${mention.why})` : ""}` : "no unit", why: c.why, hard: !!c.hard });
}
const bad = rows.filter((x) => x.kind !== "pass");
for (const x of rows) console.log(x.kind === "pass" ? "  pass" : "  FAIL", x.area.padEnd(5), x.id.padEnd(20), x.kind === "pass" ? "" : `[${x.kind}] want ${x.want}, got ${x.got} — ${x.why}`);
console.log(`\n${rows.length - bad.length}/${rows.length} pass; ${bad.length} break:`);
const by = {};
for (const x of bad) (by[x.kind] ??= []).push(x.id);
for (const [k, ids] of Object.entries(by)) console.log(`  ${k}: ${ids.join(", ")}`);
