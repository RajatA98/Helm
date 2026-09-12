// Pure-logic tests for the scene side of the contract. Run with: node --test SceneTests/
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../Scene/scene-logic.js');

const baseState = () => ({
  version: 1,
  openLeaks: 2,
  shipCondition: 'puddles',
  headingGoalID: 'fit',
  timeOfDay: 14.25,
  islands: [
    { id: 'fit', name: 'Heal the Shoulders', goalName: 'Get Fit', bearingDeg: 0 },
    { id: 'hired', name: 'Ship the Portfolio', goalName: 'Get Hired', bearingDeg: 30 },
  ],
  crewName: 'Bran, master-at-arms',
  crewLine: 'Legs before sundown, Captain.',
  avatar: { skinColor: '#b07a55', hairColor: '#17110d', hairStyle: 'short', headwear: 'bandana', headwearColor: '#23958a', coat: 'long', coatColor: '#1b2842' },
  shipDesign: { hullColor: '#3a2a1e', sailColor: '#d9d0bd', flagEmblem: 'anchor' },
});

test('contract version matches the Swift side', () => {
  assert.equal(L.VERSION, 1);
});

test('conditionFor mirrors ShipCondition boundaries', () => {
  assert.equal(L.conditionFor(0), 'clean');
  assert.equal(L.conditionFor(1), 'puddles');
  assert.equal(L.conditionFor(2), 'puddles');
  assert.equal(L.conditionFor(3), 'listing');
  assert.equal(L.conditionFor(4), 'listing');
  assert.equal(L.conditionFor(5), 'sinking');
  assert.equal(L.conditionFor(9), 'sinking');
  assert.equal(L.conditionFor(-1), 'clean');
});

test('normalizeState accepts a JSON string or an object', () => {
  const fromObject = L.normalizeState(baseState());
  const fromString = L.normalizeState(JSON.stringify(baseState()));
  assert.deepEqual(fromObject, fromString);
  assert.equal(fromObject.openLeaks, 2);
});

test('normalizeState throws on a version mismatch', () => {
  assert.throws(() => L.normalizeState({ ...baseState(), version: 2 }), /version/);
  assert.throws(() => L.normalizeState({ ...baseState(), version: undefined }), /version/);
});

test('normalizeState derives shipCondition from openLeaks, ignoring a stale value', () => {
  const s = L.normalizeState({ ...baseState(), openLeaks: 4, shipCondition: 'clean' });
  assert.equal(s.shipCondition, 'listing');
});

test('normalizeState fills defaults for missing optional fields', () => {
  const s = L.normalizeState({ version: 1, openLeaks: 0, headingGoalID: 'fit', timeOfDay: 9 });
  assert.deepEqual(s.islands, []);
  assert.equal(s.crewName, '');
  assert.equal(s.crewLine, '');
  assert.equal(typeof s.avatar.skinColor, 'string');
  assert.equal(typeof s.shipDesign.hullColor, 'string');
  assert.equal(s.timeOverride, null);
});

test('normalizeState clamps time of day into [0, 24)', () => {
  assert.equal(L.normalizeState({ ...baseState(), timeOfDay: -3 }).timeOfDay, 0);
  assert.equal(L.normalizeState({ ...baseState(), timeOfDay: 24 }).timeOfDay, 23.999);
  assert.equal(L.normalizeState({ ...baseState(), timeOfDay: 'noon' }).timeOfDay, 12);
});

test('effectiveHours prefers the override when present', () => {
  assert.equal(L.effectiveHours(L.normalizeState(baseState())), 14.25);
  assert.equal(L.effectiveHours(L.normalizeState({ ...baseState(), timeOverride: 19.5 })), 19.5);
});

test('conditionVisuals maps each condition to drawable parameters', () => {
  const clean = L.conditionVisuals('clean');
  assert.equal(clean.puddles, 0);
  assert.equal(clean.listDeg, 0);
  assert.equal(clean.sinking, false);

  const puddles = L.conditionVisuals('puddles');
  assert.ok(puddles.puddles > 0);
  assert.equal(puddles.listDeg, 0);

  const listing = L.conditionVisuals('listing');
  assert.ok(listing.puddles >= puddles.puddles);
  assert.ok(listing.listDeg > 0);
  assert.equal(listing.sinking, false);

  const sinking = L.conditionVisuals('sinking');
  assert.equal(sinking.sinking, true);
  assert.ok(sinking.listDeg >= listing.listDeg);
  assert.ok(sinking.waterline > listing.waterline);
});

test('headingBearing finds the island being steered toward', () => {
  assert.equal(L.headingBearing(L.normalizeState(baseState())), 0);
  assert.equal(L.headingBearing(L.normalizeState({ ...baseState(), headingGoalID: 'hired' })), 30);
  assert.equal(L.headingBearing(L.normalizeState({ ...baseState(), headingGoalID: 'nope' })), 0);
});

test('solar puts the sun high at noon and below the horizon at midnight', () => {
  const noon = L.solar(12, 172, 12);
  const midnight = L.solar(0, 172, 12);
  assert.ok(noon.el > 45, `noon elevation ${noon.el}`);
  assert.ok(midnight.el < 0, `midnight elevation ${midnight.el}`);
  const dusk = L.solar(19, 172, 12);
  assert.ok(dusk.el < noon.el && dusk.el > midnight.el);
});

test('solar azimuth moves from behind the ship at sunrise toward the bow by sunset', () => {
  const morning = L.solar(7, 172, 12).az;
  const evening = L.solar(19, 172, 12).az;
  assert.ok(evening > morning);
});

test('buildEvent stamps the version and carries extra fields', () => {
  assert.deepEqual(L.buildEvent('wheelTurned'), { version: 1, type: 'wheelTurned' });
  assert.deepEqual(L.buildEvent('islandTapped', { id: 'hired' }), { version: 1, type: 'islandTapped', id: 'hired' });
  assert.deepEqual(L.buildEvent('sceneStats', { fps: 59.4, loadMs: 800 }), { version: 1, type: 'sceneStats', fps: 59.4, loadMs: 800 });
});

test('buildEvent refuses islandTapped without an id', () => {
  assert.throws(() => L.buildEvent('islandTapped'), /id/);
});

test('parseHexColor accepts #rgb and #rrggbb and rejects junk', () => {
  assert.equal(L.parseHexColor('#ffffff'), 0xffffff);
  assert.equal(L.parseHexColor('#1b2842'), 0x1b2842);
  assert.equal(L.parseHexColor('#fff'), 0xffffff);
  assert.equal(L.parseHexColor('red'), null);
  assert.equal(L.parseHexColor(undefined), null);
});

test('a fixed mock state normalizes identically every time', () => {
  const a = JSON.stringify(L.normalizeState(L.MOCK_STATE));
  const b = JSON.stringify(L.normalizeState(JSON.parse(JSON.stringify(L.MOCK_STATE))));
  assert.equal(a, b);
  assert.equal(L.normalizeState(L.MOCK_STATE).shipCondition, 'puddles');
});
