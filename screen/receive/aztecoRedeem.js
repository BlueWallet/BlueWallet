/* global alert */
import React, { Component } from 'react';
import { Keyboard, Text, TouchableOpacity, TouchableWithoutFeedback, View, StyleSheet } from 'react-native';
import { Icon } from 'react-native-elements';
import { BlueButton, BlueCreateTxNavigationStyle, BlueLoading, BlueSpacing, BlueText } from '../../BlueComponents';
import PropTypes from 'prop-types';
import { AppStorage, PlaceholderWallet } from '../../class';
import Azteco from '../../class/azteco';

const EV = require('../../events');
let BlueApp: AppStorage = require('../../BlueApp');

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

export default class AztecoRedeem extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueCreateTxNavigationStyle(navigation),
    title: 'Redeem Azte.co voucher',
  });

  state = { isLoading: true };

  constructor(props) {
    super(props);

    /** @type {AbstractWallet} */
    let toWallet = null;

    const wallets = BlueApp.getWallets().filter(wallet => wallet.type !== PlaceholderWallet.type);

    if (wallets.length === 0) {
      alert('Before redeeming you must first add a Bitcoin wallet.');
      return props.navigation.goBack(null);
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

  async componentDidMount() {
    console.log('AztecoRedeem - componentDidMount');
  }

  onWalletSelect = toWallet => {
    this.setState({ toWallet }, () => {
      this.props.navigation.pop();
    });
  };

  redeem = async () => {
    this.setState({ isLoading: true });
    const address = await this.state.toWallet.getAddressAsync();
    const result = await Azteco.redeem([this.state.c1, this.state.c2, this.state.c3, this.state.c4], address);
    if (!result) {
      alert('Something went wrong. Is this voucher still valid?');
      this.setState({ isLoading: false });
    } else {
      this.props.navigation.pop();
      // remote because we want to refetch from server tx list and balance
      setTimeout(() => EV(EV.enum.REMOTE_TRANSACTIONS_COUNT_CHANGED), 4000);
      alert('Success');
    }
  };

  renderWalletSelectionButton = () => {
    if (this.state.renderWalletSelectionButtonHidden) return;
    return (
      <View style={styles.selectWallet1}>
        {!this.state.isLoading && (
          <TouchableOpacity
            style={styles.selectTouch}
            onPress={() =>
              this.props.navigation.navigate('SelectWallet', {
                onWalletSelect: this.onWalletSelect,
                availableWallets: BlueApp.getWallets(),
              })
            }
          >
            <Text style={styles.selectText}>Redeem to wallet</Text>
            <Icon name="angle-right" size={18} type="font-awesome" color="#9aa0aa" />
          </TouchableOpacity>
        )}
        <View style={styles.selectWallet2}>
          <TouchableOpacity
            style={styles.selectTouch}
            onPress={() =>
              this.props.navigation.navigate('SelectWallet', {
                onWalletSelect: this.onWalletSelect,
                availableWallets: BlueApp.getWallets(),
              })
            }
          >
            <Text style={styles.selectWalletLabel}>{this.state.toWallet.getLabel()}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  render() {
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
            <Text>Your voucher code is</Text>
            <BlueText style={styles.code}>
              {this.state.c1}-{this.state.c2}-{this.state.c3}-{this.state.c4}
            </BlueText>
            {this.renderWalletSelectionButton()}
            <BlueButton onPress={this.redeem} title={'Redeem'} />
            <BlueSpacing />
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

AztecoRedeem.propTypes = {
  navigation: PropTypes.shape({
    pop: PropTypes.func,
    goBack: PropTypes.func,
    navigate: PropTypes.func,
  }),
  route: PropTypes.shape({
    params: PropTypes.shape({
      c1: PropTypes.string,
      c2: PropTypes.string,
      c3: PropTypes.string,
      c4: PropTypes.string,
    }),
  }),
};
