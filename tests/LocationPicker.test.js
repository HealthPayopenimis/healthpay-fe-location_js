/** @jest-environment jsdom */

const mockReact = require("react");
const ReactDOM = require("react-dom");
const { act } = require("react-dom/test-utils");

let mockCurrentState;
let mockDispatch;
let mockAutocompleteProps;
let container;

const mockQueryKey = (level, parentUuid = null, searchString = "", parentUuids = null, first = null, type = null) => JSON.stringify({
  level,
  type,
  parentUuid: parentUuid || null,
  searchString: searchString || "",
  parentUuids: parentUuids || null,
  first: first || null,
});

jest.mock("@material-ui/lab", () => ({
  Autocomplete: (props) => {
    mockAutocompleteProps = props;
    return mockReact.createElement("div", { "data-testid": "autocomplete" });
  },
}), { virtual: true });
jest.mock("@material-ui/core", () => ({
  TextField: (props) => mockReact.createElement("input", props),
}));
jest.mock("@material-ui/core/styles", () => ({
  withStyles: () => (Component) => Component,
  withTheme: (Component) => Component,
}));
jest.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector(mockCurrentState),
}));
jest.mock("@openimis/fe-core", () => ({
  combine: (...enhancers) => (Component) => Component,
  withModulesManager: (Component) => Component,
  withTheme: (Component) => Component,
  withStyles: () => (Component) => Component,
  useTranslations: () => ({ formatMessage: (key) => key }),
  useDebounceCb: (callback, duration) => {
    const [payload, setPayload] = mockReact.useState(null);
    mockReact.useEffect(() => {
      if (payload) {
        const timeout = setTimeout(() => callback(...payload), duration);
        return () => clearTimeout(timeout);
      }
      return undefined;
    }, [payload, callback, duration]);
    return (...args) => setPayload(args);
  },
}));
jest.mock("../src/actions", () => ({
  clearLocations: jest.fn((level) => ({ type: `LOCATION_LOCATIONS_${level}_CLEAR` })),
  fetchLocationsStr: jest.fn((...args) => ({ type: "LOCATION_LOCATIONS_REQ", args })),
  fetchParentLocationsStr: jest.fn((...args) => ({ type: "LOCATION_PARENT_LOCATIONS_REQ", args })),
  locationQueryKey: jest.fn((...args) => mockQueryKey(...args)),
}));

const { LocationPicker } = require("../src/pickers/LocationPicker");
const { fetchLocationsStr } = require("../src/actions");

const region = { uuid: "r", type: "R", code: "R", name: "Region" };
const district = { uuid: "d", type: "D", code: "D", name: "District", parent: region };
const typedSearch = "EG-01-D01-W01-V01";
const emptyRequestKey = mockQueryKey(3, district.uuid, "", null, null, "V");
const typedRequestKey = mockQueryKey(3, district.uuid, typedSearch, null, null, "V");

function render(state = mockCurrentState) {
  mockCurrentState = state;
  if (!container) container = document.createElement("div");
  act(() => {
    ReactDOM.render(mockReact.createElement(LocationPicker, {
      modulesManager: {
        getConf: (module, key, fallback) => {
          if (key === "Location.types") return ["R", "D", "W", "V"];
          if (key === "locationMinCharLookup") return 2;
          if (key === "debounceTime") return 400;
          return fallback;
        },
      },
      locationLevel: 3,
      parentLocation: district,
      value: null,
      onChange: jest.fn(),
      withLabel: false,
    }), container);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockCurrentState = {
    loc: {
      fetchingL3s: true,
      l3s: [],
      locationQueryKeyL3s: emptyRequestKey,
      userL3s: [],
      l0s: [region],
      l1s: [district],
    },
  };
  mockDispatch = jest.fn();
  mockAutocompleteProps = null;
  container = null;
});

afterEach(() => {
  jest.useRealTimers();
});

test("dispatches the typed V query while the prior empty-query request is still loading", () => {
  render();

  act(() => mockAutocompleteProps.onOpen());
  expect(fetchLocationsStr).toHaveBeenCalledTimes(1);
  expect(fetchLocationsStr.mock.calls[0][5]).toBe("");

  act(() => mockAutocompleteProps.onInputChange(null, typedSearch));
  act(() => jest.advanceTimersByTime(400));

  expect(fetchLocationsStr).toHaveBeenCalledTimes(2);
  expect(fetchLocationsStr.mock.calls[1][5]).toBe(typedSearch);
});

test("does not re-dispatch a typed V query after the same key is current", () => {
  mockCurrentState.loc.locationQueryKeyL3s = typedRequestKey;
  mockCurrentState.loc.fetchingL3s = false;
  render();

  act(() => mockAutocompleteProps.onOpen());
  act(() => mockAutocompleteProps.onInputChange(null, typedSearch));
  act(() => jest.advanceTimersByTime(400));

  const typedCalls = fetchLocationsStr.mock.calls.filter((call) => call[5] === typedSearch);
  expect(typedCalls).toHaveLength(0);
});
