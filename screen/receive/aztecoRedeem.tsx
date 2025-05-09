import React, { Component } from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Icon } from '@rneui/themed';
import { I18nManager, Keyboard, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { BlueLoading, BlueSpacing, BlueText } from '../../BlueComponents';
import Azteco from '../../class/azteco';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import { StorageContext } from '../../components/Context/StorageProvider';
import loc from '../../loc';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { TWallet } from '../../class/wallets/types';

interface AztecoRedeemProps {
  navigation: NativeStackNavigationProp<DetailViewStackParamList, 'AztecoRedeemRoot'>;
  route: {
    params: {
      c1: string;
      c2: string;
      c3: string;
      c4: string;
    };
  };
}

interface AztecoRedeemState {
  isLoading: boolean;
  c1: string;
  c2: string;
  c3: string;
  c4: string;
  toWallet: TWallet | null;
  renderWalletSelectionButtonHidden: boolean;
}

export default class AztecoRedeem extends Component<AztecoRedeemProps, AztecoRedeemState> {
  static contextType = StorageContext;
  declare context: React.ContextType<typeof StorageContext>;

  constructor(props: AztecoRedeemProps) {
    super(props);

    let toWallet: TWallet | null = null;

    const wallets = this.context.wallets;

    if (wallets.length === 0) {
      presentAlert({ message: loc.azteco.errorBeforeRefeem });
      props.navigation.goBack();
    } else {
      if (wallets.length > 0) {
        toWallet = wallets[0];
      }
      this.state = {
        c1: props.route.params.c1,
        c2: props.route.params.c2,
        c3: props.route.params.c3,
        c4: props.route.params.c4,
        isLoading: false,
        toWallet,
        renderWalletSelectionButtonHidden: false,
      };
    }
  }

  async componentDidMount(): Promise<void> {
    console.log('AztecoRedeem - componentDidMount');
  }

  onWalletSelect = (toWallet: TWallet): void => {
    this.setState({ toWallet }, () => {
      this.props.navigation.pop();
    });
  };

  redeem = async (): Promise<void> => {
    this.setState({ isLoading: true });
    if (!this.state.toWallet) {
      presentAlert({ message: loc.azteco.errorSomething });
      this.setState({ isLoading: false });
      return;
    }
    const address = await this.state.toWallet.getAddressAsync();
    if (!address) {
      this.props.navigation.pop();
      presentAlert({ message: loc.receive.address_not_found });
      return;
    }
    const result = await Azteco.redeem([this.state.c1, this.state.c2, this.state.c3, this.state.c4], address);
    if (!result) {
      presentAlert({ message: loc.azteco.errorSomething });
      this.setState({ isLoading: false });
    } else {
      this.props.navigation.pop();
      // remote because we want to refetch from server tx list and balance
      presentAlert({ message: loc.azteco.success });
    }
  };

  renderWalletSelectionButton = (): JSX.Element | null => {
    if (this.state.renderWalletSelectionButtonHidden) return null;
    return (
      <View style={styles.selectWallet1}>
        {!this.state.isLoading && (
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.selectTouch}
            onPress={() =>
              this.props.navigation.navigate('SelectWallet', {
                onWalletSelect: this.onWalletSelect,
                availableWallets: this.context.wallets,
              })
            }
          >
            <Text style={styles.selectText}>{loc.azteco.redeem}</Text>
            <Icon name={I18nManager.isRTL ? 'angle-left' : 'angle-right'} size={18} type="font-awesome" color="#9aa0aa" />
          </TouchableOpacity>
        )}
        <View style={styles.selectWallet2}>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.selectTouch}
            onPress={() =>
              this.props.navigation.navigate('SelectWallet', {
                onWalletSelect: this.onWalletSelect,
                availableWallets: this.context.wallets,
              })
            }
          >
            <Text style={styles.selectWalletLabel}>{this.state.toWallet?.getLabel()}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  render(): JSX.Element {
    if (this.state.isLoading || typeof this.state.toWallet === 'undefined') {
      return (
        <View style={styles.loading}>
          <BlueLoading />
        </View>
      );
    }

    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View>
          <View style={styles.root}>
            <Text>{loc.azteco.codeIs}</Text>
            <BlueText style={styles.code}>
              {this.state.c1}-{this.state.c2}-{this.state.c3}-{this.state.c4}
            </BlueText>
            {this.renderWalletSelectionButton()}
            <Button onPress={this.redeem} title={loc.azteco.redeemButton} />
            <BlueSpacing />
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    paddingTop: 20,
  },
  root: {
    alignItems: 'center',
    alignContent: 'flex-end',
    marginTop: 66,
  },
  code: {
    color: '#0c2550',
    fontSize: 20,
    marginTop: 20,
    marginBottom: 90,
  },
  selectWallet1: {
    marginBottom: 24,
    alignItems: 'center',
  },
  selectTouch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectText: {
    color: '#9aa0aa',
    fontSize: 14,
    marginRight: 8,
  },
  selectWallet2: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  selectWalletLabel: {
    color: '#0c2550',
    fontSize: 14,
  },
});
