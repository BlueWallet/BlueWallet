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
let encryption = require('../encryption');

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

    // utxos as received from blockcypher
    let utxos = [
      {
        tx_hash:
          '2f445cf016fa2772db7d473bff97515355b4e6148e1c980ce351d47cf54c517f',
        block_height: 523186,
        tx_input_n: -1,
        tx_output_n: 1,
        value: 100000,
        ref_balance: 100000,
        spent: false,
        confirmations: 215,
        confirmed: '2018-05-18T03:16:34Z',
        double_spend: false,
      },
    ];
    let toAddr = '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB';
    let amount = 0.0009;
    let fee = 0.0001;
    let txHex = l.createTx(utxos, amount, fee, toAddr);
    if (
      txHex !==
      '01000000017f514cf57cd451e30c981c8e14e6b455535197ff3b477ddb7227fa16f05c442f010000006b483045022100b9a6545847bd30418c133437c7660a6676afafe6e7e837a37ef2ead931ebd586022056bc43cbf71855d0719f54151c8fcaaaa03367ecafdd7296dbe39f042e432f4f012103aea0dfd576151cb399347aa6732f8fdf027b9ea3ea2e65fb754803f776e0a509ffffffff01905f0100000000001976a914aa381cd428a4e91327fd4434aa0a08ff131f1a5a88ac00000000'
    ) {
      errorMessage += 'failed to create TX from legacy address; ';
      isOk = false;
    }

    // now, several utxos
    // utxos as received from blockcypher
    utxos = [
      {
        amount: '0.002',
        block_height: 523416,
        confirmations: 6,
        confirmed: '2018-05-19T15:46:43Z',
        double_spend: false,
        ref_balance: 300000,
        spent: false,
        tx_hash:
          'dc3605040a03724bc584ed43bc22a559f5d32a1b0708ca05b20b9018fdd523ef',
        tx_input_n: -1,
        tx_output_n: 0,
        txid:
          'dc3605040a03724bc584ed43bc22a559f5d32a1b0708ca05b20b9018fdd523ef',
        value: 200000,
        vout: 0,
      },
      {
        amount: '0.001',
        block_height: 523186,
        confirmations: 6,
        confirmed: '2018-05-18T03:16:34Z',
        double_spend: false,
        ref_balance: 100000,
        spent: false,
        tx_hash:
          'c473c104febfe6621804976d1082a1468c1198d0339e35f30a8ba1515d9eb017',
        tx_input_n: -1,
        tx_output_n: 0,
        txid:
          'c473c104febfe6621804976d1082a1468c1198d0339e35f30a8ba1515d9eb017',
        value: 100000,
        vout: 0,
      },
    ];

    toAddr = '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB';
    amount = 0.0009;
    fee = 0.0001;
    try {
      txHex = l.createTx(utxos, amount, fee, toAddr);
    } catch (e) {
      errorMessage += e.message + '; ';
      isOk = false;
    }
    if (
      txHex !==
      '0100000002ef23d5fd18900bb205ca08071b2ad3f559a522bc43ed84c54b72030a040536dc000000006a47304402206b4f03e471d60dff19f4df1a8203ca97f6282658160034cea0f2b7d748c33d9802206058d23861dabdfb252c8df14249d1a2b00345dd90d32ab451cc3c6cfcb3b402012103aea0dfd576151cb399347aa6732f8fdf027b9ea3ea2e65fb754803f776e0a509ffffffff17b09e5d51a18b0af3359e33d098118c46a182106d97041862e6bffe04c173c4000000006b4830450221009785a61358a1ee7ab5885a98b111275226e0046a48b69980c4f53ecf99cdce0a02200503249e0b23d633ec1fbae5d41a0dcf9758dce3560066d1aee9ecfbfeefcfb7012103aea0dfd576151cb399347aa6732f8fdf027b9ea3ea2e65fb754803f776e0a509ffffffff02905f0100000000001976a914aa381cd428a4e91327fd4434aa0a08ff131f1a5a88ac400d0300000000001976a914597ce022baa887799951e0496c769d9cc0c759dc88ac00000000'
    ) {
      errorMessage += 'failed to create TX from legacy address; ';
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

    // utxos as received from blockcypher
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

    let crypted = encryption.encrypt('data', 'password');
    let decrypted = encryption.decrypt(crypted, 'password');

    if (decrypted !== 'data' && crypted && decrypted) {
      errorMessage += 'encryption lib is not ok; ';
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
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
        <BlueHeader
          backgroundColor={BlueApp.settings.brandingColor}
          centerComponent={{
            text: 'Self test',
            style: { color: BlueApp.settings.foregroundColor, fontSize: 23 },
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
