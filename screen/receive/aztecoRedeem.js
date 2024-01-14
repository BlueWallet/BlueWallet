import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Keyboard, Text, TouchableOpacity, TouchableWithoutFeedback, View, StyleSheet, I18nManager } from 'react-native';
import { Icon } from 'react-native-elements';

import { BlueLoading, BlueSpacing, BlueText } from '../../BlueComponents';
import { navigationStyleTx } from '../../components/navigationStyle';
import loc from '../../loc';
import Azteco from '../../class/azteco';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import alert from '../../components/Alert';
import Button from '../../components/Button';

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
  static contextType = BlueStorageContext;
  state = { isLoading: true };

  constructor(props, context) {
    super(props);

    /** @type {AbstractWallet} */
    let toWallet = null;

    const wallets = context.wallets;

    if (wallets.length === 0) {
      alert(loc.azteco.errorBeforeRefeem);
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
      alert(loc.azteco.errorSomething);
      this.setState({ isLoading: false });
    } else {
      this.props.navigation.pop();
      // remote because we want to refetch from server tx list and balance
      alert(loc.azteco.success);
    }
  };

  renderWalletSelectionButton = () => {
    if (this.state.renderWalletSelectionButtonHidden) return;
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
                availableWallets: this.context.wallet,
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

AztecoRedeem.navigationOptions = navigationStyleTx({}, opts => ({ ...opts, title: loc.azteco.title, statusBarStyle: 'auto' }));
