import {
  formatServerError,
  formatGraphQLError,
  parseData,
  pageInfo,
  dispatchMutationReq,
  dispatchMutationResp,
  dispatchMutationErr,
} from "@openimis/fe-core";
import _ from "lodash";
import { locationLabel } from "./utils";

const locationRequestIdentity = (meta = {}) => ({
  queryKey: meta.locationQueryKey ?? null,
  owner: meta.locationRequestOwner ?? null,
  serial: meta.locationRequestSerial ?? null,
  generation: meta.locationRequestGeneration ?? null,
});

const locationRequestMatches = (state, level, meta) => {
  const actual = locationRequestIdentity(meta);
  return (
    (state[`locationQueryKeyL${level}s`] ?? null) === actual.queryKey &&
    (state[`locationRequestOwnerL${level}s`] ?? null) === actual.owner &&
    (state[`locationRequestSerialL${level}s`] ?? null) === actual.serial &&
    (state[`locationRequestGenerationL${level}s`] ?? null) === actual.generation
  );
};

function reducer(
  state = {
    fetchingHealthFacilityFullPath: false,
    fetchedHealthFacilityFullPath: false,
    healthFacilityFullPath: null,
    errorHealthFacilityFullPath: null,
    fetchingHealthFacilities: false,
    fetchedHealthFacilities: false,
    healthFacilities: null,
    healthFacilitiesPageInfo: {},
    errorHealthFacilities: null,
    fetchingHealthFacility: false,
    fetchedHealthFacility: false,
    healthFacility: null,
    errorHealthFacility: null,
    fetchingL0s: false,
    fetchedL0s: false,
    l0s: [],
    errorL0s: null,
    locationQueryKeyL0s: null,
    fetchingL1s: false,
    fetchedL1s: false,
    l1s: [],
    errorL1s: null,
    locationQueryKeyL1s: null,
    fetchingL2s: false,
    fetchedL2s: false,
    l2s: [],
    errorL2s: null,
    locationQueryKeyL2s: null,
    fetchingL3s: false,
    fetchedL3s: false,
    l3s: [],
    errorL3s: null,
    locationQueryKeyL3s: null,
    submittingMutation: false,
    mutation: {},
    userL0s: [],
    userL1s: [],
    fetchingUserLocation: false,
    fetchedUserLocation: false,
    errorUserLocation: null,
    userHealthFacilityFullPath: null,
    allL0s: [],
    fetchingAllL0s: false,
    fetchedAllL0s: false,
    errorAllL0s: null,
    allL1s: [],
    fetchingAllL1s: false,
    fetchedAllL1s: false,
    errorAllL1s: null,
    locationsByUuids: [],
    fetchingLocationsByUuids: false,
    fetchedLocationsByUuids: false,
    errorLocationsByUuids: null,
    locationQueryKeyByUuids: null,
  },
  action,
) {
  switch (action.type) {
    case "LOCATION_USER_DISTRICTS_REQ":
      return {
        ...state,
        userL0s: [],
        userL1s: [],
        errorUserLocation: null,
        fetchingUserLocation: true,
        fetchedUserLocation: false,
      };
    case "LOCATION_USER_DISTRICTS_RESP":
      const userL1s = action.payload.data.userDistricts || [];

      return {
        ...state,
        userL0s: _.uniqBy(_.map(userL1s, "parent"), "uuid"),
        userL1s,
        errorUserLocation: formatGraphQLError(action.payload),
        fetchingUserLocation: false,
        fetchedUserLocation: true,
      };
    case "LOCATION_USER_DISTRICTS_ERR":
      return {
        ...state,
        errorUserLocation: formatServerError(action.payload),
        fetchingUserLocation: false,
      };
    case "LOCATION_USER_DISTRICTS_CLEAR":
      return {
        ...state,
        userL0s: [],
        userL1s: [],
        fetchingUserLocation: false,
        fetchedUserLocation: false,
        errorUserLocation: null,
      };
    case "LOCATION_USER_HEALTH_FACILITY_FULL_PATH_RESP":
      var userHealthFacilityFullPath = parseData(action.payload.data.healthFacilities)[0];
      return {
        ...state,
        userHealthFacilityFullPath,
        userHealthFacilityLocationStr: userHealthFacilityFullPath?.location
          ? locationLabel(userHealthFacilityFullPath.location)
          : null,
      };
    case "LOCATION_HEALTH_FACILITY_FULL_PATH_REQ":
      return {
        ...state,
        fetchingHealthFacilityFullPath: true,
        fetchedHealthFacilityFullPath: false,
        healthFacilityFullPath: null,
        errorHealthFacilityFullPath: null,
      };
    case "LOCATION_HEALTH_FACILITY_FULL_PATH_RESP":
      return {
        ...state,
        fetchingHealthFacilityFullPath: false,
        fetchedHealthFacilityFullPath: true,
        healthFacilityFullPath: parseData(action.payload.data.healthFacilities)[0],
        errorHealthFacilityFullPath: formatGraphQLError(action.payload),
      };
    case "LOCATION_HEALTH_FACILITY_FULL_PATH_ERR":
      return {
        ...state,
        fetchingHealthFacilityFullPath: false,
        errorHealthFacilityFullPath: formatServerError(action.payload),
      };
    case "LOCATION_HEALTH_FACILITY_SEARCHER_REQ":
      return {
        ...state,
        fetchingHealthFacilities: true,
        fetchedHealthFacilities: false,
        healthFacilities: null,
        healthFacilitiesPageInfo: { totalCount: 0 },
        errorHealthFacilities: null,
      };
    case "LOCATION_HEALTH_FACILITY_SEARCHER_RESP":
      return {
        ...state,
        fetchingHealthFacilities: false,
        fetchedHealthFacilities: true,
        healthFacilities: parseData(action.payload.data.healthFacilities),
        healthFacilitiesPageInfo: pageInfo(action.payload.data.healthFacilities),
        errorHealthFacilities: formatGraphQLError(action.payload),
      };
    case "LOCATION_HEALTH_FACILITY_SEARCHER_ERR":
      return {
        ...state,
        fetchingHealthFacilities: false,
        errorHealthFacilities: formatServerError(action.payload),
      };
    case "LOCATION_HEALTH_FACILITY_REQ":
      return {
        ...state,
        fetchingHealthFacility: true,
        fetchedHealthFacility: false,
        healthFacility: null,
        errorHealthFacility: null,
      };
    case "LOCATION_HEALTH_FACILITY_RESP":
      var hfs = parseData(action.payload.data.healthFacilities);
      return {
        ...state,
        fetchingHealthFacility: false,
        fetchedHealthFacility: true,
        healthFacility: !!hfs && hfs.length > 0 ? hfs[0] : null,
        errorHealthFacility: formatGraphQLError(action.payload),
      };
    case "LOCATION_HEALTH_FACILITY_ERR":
      return {
        ...state,
        fetchingHealthFacility: false,
        errorHealthFacility: formatServerError(action.payload),
      };
    case "LOCATION_HEALTH_FACILITY_CLEAR":
      return {
        ...state,
        fetchingHealthFacility: false,
        fetchedHealthFacility: false,
        healthFacility: null,
        errorHealthFacility: null,
      };
    case "LOCATION_LOCATIONS_0_REQ":
      return {
        ...state,
        fetchingL0s: true,
        fetchedL0s: false,
        l0s: [],
        l1s: [],
        l2s: [],
        l3s: [],
        errorL0s: null,
        locationQueryKeyL0s: action.meta?.locationQueryKey || null,
        locationRequestOwnerL0s: action.meta?.locationRequestOwner ?? null,
        locationRequestSerialL0s: action.meta?.locationRequestSerial ?? null,
        locationRequestGenerationL0s: action.meta?.locationRequestGeneration ?? null,
      };
    case "LOCATION_LOCATIONS_0_RESP":
      if (!locationRequestMatches(state, 0, action.meta)) return state;
      return {
        ...state,
        fetchingL0s: false,
        fetchedL0s: true,
        l0s: parseData(action.payload.data.locations || action.payload.data.locationsStr),
        errorL0s: formatGraphQLError(action.payload),
      };
    case "LOCATION_LOCATIONS_0_ERR":
      if (!locationRequestMatches(state, 0, action.meta)) return state;
      return {
        ...state,
        fetchingL0s: false,
        errorL0s: formatServerError(action.payload),
      };
    case "LOCATION_LOCATIONS_1_REQ":
      return {
        ...state,
        fetchingL1s: true,
        fetchedL1s: false,
        l1s: [],
        l2s: [],
        l3s: [],
        errorL1s: null,
        locationQueryKeyL1s: action.meta?.locationQueryKey || null,
        locationRequestOwnerL1s: action.meta?.locationRequestOwner ?? null,
        locationRequestSerialL1s: action.meta?.locationRequestSerial ?? null,
        locationRequestGenerationL1s: action.meta?.locationRequestGeneration ?? null,
      };
    case "LOCATION_LOCATIONS_1_RESP":
      if (!locationRequestMatches(state, 1, action.meta)) return state;
      return {
        ...state,
        fetchingL1s: false,
        fetchedL1s: true,
        l1s: parseData(action.payload.data.locations || action.payload.data.locationsStr),
        errorL1s: formatGraphQLError(action.payload),
      };
    case "LOCATION_LOCATIONS_1_ERR":
      if (!locationRequestMatches(state, 1, action.meta)) return state;
      return {
        ...state,
        fetchingL1s: false,
        errorL1s: formatServerError(action.payload),
      };
    case "LOCATION_LOCATIONS_1_CLEAR":
      return {
        ...state,
        l1s: [],
        l2s: [],
        l3s: [],
        locationQueryKeyL1s: null,
        locationRequestOwnerL1s: action.meta?.locationRequestOwner ?? null,
        locationRequestSerialL1s: action.meta?.locationRequestSerial ?? null,
        locationRequestGenerationL1s: action.meta?.locationRequestGeneration ?? null,
      };
    case "LOCATION_LOCATIONS_2_REQ":
      return {
        ...state,
        fetchingL2s: true,
        fetchedL2s: false,
        l2s: [],
        l3s: [],
        errorL2s: null,
        locationQueryKeyL2s: action.meta?.locationQueryKey || null,
        locationRequestOwnerL2s: action.meta?.locationRequestOwner ?? null,
        locationRequestSerialL2s: action.meta?.locationRequestSerial ?? null,
        locationRequestGenerationL2s: action.meta?.locationRequestGeneration ?? null,
      };
    case "LOCATION_LOCATIONS_2_RESP":
      if (!locationRequestMatches(state, 2, action.meta)) return state;
      return {
        ...state,
        fetchingL2s: false,
        fetchedL2s: true,
        l2s: parseData(action.payload.data.locations || action.payload.data.locationsStr),
        errorL2s: formatGraphQLError(action.payload),
      };
    case "LOCATION_LOCATIONS_2_ERR":
      if (!locationRequestMatches(state, 2, action.meta)) return state;
      return {
        ...state,
        fetchingL2s: false,
        errorL2s: formatServerError(action.payload),
      };
    case "LOCATION_LOCATIONS_2_CLEAR":
      return {
        ...state,
        l2s: [],
        l3s: [],
        locationQueryKeyL2s: null,
        locationRequestOwnerL2s: action.meta?.locationRequestOwner ?? null,
        locationRequestSerialL2s: action.meta?.locationRequestSerial ?? null,
        locationRequestGenerationL2s: action.meta?.locationRequestGeneration ?? null,
      };
    case "LOCATION_LOCATIONS_3_REQ":
      return {
        ...state,
        fetchingL3s: true,
        fetchedL3s: false,
        l3s: [],
        errorL3s: null,
        locationQueryKeyL3s: action.meta?.locationQueryKey || null,
        locationRequestOwnerL3s: action.meta?.locationRequestOwner ?? null,
        locationRequestSerialL3s: action.meta?.locationRequestSerial ?? null,
        locationRequestGenerationL3s: action.meta?.locationRequestGeneration ?? null,
      };
    case "LOCATION_LOCATIONS_3_RESP":
      if (!locationRequestMatches(state, 3, action.meta)) return state;
      return {
        ...state,
        fetchingL3s: false,
        fetchedL3s: true,
        l3s: parseData(action.payload.data.locations || action.payload.data.locationsStr),
        errorL3s: formatGraphQLError(action.payload),
      };
    case "LOCATION_LOCATIONS_3_ERR":
      if (!locationRequestMatches(state, 3, action.meta)) return state;
      return {
        ...state,
        fetchingL3s: false,
        errorL3s: formatServerError(action.payload),
      };
    case "LOCATION_LOCATIONS_3_CLEAR":
      return {
        ...state,
        l3s: [],
        locationQueryKeyL3s: null,
        locationRequestOwnerL3s: action.meta?.locationRequestOwner ?? null,
        locationRequestSerialL3s: action.meta?.locationRequestSerial ?? null,
        locationRequestGenerationL3s: action.meta?.locationRequestGeneration ?? null,
      };
    case "LOCATION_FILTER_SELECTED":
      let newState = { ...state };
      for (var i = action.payload.level + 1; i < action.payload.maxLevels; i++) {
        newState[`l${i}s`] = [];
      }
      return newState;
    case "LOCATION_FILTER_REGION_SELECTED":
      return {
        ...state,
        l0s: [action.payload.location],
      };
    case "LOCATION_FILTER_DISTRICT_SELECTED":
      return {
        ...state,
        l1s: [action.payload.location],
      };
    case "LOCATION_REGIONS_REQ":
      return {
        ...state,
        allRegions: [],
        fetchingAllRegions: true,
        fetchedAllRegions: false,
        errorAllRegions: null,
      };
    case "LOCATION_REGIONS_RESP":
      return {
        ...state,
        allRegions: parseData(action.payload.data.locations || action.payload.data.locationsStr),
        fetchingAllRegions: false,
        fetchedAllRegions: true,
        errorAllRegions: formatGraphQLError(action.payload),
      };
    case "LOCATION_REGIONS_ERR":
      return {
        ...state,
        fetchingAllRegions: false,
        errorAllRegions: formatServerError(action.payload),
      };
    case "LOCATION_ALL_LOCATION_0_REQ":
      return {
        ...state,
        allL0s: [],
        fetchingAllL0s: true,
        fetchedAllL0s: false,
        errorAllL0s: null,
      };
    case "LOCATION_ALL_LOCATION_0_RESP":
      return {
        ...state,
        allL0s: parseData(action.payload.data.locationsAll),
        fetchingAllL0s: false,
        fetchedAllL0s: true,
        errorAllL0s: formatGraphQLError(action.payload),
      };
    case "LOCATION_ALL_LOCATION_0_ERR":
      return {
        ...state,
        fetchingAllL0s: false,
        errorAllL0s: formatServerError(action.payload),
      };
    case "LOCATION_ALL_LOCATION_1_REQ":
      return {
        ...state,
        allL1s: [],
        fetchingAllL1s: true,
        fetchedAllL1s: false,
        errorAllL1s: null,
      };
    case "LOCATION_ALL_LOCATION_1_RESP":
      return {
        ...state,
        allL1s: parseData(action.payload.data.locationsAll),
        fetchingAllL1s: false,
        fetchedAllL1s: true,
        errorAllL1s: formatGraphQLError(action.payload),
      };
    case "LOCATION_ALL_LOCATION_1_ERR":
      return {
        ...state,
        fetchingAllL1s: false,
        errorAllL1s: formatServerError(action.payload),
      };
    case "LOCATION_HF_CODE_FIELDS_VALIDATION_REQ":
      return {
        ...state,
        validationFields: {
          ...state.validationFields,
          HFCode: {
            isValidating: true,
            isValid: false,
            validationError: null,
          },
        },
      };
    case "LOCATION_HF_CODE_FIELDS_VALIDATION_RESP":
      return {
        ...state,
        validationFields: {
          ...state.validationFields,
          HFCode: {
            isValidating: false,
            isValid: action.payload?.data.isValid,
            validationError: formatGraphQLError(action.payload),
          },
        },
      };
    case "LOCATION_HF_CODE_FIELDS_VALIDATION_ERR":
      return {
        ...state,
        validationFields: {
          ...state.validationFields,
          HFCode: {
            isValidating: false,
            isValid: false,
            validationError: formatServerError(action.payload),
          },
        },
      };
    case "LOCATION_HF_CODE_FIELDS_VALIDATION_CLEAR":
      return {
        ...state,
        validationFields: {
          ...state.validationFields,
          HFCode: {
            isValidating: true,
            isValid: false,
            validationError: null,
          },
        },
      };
    case "LOCATION_HF_CODE_FIELDS_VALIDATION_SET_VALID":
      return {
        ...state,
        validationFields: {
          ...state.validationFields,
          HFCode: {
            isValidating: false,
            isValid: true,
            validationError: null,
          },
        },
      };
    case "LOCATION_CODE_FIELDS_VALIDATION_REQ":
      return {
        ...state,
        validationFields: {
          ...state.validationFields,
          locationCode: {
            isValidating: true,
            isValid: false,
            validationError: null,
          },
        },
      };
    case "LOCATION_CODE_FIELDS_VALIDATION_RESP":
      return {
        ...state,
        validationFields: {
          ...state.validationFields,
          locationCode: {
            isValidating: false,
            isValid: action.payload?.data.isValid,
            validationError: formatGraphQLError(action.payload),
          },
        },
      };
    case "LOCATION_CODE_FIELDS_VALIDATION_ERR":
      return {
        ...state,
        validationFields: {
          ...state.validationFields,
          locationCode: {
            isValidating: false,
            isValid: false,
            validationError: formatServerError(action.payload),
          },
        },
      };
    case "LOCATION_CODE_FIELDS_VALIDATION_CLEAR":
      return {
        ...state,
        validationFields: {
          ...state.validationFields,
          locationCode: {
            isValidating: true,
            isValid: false,
            validationError: null,
          },
        },
      };
    case "LOCATION_CODE_SET_VALID":
      return {
        ...state,
        validationFields: {
          ...state.validationFields,
          locationCode: {
            isValidating: false,
            isValid: true,
            validationError: null,
          },
        },
      };
    case "LOCATION_MUTATION_REQ":
      return dispatchMutationReq(state, action);
    case "LOCATION_MUTATION_ERR":
      return dispatchMutationErr(state, action);
    case "LOCATION_CREATE_LOCATION_RESP":
      return dispatchMutationResp(state, "createLocation", action);
    case "LOCATION_UPDATE_LOCATION_RESP":
      return dispatchMutationResp(state, "updateLocation", action);
    case "LOCATION_DELETE_LOCATION_RESP":
      return dispatchMutationResp(state, "deleteLocation", action);
    case "LOCATION_MOVE_LOCATION_RESP":
      return dispatchMutationResp(state, "moveLocation", action);
    case "LOCATION_CREATE_HEALTH_FACILITY_RESP":
      return dispatchMutationResp(state, "createHealthFacility", action);
    case "LOCATION_UPDATE_HEALTH_FACILITY_RESP":
      return dispatchMutationResp(state, "updateHealthFacility", action);
    case "LOCATION_DELETE_HEALTH_FACILITY_RESP":
      return dispatchMutationResp(state, "deleteHealthFacility", action);
    case "LOCATION_LOCATIONS_BY_UUIDS_REQ":
      return {
        ...state,
        fetchingLocationsByUuids: true,
        fetchedLocationsByUuids: false,
        locationsByUuids: [],
        errorLocationsByUuids: null,
        locationQueryKeyByUuids: action.meta?.locationQueryKey || null,
      };
    case "LOCATION_LOCATIONS_BY_UUIDS_RESP":
      if (state.locationQueryKeyByUuids && state.locationQueryKeyByUuids !== action.meta?.locationQueryKey) return state;
      const fetchedLocations = parseData(action.payload.data.locationsStr);
      return {
        ...state,
        fetchingLocationsByUuids: false,
        fetchedLocationsByUuids: true,
        locationsByUuids: fetchedLocations,
        errorLocationsByUuids: formatGraphQLError(action.payload),
      };
    case "LOCATION_LOCATIONS_BY_UUIDS_ERR":
      if (state.locationQueryKeyByUuids && state.locationQueryKeyByUuids !== action.meta?.locationQueryKey) return state;
      return {
        ...state,
        fetchingLocationsByUuids: false,
        errorLocationsByUuids: formatServerError(action.payload),
      };
    case "LOCATION_LOCATIONS_BY_UUIDS_EMPTY":
      return {
        ...state,
        fetchingLocationsByUuids: false,
        fetchedLocationsByUuids: true,
        locationsByUuids: [],
        errorLocationsByUuids: null,
        locationQueryKeyByUuids: null,
      };
    case "CORE_AUTH_LOGOUT":
      return {
        ...state,
        fetchingHealthFacilityFullPath: false,
        fetchedHealthFacilityFullPath: false,
        healthFacilityFullPath: null,
        errorHealthFacilityFullPath: null,
        fetchingHealthFacilities: false,
        fetchedHealthFacilities: false,
        healthFacilities: null,
        healthFacilitiesPageInfo: {},
        errorHealthFacilities: null,
        fetchingHealthFacility: false,
        fetchedHealthFacility: false,
        healthFacility: null,
        errorHealthFacility: null,
        fetchingL0s: false,
        fetchedL0s: false,
        l0s: [],
        errorL0s: null,
        fetchingL1s: false,
        fetchedL1s: false,
        l1s: [],
        errorL1s: null,
        fetchingL2s: false,
        fetchedL2s: false,
        l2s: [],
        errorL2s: null,
        fetchingL3s: false,
        fetchedL3s: false,
        l3s: [],
        errorL3s: null,
        submittingMutation: false,
        mutation: {},
        userL0s: [],
        userL1s: [],
        fetchingUserLocation: false,
        fetchedUserLocation: false,
        errorUserLocation: null,
        userHealthFacilityFullPath: null,
        allL0s: [],
        fetchingAllL0s: false,
        fetchedAllL0s: false,
        errorAllL0s: null,
        allL1s: [],
        fetchingAllL1s: false,
        fetchedAllL1s: false,
        errorAllL1s: null,
      };
    default:
      return state;
  }
}

export default reducer;
