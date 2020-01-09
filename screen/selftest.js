import React, { Component } from 'react';
import { ScrollView, View } from 'react-native';
import { BlueLoading, BlueSpacing20, SafeBlueArea, BlueCard, BlueText, BlueNavigationStyle } from '../BlueComponents';
import PropTypes from 'prop-types';
import { SegwitP2SHWallet, LegacyWallet, HDSegwitP2SHWallet, HDSegwitBech32Wallet } from '../class';
const bitcoin = require('bitcoinjs-lib');
let BigNumber = require('bignumber.js');
let encryption = require('../encryption');
let BlueElectrum = require('../BlueElectrum');

export default class Selftest extends Component {
  static navigationOptions = () => ({
    ...BlueNavigationStyle(),
    title: 'Self test',
  });

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
      if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
        let uniqs = {};
        let w = new SegwitP2SHWallet();
        for (let c = 0; c < 1000; c++) {
          await w.generate();
          if (uniqs[w.getSecret()]) {
            errorMessage += 'failed to generate unique private key; ';
            isOk = false;
            break;
          }
          uniqs[w.getSecret()] = 1;
        }
      } else {
        console.warn('skipping RN-specific test');
      }

      //

      if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
        await BlueElectrum.ping();
        await BlueElectrum.waitTillConnected();
        let addr4elect = '3GCvDBAktgQQtsbN6x5DYiQCMmgZ9Yk8BK';
        let electrumBalance = await BlueElectrum.getBalanceByAddress(addr4elect);
        if (electrumBalance.confirmed !== 51432)
          throw new Error('BlueElectrum getBalanceByAddress failure, got ' + JSON.stringify(electrumBalance));

        let electrumTxs = await BlueElectrum.getTransactionsByAddress(addr4elect);
        if (electrumTxs.length !== 1) throw new Error('BlueElectrum getTransactionsByAddress failure, got ' + JSON.stringify(electrumTxs));
      } else {
        console.warn('skipping RN-specific test');
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
          tx_hash: '2f445cf016fa2772db7d473bff97515355b4e6148e1c980ce351d47cf54c517f',
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
          tx_hash: 'dc3605040a03724bc584ed43bc22a559f5d32a1b0708ca05b20b9018fdd523ef',
          tx_input_n: -1,
          tx_output_n: 0,
          txid: 'dc3605040a03724bc584ed43bc22a559f5d32a1b0708ca05b20b9018fdd523ef',
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
          tx_hash: 'c473c104febfe6621804976d1082a1468c1198d0339e35f30a8ba1515d9eb017',
          tx_input_n: -1,
          tx_output_n: 0,
          txid: 'c473c104febfe6621804976d1082a1468c1198d0339e35f30a8ba1515d9eb017',
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
          tx_hash: '0f5eea78fb19e72b55bd119252ff29fc16c503d0e956a9c1b5b2ab0e95e0c323',
          block_height: 514991,
          tx_input_n: -1,
          tx_output_n: 2,
          value: 110000,
          ref_balance: 546,
          spent: false,
          confirmations: 9,
          confirmed: '2018-03-24T18:13:36Z',
          double_spend: false,
        },
      ];

      let tx = l.createTx(utxo, 0.001, 0.0001, '1QHf8Gp3wfmFiSdEX4FtrssCGR68diN1cj');
      let txDecoded = bitcoin.Transaction.fromHex(tx);
      let txid = txDecoded.getId();

      if (txid !== '110f51d28d585e922adbf701cba802e549b8fe3a53fa5d62426ab42549c9b6de') {
        errorMessage += 'created txid doesnt match; ';
        isOk = false;
      }
      if (
        tx !==
        '0100000000010123c3e0950eabb2b5c1a956e9d003c516fc29ff529211bd552be719fb78ea5e0f0200000017160014597ce022baa887799951e0496c769d9cc0c759dc0000000001a0860100000000001976a914ff715fb722cb10646d80709aeac7f2f4ee00278f88ac02473044022075670317a0e5b5d4eef154b03db97396a64cbc6ef3b576d98367e1a83c1c488002206d6df1e8085fd711d6ea264de3803340f80fa2c6e30683879d9ad40f3228c56c012103aea0dfd576151cb399347aa6732f8fdf027b9ea3ea2e65fb754803f776e0a50900000000'
      ) {
        errorMessage += 'created tx hex doesnt match; ';
        isOk = false;
      }

      let feeSatoshi = new BigNumber(0.0001);
      feeSatoshi = feeSatoshi.multipliedBy(100000000);
      let satoshiPerByte = feeSatoshi.dividedBy(Math.round(tx.length / 2));
      satoshiPerByte = Math.round(satoshiPerByte.toString(10));

      if (satoshiPerByte !== 46) {
        errorMessage += 'created tx satoshiPerByte doesnt match; ';
        isOk = false;
      }

      //
      const data2encrypt = 'really long data string';
      let crypted = encryption.encrypt(data2encrypt, 'password');
      let decrypted = encryption.decrypt(crypted, 'password');

      if (decrypted !== data2encrypt && crypted && decrypted) {
        throw new Error('encryption lib is not ok');
      }

      //

      let bip39 = require('bip39');
      let mnemonic =
        'honey risk juice trip orient galaxy win situate shoot anchor bounce remind horse traffic exotic since escape mimic ramp skin judge owner topple erode';
      let seed = bip39.mnemonicToSeed(mnemonic);
      let root = bitcoin.bip32.fromSeed(seed);

      let path = "m/49'/0'/0'/0/0";
      let child = root.derivePath(path);
      let address = bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2wpkh({
          pubkey: child.publicKey,
          network: bitcoin.networks.bitcoin,
        }),
        network: bitcoin.networks.bitcoin,
      }).address;

      if (address !== '3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK') {
        errorMessage += 'bip49 is not ok; ';
        isOk = false;
      }

      //
      if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
        let hd = new HDSegwitP2SHWallet();
        let hashmap = {};
        for (let c = 0; c < 1000; c++) {
          await hd.generate();
          let secret = hd.getSecret();
          if (hashmap[secret]) {
            throw new Error('Duplicate secret generated!');
          }
          hashmap[secret] = 1;
          if (secret.split(' ').length !== 12 && secret.split(' ').length !== 24) {
            throw new Error('mnemonic phrase not ok');
          }
        }

        let hd2 = new HDSegwitP2SHWallet();
        hd2.setSecret(hd.getSecret());
        if (!hd2.validateMnemonic()) {
          throw new Error('mnemonic phrase validation not ok');
        }

        //

        let hd3 = new HDSegwitP2SHWallet();
        hd3._xpub = 'ypub6Wb82D7F38b48uzRVyTwydMCPcos4njzygPRCJ4x1enm6EA5YUthtWgJUPYiFTs7Sk53q8rJ9d1SJ2fBNqsyhjUTDR7gyF1SXbBnaa9xcQj';
        await hd3.fetchBalance();
        if (hd3.getBalance() !== 26000) throw new Error('Could not fetch HD balance');
        await hd3.fetchTransactions();
        if (hd3.getTransactions().length !== 1) throw new Error('Could not fetch HD transactions');

        //

        let hd4 = new HDSegwitBech32Wallet();
        hd4._xpub = 'zpub6r7jhKKm7BAVx3b3nSnuadY1WnshZYkhK8gKFoRLwK9rF3Mzv28BrGcCGA3ugGtawi1WLb2vyjQAX9ZTDGU5gNk2bLdTc3iEXr6tzR1ipNP';
        await hd4.fetchBalance();
        if (hd4.getBalance() !== 200000) throw new Error('Could not fetch HD Bech32 balance');
        await hd4.fetchTransactions();
        if (hd4.getTransactions().length !== 4) throw new Error('Could not fetch HD Bech32 transactions');
      } else {
        console.warn('skipping RN-specific test');
      }

      //
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
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
        <BlueCard>
          <ScrollView>
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
                    <BlueText h4 numberOfLines={0}>
                      error: {this.state.errorMessage}
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

Selftest.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};
