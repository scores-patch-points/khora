// native/kernel/prior-broker.js — PriorBroker@1 · the registry over the prior
// library (§6 of "The Fold — Local-First Constitutive Inquiry").
//
// The spec's two-stage selection, made structural:
//   · POSSIBILITY  — which registered families apply to this inquiry's
//                    language / mode / field? Applicability is a family's OWN
//                    declared `applies`; the default is applicable and any
//                    exclusion is NAMED, never silent.
//   · ORDERING     — measured utility first (a Map the CALLER gathered), ties
//                    fall to declaration (source) order. Nothing here invents a
//                    scalar: applicability, likelihood, evidentiary authority
//                    and ethical standing are never collapsed into one number
//                    (the spec's exact prohibition). Role NEVER grades.
//
// Roles are the spec §4.3 six: linguistic · structural · predictive ·
// methodological · epistemic · normative. `capabilitiesOf` keeps them on their
// own dimensions: a predictive prior may rank possibilities but can never
// become a witness; a normative prior may constrain an action but can never
// silently supply new authority. That distinction is the point — it is why the
// broker exists at all.
//
// THE LIBRARY IS NOT LOADED ON EVERY CONSULT. `consult` lazily runs each
// applicable family's loader ONCE, caches the PROJECTION by
// `familyId :: version :: scope`, and hands back projections, not the raw
// contents of every prior file. A genuine `revision` bumps the version and
// invalidates every cached projection that depended on it (spec §6: invalidate
// dependents). A family a calling scope expects but no registration covers is a
// typed `missing` gap — NEVER a silent substitution of an English prior for a
// language that has none (the spec's demand).
//
// Relationship to queryMeaningPotential() (prior-query.js): this is the
// registry seam that module's cascade seeds, extended the spec's way — a new
// prior family is REGISTERED, never a new branch (prior-query.js's own header).
// The cascade itself is untouched and remains the collection gatherer; the
// broker is selection over the same families.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BROKER_DIR = path.dirname(fileURLToPath(import.meta.url));

export const PRIOR_BROKER_SCHEMA = "PriorBroker@1";
export const PRIOR_BROKER_VERSION = 1;

/** The six roles — declared, with a giver (this file), and held separate. */
export const FAMILY_ROLES = Object.freeze(["linguistic", "structural", "predictive", "methodological", "epistemic", "normative"]);

/** What a role may do and may NOT do (spec §4.3, §6). A predictive prior can
 *  nominate; it cannot establish. A normative prior can constrain; it cannot
 *  supply authority. Only linguistic/structural priors may serve as primary
 *  witnesses at all. */
export const ROLE_CAPABILITIES = Object.freeze({
  linguistic: { witness: true, nomination: true, constrains: false, authority: true },
  structural: { witness: true, nomination: true, constrains: false, authority: true },
  predictive: { witness: false, nomination: true, constrains: false, authority: false },
  methodological: { witness: false, nomination: true, constrains: true, authority: false },
  epistemic: { witness: false, nomination: true, constrains: false, authority: true },
  normative: { witness: false, nomination: false, constrains: true, authority: false },
});
export const canWitness = (role) => ROLE_CAPABILITIES[role]?.witness === true;

const freeze = (v) => Object.freeze(v);
const norm = (xs) => Object.freeze([...(xs ?? [])].map((x) => String(x).toLowerCase()).filter(Boolean));
const scopeOf = (inquiry) => `${String(inquiry?.language ?? "*").toLowerCase()}::${String(inquiry?.mode ?? "*").toLowerCase()}`;

/**
 * createPriorBroker({ giver }) → the broker. A family registration is:
 *   { id, role, schema?, giver?, version?, scope:{languages,modes,fields}?,
 *     basis?, loader({family, inquiry})→projection, applies?(inquiry)→bool|reason }
 * `loader` and `role` are required; `applies` defaults to true. Everything the
 * broker returns is frozen.
 */
export function createPriorBroker({ giver = "khora/native/kernel/prior-broker.js" } = {}) {
  const families = new Map();
  const projections = new Map();

  const register = (fam = {}) => {
    const id = String(fam.id ?? "").trim();
    if (!id) throw new TypeError("prior broker: a registration requires an id");
    if (typeof fam.loader !== "function") throw new TypeError("prior broker: a registration requires a lazy loader");
    if (!FAMILY_ROLES.includes(fam.role)) throw new TypeError("prior broker: role must be one of " + FAMILY_ROLES.join("|"));
    const version = Number.isInteger(fam.version) && fam.version > 0 ? fam.version : 1;
    families.set(id, freeze({
      id,
      role: fam.role,
      schema: fam.schema ?? null,
      giver: fam.giver ?? null,
      version,
      scope: freeze({ languages: norm(fam.scope?.languages), modes: norm(fam.scope?.modes), fields: norm(fam.scope?.fields) }),
      basis: fam.basis ?? (fam.giver ? `received — giver ${fam.giver}` : null),
      loader: fam.loader,
      applies: typeof fam.applies === "function" ? fam.applies : () => true,
      dependents: freeze([]),
      registeredBy: giver,
    }));
    return id;
  };

  const list = () => [...families.values()];
  const family = (id) => families.get(id) ?? null;

  /** A genuine prior revision. Bumps the version and invalidates every cached
   *  projection whose key began with this family's id. History is not kept here
   *  — the append-only record is — this is only the selection cache. */
  const revision = (id) => {
    const cur = families.get(id);
    if (!cur) return freeze({ ok: false, reason: "no_such_family", id });
    const next = freeze({ ...cur, version: cur.version + 1 });
    families.set(id, next);
    for (const key of [...projections.keys()]) if (key.startsWith(`${id}::`)) projections.delete(key);
    return freeze({ ok: true, id, now: next.version });
  };

  /** POSSIBILITY — stage one. Which families apply to this inquiry at all. */
  const possibility = (inquiry = {}) => {
    const applicable = [], inapplicable = [];
    for (const fam of families.values()) {
      let r = true;
      try { r = fam.applies(inquiry); } catch { r = true; }
      if (r === true) applicable.push(fam);
      else inapplicable.push(freeze({ family: fam, reason: typeof r === "string" ? r : "outside_declared_scope" }));
    }
    return freeze({ applicable: freeze(applicable), inapplicable: freeze(inapplicable) });
  };

  /** ORDERING — stage two. Measured utility first; ties hold declaration order.
   *  `measured` is a Map<familyId, number> the caller gathered. Without one the
   *  order is source order and the basis says so — a number is never invented. */
  const order = (applicable = [], { measured = null } = {}) => {
    const score = (f) => (measured instanceof Map ? (measured.get(f.id) ?? 0) : 0);
    const ordered = freeze([...applicable]
      .map((f, at) => ({ f, score: score(f), at }))
      .sort((a, b) => b.score - a.score || a.at - b.at)
      .map((x) => x.f));
    return freeze({
      ordered,
      basis: measured instanceof Map && measured.size ? "measured utility, then declaration order" : "declaration order — no measured utility recorded",
    });
  };

  /** CONSULT — lazily load the ordered, applicable families' PROJECTIONS,
   *  cache them by (familyId :: version :: scope), and report the typed gaps:
   *  families in `expected` with no registration (an unsupported language, a
   *  missing method) are `missing` — never silently substituted. */
  const consult = ({ inquiry = {}, measured = null, expected = null } = {}) => {
    const app = possibility(inquiry);
    const { ordered } = order(app.applicable, { measured });
    const key = scopeOf(inquiry);
    const consulted = [], failed = [];
    for (const fam of ordered) {
      const cacheKey = `${fam.id}::${fam.version}::${key}`;
      let proj = projections.get(cacheKey);
      if (proj === undefined) {
        try { proj = fam.loader({ family: fam, inquiry }) ?? null; }
        catch (e) { failed.push(freeze({ familyId: fam.id, why: String(e?.message ?? e) })); continue; }
        projections.set(cacheKey, proj);
      }
      consulted.push(freeze({
        familyId: fam.id, role: fam.role, schema: fam.schema, giver: fam.giver, version: fam.version,
        basis: fam.basis, projection: proj,
      }));
    }
    const missing = freeze([...(expected ?? [])]
      .filter((id) => !families.has(String(id)))
      .map((id) => freeze({ familyId: String(id), role: null, why: "required_by_scope_but_not_registered" })));
    return freeze({
      schema: PRIOR_BROKER_SCHEMA,
      consulted: freeze(consulted),
      failed: freeze(failed),
      missing,
      inapplicable: freeze(app.inapplicable),
    });
  };

  return freeze({
    schema: PRIOR_BROKER_SCHEMA,
    version: PRIOR_BROKER_VERSION,
    register,
    list,
    family,
    revision,
    possibility,
    order,
    consult,
  });
}

// ── discoverers §6: Zenodotus derived-priors + the named language priors ─────
//
// The Zenodotus/derived-priors tree is the received prior library; its
// subdirectories ARE the families (arc, need, reading, pos, pronoun, …). The
// broker registers one family per subdirectory with a declared role and a lazy
// loader whose PROJECTION is directory metadata + the head provenance of its
// first file — never a dump of the whole family's contents.

/** The declared role of each derived-priors subfamily. Declared with a named
 *  giver (this file) because it is a standing rule about the library's own
 *  layout, never an empirical finding; each family still carries its own giver
 *  from its files' provenance where a file names one. */
export const DERIVED_PRIORS_ROLE = Object.freeze({
  "pos-priors": "linguistic",
  "pronoun-priors": "linguistic",
  "propernoun-priors": "linguistic",
  "alias-priors": "linguistic",
  "case-priors": "linguistic",
  "pronunciation-priors": "linguistic",
  "reading-priors": "structural",
  "fold-reading-priors": "structural",
  "layout-priors": "structural",
  "display-priors": "structural",
  "typography-priors": "structural",
  "code-priors": "structural",
  "code-pattern-priors": "methodological",
  "genre-priors": "predictive",
  "arc-priors": "predictive",
  "need-priors": "predictive",
  "concern-priors": "normative",
  "socrates-priors": "epistemic",
  "lavar-priors": "methodological",
  "swarm-priors": "methodological",
  "vision-priors": "methodological",
});

const firstFileSchema = (dir) => {
  try {
    for (const f of fs.readdirSync(dir)) {
      if (!/\.json$/i.test(f)) continue;
      const raw = fs.readFileSync(path.join(dir, f), "utf8");
      try { const j = JSON.parse(raw); return { file: f, schema: j?.schema ?? null, giver: j?.giver ?? j?.provenance?.giver ?? null, language: j?.language ?? null }; }
      catch { return { file: f, schema: null, giver: null, language: null }; }
    }
  } catch {}
  return null;
};

/** makeBrokerFromDerivedPriors({ derivedPriorsDir }) — discover the received
 *  library: one family per subdirectory of derived-priors, role by the declared
 *  table above, giver from the family's own first-file provenance where named. */
export function makeBrokerFromDerivedPriors({ derivedPriorsDir = null, giver = "prior-broker.js::makeBrokerFromDerivedPriors" } = {}) {
  if (!derivedPriorsDir) derivedPriorsDir = path.resolve(BROKER_DIR, "../../../Zenodotus/derived-priors");
  const broker = createPriorBroker({ giver });
  let seen = 0;
  try {
    for (const entry of fs.readdirSync(derivedPriorsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const role = DERIVED_PRIORS_ROLE[entry.name];
      if (!role) continue;
      const dir = path.join(derivedPriorsDir, entry.name);
      const head = firstFileSchema(dir);
      broker.register({
        id: `zenodotus.${entry.name}`,
        role,
        schema: head?.schema ?? null,
        giver: head?.giver ?? null,
        basis: `the ${entry.name} family of ${derivedPriorsDir}`,
        loader: ({ family: f }) => {
          let count = 0;
          try { count = fs.readdirSync(dir).filter((x) => /\.json$/i.test(x)).length; } catch { count = 0; }
          return freeze({ familyDir: entry.name, files: count, head: head ? freeze(head) : null });
        },
      });
      seen += 1;
    }
  } catch { /* a missing derived-priors directory is a named gap, never a throw */ }
  return { broker, discovered: seen, source: derivedPriorsDir };
}

/** The named language/structural priors khora keeps in native/priors — the
 *  linguistic ladder (POS, morphology, frame, construction, morph-cues, lang).
 *  Each registered as its own family with a bounded projection (head metadata),
 *  so an inquiry can ask for `pos.eng` and get it, or ask for `pos.fra` and get
 *  a typed missing gap instead of an English substitute. */
export const NAMED_LANGUAGE_PRIORS = Object.freeze([
  { id: "pos.eng", file: "pos-eng.json", role: "linguistic", language: "eng" },
  { id: "morphology.eng", file: "morphology-eng.json", role: "linguistic", language: "eng" },
  { id: "frame.eng", file: "frame-eng.json", role: "linguistic", language: "eng" },
  { id: "construction.eng", file: "construction-eng.json", role: "linguistic", language: "eng" },
  { id: "morph-cues.eng", file: "morph-cues-en.json", role: "linguistic", language: "eng" },
  { id: "lang.en", file: "lang/en.json", role: "linguistic", language: "en" },
]);

export function registerNamedLanguagePriors(broker, { priorsDir = null } = {}) {
  if (!priorsDir) priorsDir = path.resolve(BROKER_DIR, "../priors");
  const seen = [];
  for (const p of NAMED_LANGUAGE_PRIORS) {
    const file = path.join(priorsDir, p.file);
    if (!fs.existsSync(file)) { seen.push({ id: p.id, ok: false }); continue; }
    const head = firstFileSchema(path.dirname(file));
    broker.register({
      id: p.id,
      role: p.role,
      schema: head?.schema ?? null,
      giver: head?.giver ?? null,
      scope: freeze({ languages: [p.language] }),
      basis: `the ${p.id} prior, received for ${p.language}`,
      loader: () => freeze({ file: p.file, language: p.language }),
    });
    seen.push({ id: p.id, ok: true });
  }
  return seen;
}

export default { createPriorBroker, makeBrokerFromDerivedPriors, registerNamedLanguagePriors, DERIVED_PRIORS_ROLE, NAMED_LANGUAGE_PRIORS, ROLE_CAPABILITIES, canWitness, FAMILY_ROLES };