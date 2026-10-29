import React, { Component } from "react";
import { connect } from "react-redux";
import { injectIntl } from "react-intl";
import { bindActionCreators } from "redux";
import { Grid, InputAdornment } from "@material-ui/core";
import TypeLocationsPaper from "../components/TypeLocationsPaper";
import { fetchLocations, clearLocations, locationQueryKey } from "../actions";
import { withModulesManager, FormPanel, NumberInput } from "@openimis/fe-core";
import { withTheme, withStyles } from "@material-ui/core/styles";
import { hasOptionalWard } from "./optionalWardPath";

const styles = (theme) => ({
  item: theme.paper.item,
});

class CatchmentInput extends Component {
  render() {
    const { onChange, inlineValue, location, readOnly } = this.props;
    return (
      <NumberInput
        value={inlineValue(location)}
        readOnly={readOnly}
        onChange={(v) => onChange(location, v)}
        startAdornment={<InputAdornment position="start">%</InputAdornment>}
        min={0}
        max={100}
      />
    );
  }
}

const sameLocation = (left, right) =>
  !!left && !!right && (left.uuid || left.id) === (right.uuid || right.id);

let panelOwnerSequence = 0;

export class HealthFacilityCatchmentPanel extends FormPanel {
  state = {
    index: null,
    location: null,
    parents: [],
    l0: null,
    l0s: [],
    l1: null,
    l1s: [],
    l2: null,
    l2s: [],
    l3: null,
    l3s: [],
    userL0s: [],
  };

  constructor(props) {
    super(props);
    this.locationTypes = props.modulesManager.getConf("fe-location", "Location.types", ["R", "D", "W", "V"]);
    this.optionalWard = hasOptionalWard(this.locationTypes);
    this.initialLocation = props.edited && props.edited.location;
    this.initialSeedPending = true;
    this.initialHydrationPending = !!this.initialLocation;
    this.panelOwner = `health-facility-catchment-${Date.now()}-${++panelOwnerSequence}`;
    this.requestSerial = 0;
    this.expectedRequests = {};
    this.consumedRequests = {};
    this.pendingDirectVillages = null;
    this.wardOptionsResolved = false;
    this.wardOptionsEmpty = false;
    this.mounted = false;
    this.state = {
      ...this.state,
      // Descendants deliberately start empty. They are populated only by a
      // response owned by this panel after the matching request is fetched.
      l0s: props.l0s || [],
      l1s: [],
      l2s: [],
      l3s: [],
      userL0s: props.userL0s || [],
    };
  }

  componentDidMount() {
    this.mounted = true;
    this.requestLocations(0, null, "regions");
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  initialLocationOfType = (type) => {
    let candidate = this.initialLocation;
    const visited = new Set();
    while (candidate && !visited.has(candidate)) {
      visited.add(candidate);
      if (candidate.type === type) return candidate;
      candidate = candidate.parent;
    }
    return null;
  };

  requestLocations = (level, parent, purpose) => {
    if (level > 0 && !parent) {
      this.clearLevel(level);
      return null;
    }
    const serial = ++this.requestSerial;
    const queryKey = locationQueryKey(level, parent && parent.uuid, "", null, null, this.locationTypes[level]);
    this.expectedRequests[level] = { queryKey, owner: this.panelOwner, serial, purpose };
    this.props.fetchLocations(this.locationTypes, level, parent, serial, this.panelOwner, serial);
    return serial;
  };

  clearLevel = (level) => {
    const serial = ++this.requestSerial;
    this.expectedRequests[level] = { queryKey: null, owner: this.panelOwner, serial, purpose: "clear" };
    this.props.clearLocations(level, serial, this.panelOwner, serial);
  };

  clearDescendants = (fromLevel) => {
    for (let level = fromLevel; level < this.locationTypes.length; level += 1) {
      this.clearLevel(level);
    }
  };

  selectRegion = (l0) => {
    if (sameLocation(this.state.l0, l0)) return;
    this.initialSeedPending = false;
    this.initialHydrationPending = false;
    this.clearDescendants(1);
    this.setState({ l0, l1: null, l1s: [], l2: null, l2s: [], l3: null, l3s: [] });
  };

  selectDistrict = (l1) => {
    if (sameLocation(this.state.l1, l1)) return;
    this.initialSeedPending = false;
    this.initialHydrationPending = false;
    this.clearDescendants(2);
    this.pendingDirectVillages = null;
    this.wardOptionsResolved = false;
    this.wardOptionsEmpty = false;
    this.setState({ l1, l2: null, l2s: [], l3: null, l3s: [] });
  };

  selectWard = (l2) => {
    if (sameLocation(this.state.l2, l2)) return;
    this.initialSeedPending = false;
    this.initialHydrationPending = false;
    this.clearLevel(3);
    this.pendingDirectVillages = null;
    if (!l2 && this.optionalWard && this.state.l1) {
      this.wardOptionsResolved = true;
      this.wardOptionsEmpty = true;
      this.requestLocations(3, this.state.l1, "direct");
    }
    this.setState({ l2, l3: null, l3s: [] });
  };

  componentDidUpdate(prevProps, prevState) {
    if (!this.mounted) return;

    const hydratedLocation = this.props.edited && this.props.edited.location;
    if (this.initialSeedPending && hydratedLocation && hydratedLocation !== this.initialLocation) {
      this.initialLocation = hydratedLocation;
      this.initialHydrationPending = true;
      const region = this.state.l0s.find((candidate) => sameLocation(candidate, this.initialLocationOfType("R")));
      if (region) this.setState({ l0: region });
      else this.requestLocations(0, null, "regions");
      return;
    }

    // User changes are handled before shared Redux arrays so stale global data
    // cannot be consumed during the same update.
    if (prevState.l0 !== this.state.l0) {
      if (this.state.l0) this.requestLocations(1, this.state.l0, "districts");
      else this.clearLevel(1);
      return;
    }
    if (prevState.l1 !== this.state.l1) {
      if (this.state.l1) {
        if (this.optionalWard) {
          this.requestLocations(2, this.state.l1, "wards");
        } else {
          this.requestLocations(2, this.state.l1, "sequential");
        }
      } else {
        this.clearLevel(2);
        this.clearLevel(3);
      }
      return;
    }
    if (prevState.l2 !== this.state.l2) {
      if (this.state.l2) this.requestLocations(3, this.state.l2, "ward");
      else if (!this.optionalWard) this.clearLevel(3);
      return;
    }

    if (this.consumeMatchingResponse(prevProps, 0)) return;
    if (this.consumeMatchingResponse(prevProps, 1)) return;
    if (this.consumeMatchingResponse(prevProps, 2)) return;
    if (this.consumeMatchingResponse(prevProps, 3)) return;

    if (prevProps.userL0s !== this.props.userL0s) {
      this.setState({ userL0s: this.props.userL0s || [] });
      return;
    }

    if (prevProps.submittingMutation && !this.props.submittingMutation) {
      this.props.journalize(this.props.mutation);
    }
  }

  responseIdentity = (level, props) => ({
    queryKey: props[`locationQueryKeyL${level}s`],
    owner: props[`locationRequestOwnerL${level}s`] || null,
    serial: props[`locationRequestSerialL${level}s`] ?? props[`locationRequestGenerationL${level}s`] ?? null,
  });

  consumeMatchingResponse = (prevProps, level) => {
    const expected = this.expectedRequests[level];
    if (!expected || expected.purpose === "clear" || !this.props[`fetchedL${level}s`]) return false;
    const actual = this.responseIdentity(level, this.props);
    if (
      actual.queryKey !== expected.queryKey ||
      actual.owner !== expected.owner ||
      actual.serial !== expected.serial
    ) return false;
    const identity = `${actual.queryKey}|${actual.owner}|${actual.serial}`;
    if (this.consumedRequests[level] === identity) return false;
    this.consumedRequests[level] = identity;
    const locations = this.props[`l${level}s`] || [];

    if (level === 0) {
      const nextState = { l0s: locations };
      if (this.initialSeedPending && this.initialLocation) {
        const region = locations.find((candidate) => sameLocation(candidate, this.initialLocationOfType("R")));
        if (region) nextState.l0 = region;
      }
      this.setState(nextState);
      return true;
    }
    if (level === 1) {
      const nextState = { l1s: locations };
      if (this.initialSeedPending && this.state.l0) {
        const district = locations.find((candidate) => sameLocation(candidate, this.initialLocationOfType("D")));
        nextState.l1 = district || null;
        this.initialSeedPending = false;
      }
      this.setState(nextState);
      return true;
    }
    if (level === 2 && this.optionalWard) {
      this.wardOptionsResolved = true;
      this.wardOptionsEmpty = locations.length === 0;
      if (locations.length) {
        const ward = this.initialHydrationPending
          ? locations.find((candidate) => sameLocation(candidate, this.initialLocationOfType("W"))) || locations[0]
          : locations[0];
        this.pendingDirectVillages = null;
        this.setState({ l2s: locations, l2: ward, l3: null, l3s: [] });
      } else {
        const directVillages = this.pendingDirectVillages || [];
        const village = this.initialHydrationPending
          ? directVillages.find((candidate) => sameLocation(candidate, this.initialLocationOfType("V"))) || directVillages[0] || null
          : directVillages[0] || null;
        this.setState({ l2s: [], l2: null, l3s: directVillages, l3: village });
        this.requestLocations(3, this.state.l1, "direct");
        if (directVillages.length || !this.initialHydrationPending) this.initialHydrationPending = false;
      }
      return true;
    }
    if (level === 2) {
      const location = locations[0] || null;
      this.setState({ l2s: locations, l2: location, l3: null, l3s: [] });
      return true;
    }
    if (level === 3 && this.optionalWard && expected.purpose === "direct") {
      this.pendingDirectVillages = locations;
      if (this.wardOptionsResolved && this.wardOptionsEmpty) {
        const village = this.initialHydrationPending
          ? locations.find((candidate) => sameLocation(candidate, this.initialLocationOfType("V"))) || locations[0] || null
          : locations[0] || null;
        this.initialHydrationPending = false;
        this.setState({ l3s: locations, l3: village });
      }
      return true;
    }
    if (level === 3) {
      const village = this.initialHydrationPending
        ? locations.find((candidate) => sameLocation(candidate, this.initialLocationOfType("V"))) || locations[0] || null
        : locations[0] || null;
      this.initialHydrationPending = false;
      this.setState({ l3s: locations, l3: village });
      return true;
    }
    return false;
  };

  inlineValue = (l) => {
    const catchments = this.props.edited && this.props.edited.catchments ? this.props.edited.catchments : [];
    const row = catchments.find((catchment) => catchment.location.id === l.id);
    return row ? row.catchment : null;
  };

  updateCatchments = (locationId, value) => {
    const catchments = this.props.edited && this.props.edited.catchments ? this.props.edited.catchments : [];
    const index = catchments.findIndex((catchment) => catchment.location.id === locationId);
    if (index === -1) {
      return [
        ...catchments,
        { location: { id: locationId }, healthFacilityId: this.props.edited.id, catchment: value },
      ];
    }
    return catchments.map((catchment, catchmentIndex) =>
      catchmentIndex === index ? { ...catchment, catchment: value } : catchment,
    );
  };

  onCatchmentChanged = (l, v) => {
    this.props.onEditedChanged({
      ...this.props.edited,
      catchments: this.updateCatchments(l.id, v),
    });
  };

  render() {
    const {
      classes, fetchingL0s, fetchedL0s, errorL0s, fetchingL1s, fetchedL1s, errorL1s,
      fetchingL2s, fetchedL2s, errorL2s, fetchingL3s, fetchedL3s, errorL3s, readOnly,
    } = this.props;
    const { l0s, l1s, l2s, l3s } = this.state;
    const villageParent = this.state.l2 || this.state.l1;
    return (
      <Grid container spacing={1} className={classes.item}>
        <Grid item xl={8} lg={12}>
          <Grid container spacing={1}>
            <Grid item xs={4}>
              <TypeLocationsPaper type={0} onRefresh={() => this.requestLocations(0, null, "regions")} changeState={(state) => this.setState(state)} onSelect={this.selectRegion} fetching={fetchingL0s} fetched={fetchedL0s} error={errorL0s} location={this.state.l0} locations={this.state.userL0s} currentParents={[]} stateLocation={this.state.location} reassign={true} readOnly={readOnly} />
            </Grid>
            <Grid item xs={4}>
              <TypeLocationsPaper type={1} onRefresh={() => this.requestLocations(1, this.state.l0, "districts")} changeState={(state) => this.setState(state)} onSelect={this.selectDistrict} fetching={fetchingL1s} fetched={fetchedL1s} error={errorL1s} location={this.state.l1} locations={l1s} currentParents={this.state.l0 ? [this.state.l0] : []} stateLocation={this.state.location} reassign={true} readOnly={readOnly} />
            </Grid>
            <Grid item xs={4}>
              <TypeLocationsPaper type={2} onRefresh={() => this.requestLocations(2, this.state.l1, "wards")} changeState={(state) => this.setState(state)} onSelect={this.selectWard} fetching={fetchingL2s} fetched={fetchedL2s} error={errorL2s} location={this.state.l2} locations={l2s} currentParents={this.state.l1 ? [this.state.l1] : []} stateLocation={this.state.location} reassign={true} readOnly={readOnly} />
            </Grid>
          </Grid>
        </Grid>
        <Grid item xl={4} lg={12} xs={12}>
          <TypeLocationsPaper type={3} title={`locations.searcher.title.3.catchments`} onRefresh={() => this.requestLocations(3, villageParent, this.state.l2 ? "ward" : "direct")} changeState={(state) => this.setState(state)} onSelect={(l3) => this.setState({ l3 })} InlineInput={CatchmentInput} inlineValue={this.inlineValue} onChange={this.onCatchmentChanged} fetching={fetchingL3s} fetched={fetchedL3s} error={errorL3s} location={this.state.l3} locations={l3s} currentParents={villageParent ? [villageParent] : []} stateLocation={this.state.location} readOnly={readOnly} />
        </Grid>
      </Grid>
    );
  }
}

const mapStateToProps = (state) => ({
  fetchingL0s: state.loc.fetchingL0s, fetchedL0s: state.loc.fetchedL0s, l0s: state.loc.l0s, errorL0s: state.loc.errorL0s,
  locationQueryKeyL0s: state.loc.locationQueryKeyL0s, locationRequestOwnerL0s: state.loc.locationRequestOwnerL0s, locationRequestSerialL0s: state.loc.locationRequestSerialL0s, locationRequestGenerationL0s: state.loc.locationRequestGenerationL0s,
  fetchingL1s: state.loc.fetchingL1s, fetchedL1s: state.loc.fetchedL1s, l1s: state.loc.l1s, errorL1s: state.loc.errorL1s,
  locationQueryKeyL1s: state.loc.locationQueryKeyL1s, locationRequestOwnerL1s: state.loc.locationRequestOwnerL1s, locationRequestSerialL1s: state.loc.locationRequestSerialL1s, locationRequestGenerationL1s: state.loc.locationRequestGenerationL1s,
  fetchingL2s: state.loc.fetchingL2s, fetchedL2s: state.loc.fetchedL2s, l2s: state.loc.l2s, errorL2s: state.loc.errorL2s,
  locationQueryKeyL2s: state.loc.locationQueryKeyL2s, locationRequestOwnerL2s: state.loc.locationRequestOwnerL2s, locationRequestSerialL2s: state.loc.locationRequestSerialL2s, locationRequestGenerationL2s: state.loc.locationRequestGenerationL2s,
  fetchingL3s: state.loc.fetchingL3s, fetchedL3s: state.loc.fetchedL3s, l3s: state.loc.l3s, errorL3s: state.loc.errorL3s,
  locationQueryKeyL3s: state.loc.locationQueryKeyL3s, locationRequestOwnerL3s: state.loc.locationRequestOwnerL3s, locationRequestSerialL3s: state.loc.locationRequestSerialL3s, locationRequestGenerationL3s: state.loc.locationRequestGenerationL3s,
  userL0s: state.loc.userL0s,
});
const mapDispatchToProps = (dispatch) => bindActionCreators({ fetchLocations, clearLocations }, dispatch);

export default withModulesManager(
  injectIntl(connect(mapStateToProps, mapDispatchToProps)(withTheme(withStyles(styles)(HealthFacilityCatchmentPanel)))),
);
