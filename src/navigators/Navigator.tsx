import { NavigationContainer } from '@react-navigation/native';
import config from 'app/../config';
import JailMonkey from 'jail-monkey';
import React from 'react';
import { connect } from 'react-redux';

import { RenderMessage, MessageType } from 'app/helpers/MessageCreator';
import { RootNavigator, PasswordNavigator } from 'app/navigators';
import { UnlockScreen } from 'app/screens';
import { BetaVersionScreen } from 'app/screens/BetaVersionScreen';
import { navigationRef } from 'app/services';
import { checkDeviceSecurity } from 'app/services/DeviceSecurityService';
import { ApplicationState } from 'app/state';
import { selectors } from 'app/state/authentication';
import { checkCredentials as checkCredentialsAction } from 'app/state/authentication/actions';
import { isAndroid, isIos } from 'app/styles';

const i18n = require('../../loc');

interface MapStateToProps {
  isPinSet: boolean;
  isAuthenticated: boolean;
  isTxPasswordSet: boolean;
  isLoading: boolean;
}

interface ActionsDisptach {
  checkCredentials: Function;
}

type Props = MapStateToProps & ActionsDisptach;

interface State {
  isBetaVersionRiskAccepted: boolean;
}

class Navigator extends React.Component<Props, State> {
  state = {
    isBetaVersionRiskAccepted: false,
  };

  async componentDidMount() {
    const { checkCredentials } = this.props;
    checkCredentials();

    if (!__DEV__) {
      checkDeviceSecurity();
    }
  }

  shouldRenderOnBoarding = () => {
    const { isPinSet, isTxPasswordSet } = this.props;

    return !isPinSet || !isTxPasswordSet;
  };

  shouldRenderUnlockScreen = () => {
    const { isPinSet, isTxPasswordSet, isAuthenticated } = this.props;

    if (__DEV__) {
      return false;
    }
    return !isAuthenticated && isTxPasswordSet && isPinSet;
  };

  preventOpenAppWithRootedPhone = () => {
    if (isIos()) {
      return RenderMessage({
        description: i18n.security.jailBrokenPhone,
        title: i18n.security.title,
        type: MessageType.error,
      });
    } else if (isAndroid()) {
      return RenderMessage({
        description: i18n.security.rootedPhone,
        title: i18n.security.title,
        type: MessageType.error,
      });
    }
  };

  handleAcceptBetaVersionRisk = () => {
    this.setState({ isBetaVersionRiskAccepted: true });
  };

  renderRoutes = () => {
    const { isLoading } = this.props;
    if (isLoading) {
      return null;
    }

    if (!__DEV__ && JailMonkey.isJailBroken()) {
      return this.preventOpenAppWithRootedPhone();
    }

    if (!__DEV__ && config.isBeta && !this.state.isBetaVersionRiskAccepted) {
      return <BetaVersionScreen onButtonPress={this.handleAcceptBetaVersionRisk} />;
    }

    if (this.shouldRenderOnBoarding()) {
      return <PasswordNavigator />;
    }

    return (
      <>
        <RootNavigator />
        {this.shouldRenderUnlockScreen() && <UnlockScreen />}
      </>
    );
  };

  render() {
    return <NavigationContainer ref={navigationRef}>{this.renderRoutes()}</NavigationContainer>;
  }
}

const mapStateToProps = (state: ApplicationState): MapStateToProps => ({
  isLoading: selectors.isLoading(state),
  isPinSet: selectors.isPinSet(state),
  isTxPasswordSet: selectors.isTxPasswordSet(state),
  isAuthenticated: selectors.isAuthenticated(state),
});

const mapDispatchToProps: ActionsDisptach = {
  checkCredentials: checkCredentialsAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(Navigator);
