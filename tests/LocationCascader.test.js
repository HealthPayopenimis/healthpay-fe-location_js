/** @jest-environment jsdom */

const mockReact = require("react");
const ReactDOM = require("react-dom");
const { act } = require("react-dom/test-utils");

let mockCurrentState;
let mockDispatch;
let mockCascaderProps;
let mockContainer;

jest.mock("@material-ui/core", () => ({
  TextField: (props) => mockReact.createElement("input", props),
  Chip: (props) => mockReact.createElement("span", props),
}));
jest.mock("@material-ui/icons/ArrowDropDown", () => () => null);
jest.mock("@material-ui/icons/KeyboardArrowRight", () => () => null);
jest.mock("@material-ui/icons/Autorenew", () => () => null);
jest.mock("@material-ui/core/styles", () => ({
  withStyles: () => (Component) => Component,
  withTheme: (Component) => Component,
}));
jest.mock("rc-cascader", () => (props) => {
  mockCascaderProps = props;
  return mockReact.createElement("div", { "data-testid": "cascader" });
});
jest.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockCurrentState),
}));
jest.mock("@openimis/fe-core", () => ({
  useModulesManager: () => ({
    getConf: (module, key, fallback) => {
      if (key === "Location.MaxLevels") return 4;
      if (key === "Location.types") return ["R", "D", "W", "V"];
      return fallback;
    },
  }),
  useTranslations: () => ({ formatMessage: (key) => key }),
}));
jest.mock("../src/actions", () => ({
  fetchLocationsStr: jest.fn((mm, level, regions, districts, parent) => ({
    type: `LOCATION_LOCATIONS_${level}_REQ`,
    parent,
  })),
  fetchLocationsByUuids: jest.fn(),
  locationQueryKey: jest.fn((level, parentUuid = null, searchString = "", parentUuids = null, first = null, type = null) => JSON.stringify({
    level,
    type,
    parentUuid: parentUuid || null,
    searchString: searchString || "",
    parentUuids: parentUuids || null,
    first: first || null,
  })),
}));

const { LocationCascader } = require("../src/pickers/LocationCascader");
const { fetchLocationsStr } = require("../src/actions");

const region = { uuid: "r", type: "R", name: "Region" };
const district = { uuid: "d", type: "D", name: "District", parent: region };
const emptyState = {
  loc: {
    l0s: [region],
    l2s: [],
    l3s: [],
    fetchedL2s: false,
    fetchedL3s: false,
    errorL2s: null,
    errorL3s: null,
    locationQueryKeyL2s: null,
    locationQueryKeyL3s: null,
  },
};

function render(state) {
  mockCurrentState = state;
  if (!mockContainer) mockContainer = document.createElement("div");
  return act(() => {
    ReactDOM.render(
      mockReact.createElement(LocationCascader, {
        classes: { root: "root", inputRoot: "input", chipsContainer: "chips" },
        value: null,
        onChange: jest.fn(),
      }),
      mockContainer,
    );
  });
}

beforeEach(() => {
  mockDispatch = jest.fn();
  mockCascaderProps = null;
  mockContainer = null;
  jest.clearAllMocks();
});

test("does not consume fetched flags from a previous parent", () => {
  const option = { value: district.uuid, level: 1, raw: district, isLeaf: false };
  const state = { ...emptyState, loc: { ...emptyState.loc, fetchedL2s: true, fetchedL3s: true, locationQueryKeyL2s: "old", locationQueryKeyL3s: "old" } };
  render(state);

  act(() => mockCascaderProps.loadData([option]));
  expect(option.loading).toBe(true);
  expect(fetchLocationsStr).toHaveBeenCalled();

  render({ ...state, loc: { ...state.loc, locationQueryKeyL2s: "old", locationQueryKeyL3s: "old" } });
  expect(option.loading).toBe(true);
});

test("marks an empty expansion as a leaf instead of leaving a spinner", () => {
  const option = { value: district.uuid, level: 1, raw: district, isLeaf: false };
  render(emptyState);
  act(() => mockCascaderProps.loadData([option]));

  const requestKey = JSON.stringify({ level: 2, type: "W", parentUuid: "d", searchString: "", parentUuids: null, first: null });
  const requestKey3 = JSON.stringify({ level: 3, type: "V", parentUuid: "d", searchString: "", parentUuids: null, first: null });
  render({ ...emptyState, loc: {
    ...emptyState.loc,
    fetchedL2s: true,
    fetchedL3s: true,
    locationQueryKeyL2s: requestKey,
    locationQueryKeyL3s: requestKey3,
  } });

  expect(option.loading).toBe(false);
  expect(option.isLeaf).toBe(true);
  expect(option.children).toEqual([]);
});

test("settles an expansion error without an endless spinner", () => {
  const option = { value: district.uuid, level: 1, raw: district, isLeaf: false };
  render(emptyState);
  act(() => mockCascaderProps.loadData([option]));

  const requestKey = JSON.stringify({ level: 2, type: "W", parentUuid: "d", searchString: "", parentUuids: null, first: null });
  const requestKey3 = JSON.stringify({ level: 3, type: "V", parentUuid: "d", searchString: "", parentUuids: null, first: null });
  render({ ...emptyState, loc: {
    ...emptyState.loc,
    fetchedL2s: true,
    errorL3s: { message: "network" },
    locationQueryKeyL2s: requestKey,
    locationQueryKeyL3s: requestKey3,
  } });

  expect(option.loading).toBe(false);
  expect(option.isLeaf).toBe(true);
  expect(option.children).toEqual([]);
});
