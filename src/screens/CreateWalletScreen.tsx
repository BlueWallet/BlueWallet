import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { connect } from 'react-redux';

import { ScreenTemplate, Text, InputItem, Header, Button, FlatButton, RadioGroup, RadioButton } from 'app/components';
import { Route, Wallet, MainCardStackNavigatorParams, ActionMeta, CONST } from 'app/consts';
import { maxWalletNameLength } from 'app/consts/text';
import { CreateMessage, MessageType } from 'app/helpers/MessageCreator';
import {
  HDSegwitBech32Wallet,
  HDSegwitP2SHWallet,
  SegwitP2SHWallet,
  HDSegwitP2SHArWallet,
  HDSegwitP2SHAirWallet,
} from 'app/legacy';
import { ApplicationState } from 'app/state';
import { AppSettingsState } from 'app/state/appSettings/reducer';
import { selectors } from 'app/state/wallets';
import { createWallet as createWalletAction, CreateWalletAction } from 'app/state/wallets/actions';
import { palette, typography } from 'app/styles';

const i18n = require('../../loc');

interface Props {
  navigation: StackNavigationProp<MainCardStackNavigatorParams, Route.CreateWallet>;
  route: RouteProp<MainCardStackNavigatorParams, Route.CreateWallet>;
  appSettings: AppSettingsState;
  createWallet: (wallet: Wallet, meta?: ActionMeta) => CreateWalletAction;
  walletsLabels: string[];
}
interface State {
  label: string;
  selectedIndex: number;
}

export class CreateWalletScreen extends React.PureComponent<Props, State> {
  state: State = {
    label: '',
    selectedIndex: 0,
  };

  onSelect = (selectedIndex: number) =>
    this.setState({
      selectedIndex,
    });

  setLabel = (label: string) => this.setState({ label: label.trim() });

  navigateToImportWallet = () => this.props.navigation.navigate(Route.ImportWalletChooseType);

  getWalletClassByIndex = (index: number) => {
    switch (index) {
      case 0:
        return HDSegwitP2SHArWallet;
      case 1:
        return HDSegwitP2SHAirWallet;
      case 3:
        return SegwitP2SHWallet;
      case 4:
        return HDSegwitBech32Wallet;
      case 2:
      default:
        return HDSegwitP2SHWallet;
    }
  };

  createARWallet = (recoveryPublicKey: string) => {
    const { navigation } = this.props;

    const onError = () => this.showAlert(() => this.navigateToIntegrateRecoveryPublicKeyForAR());
    try {
      const wallet = new HDSegwitP2SHArWallet([recoveryPublicKey]);
      navigation.goBack();
      this.createWalletMessage(wallet, onError);
    } catch (_) {
      onError();
    }
  };

  showAlert = (onPress: Function, error?: string) => {
    Alert.alert('Error', error || i18n.wallets.add.publicKeyError, [
      {
        text: 'OK',
        onPress: () => onPress(),
      },
    ]);
  };

  generateWallet = (wallet: Wallet, onError: Function) => {
    const { label } = this.state;
    const { navigation, createWallet } = this.props;
    wallet.setLabel(label || i18n.wallets.details.title);
    createWallet(wallet, {
      onSuccess: (w: Wallet) => {
        navigation.navigate(Route.CreateWalletSuccess, {
          secret: w.getSecret(),
        });
      },
      onFailure: () => onError(),
    });
  };

  createWalletMessage = (wallet: any, onError: Function) => {
    CreateMessage({
      title: i18n.message.creatingWallet,
      description: i18n.message.creatingWalletDescription,
      type: MessageType.processingState,
      asyncTask: () => this.generateWallet(wallet, onError),
    });
  };

  createAIRWalletAddRecoveryPublicKey = (wallet: HDSegwitP2SHAirWallet) => (recoveryPublicKey: string) => {
    const { navigation } = this.props;
    const onError = (error: string) =>
      this.showAlert(() => {
        this.navigateToIntegrateRecoveryPublicKeyForAIR(wallet);
      }, error);
    try {
      wallet.addPublicKey(recoveryPublicKey);
      navigation.goBack();
      this.createWalletMessage(wallet, onError);
    } catch (e) {
      onError(e.message);
    }
  };

  navigateToIntegrateRecoveryPublicKeyForAIR = (wallet: HDSegwitP2SHAirWallet) => {
    const { navigation } = this.props;
    navigation.navigate(Route.IntegrateKey, {
      onBarCodeScan: this.createAIRWalletAddRecoveryPublicKey(wallet),

      headerTitle: i18n.wallets.add.title,
      title: i18n.wallets.publicKey.recoverySubtitle,
      description: i18n.wallets.publicKey.recoveryDescription,
      onBackArrow: () => {
        this.navigateToIntegrateInstantPublicKeyForAIR();
      },
    });
  };

  navigateToIntegrateRecoveryPublicKeyForAR = () => {
    const { navigation } = this.props;
    navigation.navigate(Route.IntegrateKey, {
      onBarCodeScan: recoveryPublicKey => this.createARWallet(recoveryPublicKey),
      headerTitle: i18n.wallets.add.title,
      title: i18n.wallets.publicKey.recoverySubtitle,
      description: i18n.wallets.publicKey.recoveryDescription,
      onBackArrow: () => {
        navigation.navigate(Route.CreateWallet);
      },
    });
  };

  navigateToIntegrateInstantPublicKeyForAIR = () => {
    const { navigation } = this.props;
    const wallet = new HDSegwitP2SHAirWallet();
    navigation.navigate(Route.IntegrateKey, {
      onBarCodeScan: instantPublicKey => {
        try {
          wallet.addPublicKey(instantPublicKey);
          this.navigateToIntegrateRecoveryPublicKeyForAIR(wallet);
        } catch (e) {
          this.showAlert(() => this.navigateToIntegrateInstantPublicKeyForAIR(), e.message);
        }
      },
      title: i18n.wallets.publicKey.instantSubtitle,
      headerTitle: i18n.wallets.add.title,
      description: i18n.wallets.publicKey.instantDescription,
      onBackArrow: () => {
        navigation.navigate(Route.CreateWallet);
      },
    });
  };

  setupWallet = () => {
    const { selectedIndex } = this.state;
    if (selectedIndex === 0) {
      return this.navigateToIntegrateRecoveryPublicKeyForAR();
    }
    if (selectedIndex === 1) {
      return this.navigateToIntegrateInstantPublicKeyForAIR();
    }
    this.createWallet();
  };

  createWallet = async () => {
    const { navigation } = this.props;
    const { selectedIndex } = this.state;
    const WalletClass = this.getWalletClassByIndex(selectedIndex);

    const wallet = new WalletClass();

    const onError = () =>
      this.showAlert(() => {
        navigation.navigate(Route.CreateWallet);
      }, i18n.wallets.add.failed);
    this.createWalletMessage(wallet, onError);
  };

  get canCreateWallet(): boolean {
    return !!this.state.label && !this.validationError;
  }

  get validationError(): string | undefined {
    const { walletsLabels } = this.props;
    if (walletsLabels.includes(this.state.label.trim())) {
      return i18n.wallets.importWallet.walletInUseValidationError;
    }
    if (
      this.state.label.toLowerCase() === i18n.wallets.dashboard.allWallets.toLowerCase() ||
      this.state.label === CONST.allWallets
    ) {
      return i18n.wallets.importWallet.allWalletsValidationError;
    }
  }

  renderAdvancedSection() {
    const { isAdvancedOptionsEnabled } = this.props.appSettings;

    return (
      <>
        <Text style={styles.advancedOptionsLabel}>{i18n.wallets.add.walletType}</Text>
        {!isAdvancedOptionsEnabled ? (
          <RadioGroup color={palette.secondary} onSelect={this.onSelect} selectedIndex={this.state.selectedIndex}>
            <RadioButton style={styles.radioButton} value={HDSegwitP2SHArWallet.type}>
              <View style={styles.radioButtonContent}>
                <Text style={styles.radioButtonTitle}>{HDSegwitP2SHArWallet.typeReadable}</Text>
                <Text style={styles.radioButtonSubtitle}>{i18n.wallets.add.ar}</Text>
              </View>
            </RadioButton>
            <RadioButton style={styles.radioButton} value={HDSegwitP2SHAirWallet.type}>
              <View style={styles.radioButtonContent}>
                <Text style={styles.radioButtonTitle}>{HDSegwitP2SHAirWallet.typeReadable}</Text>
                <Text style={styles.radioButtonSubtitle}>{i18n.wallets.add.air}</Text>
              </View>
            </RadioButton>
            <RadioButton style={styles.radioButton} value={HDSegwitP2SHWallet.type}>
              <View style={styles.radioButtonContent}>
                <Text style={styles.radioButtonTitle}>{i18n.wallets.add.legacyTitle}</Text>
                <Text style={styles.radioButtonSubtitle}>{i18n.wallets.add.legacy}</Text>
              </View>
            </RadioButton>
          </RadioGroup>
        ) : (
          <RadioGroup color={palette.secondary} onSelect={this.onSelect} selectedIndex={this.state.selectedIndex}>
            <RadioButton style={styles.radioButton} value={HDSegwitP2SHArWallet.type}>
              <View style={styles.radioButtonContent}>
                <Text style={styles.radioButtonTitle}>{HDSegwitP2SHArWallet.typeReadable}</Text>
                <Text style={styles.radioButtonSubtitle}>{i18n.wallets.add.ar}</Text>
              </View>
            </RadioButton>
            <RadioButton style={styles.radioButton} value={HDSegwitP2SHAirWallet.type}>
              <View style={styles.radioButtonContent}>
                <Text style={styles.radioButtonTitle}>{HDSegwitP2SHAirWallet.typeReadable}</Text>
                <Text style={styles.radioButtonSubtitle}>{i18n.wallets.add.air}</Text>
              </View>
            </RadioButton>
            <RadioButton style={styles.radioButton} value={HDSegwitP2SHWallet.type}>
              <View style={styles.radioButtonContent}>
                <Text style={styles.radioButtonTitle}>{i18n.wallets.add.legacyHDP2SHTitle}</Text>
                <Text style={styles.radioButtonSubtitle}>{i18n.wallets.add.legacyHDP2SH}</Text>
              </View>
            </RadioButton>
            <RadioButton style={styles.radioButton} value={SegwitP2SHWallet.type}>
              <View style={styles.radioButtonContent}>
                <Text style={styles.radioButtonTitle}>{i18n.wallets.add.legacyP2SHTitle}</Text>
                <Text style={styles.radioButtonSubtitle}>{i18n.wallets.add.LegacyP2SH}</Text>
              </View>
            </RadioButton>
            <RadioButton style={styles.radioButton} value={HDSegwitBech32Wallet.type}>
              <View style={styles.radioButtonContent}>
                <Text style={styles.radioButtonTitle}>{i18n.wallets.add.legacyHDSegWitTitle}</Text>
                <Text style={styles.radioButtonSubtitle}>{i18n.wallets.add.LegacyHDSegWit}</Text>
              </View>
            </RadioButton>
          </RadioGroup>
        )}
      </>
    );
  }

  render() {
    return (
      <ScreenTemplate
        footer={
          <>
            <Button
              disabled={!this.canCreateWallet}
              onPress={this.setupWallet}
              title={i18n.wallets.add.addWalletButton}
            />
            <FlatButton
              onPress={this.navigateToImportWallet}
              containerStyle={styles.importButtonContainer}
              title={i18n.wallets.add.importWalletButton}
            />
          </>
        }
        // @ts-ignore
        header={<Header navigation={this.props.navigation} isBackArrow title={i18n.wallets.add.title} />}
      >
        <Text style={styles.subtitle}>{i18n.wallets.add.subtitle}</Text>
        <Text style={styles.description}>{i18n.wallets.add.description}</Text>
        <InputItem
          error={this.validationError}
          setValue={this.setLabel}
          label={i18n.wallets.add.inputLabel}
          maxLength={maxWalletNameLength}
        />
        {this.renderAdvancedSection()}
      </ScreenTemplate>
    );
  }
}

const mapStateToProps = (state: ApplicationState) => ({
  appSettings: state.appSettings,
  walletsLabels: selectors.getWalletsLabels(state),
});

const mapDispatchToProps = {
  createWallet: createWalletAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(CreateWalletScreen);

const styles = StyleSheet.create({
  subtitle: {
    marginTop: 12,
    marginBottom: 18,
    ...typography.headline4,
    textAlign: 'center',
  },
  description: {
    marginBottom: 52,
    color: palette.textGrey,
    ...typography.caption,
    textAlign: 'center',
  },
  advancedOptionsLabel: {
    color: palette.textGrey,
    marginBottom: 12,
  },
  radioButton: {
    paddingStart: 0,
    paddingVertical: 8,
  },
  radioButtonContent: {
    paddingStart: 10,
    top: -3,
  },
  radioButtonTitle: {
    ...typography.caption,
    marginBottom: 2,
  },
  radioButtonSubtitle: {
    ...typography.overline,
    color: palette.textGrey,
    fontSize: 13,
  },
  importButtonContainer: {
    marginTop: 12,
  },
});
