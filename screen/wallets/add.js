/* global alert */
import { SegwitP2SHWallet } from '../../class';
import React, { Component } from 'react';
import { ActivityIndicator, Dimensions, View } from 'react-native';
import {
  BlueTextCentered,
  LightningButton,
  BitcoinButton,
  BlueButtonLink,
  BlueFormLabel,
  BlueFormInput,
  BlueSpacingVariable,
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueHeaderDefaultSub,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
let EV = require('../../events');
let A = require('../../analytics');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
const { width } = Dimensions.get('window');

export default class WalletsAdd extends Component {
  static navigationOptions = {
    tabBarVisible: false,
  };

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
    };
  }

  async componentDidMount() {
    this.setState({
      isLoading: false,
      activeBitcoin: true,
      label: '',
    });
  }

  setLabel(text) {
    this.setState({
      label: text,
    }); /* also, a hack to make screen update new typed text */
  }

  render() {
    if (this.state.isLoading) {
      return (
        <View style={{ flex: 1, paddingTop: 20 }}>
          <ActivityIndicator />
        </View>
      );
    }

    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1, paddingTop: 40 }}>
        <BlueSpacingVariable />
        <BlueHeaderDefaultSub leftText={loc.wallets.add.title} onClose={() => this.props.navigation.goBack()} />

        <BlueCard>
          <BlueFormLabel>{loc.wallets.add.wallet_name}</BlueFormLabel>
          <BlueFormInput
            value={this.state.label}
            placeholder={loc.wallets.add.label_new_segwit}
            onChangeText={text => {
              this.setLabel(text);
            }}
          />

          <BlueFormLabel>{loc.wallets.add.wallet_type}</BlueFormLabel>

          <View style={{ flexDirection: 'row', paddingTop: 10, paddingLeft: 20, width: width - 80, borderColor: 'red', borderWidth: 0 }}>
            <View style={{ width: (width - 60) / 3, height: (width - 60) / 3, backgroundColor: 'transparent' }}>
              <BitcoinButton
                active={this.state.activeBitcoin}
                onPress={() => {
                  this.setState({
                    activeBitcoin: true,
                    activeLightning: false,
                  });
                }}
                style={{
                  width: (width - 60) / 3,
                  height: (width - 60) / 3,
                }}
                title={loc.wallets.add.create}
              />
            </View>
            <View style={{ top: 40, width: (width - 185) / 3, height: 50, borderColor: 'red', borderWidth: 0 }}>
              <BlueTextCentered style={{ textAlign: 'center' }}>{loc.wallets.add.or}</BlueTextCentered>
            </View>
            <View style={{ width: (width - 60) / 3, height: (width - 60) / 3, position: 'absolute', top: 10, right: 0 }}>
              <LightningButton
                active={this.state.activeLightning}
                onPress={() => {
                  this.setState({
                    activeBitcoin: false,
                    activeLightning: true,
                  });
                }}
                style={{
                  width: (width - 60) / 3,
                  height: (width - 60) / 3,
                }}
                title={loc.wallets.add.create}
              />
            </View>
          </View>

          <View
            style={{
              alignItems: 'center',
            }}
          >
            <BlueButton
              title={loc.wallets.add.create}
              buttonStyle={{
                width: width / 1.5,
              }}
              onPress={() => {
                if (this.state.activeLightning) {
                  return alert('Coming soon');
                }

                this.props.navigation.goBack();
                setTimeout(async () => {
                  let w = new SegwitP2SHWallet();
                  w.setLabel(this.state.label || loc.wallets.add.label_new_segwit);
                  w.generate();
                  BlueApp.wallets.push(w);
                  await BlueApp.saveToDisk();
                  EV(EV.enum.WALLETS_COUNT_CHANGED);
                  A(A.ENUM.CREATED_WALLET);
                }, 1);
              }}
            />

            <BlueButtonLink
              title={loc.wallets.add.import_wallet}
              onPress={() => {
                this.props.navigation.navigate('ImportWallet');
              }}
            />
          </View>
        </BlueCard>
      </SafeBlueArea>
    );
  }
}

WalletsAdd.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};
