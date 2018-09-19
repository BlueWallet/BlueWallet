/* global alert */
import { SegwitP2SHWallet } from '../../class';
import React, { Component } from 'react';
import { ActivityIndicator, Dimensions, View } from 'react-native';
import {
  BlueTextCentered,
  BlueText,
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
import { RadioGroup, RadioButton } from 'react-native-flexi-radio-button';

import PropTypes from 'prop-types';
import { HDSegwitP2SHWallet } from '../../class/hd-segwit-p2sh-wallet';
import { LightningCustodianWallet } from '../../class/lightning-custodian-wallet';
let EV = require('../../events');
let A = require('../../analytics');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
const { width } = Dimensions.get('window');

export default class WalletsAdd extends Component {
  static navigationOptions = {
    header: ({ navigation }) => {
      return <BlueHeaderDefaultSub leftText={loc.wallets.add.title} onClose={() => navigation.goBack(null)} />;
    },
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

  onSelect(index, value) {
    this.setState({
      selectedIndex: index,
      selectedValue: value,
    });
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

          <View>
            {(() => {
              if (this.state.activeBitcoin) {
                return (
                  <View
                    style={{
                      width: 200,
                      height: 100,
                      left: 10,
                    }}
                  >
                    <RadioGroup onSelect={(index, value) => this.onSelect(index, value)} selectedIndex={0}>
                      <RadioButton value={new HDSegwitP2SHWallet().type}>
                        <BlueText>{new HDSegwitP2SHWallet().getTypeReadable()}</BlueText>
                      </RadioButton>
                      <RadioButton value={new SegwitP2SHWallet().type}>
                        <BlueText>{new SegwitP2SHWallet().getTypeReadable()}</BlueText>
                      </RadioButton>
                    </RadioGroup>
                  </View>
                );
              }
            })()}
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
                this.props.navigation.goBack();
                setTimeout(async () => {
                  let w;

                  if (this.state.activeLightning) {
                    // lightning was selected

                    return alert('Coming soon');
                    // eslint-disable-next-line
                    for (let t of BlueApp.getWallets()) {
                      if (t.type === new LightningCustodianWallet().type) {
                        // already exist
                        return alert('Only 1 Ligthning wallet allowed for now');
                      }
                    }

                    w = new LightningCustodianWallet();
                    w.setLabel(this.state.label || w.getTypeReadable());
                    await w.createAccount();
                    await w.authorize();
                    A(A.ENUM.CREATED_LIGHTNING_WALLET);
                  } else if (this.state.selectedIndex === 1) {
                    // btc was selected
                    // index 1 radio - segwit single address
                    w = new SegwitP2SHWallet();
                    w.setLabel(this.state.label || loc.wallets.add.label_new_segwit);
                  } else {
                    // zero index radio - HD segwit
                    w = new HDSegwitP2SHWallet();
                    w.setLabel((this.state.label || loc.wallets.add.label_new_segwit) + ' HD');
                  }
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
