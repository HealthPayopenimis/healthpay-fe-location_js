/** @jest-environment jsdom */
const mockReact = require("react");
const TestRenderer = require("react-test-renderer");
const { act } = TestRenderer;
const fs = require("fs");
const path = require("path");

let mockPapers;

jest.mock("@material-ui/core", () => {
  const React = require("react");
  return {
    Grid: (props) => React.createElement("div", props),
    InputAdornment: (props) => React.createElement("span", props),
  };
});
jest.mock("@material-ui/core/styles", () => ({
  withStyles: () => (Component) => Component,
  withTheme: (Component) => Component,
}));
jest.mock("react-redux", () => ({
  connect: () => (Component) => Component,
}));
jest.mock("react-intl", () => ({
  injectIntl: (Component) => Component,
}), { virtual: true });
jest.mock("lodash", () => ({
  isEqual: (left, right) => JSON.stringify(left) === JSON.stringify(right),
}));
jest.mock("../src/actions", () => ({
  locationQueryKey: (level, parentUuid = null, searchString = "", parentUuids = null, first = null, type = null) =>
    JSON.stringify({ level, type, parentUuid: parentUuid || null, searchString: searchString || "", parentUuids: parentUuids || null, first: first || null }),
  fetchLocations: jest.fn((levels, type, parent, locationRequestGeneration, locationRequestOwner, locationRequestSerial) => ({
    type: `LOCATION_LOCATIONS_${type}_REQ`,
    levels,
    parent,
    meta: {
      locationQueryKey: JSON.stringify({ level: type, type: levels[type], parentUuid: parent && parent.uuid || null, searchString: "", parentUuids: null, first: null }),
      locationRequestGeneration,
      locationRequestOwner,
      locationRequestSerial,
    },
  })),
  clearLocations: jest.fn((type, locationRequestGeneration, locationRequestOwner, locationRequestSerial) => ({
    type: `LOCATION_LOCATIONS_${type}_CLEAR`,
    meta: { locationRequestGeneration, locationRequestOwner, locationRequestSerial },
  })),
}));
jest.mock("@openimis/fe-core", () => {
  const React = require("react");
  return {
    FormPanel: class FormPanel extends React.Component {},
    NumberInput: () => null,
    withModulesManager: (Component) => Component,
    parseData: (connection) => (connection && connection.edges ? connection.edges.map((edge) => edge.node) : []),
    formatServerError: (payload) => payload && payload.error,
    formatGraphQLError: () => null,
    pageInfo: () => ({}),
    dispatchMutationReq: (state) => state,
    dispatchMutationResp: (state) => state,
    dispatchMutationErr: (state) => state,
  };
});
jest.mock("../src/components/TypeLocationsPaper", () => {
  const React = require("react");
  return (props) => {
    mockPapers[props.type] = props;
    return React.createElement("div", { "data-type": props.type });
  };
});

const { fetchLocations, clearLocations, locationQueryKey } = require("../src/actions");
const { HealthFacilityCatchmentPanel } = require("../src/components/HealthFacilityCatchmentPanel");
const reducer = require("../src/reducer").default;

const types = ["R", "D", "W", "V"];
const regionA = { id: 1, uuid: "region-a", type: "R", code: "A", name: "A" };
const regionB = { id: 2, uuid: "region-b", type: "R", code: "B", name: "B" };
const districtA = { id: 11, uuid: "district-a", type: "D", code: "DA", name: "DA", parent: regionA };
const districtB = { id: 21, uuid: "district-b", type: "D", code: "DB", name: "DB", parent: regionB };
const wardA = { id: 111, uuid: "ward-a", type: "W", code: "WA", name: "WA", parent: districtA };
const villageA = { id: 1111, uuid: "village-a", type: "V", code: "VA", name: "VA", parent: wardA };
const villageDirectA = { id: 1121, uuid: "village-direct-a", type: "V", code: "VDA", name: "VDA", parent: districtA };
const villageDirectB = { id: 2111, uuid: "village-b", type: "V", code: "VB", name: "VB", parent: districtB };

const baseProps = (overrides = {}) => ({
  classes: { item: "item" },
  modulesManager: { getConf: () => types },
  edited: {
    id: 99,
    location: districtA,
    catchments: [
      { id: 501, location: { id: villageA.id }, catchment: 25 },
      { id: 502, location: { id: villageDirectB.id }, catchment: 75 },
    ],
  },
  onEditedChanged: jest.fn(),
  fetchLocations,
  clearLocations,
  journalize: jest.fn(),
  mutation: {},
  submittingMutation: false,
  l0s: [regionA, regionB],
  userL0s: [regionA],
  l1s: [districtA],
  l2s: [wardA],
  l3s: [villageA],
  fetchedL0s: false,
  fetchedL1s: false,
  fetchedL2s: false,
  fetchedL3s: false,
  readOnly: false,
  ...overrides,
});

function renderPanel(overrides = {}) {
  mockPapers = {};
  let renderer;
  act(() => {
    renderer = TestRenderer.create(mockReact.createElement(HealthFacilityCatchmentPanel, baseProps(overrides)));
  });
  return renderer;
}

function updateWithResponse(renderer, level, locations, identity, overrides = {}) {
  const responseProps = {
    [`fetchedL${level}s`]: true,
    [`l${level}s`]: locations,
    [`locationQueryKeyL${level}s`]: identity.queryKey,
    [`locationRequestOwnerL${level}s`]: identity.owner,
    [`locationRequestSerialL${level}s`]: identity.serial,
    [`locationRequestGenerationL${level}s`]: identity.serial,
    ...overrides,
  };
  act(() => renderer.update(mockReact.createElement(HealthFacilityCatchmentPanel, baseProps(responseProps))));
}

function requestIdentity(instance, level) {
  return instance.expectedRequests[level];
}

function responseIdentityFor(level, parent, owner, serial) {
  return {
    queryKey: locationQueryKey(level, parent && parent.uuid, "", null, null, types[level]),
    owner,
    serial,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPapers = {};
});

test("npm test includes this component suite", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json"), "utf8"));
  expect(packageJson.scripts["test:components"]).toContain("tests/HealthFacilityCatchmentPanel.test.js");
});

test("starts descendants empty, then hydrates the initial R/D/W/V path asynchronously once", () => {
  const renderer = renderPanel();
  const instance = renderer.root.findByType(HealthFacilityCatchmentPanel).instance;
  expect(instance.state.l1s).toEqual([]);
  expect(instance.state.l2s).toEqual([]);
  expect(instance.state.l3s).toEqual([]);

  const regions = requestIdentity(instance, 0);
  updateWithResponse(renderer, 0, [regionA, regionB], regions);
  expect(instance.state.l0).toEqual(regionA);
  const districts = requestIdentity(instance, 1);
  updateWithResponse(renderer, 1, [districtA], districts);
  expect(instance.state.l1).toEqual(districtA);
  const wards = requestIdentity(instance, 2);
  updateWithResponse(renderer, 2, [wardA], wards);
  expect(instance.state.l2).toEqual(wardA);
  const villages = requestIdentity(instance, 3);
  updateWithResponse(renderer, 3, [villageA], villages);
  expect(instance.state.l3).toEqual(villageA);
  expect(fetchLocations.mock.calls.filter((call) => call[1] === 0)).toHaveLength(1);
  renderer.unmount();
});

test("A to B to A clears descendants and rejects the delayed old-A response", () => {
  const renderer = renderPanel();
  const instance = renderer.root.findByType(HealthFacilityCatchmentPanel).instance;
  act(() => instance.selectRegion(regionA));
  const oldA = requestIdentity(instance, 1);
  act(() => instance.selectRegion(regionB));
  const b = requestIdentity(instance, 1);
  act(() => instance.selectRegion(regionA));
  const newA = requestIdentity(instance, 1);
  expect(newA.queryKey).toBe(oldA.queryKey);
  expect(newA.serial).not.toBe(oldA.serial);
  expect(instance.state.l1s).toEqual([]);

  updateWithResponse(renderer, 1, [districtA], oldA);
  expect(instance.state.l1s).toEqual([]);
  updateWithResponse(renderer, 1, [districtA], newA);
  expect(instance.state.l1s).toEqual([districtA]);
  expect(b.owner).toBe(newA.owner);
  renderer.unmount();
});

test("optional W uses W-parent V, empty W then uses D-parent V, and a direct response before W is ignored", () => {
  const renderer = renderPanel({ edited: { ...baseProps().edited, location: districtB }, l0s: [], l1s: [], l2s: [], l3s: [] });
  const instance = renderer.root.findByType(HealthFacilityCatchmentPanel).instance;
  act(() => instance.selectDistrict(districtB));
  const wardRequest = requestIdentity(instance, 2);
  const staleDirect = responseIdentityFor(3, districtB, instance.panelOwner, wardRequest.serial + 1);
  updateWithResponse(renderer, 3, [villageDirectB], staleDirect);
  expect(instance.state.l3s).toEqual([]);

  updateWithResponse(renderer, 2, [], wardRequest);
  const directRequest = requestIdentity(instance, 3);
  expect(fetchLocations).toHaveBeenCalledWith(types, 3, districtB, directRequest.serial, instance.panelOwner, directRequest.serial);
  updateWithResponse(renderer, 3, [], directRequest);
  expect(instance.state.l2).toBeNull();
  expect(instance.state.l3s).toEqual([]);
  expect(instance.state.l3).toBeNull();
  renderer.unmount();
});

test("a non-empty W response clears any direct-path data and fetches V under W", () => {
  const renderer = renderPanel({ l0s: [], l1s: [], l2s: [], l3s: [] });
  const instance = renderer.root.findByType(HealthFacilityCatchmentPanel).instance;
  act(() => instance.selectDistrict(districtA));
  const wardRequest = requestIdentity(instance, 2);
  updateWithResponse(renderer, 2, [wardA], wardRequest);
  expect(instance.state.l2).toEqual(wardA);
  expect(instance.state.l3s).toEqual([]);
  const villageRequest = requestIdentity(instance, 3);
  expect(fetchLocations).toHaveBeenCalledWith(types, 3, wardA, villageRequest.serial, instance.panelOwner, villageRequest.serial);
  updateWithResponse(renderer, 3, [villageA], villageRequest);
  expect(instance.state.l3).toEqual(villageA);
  renderer.unmount();
});

test("clearing W requests D-direct V again instead of leaving villages permanently cleared", () => {
  const renderer = renderPanel({ l0s: [], l1s: [], l2s: [], l3s: [] });
  const instance = renderer.root.findByType(HealthFacilityCatchmentPanel).instance;
  act(() => instance.selectDistrict(districtA));
  const wardRequest = requestIdentity(instance, 2);
  updateWithResponse(renderer, 2, [wardA], wardRequest);
  act(() => instance.selectWard(null));
  const directRequest = requestIdentity(instance, 3);
  expect(fetchLocations).toHaveBeenCalledWith(types, 3, districtA, directRequest.serial, instance.panelOwner, directRequest.serial);
  updateWithResponse(renderer, 3, [villageDirectA], directRequest);
  expect(instance.state.l3s).toEqual([villageDirectA]);
  renderer.unmount();
});

test("component does not consume concurrent untagged picker data and keeps matching metadata transitions", () => {
  const renderer = renderPanel({ l0s: [], l1s: [], l2s: [], l3s: [] });
  const instance = renderer.root.findByType(HealthFacilityCatchmentPanel).instance;
  act(() => instance.selectRegion(regionA));
  const expected = requestIdentity(instance, 1);
  updateWithResponse(renderer, 1, [districtB], { queryKey: expected.queryKey, owner: null, serial: null });
  expect(instance.state.l1s).toEqual([]);
  updateWithResponse(renderer, 1, [districtA], expected);
  expect(instance.state.l1s).toEqual([districtA]);
  renderer.unmount();
});

test("same-parent remounts have distinct owners, so old panel responses cannot collide", () => {
  const first = renderPanel({ l0s: [], l1s: [], l2s: [], l3s: [] });
  const firstInstance = first.root.findByType(HealthFacilityCatchmentPanel).instance;
  const firstOwner = firstInstance.panelOwner;
  const firstRequest = requestIdentity(firstInstance, 0);
  first.unmount();

  const second = renderPanel({ l0s: [], l1s: [], l2s: [], l3s: [] });
  const secondInstance = second.root.findByType(HealthFacilityCatchmentPanel).instance;
  const secondRequest = requestIdentity(secondInstance, 0);
  expect(secondInstance.panelOwner).not.toBe(firstOwner);
  expect(secondRequest.serial).toBe(firstRequest.serial);
  updateWithResponse(second, 0, [regionA], { ...firstRequest, serial: firstRequest.serial });
  expect(secondInstance.state.l0s).toEqual([]);
  updateWithResponse(second, 0, [regionA], secondRequest);
  expect(secondInstance.state.l0s).toEqual([regionA]);
  second.unmount();
});

test("strict reducer identity rejects untagged responses while a tagged request is current and preserves legacy untagged callers", () => {
  let state = reducer(undefined, { type: "@@init" });
  const key = locationQueryKey(1, regionA.uuid, "", null, null, "D");
  state = reducer(state, { type: "LOCATION_LOCATIONS_1_REQ", meta: { locationQueryKey: key, locationRequestOwner: "panel-a", locationRequestSerial: 4, locationRequestGeneration: 4 } });
  const untagged = reducer(state, { type: "LOCATION_LOCATIONS_1_RESP", meta: { locationQueryKey: key }, payload: { data: { locations: { edges: [{ node: districtB }] } } } });
  expect(untagged).toBe(state);
  const tagged = reducer(state, { type: "LOCATION_LOCATIONS_1_RESP", meta: { locationQueryKey: key, locationRequestOwner: "panel-a", locationRequestSerial: 4, locationRequestGeneration: 4 }, payload: { data: { locations: { edges: [{ node: districtA }] } } } });
  expect(tagged.l1s).toEqual([districtA]);

  let legacy = reducer(undefined, { type: "LOCATION_LOCATIONS_1_REQ", meta: { locationQueryKey: key } });
  legacy = reducer(legacy, { type: "LOCATION_LOCATIONS_1_RESP", meta: { locationQueryKey: key }, payload: { data: { locations: { edges: [{ node: districtA }] } } } });
  expect(legacy.l1s).toEqual([districtA]);
});

test("currentParents are arrays, permissions remain filtered, and catchment edits preserve IDs/percentages immutably", () => {
  const renderer = renderPanel({ readOnly: true });
  const instance = renderer.root.findByType(HealthFacilityCatchmentPanel).instance;
  expect(mockPapers[0].locations).toEqual([regionA]);
  expect(mockPapers[1].currentParents).toEqual([]);
  expect(mockPapers[2].currentParents).toEqual([]);
  expect(mockPapers[3].currentParents).toEqual([]);
  expect(mockPapers[0].readOnly).toBe(true);
  const original = instance.props.edited;
  act(() => instance.onCatchmentChanged(villageA, 40));
  const edited = instance.props.onEditedChanged.mock.calls[0][0];
  expect(edited.catchments.map((row) => [row.location.id, row.catchment])).toEqual([[villageA.id, 40], [villageDirectB.id, 75]]);
  expect(original.catchments[0].catchment).toBe(25);
  expect(original.catchments[1].catchment).toBe(75);
  renderer.unmount();
});

test("old fixture remains byte-identical and behaviorally demonstrates stale descendants", () => {
  const fixturePath = path.join(__dirname, "fixtures/Issue40-pre-fix-HealthFacilityCatchmentPanel.js");
  const exact = fs.readFileSync(fixturePath, "utf8");
  expect(require("crypto").createHash("sha256").update(exact).digest("hex")).toBe("33d2581eef9f81d19b0d874289b2f0696def0b9e05430f7e2dc35cf81ac6b901");

  const temporaryPath = path.join(__dirname, "../src/components/.issue40-old-fixture-runtime.js");
  fs.writeFileSync(temporaryPath, `${exact}\nexport { HealthFacilityCatchmentPanel };\n`, "utf8");
  let OldPanel;
  try {
    OldPanel = require(temporaryPath).HealthFacilityCatchmentPanel;
    mockPapers = {};
    let renderer;
    act(() => renderer = TestRenderer.create(mockReact.createElement(OldPanel, baseProps({ l0s: [], fetchedL0s: false }))));
    act(() => renderer.update(mockReact.createElement(OldPanel, baseProps({ l0s: [regionA, regionB], fetchedL0s: true }))));
    const oldInstance = renderer.root.findByType(OldPanel).instance;
    act(() => mockPapers[0].onSelect(regionB));
    expect(oldInstance.state.l2s).toEqual([wardA]);
    expect(oldInstance.state.l3s).toEqual([villageA]);
    act(() => mockPapers[3].onRefresh());
    const refresh = fetchLocations.mock.calls[fetchLocations.mock.calls.length - 1];
    expect(refresh.slice(0, 3)).toEqual([types, 3, null]);
    renderer.unmount();
  } finally {
    delete require.cache[require.resolve(temporaryPath)];
    fs.unlinkSync(temporaryPath);
  }
});

test("unmount is safe and does not create lifecycle loops", () => {
  const renderer = renderPanel();
  const instance = renderer.root.findByType(HealthFacilityCatchmentPanel).instance;
  const before = fetchLocations.mock.calls.length;
  renderer.unmount();
  expect(() => instance.componentDidUpdate(instance.props, instance.state)).not.toThrow();
  expect(fetchLocations.mock.calls.length).toBe(before);
});


test("facility context arriving after mount seeds once and never overrides manual selection", () => {
  const renderer = renderPanel({ edited: { ...baseProps().edited, location: null } });
  const instance = renderer.root.findByType(HealthFacilityCatchmentPanel).instance;
  updateWithResponse(renderer, 0, [regionA, regionB], requestIdentity(instance, 0), { edited: { ...baseProps().edited, location: null } });
  expect(instance.state.l0).toBeNull();
  act(() => renderer.update(mockReact.createElement(HealthFacilityCatchmentPanel, baseProps())));
  expect(instance.state.l0).toEqual(regionA);
  act(() => instance.selectRegion(regionB));
  act(() => renderer.update(mockReact.createElement(HealthFacilityCatchmentPanel, baseProps({ edited: { ...baseProps().edited, location: districtA } }))));
  expect(instance.state.l0).toEqual(regionB);
  renderer.unmount();
});

test("refresh without a selected parent never requests an unfiltered child list", () => {
  const renderer = renderPanel();
  fetchLocations.mockClear();
  act(() => mockPapers[3].onRefresh());
  expect(fetchLocations).not.toHaveBeenCalled();
  renderer.unmount();
});
