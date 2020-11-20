import AsyncStorage from '@react-native-community/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import JailMonkey from 'jail-monkey';
import React from 'react';
import { isEmulator } from 'react-native-device-info';
import { connect } from 'react-redux';

import { CONST } from 'app/consts';
import { RenderMessage, MessageType } from 'app/helpers/MessageCreator';
import { RootNavigator, PasswordNavigator } from 'app/navigators';
import { TermsConditionsScreen, UnlockScreen } from 'app/screens';
import { BetaVersionScreen } from 'app/screens/BetaVersionScreen';
import { navigationRef, AppStateManager } from 'app/services';
import { checkDeviceSecurity } from 'app/services/DeviceSecurityService';
import { ApplicationState } from 'app/state';
import { selectors as appSettingsSelectors } from 'app/state/appSettings';
import { updateSelectedLanguage as updateSelectedLanguageAction } from 'app/state/appSettings/actions';
import { selectors as authenticationSelectors } from 'app/state/authentication';
import { checkCredentials as checkCredentialsAction, checkTc as checkTcAction } from 'app/state/authentication/actions';
import {
  startListeners,
  StartListenersAction,
  fetchBlockHeight as fetchBlockHeightAction,
  FetchBlockHeightAction,
} from 'app/state/electrumX/actions';
import { RefreshAllWalletsAction, refreshAllWallets as refreshAllWalletsAction } from 'app/state/wallets/actions';
import { isAndroid, isIos } from 'app/styles';

import config from '../../config';

const i18n = require('../../loc');

interface MapStateToProps {
  isPinSet: boolean;
  isTcAccepted: boolean;
  isAuthenticated: boolean;
  isTxPasswordSet: boolean;
  isLoading: boolean;
  language: string;
}

interface ActionsDisptach {
  checkCredentials: Function;
  startElectrumXListeners: () => StartListenersAction;
  refreshAllWallets: () => RefreshAllWalletsAction;
  fetchBlockHeight: () => FetchBlockHeightAction;
  updateSelectedLanguage: Function;
  checkTc: Function;
}

interface OwnProps {
  unlockKey: string;
}

type Props = MapStateToProps & ActionsDisptach & OwnProps;

interface State {
  isBetaVersionRiskAccepted: boolean;
  isEmulator: boolean;
}

class Navigator extends React.Component<Props, State> {
  state = {
    isBetaVersionRiskAccepted: false,
    isEmulator: false,
  };

  componentDidMount() {
    const { checkCredentials, startElectrumXListeners, fetchBlockHeight, checkTc } = this.props;
    checkTc();
    checkCredentials();
    startElectrumXListeners();
    fetchBlockHeight();
    this.initLanguage();

    isEmulator().then(isEmulator => {
      this.setState({
        isEmulator,
      });

      if (!isEmulator && !__DEV__) {
        checkDeviceSecurity();
      }
    });
  }

  initLanguage = async () => {
    const { language, updateSelectedLanguage } = this.props;
    const detectedLanguage = (await AsyncStorage.getItem('lang')) || CONST.defaultLanguage;

    if (language !== detectedLanguage) {
      updateSelectedLanguage(detectedLanguage);
    }
  };

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

  refresh = () => {
    const { refreshAllWallets, fetchBlockHeight } = this.props;
    refreshAllWallets();
    fetchBlockHeight();
  };

  renderRoutes = () => {
    const { isLoading, unlockKey, isTcAccepted } = this.props;
    if (isLoading) {
      return null;
    }

    if (!isTcAccepted) {
      return <TermsConditionsScreen />;
    }

    if (!__DEV__ && JailMonkey.isJailBroken() && !this.state.isEmulator) {
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
        {this.shouldRenderUnlockScreen() && <UnlockScreen key={unlockKey} />}
      </>
    );
  };

  render() {
    return (
      <>
        <AppStateManager handleAppComesToForeground={this.refresh} />
        <NavigationContainer key={this.props.language} ref={navigationRef}>
          {this.renderRoutes()}
        </NavigationContainer>
      </>
    );
  }
}

const mapStateToProps = (state: ApplicationState): MapStateToProps => ({
  isTcAccepted: authenticationSelectors.isTcAccepted(state),
  isLoading: authenticationSelectors.isLoading(state),
  isPinSet: authenticationSelectors.isPinSet(state),
  isTxPasswordSet: authenticationSelectors.isTxPasswordSet(state),
  isAuthenticated: authenticationSelectors.isAuthenticated(state),
  language: appSettingsSelectors.language(state),
});

const mapDispatchToProps: ActionsDisptach = {
  checkCredentials: checkCredentialsAction,
  checkTc: checkTcAction,
  startElectrumXListeners: startListeners,
  refreshAllWallets: refreshAllWalletsAction,
  updateSelectedLanguage: updateSelectedLanguageAction,
  fetchBlockHeight: fetchBlockHeightAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(Navigator);
