import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ScrollView, View, StyleSheet } from 'react-native';
import RNSecureKeyStore, { ACCESSIBLE } from 'react-native-secure-key-store';

import loc from '../loc';
import { BlueSpacing20, SafeBlueArea, BlueCard, BlueText, BlueLoading } from '../BlueComponents';
import navigationStyle from '../components/navigationStyle';
import {
  SegwitP2SHWallet,
  LegacyWallet,
  HDSegwitP2SHWallet,
  HDSegwitBech32Wallet,
  HDAezeedWallet,
  SLIP39LegacyP2PKHWallet,
} from '../class';
const bitcoin = require('bitcoinjs-lib');
const BlueCrypto = require('react-native-blue-crypto');
const encryption = require('../blue_modules/encryption');
const BlueElectrum = require('../blue_modules/BlueElectrum');

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
  },
});

export default class Selftest extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
    };
  }

  async componentDidMount() {
    let errorMessage = '';
    let isOk = true;

    try {
      for (let c = 0; c < 10000; c++) {
        const val = Math.random() + '';
        setTimeout(() => RNSecureKeyStore.set('test', val, { accessible: ACCESSIBLE.WHEN_UNLOCKED }), 0);
        setTimeout(() => RNSecureKeyStore.set('test', val, { accessible: ACCESSIBLE.WHEN_UNLOCKED }), 0);

        await new Promise(resolve => setTimeout(resolve, 10)); // sleep
        const g = await RNSecureKeyStore.get('test');
        assertStrictEqual(g, val);
      }
    } catch (Err) {
      errorMessage += Err;
      isOk = false;
    }


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
      <SafeBlueArea>
        <BlueCard>
          <ScrollView>
            <BlueSpacing20 />

            {(() => {
              if (this.state.isOk) {
                return (
                  <View style={styles.center}>
                    <BlueText testID="SelfTestOk" h4>
                      OK
                    </BlueText>
                    <BlueSpacing20 />
                    <BlueText>{loc.settings.about_selftest_ok}</BlueText>
                  </View>
                );
              } else {
                return (
                  <View style={styles.center}>
                    <BlueText h4 numberOfLines={0}>
                      {this.state.errorMessage}
                    </BlueText>
                  </View>
                );
              }
            })()}
          </ScrollView>
        </BlueCard>
      </SafeBlueArea>
    );
  }
}

function assertStrictEqual(actual, expected, message) {
  if (expected !== actual) {
    if (message) throw new Error(message);
    throw new Error('Assertion failed that ' + JSON.stringify(expected) + ' equals ' + JSON.stringify(actual));
  }
}

Selftest.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};

Selftest.navigationOptions = navigationStyle({
  title: loc.settings.selfTest,
});
