import React, { Component } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import _debounce from "lodash/debounce";
import { withTheme, withStyles } from "@material-ui/core/styles";
import _ from "lodash";
import { Grid } from "@material-ui/core";
import { withModulesManager, ControlledField, PublishedComponent } from "@openimis/fe-core";
import { selectLocation } from "../actions";
import { DEFAULT_LOCATION_TYPES } from "../constants";
import CoarseLocation from "./CoarseLocation";
import { hasOptionalWard, locationPathState, selectFamilyLocation } from "./optionalWardPath";

const styles = (theme) => ({
  dialogTitle: theme.dialog.title,
  dialogContent: theme.dialog.content,
  form: {
    padding: 0,
  },
  item: {
    padding: theme.spacing(1),
  },
  paperDivider: theme.paper.divider,
});

class DetailedLocation extends Component {
  state = {};

  constructor(props) {
    super(props);
    this.locationTypes = props.modulesManager.getConf("fe-location", "Location.types", DEFAULT_LOCATION_TYPES);
    this.optionalWard = hasOptionalWard(this.locationTypes);
    this.pendingClear = false;
  }

  computeState = () => {
    const { value } = this.props;
    if (this.optionalWard) {
      this.setState(locationPathState(value, this.locationTypes));
      return;
    }
    let region = !!value ? value.parent : null;
    let district = value;
    while (!!region && !!region.parent) {
      district = region;
      region = region.parent;
    }
    let state = {
      "location_-2": region,
      "location_-1": district,
    };
    let v = !!value ? { ...value } : null;
    _.times(this.locationTypes.length - 2, (i) => {
      state[`location_${this.locationTypes.length - 3 - i}`] = v;
      v = !!v ? v.parent : null;
    });
    this.setState({ ...state });
  };

  componentDidMount() {
    this.computeState();
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (!_.isEqual(prevProps.value, this.props.value)) {
      if (this.pendingClear && !this.props.value) {
        // An intermediate district/W selection clears the saved V, but must
        // not erase the user's in-progress picker selections.
        this.pendingClear = false;
        return;
      }
      this.pendingClear = false;
      this.computeState();
    }
  }

  onDistrictChange = (d) => {
    let state = { ...this.state };
    const selectedRegion = state["location_-2"];
    if (!state[`location_-2`] && !!d) {
      state[`location_-2`] = d.parent;
    }
    // CoarseLocation emits null when its district is cleared.  Keep the
    // already selected region in that case; only the district and optional
    // descendants are being cleared.
    if (!d && selectedRegion) {
      state["location_-2"] = selectedRegion;
    }
    state[`location_-1`] = d;
    for (let i = 0; i < this.locationTypes.length - 2; i++) {
      state[`location_${i}`] = null;
    }
    this.setState({ ...state }, (e) => {
      this.props.selectLocation(d, 1, this.locationTypes.length);
      if (this.optionalWard && this.props.value) {
        this.pendingClear = true;
        this.props.onChange(null);
      }
    });
  };

  onLocationChange = (l, v) => {
    if (this.optionalWard) {
      const { state, familyLocation } = selectFamilyLocation(this.state, l, v, this.locationTypes);
      this.setState(state, () => {
        this.props.selectLocation(v, l + 2, this.locationTypes.length);
        if (l === this.locationTypes.length - 3) {
          this.props.onChange(familyLocation);
        } else if (this.props.value) {
          this.pendingClear = true;
          this.props.onChange(null);
        }
      });
      return;
    }
    let state = { ...this.state };
    let current = v;
    for (let i = l; i >= -2 && !!current; i--) {
      state[`location_${i}`] = current;
      current = current.parent;
    }
    state[`location_${l}`] = v;
    for (let i = l + 1; i < this.locationTypes.length - 2; i++) {
      state[`location_${i}`] = null;
    }
    this.setState({ ...state }, (e) => {
      if (l === this.locationTypes.length - 3) {
        this.props.onChange(v);
      }
      this.props.selectLocation(v, l, this.locationTypes.length);
    });
  };

  render() {
    const {
      classes,
      split = false,
      readOnly,
      required = false,
      filterLabels = true,
      title = '',
    } = this.props;
    let grid = split ? 12 : 6;
    return (
      <Grid container className={classes.form}>
        <Grid item xs={grid}>
          <CoarseLocation
            region={this.state[`location_-2`]}
            district={this.state[`location_-1`]}
            readOnly={readOnly}
            required={required}
            onChange={this.onDistrictChange}
            filterLabels={filterLabels}
            title={title}
          />
        </Grid>
        {_.times(this.locationTypes.length - 2, (i) => (
          <ControlledField
            module="location"
            id={`DetailedLocation.location_${this.locationTypes.length - 2 + i}`}
            key={`location_${this.locationTypes.length - 2 + i}`}
            field={
              <Grid item xs={Math.floor(grid / (this.locationTypes.length - 2))} className={classes.item}>
                <PublishedComponent
                  pubRef="location.LocationPicker"
                  value={this.state[`location_${i}`]}
                  parentLocation={this.optionalWard && i === 1
                    ? this.state.location_0 || this.state["location_-1"]
                    : this.state[`location_${i - 1}`]}
                  readOnly={readOnly}
                  required={required && !(this.optionalWard && i === 0)}
                  optionalLabel={this.optionalWard && i === 0}
                  withNull={true}
                  filterLabels={filterLabels}
                  locationLevel={this.locationTypes.length - 2 + i}
                  onChange={(v) => this.onLocationChange(i, v)}
                  title={title}
                />
              </Grid>
            }
          />
        ))}
      </Grid>
    );
  }
}

const mapStateToProps = (state) => ({});

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ selectLocation }, dispatch);
};

export default withModulesManager(
  connect(mapStateToProps, mapDispatchToProps)(withTheme(withStyles(styles)(DetailedLocation))),
);
