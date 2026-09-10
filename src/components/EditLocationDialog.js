import React, { Component } from "react";
import { connect } from "react-redux";
import { injectIntl } from "react-intl";
import _ from "lodash";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
} from "@material-ui/core";

import { withModulesManager, formatMessage, TextInput, ValidatedTextInput, NumberInput } from "@openimis/fe-core";
import { locationCodeValidationCheck, locationCodeValidationClear, locationCodeSetValid } from "../actions";
import { MAX_INT_NUMBER } from "../constants";

class EditLocationDialog extends Component {
  state = {
    data: {},
  };

  constructor(props) {
    super(props);
    this.codeMaxLength = props.modulesManager.getConf("fe-location", "locationForm.codeMaxLength", 50);
  }

  keysFunction = (event) => {
    if (!!this.props.open) {
      if (event.keyCode === 13) {
        if (this.canSave()) {
          this.props.onSave(this.state.data);
        }
      } else if (event.keyCode === 27) {
        this.props.onCancel();
      }
    }
  };

  validateNumberInputs = (malePopulation, femalePopulation, otherPopulation, families) => {
    if (malePopulation > MAX_INT_NUMBER) return false;
    if (femalePopulation > MAX_INT_NUMBER) return false;
    if (otherPopulation > MAX_INT_NUMBER) return false;
    if (families > MAX_INT_NUMBER) return false;

    return true;
  };

  componentDidMount() {
    document.addEventListener("keydown", this.keysFunction, false);
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this.keysFunction, false);
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (!_.isEqual(prevProps.location, this.props.location)) {
      this.setState((state, props) => ({ data: props.location }));
    }

    const areInputsValid = this.validateNumberInputs(
      this.state.data?.malePopulation,
      this.state.data?.femalePopulation,
      this.state.data?.otherPopulation,
      this.state.data?.families,
    );

    if (!_.isEqual(prevState.data, this.state.data)) {
      this.setState((state, props) => ({ ...state, areInputsValid }));
    }
  }

  changeData = (k, v) => {
    let data = { ...this.state.data };
    data[k] = v;
    this.setState({ data });
  };

  canSave = () =>
    !!this.state.data &&
    !!this.state.data.code &&
    !!this.state.data.name &&
    !!this.state.areInputsValid &&
    !!(this.props.isCodeValid || this.props.location?.code === this.state.data?.code);

  shouldValidate = (inputValue) => {
    const savedLocationCode = this.props.location?.code;
    if (this.state.data?.uuid && inputValue === savedLocationCode) return false;
    return true;
  };

  render() {
    const {
      intl,
      open,
      title,
      onSave,
      onCancel,
      withCaptation = false,
      isCodeValid,
      isCodeValidating,
      codeValidationError,
    } = this.props;

    if (this.props.open === true && !this.props.location) {
      return (
        <Dialog open={open} onClose={onCancel}>
          <DialogTitle>{title}</DialogTitle>
          <Divider />
          <DialogContent>
            <DialogContentText>
              <ValidatedTextInput
                action={locationCodeValidationCheck}
                clearAction={locationCodeValidationClear}
                itemQueryIdentifier="locationCode"
                isValid={isCodeValid}
                isValidating={isCodeValidating}
                validationError={codeValidationError}
                shouldValidate={this.shouldValidate}
                codeTakenLabel="EditDialog.codeTaken"
                onChange={(code) => this.changeData("code", code)}
                module="location"
                label="EditDialog.code"
                autoFocus={true}
                value={!!this.state.data ? this.state.data.code : null}
                inputProps={{
                  "maxLength": this.codeMaxLength,
                }}
              />
              <TextInput
                module="location"
                label="EditDialog.name"
                value={!!this.state.data ? this.state.data.name : null}
                onChange={(v) => this.changeData("name", v)}
              />
              {withCaptation && (
                <Grid container>
                  <Grid item xs={6}>
                    <NumberInput
                      module="location"
                      label="EditDialog.male"
                      max={MAX_INT_NUMBER}
                      value={!!this.state.data ? this.state.data.malePopulation : null}
                      onChange={(v) => this.changeData("malePopulation", v)}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <NumberInput
                      module="location"
                      label="EditDialog.female"
                      max={MAX_INT_NUMBER}
                      value={!!this.state.data ? this.state.data.femalePopulation : null}
                      onChange={(v) => this.changeData("femalePopulation", v)}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <NumberInput
                      module="location"
                      label="EditDialog.other"
                      max={MAX_INT_NUMBER}
                      value={!!this.state.data ? this.state.data.otherPopulation : null}
                      onChange={(v) => this.changeData("otherPopulation", v)}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <NumberInput
                      module="location"
                      label="EditDialog.family"
                      max={MAX_INT_NUMBER}
                      value={!!this.state.data ? this.state.data.families : null}
                      onChange={(v) => this.changeData("families", v)}
                    />
                  </Grid>
                </Grid>
              )}
            </DialogContentText>
          </DialogContent>
          <Divider />
          <DialogActions>
            <Button onClick={onCancel}>{formatMessage(intl, "location", "EditDialog.cancel")}</Button>
            <Button onClick={(e) => onSave(this.state.data)} color="primary" autoFocus disabled={!this.canSave()}>
              {formatMessage(intl, "location", "EditDialog.save")}
            </Button>
          </DialogActions>
        </Dialog>
      );
    } else {
      return (
        <Dialog open={open} onClose={onCancel}>
          <DialogTitle>{title}</DialogTitle>
          <Divider />
          <DialogContent>
            <DialogContentText>
              <ValidatedTextInput
                action={locationCodeValidationCheck}
                clearAction={locationCodeValidationClear}
                setValidAction={locationCodeSetValid}
                itemQueryIdentifier="locationCode"
                isValid={isCodeValid}
                isValidating={isCodeValidating}
                validationError={codeValidationError}
                shouldValidate={this.shouldValidate}
                codeTakenLabel="EditDialog.codeTaken"
                onChange={(code) => this.changeData("code", code)}
                module="location"
                label="EditDialog.code"
                autoFocus={true}
                value={!!this.state.data ? this.state.data.code : null}
                inputProps={{
                  "maxLength": this.codeMaxLength,
                }}
              />
              <TextInput
                module="location"
                label="EditDialog.name"
                value={!!this.state.data ? this.state.data.name : null}
                onChange={(v) => this.changeData("name", v)}
              />
              {withCaptation && (
                <Grid container>
                  <Grid item xs={6}>
                    <NumberInput
                      module="location"
                      label="EditDialog.male"
                      max={MAX_INT_NUMBER}
                      value={!!this.state.data ? this.state.data.malePopulation : null}
                      onChange={(v) => this.changeData("malePopulation", v)}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <NumberInput
                      module="location"
                      label="EditDialog.female"
                      max={MAX_INT_NUMBER}
                      value={!!this.state.data ? this.state.data.femalePopulation : null}
                      onChange={(v) => this.changeData("femalePopulation", v)}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <NumberInput
                      module="location"
                      label="EditDialog.other"
                      max={MAX_INT_NUMBER}
                      value={!!this.state.data ? this.state.data.otherPopulation : null}
                      onChange={(v) => this.changeData("otherPopulation", v)}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <NumberInput
                      module="location"
                      label="EditDialog.family"
                      max={MAX_INT_NUMBER}
                      value={!!this.state.data ? this.state.data.families : null}
                      onChange={(v) => this.changeData("families", v)}
                    />
                  </Grid>
                </Grid>
              )}
            </DialogContentText>
          </DialogContent>
          <Divider />
          <DialogActions>
            <Button onClick={onCancel}>{formatMessage(intl, "location", "EditDialog.cancel")}</Button>
            <Button onClick={(e) => onSave(this.state.data)} color="primary" autoFocus disabled={!this.canSave()}>
              {formatMessage(intl, "location", "EditDialog.save")}
            </Button>
          </DialogActions>
        </Dialog>
      );
    }
  }
}

const mapStateToProps = (store) => ({
  isCodeValid: store.loc.validationFields?.locationCode?.isValid,
  isCodeValidating: store.loc.validationFields?.locationCode?.isValidating,
  codeValidationError: store.loc.validationFields?.locationCode?.validationError,
});

export default withModulesManager(injectIntl(connect(mapStateToProps)(EditLocationDialog)));
