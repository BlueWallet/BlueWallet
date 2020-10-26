import dayjs from 'dayjs';
import React, { PureComponent } from 'react';
import { StatusBar, StyleSheet, Text, View, Keyboard, AppState } from 'react-native';
import { connect } from 'react-redux';

import { images } from 'app/assets';
import { Image, PinView, PinInputView } from 'app/components';
import { CONST, finalAttempt } from 'app/consts';
import { TimeCounterScreen } from 'app/screens';
import { BiometricService } from 'app/services';
import { ApplicationState } from 'app/state';
import {
  authenticate as authenticateAction,
  setIsAuthenticated as setIsAuthenticatedAction,
  SetIsAuthenticatedAction,
} from 'app/state/authentication/actions';
import {
  setTimeCounter as setTimeCounterAction,
  SetTimeCounterAction,
  setFailedAttempts as setFailedAttemptsAction,
  SetFailedAttemptsAction,
  setFailedAttemptStep as setFailedAttemptStepAction,
  SetFailedAttemptStepAction,
} from 'app/state/timeCounter/actions';
import { TimeCounterState } from 'app/state/timeCounter/reducer';
import { getStatusBarHeight, palette, typography } from 'app/styles';

const i18n = require('../../loc');

interface Props {
  isBiometricsEnabled: boolean;
  setTimeCounter: (timestamp: number) => SetTimeCounterAction;
  setFailedAttempts: (attempt: number) => SetFailedAttemptsAction;
  setFailedAttemptStep: (failedAttempt: number) => SetFailedAttemptStepAction;
  timeCounter: TimeCounterState;
  authenticate: Function;
  setIsAuthenticated: (isAuthenticated: boolean) => SetIsAuthenticatedAction;
}

interface State {
  pin: string;
  error: string;
  isCount: boolean;
}

class UnlockScreen extends PureComponent<Props, State> {
  state: State = {
    pin: '',
    error: '',
    isCount: true,
  };

  async componentDidMount() {
    Keyboard.dismiss();
    if (!this.isTimeCounterVisible() && AppState.currentState === 'active') {
      await this.unlockWithBiometrics();
    }
  }

  unlockWithBiometrics = async () => {
    const { setIsAuthenticated, isBiometricsEnabled } = this.props;
    if (!isBiometricsEnabled) {
      return;
    }
    if (!!BiometricService.biometryType) {
      const result = await BiometricService.unlockWithBiometrics();
      if (result) {
        setIsAuthenticated(true);
      }
    }
  };

  handleFailedAttempt = (increasedFailedAttemptStep: number) => {
    const { attempt } = this.props.timeCounter;
    const { setFailedAttempts, setFailedAttemptStep, setTimeCounter } = this.props;
    const isFinalAttempt = increasedFailedAttemptStep === finalAttempt;
    let currentDate = dayjs();
    let blockedTimeInMinutes = 1;

    if (attempt === 1) {
      blockedTimeInMinutes = 2;
    } else if (attempt > 1) {
      blockedTimeInMinutes = 10;
    }
    currentDate = currentDate.add(blockedTimeInMinutes, 'minute');

    if (isFinalAttempt) {
      setTimeCounter(currentDate.unix());
      setFailedAttempts(attempt + 1);
      setFailedAttemptStep(0);
      this.setState({ isCount: true });
    } else {
      setFailedAttemptStep(increasedFailedAttemptStep);
    }

    return !isFinalAttempt
      ? `\n${i18n.onboarding.failedTimesErrorInfo} ${blockedTimeInMinutes} ${i18n.onboarding.minutes}\n${i18n.onboarding.failedTimes} ${increasedFailedAttemptStep}/${finalAttempt}`
      : '';
  };

  updatePin = (pin: string) => {
    const { setFailedAttempts, setFailedAttemptStep, authenticate } = this.props;
    if (this.state.pin.length < CONST.pinCodeLength) {
      this.setState({ pin: this.state.pin + pin }, async () => {
        if (this.state.pin.length === CONST.pinCodeLength) {
          authenticate(this.state.pin, {
            onSuccess: () => {
              setFailedAttempts(0);
              setFailedAttemptStep(0);
            },
            onFailure: () => {
              const increasedFailedAttemptStep = this.props.timeCounter.failedAttemptStep + 1;
              const failedTimesError = this.handleFailedAttempt(increasedFailedAttemptStep);
              this.setState({
                error: i18n.onboarding.pinDoesNotMatch + failedTimesError,
                pin: '',
              });
            },
          });
        }
      });
    }
  };

  onClearPress = () => {
    this.setState({
      pin: this.state.pin.slice(0, -1),
    });
  };

  onTryAgain = () => {
    this.setState({ isCount: false, error: '' });
  };

  isTimeCounterVisible = () => {
    return dayjs().unix() < this.props.timeCounter.timestamp && this.state.isCount;
  };

  render() {
    const { error, pin } = this.state;
    if (this.isTimeCounterVisible()) {
      return (
        <View style={styles.container}>
          <TimeCounterScreen onTryAgain={this.onTryAgain} timestamp={this.props.timeCounter.timestamp} />
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.imageContainer}>
          <Image source={images.portraitLogo} style={styles.logo} resizeMode="contain" />
        </View>
        <PinView value={pin} length={CONST.pinCodeLength} />
        <Text style={styles.errorText}>{error}</Text>
        <PinInputView value={pin} onTextChange={this.updatePin} onClearPress={this.onClearPress} />
      </View>
    );
  }
}

const mapStateToProps = (state: ApplicationState) => ({
  timeCounter: state.timeCounter,
  isBiometricsEnabled: state.appSettings.isBiometricsEnabled,
});

const mapDispatchToProps = {
  setTimeCounter: setTimeCounterAction,
  setFailedAttempts: setFailedAttemptsAction,
  setFailedAttemptStep: setFailedAttemptStepAction,
  authenticate: authenticateAction,
  setIsAuthenticated: setIsAuthenticatedAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(UnlockScreen);

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.white,
    alignItems: 'center',
    ...StyleSheet.absoluteFillObject,
    paddingTop: getStatusBarHeight(),
    zIndex: 1000,
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: 150,
    height: 235,
  },
  errorText: {
    marginVertical: 20,
    color: palette.textRed,
    marginHorizontal: 20,
    textAlign: 'center',
    ...typography.headline6,
  },
});
