// epistemic-core.js — a general reasoner about who knows what: possible worlds and public announcements.
// Not a puzzle solver. It knows nothing about words, letters, birthdays, hats or sentences. It knows:
//   worlds      the ways things could be (any values)
//   observers   for each agent, what that agent can see of a world (a function world -> anything)
//   a query     what is to be known (a function world -> anything), e.g. "which word", "which date"
//   a step      a public announcement: a condition on worlds, evaluated against the model as it stands
// An agent KNOWS a query in a world when every world the agent still considers possible (the worlds that look the same
// from where it stands) gives the same value of the query. An announcement that is made in front of everyone removes
// every world in which it would not have been true to say it; that is the only thing that moves the model.
//
// It sits beside reasoning-core.js (finite-domain constraint search). That one asks "which assignments satisfy these
// rules"; this one asks "which worlds survive what was said, given what each agent could see". Same discipline: the
// answer is computed by exhaustive check, never narrated, and the trace is the computation (every step reports the
// worlds it removed and the agent's own view that made it so).
//
// Pure. No fetch, no fs, no DOM. Zero imports.

const key = (v) => JSON.stringify(v);

/** makeModel(worlds, observers) -> a frozen model. `observers` is { agent: (world) => anything }. */
export function makeModel(worlds, observers, { label = "initial" } = {}) {
  if (!Array.isArray(worlds) || !worlds.length) throw new Error("epistemic-core: a model needs at least one world");
  for (const [a, f] of Object.entries(observers ?? {})) if (typeof f !== "function") throw new Error(`epistemic-core: observer "${a}" is not a function`);
  const model = { worlds: Object.freeze([...worlds]), observers: Object.freeze({ ...observers }), label, root: null, history: Object.freeze([]) };
  model.root = model;
  return Object.freeze(model);
}

const view = (model, agent, world) => {
  const f = model.observers[agent];
  if (!f) throw new Error(`epistemic-core: no observer for "${agent}" (agents here: ${Object.keys(model.observers).join(", ") || "none"})`);
  return key(f(world));
};

// A model is immutable, so what an agent can tell apart is worked out once per model and agent (the worlds grouped by what the
// agent sees), and whether a group fixes a query once per query. This changes the cost, never the answer.
const GROUPS = new WeakMap();
function groupsOf(model, agent) {
  let byAgent = GROUPS.get(model); if (!byAgent) GROUPS.set(model, (byAgent = new Map()));
  let g = byAgent.get(agent);
  if (!g) {
    g = { keyOf: new Map(), groups: new Map(), fixes: new WeakMap() };
    for (const w of model.worlds) { const k = view(model, agent, w); g.keyOf.set(w, k); const a = g.groups.get(k); if (a) a.push(w); else g.groups.set(k, [w]); }
    byAgent.set(agent, g);
  }
  return g;
}

/** considers(model, agent, world): the worlds the agent cannot tell apart from `world`, in this model. */
export function considers(model, agent, world) {
  const g = groupsOf(model, agent);
  return g.groups.get(g.keyOf.get(world) ?? view(model, agent, world)) ?? [];
}

/** knows(model, agent, query, world): in `world`, does the agent's own view fix the value of `query`? */
export function knows(model, agent, query, world) {
  const g = groupsOf(model, agent), k = g.keyOf.get(world) ?? view(model, agent, world);
  let perQuery = g.fixes.get(query); if (!perQuery) g.fixes.set(query, (perQuery = new Map()));
  let fixed = perQuery.get(k);
  if (fixed === undefined) { fixed = new Set((g.groups.get(k) ?? []).map((w) => key(query(w)))).size === 1; perQuery.set(k, fixed); }
  return fixed;
}

/** answersOf(model, query): the values of `query` that survive across the model's worlds (each once, with how many worlds). */
export function answersOf(model, query) {
  const m = new Map();
  for (const w of model.worlds) { const k = key(query(w)); const e = m.get(k); if (e) e.worlds++; else m.set(k, { value: query(w), worlds: 1 }); }
  return [...m.values()];
}

/**
 * announce(model, label, holds): a public announcement. `holds(world, model)` says whether it would be TRUE of that world to
 * make the announcement; it is evaluated against the model as it stands, for every world at once, and may ask the model what
 * anyone knows (`knows`, `considers`) or what was true at the start (`model.root`). Returns the next model and the step.
 */
export function announce(model, label, holds) {
  const kept = [], removed = [];
  for (const w of model.worlds) (holds(w, model) ? kept : removed).push(w);
  const step = { label, before: model.worlds.length, after: kept.length, removed: removed.length };
  const next = { worlds: Object.freeze(kept), observers: model.observers, label, root: model.root, history: Object.freeze([...model.history, step]) };
  return { model: Object.freeze(next), step, inconsistent: kept.length === 0, removedWorlds: removed };
}

/** The two things an agent can say about a query, as announcements. */
export const saysKnows = (agent, query, name = "the answer") => ({
  label: `${agent} says they know ${name}`,
  holds: (w, m) => knows(m, agent, query, w),
});
export const saysDoesNotKnow = (agent, query, name = "the answer") => ({
  label: `${agent} says they do not know ${name}`,
  holds: (w, m) => !knows(m, agent, query, w),
});

/**
 * run(model, steps, { question }): apply the announcements in order. Stops at an inconsistency (nothing could have been
 * said) and says so. Returns { final, trace, answers, unique, inconsistent }; `question` is a query over worlds.
 */
export function run(model, steps, { question = null } = {}) {
  let cur = model; const trace = []; let inconsistent = false;
  for (const s of steps) {
    const r = announce(cur, s.label, s.holds);
    trace.push({ ...r.step, ...(question ? { answers: answersOf(r.model, question).length } : {}) });
    cur = r.model;
    if (r.inconsistent) { inconsistent = true; break; }
  }
  const answers = question && !inconsistent ? answersOf(cur, question) : [];
  return { final: cur, trace, answers, unique: answers.length === 1, inconsistent };
}
