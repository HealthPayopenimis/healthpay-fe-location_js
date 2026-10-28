/** @jest-environment jsdom */

const React = require("react");
const ReactDOM = require("react-dom");
const { act } = require("react-dom/test-utils");

let currentState;
let dispatch;
let autocompleteProps;
let container;

const queryKey = (level, parentUuid = null, searchString = "", parentUuids = null, first = null, type = null) => JSON.stringify({
  level,
  type,
  parentUuid: parentUuid || null,
  searchString: searchString || "",
  parentUuids: parentUuids || null,
  first: first || null,
});

jest.mock("@material-ui/lab", () => ({
  Autocomplete: (props) => {
    autocompleteProps = props;
    return React.createElement("div", { "data-testid": "autocomplete" });
  },
}));
jest.mock("@material-ui/core", () => ({
  TextField: (props) => React.createElement("input", props),
}));
jest.mock("@material-ui/core/styles", () => ({
  withStyles: () => (Component) => Component,
  withTheme: (Component) => Component,
}));
jest.mock("react-redux", () => ({
  useDispatch: () => dispatch,
  useSelector: (selector) => selector(currentState),
}));
jest.mock("@openimis/fe-core", () => ({
  combine: (...enhancers) => (Component) => Component,
  withModulesManager: (Component) => Component,
  withTheme: (Component) => Component,
  withStyles: () => (Component) => Component,
  useTranslations: () => ({ formatMessage: (key) => key }),
  useDebounceCb: (callback, duration) => {
    const [payload, setPayload] = React.useState(null);
    React.useEffect(() => {
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
  locationQueryKey: jest.fn(queryKey),
}));

const { LocationPicker } = require("../src/pickers/LocationPicker");
const { fetchLocationsStr } = require("../src/actions");

const region = { uuid: "r", type: "R", code: "R", name: "Region" };
const district = { uuid: "d", type: "D", code: "D", name: "District", parent: region };
const typedSearch = "EG-01-D01-W01-V01";
const emptyRequestKey = queryKey(3, district.uuid, "", null, null, "V");
const typedRequestKey = queryKey(3, district.uuid, typedSearch, null, null, "V");

function render(state = currentState) {
  currentState = state;
  if (!container) container = document.createElement("div");
  act(() => {
    ReactDOM.render(React.createElement(LocationPicker, {
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
  currentState = {
    loc: {
      fetchingL3s: true,
      l3s: [],
      locationQueryKeyL3s: emptyRequestKey,
      userL3s: [],
      l0s: [region],
      l1s: [district],
    },
  };
  dispatch = jest.fn();
  autocompleteProps = null;
  container = null;
});

afterEach(() => {
  jest.useRealTimers();
});

test("dispatches the typed V query while the prior empty-query request is still loading", () => {
  render();

  act(() => autocompleteProps.onOpen());
  expect(fetchLocationsStr).toHaveBeenCalledTimes(1);
  expect(fetchLocationsStr.mock.calls[0][5]).toBe("");

  act(() => autocompleteProps.onInputChange(null, typedSearch));
  act(() => jest.advanceTimersByTime(400));

  expect(fetchLocationsStr).toHaveBeenCalledTimes(2);
  expect(fetchLocationsStr.mock.calls[1][5]).toBe(typedSearch);
});

test("does not re-dispatch a typed V query after the same key is current", () => {
  currentState.loc.locationQueryKeyL3s = typedRequestKey;
  currentState.loc.fetchingL3s = false;
  render();

  act(() => autocompleteProps.onOpen());
  act(() => autocompleteProps.onInputChange(null, typedSearch));
  act(() => jest.advanceTimersByTime(400));

  const typedCalls = fetchLocationsStr.mock.calls.filter((call) => call[5] === typedSearch);
  expect(typedCalls).toHaveLength(0);
});
