import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationInjectedProps } from 'react-navigation';

import { ScreenTemplate, Text, Header, Button, RadioGroup, RadioButton } from 'app/components';
import { Route } from 'app/consts';
import { HDSegwitP2SHArWallet, HDSegwitP2SHAirWallet } from 'app/legacy';
import { AppSettingsState } from 'app/state/appSettings/reducer';
import { WalletsActionType } from 'app/state/wallets/actions';
import { palette, typography } from 'app/styles';

const i18n = require('../../loc');

const WalletTypes = [HDSegwitP2SHArWallet.type, HDSegwitP2SHAirWallet.type, 'legacy'];

interface Props extends NavigationInjectedProps {
  appSettings: AppSettingsState;
  loadWallets: () => Promise<WalletsActionType>;
}

interface State {
  label: string;
  isLoading: boolean;
  selectedIndex: number;
}

export class ImportWalletChooseTypeScreen extends React.PureComponent<Props, State> {
  state: State = {
    label: '',
    isLoading: false,
    selectedIndex: 0,
  };

  navigateToImportWallet = () => {
    this.props.navigation.navigate(Route.ImportWallet, {
      walletType: WalletTypes[this.state.selectedIndex],
    });
  };

  onSelect = (selectedIndex: number) =>
    this.setState({
      selectedIndex,
    });

  render() {
    return (
      <ScreenTemplate
        footer={
          <>
            {this.state.isLoading && (
              <Text style={styles.isLoadingDescription}>{i18n.message.creatingWalletDescription}</Text>
            )}
            <Button loading={this.state.isLoading} onPress={this.navigateToImportWallet} title={i18n._.next} />
          </>
        }
        // @ts-ignore
        header={<Header navigation={this.props.navigation} isBackArrow title={i18n.wallets.importWallet.header} />}
      >
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{i18n.wallets.importWallet.title}</Text>
          <Text style={styles.subtitle}>{i18n.wallets.importWallet.chooseTypeDescription}</Text>
        </View>
        <RadioGroup color={palette.secondary} onSelect={this.onSelect} selectedIndex={this.state.selectedIndex}>
          <RadioButton style={styles.radioButton} value={WalletTypes[0]}>
            <View style={styles.radioButtonContent}>
              <Text style={styles.radioButtonTitle}>{HDSegwitP2SHArWallet.typeReadable}</Text>
              <Text style={styles.radioButtonSubtitle}>{i18n.wallets.add.ar}</Text>
            </View>
          </RadioButton>
          <RadioButton style={styles.radioButton} value={WalletTypes[1]}>
            <View style={styles.radioButtonContent}>
              <Text style={styles.radioButtonTitle}>{HDSegwitP2SHAirWallet.typeReadable}</Text>
              <Text style={styles.radioButtonSubtitle}>{i18n.wallets.add.air}</Text>
            </View>
          </RadioButton>
          <RadioButton style={styles.radioButton} value={WalletTypes[2]}>
            <View style={styles.radioButtonContent}>
              <Text style={styles.radioButtonTitle}>{i18n.wallets.add.legacyTitle}</Text>
              <Text style={styles.radioButtonSubtitle}>{i18n.wallets.add.legacy}</Text>
            </View>
          </RadioButton>
        </RadioGroup>
      </ScreenTemplate>
    );
  }
}

const styles = StyleSheet.create({
  subtitle: {
    ...typography.caption,
    color: palette.textGrey,
    paddingTop: 18,
    textAlign: 'center',
  },
  title: {
    ...typography.headline4,
    textAlign: 'center',
  },
  titleContainer: {
    marginBottom: 50,
  },
  isLoadingDescription: {
    ...typography.caption,
    color: palette.textGrey,
    textAlign: 'center',
    lineHeight: 19,
    flexGrow: 1,
    marginVertical: 10,
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
});
