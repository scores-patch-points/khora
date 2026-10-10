// native/kernel/prior-broker.test.mjs — the gate on the prior library.
// Falsifiers must genuinely reject (spec §14), so every positive has a control.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPriorBroker, makeBrokerFromDerivedPriors, registerNamedLanguagePriors, canWitness, ROLE_CAPABILITIES, DERIVED_PRIORS_ROLE } from './prior-broker.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

test('roles are separate dimensions: a predictive prior can never witness (§4.3)', () => {
  assert.equal(canWitness('predictive'), false);
  assert.equal(canWitness('normative'), false);
  assert.equal(canWitness('linguistic'), true);
  assert.equal(ROLE_CAPABILITIES.predictive.nomination, true);
  assert.equal(ROLE_CAPABILITIES.predictive.authority, false, 'a predictive prior ranks possibilities, it does not establish');
  assert.equal(ROLE_CAPABILITIES.normative.constrains, true);
  assert.equal(ROLE_CAPABILITIES.normative.authority, false, 'a normative prior constrains but cannot silently supply authority');
});

test('POSSIBILITY — a family names its own applicability, and an exclusion is explicit', () => {
  const b = createPriorBroker();
  b.register({ id: 'pos.eng', role: 'linguistic', loader: () => ({}) });
  b.register({
    id: 'gender.arabic', role: 'linguistic', loader: () => ({}),
    applies: (inq) => inq?.language === 'arb' ? true : 'no morph-cues registered for this language',
  });
  const p = b.possibility({ language: 'eng' });
  assert.ok(p.applicable.some((f) => f.id === 'pos.eng'));
  const ex = p.inapplicable.find((f) => f.family.id === 'gender.arabic');
  assert.match(ex.reason, /no morph-cues/);
});

test('ORDERING — measured utility orders first; without it, declaration order, never a fabricated scalar', () => {
  const b = createPriorBroker();
  for (const id of ['arc', 'need', 'reading']) b.register({ id, role: id === 'reading' ? 'structural' : 'predictive', loader: () => ({}) });
  const { ordered: byOrder } = b.order(b.list());
  assert.deepEqual(byOrder.map((f) => f.id), ['arc', 'need', 'reading']);
  const { ordered: byUtil } = b.order(b.list(), { measured: new Map([['reading', 9], ['arc', 1], ['need', 5]]) });
  assert.deepEqual(byUtil.map((f) => f.id), ['reading', 'need', 'arc']);
});

test('CONSULT — lazy loader runs once, then the projection is cached by family::version::scope', () => {
  const b = createPriorBroker();
  let calls = 0;
  b.register({ id: 'f1', role: 'predictive', loader: () => { calls += 1; return { n: calls }; } });
  const r1 = b.consult({ inquiry: { language: 'eng' } });
  const r2 = b.consult({ inquiry: { language: 'eng' } });
  const r3 = b.consult({ inquiry: { language: 'fra' } });   // different scope → reload
  assert.equal(calls, 2, 'same scope cached; new scope reloads');
  assert.equal(r1.consulted[0].projection.n, 1);
  assert.equal(r2.consulted[0].projection.n, 1);
  assert.equal(r3.consulted[0].projection.n, 2);
});

test('REVISION — a genuine prior revision invalidates its cached projection', () => {
  const b = createPriorBroker();
  let calls = 0;
  b.register({ id: 'f1', role: 'predictive', loader: () => { calls += 1; return { n: calls }; } });
  b.consult({});
  b.consult({});
  assert.equal(calls, 1);
  b.revision('f1');
  b.consult({});
  assert.equal(calls, 2, 'revision invalidated the cache');
  assert.equal(b.family('f1').version, 2);
});

test('a loader that fails is a named failure, not an aborted consult', () => {
  const b = createPriorBroker();
  b.register({ id: 'ok', role: 'structural', loader: () => ({ fine: true }) });
  b.register({ id: 'broken', role: 'predictive', loader: () => { throw new Error('denied'); } });
  const r = b.consult({});
  assert.deepEqual(r.consulted.map((c) => c.familyId), ['ok']);
  assert.equal(r.failed[0].familyId, 'broken');
  assert.equal(r.failed[0].why, 'denied');
});

test('makeBrokerFromDerivedPriors discovers the received library and its roles', () => {
  const { broker, discovered } = makeBrokerFromDerivedPriors();
  assert.ok(discovered >= 10, `derived-priors should yield the families, saw ${discovered}`);
  const byId = new Map(broker.list().map((f) => [f.id, f]));
  assert.equal(byId.get('zenodotus.arc-priors').role, 'predictive');
  assert.equal(byId.get('zenodotus.concern-priors').role, 'normative');
  assert.equal(byId.get('zenodotus.pos-priors').role, 'linguistic');
  const r = broker.consult({});
  assert.ok(r.consulted.length >= 10);
  const arc = r.consulted.find((c) => c.familyId === 'zenodotus.arc-priors');
  assert.ok(arc.projection.files >= 1, 'the projection is library metadata, not a file dump');
});

test('an unsupported language is a typed MISSING gap — never an English substitution (§6)', () => {
  const b = createPriorBroker();
  registerNamedLanguagePriors(b, { priorsDir: path.join(HERE, '../priors') });
  const gotEng = b.consult({ expected: ['pos.eng'] });
  assert.equal(gotEng.consulted.some((c) => c.familyId === 'pos.eng'), true);
  const wantFra = b.consult({ expected: ['pos.fra'] });
  assert.equal(wantFra.missing.some((m) => m.familyId === 'pos.fra' && /not_registered/.test(m.why)), true, 'the gap is reported by name');
  assert.equal(wantFra.consulted.some((c) => c.familyId === 'pos.fra'), false, 'no silent substitution');
});