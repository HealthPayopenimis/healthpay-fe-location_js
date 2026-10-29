const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/components/optionalWardPath.js'), 'utf8');
const modulePromise = import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const types = ['R', 'D', 'W', 'V'];
const R = { uuid: 'r', type: 'R', name: 'Cairo', parent: null };
const D = { uuid: 'd', type: 'D', name: 'district', parent: R };
const W = { uuid: 'w', type: 'W', name: 'municipality', parent: D };
const directV = { uuid: 'v-direct', type: 'V', name: 'village', parent: D };
const wardV = { uuid: 'v-ward', type: 'V', name: 'village', parent: W };

test('family registration accepts a V with direct D parent, with W left null', async () => {
  const { locationPathState, selectFamilyLocation } = await modulePromise;
  const initial = locationPathState(null, types);
  const { state, familyLocation } = selectFamilyLocation(initial, 1, directV, types);
  assert.equal(state['location_-2'], R);
  assert.equal(state['location_-1'], D);
  assert.equal(state.location_0, null);
  assert.equal(state.location_1, directV);
  assert.equal(familyLocation, directV);
  assert.equal(locationPathState(familyLocation, types).location_0, null);
});

test('existing D→W→V family registration remains unchanged', async () => {
  const { locationPathState, selectFamilyLocation } = await modulePromise;
  const initial = locationPathState(W, types);
  assert.equal(initial.location_0, W);
  const { state, familyLocation } = selectFamilyLocation(initial, 1, wardV, types);
  assert.equal(state['location_-1'], D);
  assert.equal(state.location_0, W);
  assert.equal(state.location_1, wardV);
  assert.equal(familyLocation, wardV);
});

test('intermediate W selection clears stale V and does not satisfy required family location', async () => {
  const { selectFamilyLocation, locationPathState } = await modulePromise;
  const fromDirect = locationPathState(directV, types);
  const { state, familyLocation } = selectFamilyLocation(fromDirect, 0, W, types);
  assert.equal(state.location_0, W);
  assert.equal(state.location_1, null);
  assert.equal(familyLocation, null);
});

test('clearing a V preserves chosen W and requires another V to save family', async () => {
  const { selectFamilyLocation, locationPathState } = await modulePromise;
  const { state, familyLocation } = selectFamilyLocation(locationPathState(wardV, types), 1, null, types);
  assert.equal(state.location_0, W);
  assert.equal(state.location_1, null);
  assert.equal(familyLocation, null);
});

test('cascader offers real W and direct V children of D, never a synthetic W', async () => {
  const { hasOptionalWard, nextLocationLevels, normalizeCascaderSelection } = await modulePromise;
  assert.equal(hasOptionalWard(types), true);
  assert.deepEqual(nextLocationLevels(1, 4, types), [2, 3]);
  assert.deepEqual(nextLocationLevels(2, 4, types), [3]);
  assert.deepEqual(nextLocationLevels(3, 4, types), []);
  assert.deepEqual(nextLocationLevels(1, 4, ['R','D','W','X']), [2]);
  const option = { raw: directV };
  assert.equal(normalizeCascaderSelection(false, [[option]]), directV);
  assert.equal(normalizeCascaderSelection(false, []), null);
  assert.deepEqual(normalizeCascaderSelection(true, []), []);
});

test('cascader expansion status rejects stale flags and settles empty/error responses', async () => {
  const { expansionStatus } = await modulePromise;
  const pending = { levels: [2, 3], requestKeys: { 2: 'new-d', 3: 'new-d' } };
  assert.equal(expansionStatus(pending, {
    locationQueryKeyL2s: 'old-d',
    locationQueryKeyL3s: 'new-d',
    fetchedL2s: true,
    fetchedL3s: true,
  }), 'stale');
  assert.equal(expansionStatus(pending, {
    locationQueryKeyL2s: 'new-d',
    locationQueryKeyL3s: 'new-d',
    fetchedL2s: false,
    fetchedL3s: true,
  }), 'pending');
  assert.equal(expansionStatus(pending, {
    locationQueryKeyL2s: 'new-d',
    locationQueryKeyL3s: 'new-d',
    fetchedL2s: true,
    fetchedL3s: true,
    l2s: [],
    l3s: [],
  }), 'ready');
  assert.equal(expansionStatus(pending, {
    locationQueryKeyL2s: 'new-d',
    locationQueryKeyL3s: 'new-d',
    fetchedL2s: true,
    errorL3s: { message: 'network' },
  }), 'error');
});

test('required and label contracts are scoped to optional W in DetailedLocation', () => {
  const detailed = fs.readFileSync(path.join(__dirname, '../src/components/DetailedLocation.js'), 'utf8');
  const picker = fs.readFileSync(path.join(__dirname, '../src/pickers/LocationPicker.js'), 'utf8');
  const actions = fs.readFileSync(path.join(__dirname, '../src/actions.js'), 'utf8');
  const en = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/translations/en.json'), 'utf8'));
  assert.match(detailed, /required=\{required && !\(this\.optionalWard && i === 0\)\}/);
  assert.match(detailed, /this\.state\.location_0 \|\| this\.state\["location_-1"\]/);
  assert.match(detailed, /optionalLabel=\{this\.optionalWard && i === 0\}/);
  assert.match(picker, /optionalLabel \? `Location\$\{locationLevel\}Picker\.optionalLabel`/);
  assert.match(actions, /filters\.push\(`parent_Uuid: "\$\{parent\.uuid\}"`\)/);
  assert.equal(en['location.Location2Picker.optionalLabel'], 'Municipality (optional)');
  assert.match(detailed, /const selectedRegion = state\["location_-2"\]/);
  assert.match(detailed, /if \(!d && selectedRegion\)/);
});

test('query actions carry distinct parent/search identities for stale-response guards', () => {
  const actions = fs.readFileSync(path.join(__dirname, '../src/actions.js'), 'utf8');
  const reducer = fs.readFileSync(path.join(__dirname, '../src/reducer.js'), 'utf8');
  assert.match(actions, /locationQueryKey/);
  assert.match(actions, /parentUuid/);
  assert.match(actions, /searchString/);
  assert.match(reducer, /locationQueryKeyL2s/);
  assert.match(reducer, /locationRequestMatches\(state, 2, action\.meta\)/);
});
