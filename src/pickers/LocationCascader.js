import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import AutorenewIcon from '@material-ui/icons/Autorenew';
import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import Cascader from "rc-cascader";
import { TextField, Chip } from "@material-ui/core";
import { withTheme, withStyles } from "@material-ui/core/styles";
import { useModulesManager, useTranslations } from "@openimis/fe-core";
import { fetchLocationsStr, fetchLocationsByUuids, locationQueryKey } from "../actions";
import { locationLabel } from "../utils";
import { nextLocationLevels, normalizeCascaderSelection, expansionStatus } from "../components/optionalWardPath";
import _ from "lodash";

const styles = () => ({
  root: {
    width: "100%",
  },
  chipsContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "4px",
    flex: 1,
    minWidth: 0,
    margin: "3px",
  },
  inputRoot: {
    flexWrap: "wrap",
    "& input": {
      width: 0,
      minWidth: 0,
    },
  },
});

const extractPathFromValue = (location) => {
  const names = [];
  const uuids = [];

  let current = location;
  while (current) {
    names.unshift(current.name);
    uuids.unshift(current.uuid);
    current = current.parent;
  }

  return {
    names,
    uuids,
  };
};

export const LocationCascader = ({
  label = "Location",
  onChange,
  readOnly,
  classes,
  value,
  multiple = false,
}) => {
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations("location", modulesManager);
  const dispatch = useDispatch();
  const locState = useSelector((state) => state.loc);
  const maxLevel = parseInt(
    modulesManager.getConf("location", "Location.MaxLevels", 4)
  );
  const locationTypes = modulesManager.getConf("fe-location", "Location.types", ["R", "D", "W", "V"]);

  const [options, setOptions] = useState([]);
  const [locations, setLocations] = useState(multiple ? [] : "");
  const [defaultValue, setDefaultValue] = useState([]);

  const locationCache = useRef({}); // { [parentUuid]: [childLocations] }
  const pendingExpansion = useRef(null);

  // Load top-level locations on mount
  useEffect(() => {
    dispatch(fetchLocationsStr(modulesManager, 0));
  }, []);

  useEffect(() => {
    const l0s = (locState.l0s || []).map((loc) => ({
      label: locationLabel(loc),
      value: loc.uuid,
      isLeaf: false,
      level: 0,
      raw: loc,
    }));
    setOptions(l0s);
  }, [locState.l0s]);

  const loadData = (selectedOptions) => {
    const targetOption = selectedOptions[selectedOptions.length - 1];
    const currentLevel = targetOption.level ?? selectedOptions.length - 1;
    const levels = nextLocationLevels(currentLevel, maxLevel, locationTypes);

    if (!levels.length) {
      targetOption.isLeaf = true;
      return;
    }

    targetOption.loading = true;
    // Keep the exact request identity for every level.  A fetched flag alone is
    // not sufficient: it may still describe the previous parent while a new
    // request is being started.
    const requestKeys = levels.reduce((keys, level) => ({
      ...keys,
      [level]: locationQueryKey(level, targetOption.value, "", null, null, locationTypes[level]),
    }), {});
    pendingExpansion.current = { targetOption, levels, requestKeys };
    levels.forEach((level) =>
      dispatch(fetchLocationsStr(modulesManager, level, null, null, targetOption.raw))
    );
  };

  useEffect(() => {
    if (!pendingExpansion.current) return;

    const { targetOption, levels, requestKeys } = pendingExpansion.current;
    const status = expansionStatus({ levels, requestKeys }, locState);
    if (status === "stale" || status === "pending") return;

    if (status === "error") {
      // An error must settle the option as well as a successful empty result;
      // otherwise rc-cascader keeps showing a spinner and retries forever.
      targetOption.loading = false;
      targetOption.children = [];
      targetOption.isLeaf = true;
      setOptions((currentOptions) => [...currentOptions]);
      pendingExpansion.current = null;
      return;
    }

    const children = levels.flatMap((level) => (locState[`l${level}s`] || []).map((loc) => ({
        label: locationLabel(loc),
        value: loc.uuid,
        isLeaf: level + 1 >= maxLevel,
        level,
        raw: loc,
      })));

    targetOption.loading = false;
    targetOption.children = children;
    // D→V may legitimately have no W/V children.  Marking that option as a
    // leaf prevents rc-cascader from repeatedly invoking loadData for [] .
    targetOption.isLeaf = children.length === 0;
    locationCache.current[targetOption.value] = children;

    setOptions((currentOptions) => [...currentOptions]); // trigger re-render
    pendingExpansion.current = null;
  }, [locState]);

  useEffect(() => {
    if (value?.uuid) {
      const { names, uuids } = extractPathFromValue(value);
      setDefaultValue(uuids);
      setLocations(locationLabel(value));
    } else if (multiple && value?.length) {
      if(!_.isEqual(_.sortBy(value.map(v => v.uuid)), _.sortBy((locations || []).map(v => v.uuid)))) {
        const hasPartialLocations = value.some(loc => loc.uuid && !loc.name);
        if (hasPartialLocations) {
          const uuidsToFetch = value.filter(loc => loc.uuid && !loc.name).map(loc => loc.uuid);
          if (uuidsToFetch.length > 0) {
            dispatch(fetchLocationsByUuids(uuidsToFetch, maxLevel));
          }
        } else {
          setDefaultValue(value.map(v => v.uuid));
          setLocations(value)
        }
      }
    } else {
      setDefaultValue([]);
      setLocations(multiple ? [] : "");
      setOptions((currentOptions) => currentOptions.map((option) => ({ ...option, children: undefined })));
      locationCache.current = {};
      pendingExpansion.current = null;
    }
  }, [value, multiple]);

  useEffect(() => {
    if (locState.fetchedLocationsByUuids && locState.locationsByUuids?.length > 0) {
      const fetchedLocationsMap = new Map(
        locState.locationsByUuids.map(loc => [loc.uuid, loc])
      );

      if (multiple && Array.isArray(value) && value.length > 0) {
        const enrichedLocations = value.map(loc => {
          if (loc.uuid && !loc.name) {
            return fetchedLocationsMap.get(loc.uuid) || loc;
          }
          return loc;
        });

        setDefaultValue(enrichedLocations.map(v => v.uuid));
        setLocations(enrichedLocations);
      }
    }
  }, [locState.fetchedLocationsByUuids, locState.locationsByUuids]);

  const handleCascaderChange = (uuids, selectedOptions) => {
    // selectedOptions contains the selected location and all its parent levels for each selection
    // unwrap to keep only the lowest level for each selection
    const normalized = normalizeCascaderSelection(multiple, multiple ? selectedOptions : [selectedOptions]);
    setLocations(multiple ? normalized : normalized ? locationLabel(normalized) : "");
    onChange?.(normalized);
  };

  return (
    <div className={classes.root}>
      <Cascader
        key={defaultValue.join(",")}
        options={options}
        defaultValue={defaultValue}
        loadData={loadData}
        onChange={handleCascaderChange}
        changeOnSelect={true}
        disabled={readOnly}
        checkable={multiple}
        expandIcon={<KeyboardArrowRightIcon fontSize="small" />}
        loadingIcon={<AutorenewIcon fontSize="small" className="spin" />}
      >
        <TextField
          label={label || formatMessage("LocationPicker.label")}
          value={multiple ? "" : locations}
          fullWidth
          disabled={readOnly}
          InputProps={{
            readOnly: true,
            classes: multiple && Array.isArray(locations) && locations.length > 0 ? {
              root: classes.inputRoot,
            } : undefined,
            startAdornment: multiple && Array.isArray(locations) && locations.length > 0 ? (
              <div className={classes.chipsContainer}>
                {locations.map((location) => (
                  <Chip
                    key={location.uuid}
                    label={locationLabel(location)}
                    disabled={readOnly}
                  />
                ))}
              </div>
            ) : null,
            endAdornment: (<ArrowDropDownIcon
              style={{ color: "rgba(0, 0, 0, 0.54)" }}
            />),
          }}
        />
      </Cascader>
    </div>
  );
};

export default withStyles(styles)(withTheme(LocationCascader));
