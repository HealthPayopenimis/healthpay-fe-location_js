import React, { Component } from "react";
import { connect } from "react-redux";
import { injectIntl } from "react-intl";
import { bindActionCreators } from "redux";
import { Grid, InputAdornment } from "@material-ui/core";
import TypeLocationsPaper from "../components/TypeLocationsPaper";
import { fetchLocations, clearLocations } from "../actions";
import { withModulesManager, FormPanel, NumberInput } from "@openimis/fe-core";
import { withTheme, withStyles } from "@material-ui/core/styles";
import _ from "lodash";

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
class HealthFacilityCatchmentPanel extends FormPanel {
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
  }

  componentDidMount() {
    this.props.fetchLocations(this.locationTypes, 0, null);
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (!_.isEqual(prevProps.l0s, this.props.l0s)) {
      let l0 = this.state.l0 || (!!this.props.edited.location ? this.props.edited.location.parent : null);
      this.setState({
        l0,
        l0s: this.props.l0s,
        l1s: this.props.l1s,
        l2s: this.props.l2s,
        l3s: this.props.l3s,
        userL0s: this.props.userL0s,
      });
    } else if (prevState.l0 !== this.state.l0) {
      if (!this.state.l0) {
        this.props.clearLocations(1);
      } else {
        this.props.fetchLocations(this.locationTypes, 1, this.state.l0);
      }
    } else if (!_.isEqual(prevProps.l1s, this.props.l1s)) {
      let l1 = this.state.l1 || this.props.edited.location;
      this.setState({
        l1,
        l1s: this.props.l1s,
        l2s: this.props.l2s,
        l3s: this.props.l3s,
      });
    } else if (prevState.l1 !== this.state.l1) {
      if (!this.state.l1) {
        this.props.clearLocations(2);
      } else {
        this.props.fetchLocations(this.locationTypes, 2, this.state.l1);
      }
    } else if (!_.isEqual(prevProps.l2s, this.props.l2s)) {
      this.setState({
        l2: !!this.props.l2s ? this.props.l2s[0] : null,
        l2s: this.props.l2s,
        l3s: this.props.l3s,
      });
    } else if (prevState.l2 !== this.state.l2) {
      if (!this.state.l2) {
        this.props.clearLocations(3);
      } else {
        this.props.fetchLocations(this.locationTypes, 3, this.state.l2);
      }
    } else if (!_.isEqual(prevProps.l3s, this.props.l3s)) {
      this.setState({
        l3: !!this.props.l3s ? this.props.l3s[0] : null,
        l3s: this.props.l3s,
      });
    } else if (prevProps.submittingMutation && !this.props.submittingMutation) {
      this.props.journalize(this.props.mutation);
    }
  }

  inlineValue = (l) => {
    let catchments = !!this.props.edited.catchments ? [...this.props.edited.catchments] : [];
    for (let idx in catchments) {
      if (catchments[idx].location.id === l.id) {
        return catchments[idx].catchment;
      }
    }
    return null;
  };

  updateCatchments = (locationId, value) => {
    let catchments = !!this.props.edited.catchments ? [...this.props.edited.catchments] : [];
    for (let idx in catchments) {
      if (catchments[idx].location.id === locationId) {
        catchments[idx].catchment = value;
        return catchments;
      }
    }
    catchments.push({
      location: { id: locationId },
      healthFacilityId: this.props.edited.id,
      catchment: value,
    });
    return catchments;
  };

  onCatchmentChanged = (l, v) => {
    let catchments = this.updateCatchments(l.id, v);
    let edited = { ...this.props.edited };
    edited.catchments = catchments;
    this.props.onEditedChanged(edited);
  };

  render() {
    const {
      classes,
      fetchingL0s,
      fetchedL0s,
      errorL0s,
      fetchingL1s,
      fetchedL1s,
      errorL1s,
      fetchingL2s,
      fetchedL2s,
      errorL2s,
      fetchingL3s,
      fetchedL3s,
      errorL3s,
      readOnly,
    } = this.props;
    const { l0s, l1s, l2s, l3s } = this.state;
    return (
      <Grid container spacing={1} className={classes.item}>
        <Grid item xl={8} lg={12}>
          <Grid container spacing={1}>
            <Grid item xs={4}>
              <TypeLocationsPaper
                type={0}
                onRefresh={() => this.props.fetchLocations(this.locationTypes, 0, null)}
                changeState={(state) => this.setState(state)}
                onSelect={(l0) => this.setState({ l0 })}
                fetching={fetchingL0s}
                fetched={fetchedL0s}
                error={errorL0s}
                location={this.state.l0}
                locations={this.state.userL0s}
                currentParents={this.state.currentParents}
                stateLocation={this.state.location}
                reassign={true}
                readOnly={readOnly}
              />
            </Grid>
            <Grid item xs={4}>
              <TypeLocationsPaper
                type={1}
                onRefresh={() => this.props.fetchLocations(this.locationTypes, 1, this.state.l0)}
                changeState={(state) => this.setState(state)}
                onSelect={(l1) => this.setState({ l1 })}
                fetching={fetchingL1s}
                fetched={fetchedL1s}
                error={errorL1s}
                location={this.state.l1}
                locations={l1s}
                currentParents={this.state.currentParents}
                stateLocation={this.state.location}
                reassign={true}
                readOnly={readOnly}
              />
            </Grid>
            <Grid item xs={4}>
              <TypeLocationsPaper
                type={2}
                onRefresh={() => this.props.fetchLocations(this.locationTypes, 2, this.state.l1)}
                changeState={(state) => this.setState(state)}
                onSelect={(l2) => this.setState({ l2 })}
                fetching={fetchingL2s}
                fetched={fetchedL2s}
                error={errorL2s}
                location={this.state.l2}
                locations={l2s}
                currentParents={this.state.currentParents}
                stateLocation={this.state.location}
                reassign={true}
                readOnly={readOnly}
              />
            </Grid>
          </Grid>
        </Grid>
        <Grid item xl={4} lg={12} xs={12}>
          <TypeLocationsPaper
            type={3}
            title={`locations.searcher.title.3.catchments`}
            onRefresh={() => this.props.fetchLocations(this.locationTypes, 3, this.state.l2)}
            changeState={(state) => this.setState(state)}
            onSelect={(l3) => this.setState({ l3 })}
            InlineInput={CatchmentInput}
            inlineValue={this.inlineValue}
            onChange={this.onCatchmentChanged}
            fetching={fetchingL3s}
            fetched={fetchedL3s}
            error={errorL3s}
            location={this.state.l3}
            locations={l3s}
            currentParents={this.state.currentParents}
            stateLocation={this.state.location}
            readOnly={readOnly}
          />
        </Grid>
      </Grid>
    );
  }
}

const mapStateToProps = (state) => ({
  fetchingL0s: state.loc.fetchingL0s,
  fetchedL0s: state.loc.fetchedL0s,
  l0s: state.loc.l0s,
  errorL0s: state.loc.errorL0s,
  fetchingL1s: state.loc.fetchingL1s,
  fetchedL1s: state.loc.fetchedL1s,
  l1s: state.loc.l1s,
  errorL1s: state.loc.errorL1s,
  fetchingL2s: state.loc.fetchingL2s,
  fetchedL2s: state.loc.fetchedL2s,
  l2s: state.loc.l2s,
  errorL2s: state.loc.errorL2s,
  fetchingL3s: state.loc.fetchingL3s,
  fetchedL3s: state.loc.fetchedL3s,
  l3s: state.loc.l3s,
  errorL3s: state.loc.errorL3s,
  userL0s: state.loc.userL0s,
});

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      fetchLocations,
      clearLocations,
    },
    dispatch,
  );
};

export default withModulesManager(
  injectIntl(connect(mapStateToProps, mapDispatchToProps)(withTheme(withStyles(styles)(HealthFacilityCatchmentPanel)))),
);
