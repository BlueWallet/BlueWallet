import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { ScrollView, View } from 'react-native';

import { BlueLoading, BlueSpacing20, SafeBlueArea, BlueCard, BlueText, BlueNavigationStyle } from '../BlueComponents';
import { SegwitP2SHWallet, LegacyWallet, HDSegwitP2SHWallet, HDSegwitBech32Wallet } from '../class';

const BigNumber = require('bignumber.js');
const bitcoin = require('bitcoinjs-lib');

const BlueElectrum = require('../BlueElectrum');
const encryption = require('../encryption');

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
        const uniqs = {};
        const w = new SegwitP2SHWallet();
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
        const addr4elect = '3GCvDBAktgQQtsbN6x5DYiQCMmgZ9Yk8BK';
        const electrumBalance = await BlueElectrum.getBalanceByAddress(addr4elect);
        if (electrumBalance.confirmed !== 51432)
          throw new Error('BlueElectrum getBalanceByAddress failure, got ' + JSON.stringify(electrumBalance));

        const electrumTxs = await BlueElectrum.getTransactionsByAddress(addr4elect);
        if (electrumTxs.length !== 1)
          throw new Error('BlueElectrum getTransactionsByAddress failure, got ' + JSON.stringify(electrumTxs));
      } else {
        console.warn('skipping RN-specific test');
      }

      //

      let l = new LegacyWallet();
      l.setSecret('L5KcrwqMGgEtVnsM4ZGS6XdRoBDinfb1hfFW61RhsY9QuumePh8b');
      if (l.getAddress() !== 'YXiAStqJWhEGxf2G7kgoAU1w6khDVWgxJm') {
        errorMessage += 'failed to generate legacy address from WIF; ';
        isOk = false;
      }

      // utxos as received from blockcypher
      let utxos = [
        {
          height: 24097,
          value: 20000,
          address: 'YWw3NfAvYyZfMgzqooG4b4NYUzBdAToYba',
          txid: '7f3b9e032a84413d7a5027b0d020f8acf80ad28f68b5bce8fa8ac357248c5b80',
          vout: 0,
        },
      ];
      let toAddr = 'royale1q3c4dwjwr4k9f40tdy373zy4mmuwd52p95ell7u';
      let amount = 0.0009;
      let fee = 0.0001;
      let txHex = l.createTx(utxos, amount, fee, toAddr);
      if (
        txHex !==
        '0100000001805b8c2457c38afae8bcb5688fd20af8acf820d0b027507a3d41842a039e3b7f000000006a47304402201340b46e892c82d61bdbd88d74bb28e1af9de02f676146e6e3897357b736906d02200397ee1258179c37682f4abe65a84cf9a4d5efc8ad206e2644c3df78f7c6967001210271fadbb34b835770448fe296a8dacc61826d1e5ec5f5deb699837dfb04a24d09ffffffff01905f0100000000001600148e2ad749c3ad8a9abd6d247d1112bbdf1cda282500000000'
      ) {
        errorMessage += 'failed to create TX from legacy address; ';
        isOk = false;
      }

      // now, several utxos
      // utxos as received from blockcypher
      utxos = [
        {
          height: 24097,
          value: 20000,
          address: 'YWw3NfAvYyZfMgzqooG4b4NYUzBdAToYba',
          txid: '7f3b9e032a84413d7a5027b0d020f8acf80ad28f68b5bce8fa8ac357248c5b80',
        },
        {
          height: 123,
          value: 40000,
          address: 'YRMrqNUKAfA2bQ7RmSz1hLYCeGAtci8NkT',
          txid: '99a385c93ccca11c10a61517c7a61c35c3c4b81c3e02a8deadc277d4b66eb47a',
          vout: 5,
        },
      ];

      toAddr = 'royale1q3c4dwjwr4k9f40tdy373zy4mmuwd52p95ell7u';
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
        '0100000002805b8c2457c38afae8bcb5688fd20af8acf820d0b027507a3d41842a039e3b7f000000006a473044022053cb5b71519c0168c4432516789bac2a1fe4a4da9c625b2d9d7c77b480f44ea8022071b77df76f88435199abe7edecd81e09abf3cb050f29d77c56cec8244fadb71601210271fadbb34b835770448fe296a8dacc61826d1e5ec5f5deb699837dfb04a24d09ffffffff7ab46eb6d477c2addea8023e1cb8c4c3351ca6c71715a6101ca1cc3cc985a399050000006a473044022061e12e9cc675a65234c67ae1af146a49c5d038b14663821cac0e122f1b34ca53022032c68aec78ebdbdbe07acd571676d14641e9166680ab81e52c85c94f9d02f89901210271fadbb34b835770448fe296a8dacc61826d1e5ec5f5deb699837dfb04a24d09ffffffff01905f0100000000001600148e2ad749c3ad8a9abd6d247d1112bbdf1cda282500000000'
      ) {
        errorMessage += 'failed to create TX from legacy address; ';
        isOk = false;
      }

      //

      l = new SegwitP2SHWallet();
      l.setSecret('L5KcrwqMGgEtVnsM4ZGS6XdRoBDinfb1hfFW61RhsY9QuumePh8b');
      if (l.getAddress() !== 'RVUYxQnej5m99PEr5qKrMS128czSCSPz4W') {
        errorMessage += 'failed to generate segwit P2SH address from WIF; ';
        isOk = false;
      }

      //

      // utxos as received from blockcypher
      const utxo = [
        {
          height: 24097,
          value: 200000,
          address: 'RVUYxQnej5m99PEr5qKrMS128czSCSPz4W',
          txid: '7f3b9e032a84413d7a5027b0d020f8acf80ad28f68b5bce8fa8ac357248c5b80',
          vout: 0,
        },
      ];

      const tx = l.createTx(utxo, 0.001, 0.0001, 'YRMrqNUKAfA2bQ7RmSz1hLYCeGAtci8NkT');
      const txDecoded = bitcoin.Transaction.fromHex(tx);
      const txid = txDecoded.getId();

      if (txid !== '15e9e40712c2b2421230ccfcac8cd5b8d3e4703cee612cf24cf8c6ff7892492f') {
        errorMessage += 'created txid doesnt match; ';
        isOk = false;
      }
      if (
        tx !==
        '01000000000101805b8c2457c38afae8bcb5688fd20af8acf820d0b027507a3d41842a039e3b7f00000000171600145b8edf676e7cf478c7ea5c24975559d7df2229730000000002a0860100000000001976a91415e718b98502832b2fe146430ef89e466fda000688ac905f01000000000017a914dd8884d77835ddaea750605abdcd4ef74696836f870247304402207706b6f700c149f92ee17b8d1b01c2e6184fe4a50d6cbf52010322903b8a547402202296622b204fe14f9b5e76c8c290567394873dd6fafa57163845f3d6619f8d6e01210271fadbb34b835770448fe296a8dacc61826d1e5ec5f5deb699837dfb04a24d0900000000'
      ) {
        errorMessage += 'created tx hex doesnt match; ';
        isOk = false;
      }

      let feeSatoshi = new BigNumber(0.0001);
      feeSatoshi = feeSatoshi.multipliedBy(100000000);
      let satoshiPerByte = feeSatoshi.dividedBy(Math.round(tx.length / 2));
      satoshiPerByte = Math.round(satoshiPerByte.toString(10));

      if (satoshiPerByte !== 40) {
        errorMessage += 'created tx satoshiPerByte doesnt match; ';
        isOk = false;
      }

      //

      const crypted = encryption.encrypt('data', 'password');
      const decrypted = encryption.decrypt(crypted, 'password');

      if (decrypted !== 'data' && crypted && decrypted) {
        errorMessage += 'encryption lib is not ok; ';
        isOk = false;
      }

      //

      const bip39 = require('bip39');
      const mnemonic =
        'honey risk juice trip orient galaxy win situate shoot anchor bounce remind horse traffic exotic since escape mimic ramp skin judge owner topple erode';
      const seed = bip39.mnemonicToSeed(mnemonic);
      const root = bitcoin.bip32.fromSeed(seed);

      const path = "m/49'/440'/0'/0/0";
      const child = root.derivePath(path);
      const address = bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2wpkh({
          pubkey: child.publicKey,
          network: bitcoin.networks.bitcoin,
        }),
        network: bitcoin.networks.bitcoin,
      }).address;

      if (address !== 'RLDnrkrVbNNJZTf1wc5CBbnRsfbwePh7mT') {
        errorMessage += 'bip49 is not ok; ';
        isOk = false;
      }

      //
      if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
        const hd = new HDSegwitP2SHWallet();
        const hashmap = {};
        for (let c = 0; c < 10; c++) {
          await hd.generate();
          const secret = hd.getSecret();
          if (hashmap[secret]) {
            throw new Error('Duplicate secret generated!');
          }
          hashmap[secret] = 1;
          if (secret.split(' ').length !== 12 && secret.split(' ').length !== 24) {
            throw new Error('mnemonic phrase not ok');
          }
        }

        const hd2 = new HDSegwitP2SHWallet();
        hd2.setSecret(hd.getSecret());
        if (!hd2.validateMnemonic()) {
          throw new Error('mnemonic phrase validation not ok');
        }

        //

        const hd3 = new HDSegwitP2SHWallet();
        hd3._xpub =
          'ypub6Wj9dHZAtSM3DQB6kG37aK5i1yJbBoM2d1W57aMkyLx4cNyGqWYpGvL194zA4HSxWpQyoPrsXE2PP4pNUqu5cvvHUK2ZpfUeHFmuK4THAD3';
        await hd3.fetchBalance();
        if (hd3.getBalance() !== b0) throw new Error('Could not fetch HD balance');
        await hd3.fetchTransactions();
        if (hd3.transactions.length !== 2) throw new Error('Could not fetch HD transactions');
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
