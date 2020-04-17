import AsyncStorage from '@react-native-community/async-storage';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationInjectedProps, NavigationScreenProps } from 'react-navigation';

import { ScreenTemplate, Text, InputItem, Header, Button, FlatButton, RadioGroup, RadioButton } from 'app/components';
import { Route, Wallet } from 'app/consts';
import { AppStorage, HDSegwitBech32Wallet, HDSegwitP2SHWallet, SegwitP2SHWallet, BlueApp, EV } from 'app/legacy';
import i18n from 'app/locale';
import { palette, typography } from 'app/styles';

type Props = NavigationInjectedProps;

interface State {
  label: string;
  isLoading: boolean;
  activeBitcoin: boolean;
  isAdvancedOptionsEnabled: boolean;
  walletBaseURI: string;
  selectedIndex: number;
}

export class CreateWalletScreen extends React.PureComponent<Props, State> {
  state: State = {
    label: '',
    isLoading: false,
    activeBitcoin: false,
    isAdvancedOptionsEnabled: false,
    walletBaseURI: '',
    selectedIndex: 0,
  };

  static navigationOptions = (props: NavigationScreenProps) => ({
    header: <Header navigation={props.navigation} isBackArrow title={i18n.wallets.add.title} />,
  });

  async componentDidMount() {
    let walletBaseURI = await AsyncStorage.getItem(AppStorage.LNDHUB);
    const isAdvancedOptionsEnabled = !!(await AsyncStorage.getItem(AppStorage.ADVANCED_MODE_ENABLED));
    walletBaseURI = walletBaseURI || '';

    this.setState({
      isLoading: false,
      activeBitcoin: true,
      label: '',
      isAdvancedOptionsEnabled,
      walletBaseURI,
    });
  }

  onSelect = (selectedIndex: number) =>
    this.setState({
      selectedIndex,
    });

  setLabel = (label: string) => this.setState({ label });

  navigateToImportWallet = () => this.props.navigation.navigate(Route.ImportWallet);

  createWallet = async () => {
    this.setState({ isLoading: true });

    let wallet;
    if (this.state.selectedIndex === 2) {
      // btc was selected
      // index 2 radio - hd bip84
      wallet = new HDSegwitBech32Wallet();
      wallet.setLabel(this.state.label || i18n.wallets.details.title);
    } else if (this.state.selectedIndex === 1) {
      // btc was selected
      // index 1 radio - segwit single address
      wallet = new SegwitP2SHWallet();
      wallet.setLabel(this.state.label || i18n.wallets.details.title);
    } else {
      // zero index radio - HD segwit
      wallet = new HDSegwitP2SHWallet();
      wallet.setLabel(this.state.label || i18n.wallets.details.title);
    }
    if (this.state.activeBitcoin) {
      await wallet.generate();
      BlueApp.wallets.push(wallet);
      await BlueApp.saveToDisk();
      EV(EV.enum.WALLETS_COUNT_CHANGED);
      this.props.navigation.goBack();
      // if (wallet.type === HDSegwitP2SHWallet.type || wallet.type === HDSegwitBech32Wallet.type) {
      //   this.props.navigation.navigate('PleaseBackup', {
      //     secret: wallet.getSecret(),
      //   });
      // }
    }
  };

  get canCreateWallet(): boolean {
    return this.state.activeBitcoin && !!this.state.label && !this.validationError;
  }

  get validationError(): string | undefined {
    const walletLabels = BlueApp.getWallets().map((wallet: Wallet) => wallet.label) || [];
    if (walletLabels.includes(this.state.label)) {
      return 'Name is already in use. Please enter a valid name.';
    }
  }

  renderAdvancedSection() {
    if (this.state.activeBitcoin && this.state.isAdvancedOptionsEnabled) {
      return (
        <>
          <Text style={styles.advancedOptionsLabel}>{i18n.wallets.add.advancedOptions}</Text>
          <RadioGroup color={palette.secondary} onSelect={this.onSelect} selectedIndex={this.state.selectedIndex}>
            <RadioButton style={styles.radioButton} value={HDSegwitP2SHWallet.type}>
              <View style={styles.radioButtonContent}>
                <Text style={styles.radioButtonTitle}>{HDSegwitP2SHWallet.typeReadable}</Text>
                <Text style={styles.radioButtonSubtitle}>{i18n.wallets.add.multipleAddresses}</Text>
              </View>
            </RadioButton>
            <RadioButton style={styles.radioButton} value={SegwitP2SHWallet.type}>
              <View style={styles.radioButtonContent}>
                <Text style={styles.radioButtonTitle}>{SegwitP2SHWallet.typeReadable}</Text>
                <Text style={styles.radioButtonSubtitle}>{i18n.wallets.add.singleAddress}</Text>
              </View>
            </RadioButton>
            <RadioButton style={styles.radioButton} value={HDSegwitBech32Wallet.type}>
              <View style={styles.radioButtonContent}>
                <Text style={styles.radioButtonTitle}>{HDSegwitBech32Wallet.typeReadable}</Text>
                <Text style={styles.radioButtonSubtitle}>{i18n.wallets.add.multipleAddresses}</Text>
              </View>
            </RadioButton>
          </RadioGroup>
        </>
      );
    }
  }

  render() {
    return (
      <ScreenTemplate
        footer={
          <>
            <Button
              disabled={!this.canCreateWallet}
              loading={this.state.isLoading}
              onPress={this.createWallet}
              title={i18n.wallets.add.addWalletButton}
            />
            <FlatButton
              onPress={this.navigateToImportWallet}
              containerStyle={styles.importButtonContainer}
              title={i18n.wallets.add.importWalletButton}
            />
          </>
        }>
        <Text style={styles.subtitle}>{i18n.wallets.add.subtitle}</Text>
        <Text style={styles.description}>{i18n.wallets.add.description}</Text>
        <InputItem error={this.validationError} setValue={this.setLabel} label={i18n.wallets.add.inputLabel} />
        {this.renderAdvancedSection()}
      </ScreenTemplate>
    );
  }
}

export default CreateWalletScreen;

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
  },
  importButtonContainer: {
    marginTop: 12,
  },
});
