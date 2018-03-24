import React, { Component } from 'react';
import { ScrollView, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  BlueLoading,
  BlueSpacing20,
  SafeBlueArea,
  BlueCard,
  BlueText,
  BlueButton,
  BlueHeader,
} from '../BlueComponents';
import PropTypes from 'prop-types';
import { SegwitP2SHWallet, LegacyWallet } from '../class';
let BlueApp = require('../BlueApp');
let BigNumber = require('bignumber.js');

export default class Selftest extends Component {
  static navigationOptions = {
    tabBarLabel: 'Self test',
    tabBarIcon: ({ tintColor, focused }) => (
      <Ionicons
        name={focused ? 'ios-settings' : 'ios-settings-outline'}
        size={26}
        style={{ color: tintColor }}
      />
    ),
  };

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
    };
  }

  async componentDidMount() {
    let errorMessage = '';
    let isOk = true;

    let uniqs = {};
    let w = new SegwitP2SHWallet();
    for (let c = 0; c < 1000; c++) {
      w.generate();
      if (uniqs[w.getSecret()]) {
        errorMessage += 'failed to generate unique private key; ';
        isOk = false;
        break;
      }
      uniqs[w.getSecret()] = 1;
    }

    //

    let l = new LegacyWallet();
    l.setSecret('Kxr9tQED9H44gCmp6HAdmemAzU3n84H3dGkuWTKvE23JgHMW8gct');
    if (l.getAddress() !== '19AAjaTUbRjQCMuVczepkoPswiZRhjtg31') {
      errorMessage += 'failed to generate legacy address from WIF; ';
      isOk = false;
    }

    //

    l = new SegwitP2SHWallet();
    l.setSecret('Kxr9tQED9H44gCmp6HAdmemAzU3n84H3dGkuWTKvE23JgHMW8gct');
    if (l.getAddress() !== '34AgLJhwXrvmkZS1o5TrcdeevMt22Nar53') {
      errorMessage += 'failed to generate segwit P2SH address from WIF; ';
      isOk = false;
    }

    //

    let utxo = [
      {
        tx_hash:
          '0f5eea78fb19e72b55bd119252ff29fc16c503d0e956a9c1b5b2ab0e95e0c323',
        block_height: 514991,
        tx_input_n: -1,
        tx_output_n: 2,
        value: 546,
        ref_balance: 546,
        spent: false,
        confirmations: 9,
        confirmed: '2018-03-24T18:13:36Z',
        double_spend: false,
      },
    ];

    let tx = l.createTx(
      utxo,
      0.001,
      0.0001,
      '1QHf8Gp3wfmFiSdEX4FtrssCGR68diN1cj',
    );
    let bitcoin = require('bitcoinjs-lib');
    let txDecoded = bitcoin.Transaction.fromHex(tx);
    let txid = txDecoded.getId();

    if (
      txid !==
      '110f51d28d585e922adbf701cba802e549b8fe3a53fa5d62426ab42549c9b6de'
    ) {
      errorMessage += 'created txid doesnt match; ';
      isOk = false;
    }
    if (
      tx !==
      '0100000000010123c3e0950eabb2b5c1a956e9d003c516fc29ff529211bd552be719fb78ea5e0f0200000017160014597ce022baa887799951e0496c769d9cc0c759dc0000000001a0860100000000001976a914ff715fb722cb10646d80709aeac7f2f4ee00278f88ac0247304402202507d6b05ab19c7fdee217e97fddab80d481d7b2a103c00cecfc634bf897188d02205fa62ad413b6e441f99f94d7d8f9cd4ba51a1d928cbdec6873fa915236dd6d92012103aea0dfd576151cb399347aa6732f8fdf027b9ea3ea2e65fb754803f776e0a50900000000'
    ) {
      errorMessage += 'created tx hex doesnt match; ';
      isOk = false;
    }

    let feeSatoshi = new BigNumber(0.0001);
    feeSatoshi = feeSatoshi.mul(100000000);
    let satoshiPerByte = feeSatoshi.div(Math.round(tx.length / 2));
    satoshiPerByte = Math.round(satoshiPerByte.toString(10));

    if (satoshiPerByte !== 46) {
      errorMessage += 'created tx satoshiPerByte doesnt match; ';
      isOk = false;
    }

    //

    this.setState({
      isLoading: false,
      isOk,
      errorMessage,
    });
  }

  render() {
    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
        <BlueHeader
          backgroundColor={BlueApp.settings.brandingColor}
          centerComponent={{
            text: 'Self test',
            style: { color: '#fff', fontSize: 25 },
          }}
        />
        <BlueCard>
          <ScrollView maxHeight={450}>
            <BlueSpacing20 />

            {(() => {
              if (this.state.isOk) {
                return (
                  <View style={{ alignItems: 'center' }}>
                    <BlueText h4>OK</BlueText>
                  </View>
                );
              } else {
                return (
                  <View style={{ alignItems: 'center' }}>
                    <BlueText h4>error: {this.state.errorMessage}</BlueText>
                  </View>
                );
              }
            })()}

            <BlueButton
              icon={{ name: 'arrow-left', type: 'octicon' }}
              title="Go Back"
              onPress={() => {
                this.props.navigation.goBack();
              }}
            />
          </ScrollView>
        </BlueCard>
      </SafeBlueArea>
    );
  }
}

Selftest.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};
