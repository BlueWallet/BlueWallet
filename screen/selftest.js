import React, { Component } from 'react';
import { ScrollView, View } from 'react-native';
import { BlueLoading, BlueSpacing20, SafeBlueArea, BlueCard, BlueText, BlueNavigationStyle } from '../BlueComponents';
import PropTypes from 'prop-types';
import { SegwitP2SHWallet, LegacyWallet, HDSegwitP2SHWallet, HDSegwitBech32Wallet } from '../class';
const bitcoin = require('bitcoinjs-lib');
const BlueCrypto = require('react-native-blue-crypto');
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
            throw new Error('failed to generate unique private key');
          }
          uniqs[w.getSecret()] = 1;
        }
      } else {
        // skipping RN-specific test
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
        // skipping RN-specific test'
      }

      //

      let l = new LegacyWallet();
      l.setSecret('L4ccWrPMmFDZw4kzAKFqJNxgHANjdy6b7YKNXMwB4xac4FLF3Tov');
      assertStrictEqual(l.getAddress(), '14YZ6iymQtBVQJk6gKnLCk49UScJK7SH4M');
      let utxos = [
        {
          txid: 'cc44e933a094296d9fe424ad7306f16916253a3d154d52e4f1a757c18242cec4',
          vout: 0,
          value: 100000,
          txhex:
            '0200000000010161890cd52770c150da4d7d190920f43b9f88e7660c565a5a5ad141abb6de09de00000000000000008002a0860100000000001976a91426e01119d265aa980390c49eece923976c218f1588ac3e17000000000000160014c1af8c9dd85e0e55a532a952282604f820746fcd02473044022072b3f28808943c6aa588dd7a4e8f29fad7357a2814e05d6c5d767eb6b307b4e6022067bc6a8df2dbee43c87b8ce9ddd9fe678e00e0f7ae6690d5cb81eca6170c47e8012102e8fba5643e15ab70ec79528833a2c51338c1114c4eebc348a235b1a3e13ab07100000000',
        },
      ];

      let txNew = l.createTransaction(utxos, [{ value: 90000, address: '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB' }], 1, l.getAddress());
      let txBitcoin = bitcoin.Transaction.fromHex(txNew.tx.toHex());
      assertStrictEqual(
        txNew.tx.toHex(),
        '0200000001c4ce4282c157a7f1e4524d153d3a251669f10673ad24e49f6d2994a033e944cc000000006a47304402200faed160757433bcd4d9fe5f55eb92420406e8f3099a7e12ef720c77313c8c7e022044bc9e1abca6a81a8ad5c749f5ec4694301589172b83b1803bc134eda0487dbc01210337c09b3cb889801638078fd4e6998218b28c92d338ea2602720a88847aedceb3ffffffff02905f0100000000001976a914aa381cd428a4e91327fd4434aa0a08ff131f1a5a88ac2f260000000000001976a91426e01119d265aa980390c49eece923976c218f1588ac00000000',
      );
      assertStrictEqual(txBitcoin.ins.length, 1);
      assertStrictEqual(txBitcoin.outs.length, 2);
      assertStrictEqual('1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB', bitcoin.address.fromOutputScript(txBitcoin.outs[0].script)); // to address
      assertStrictEqual(l.getAddress(), bitcoin.address.fromOutputScript(txBitcoin.outs[1].script)); // change address

      //

      l = new SegwitP2SHWallet();
      l.setSecret('Kxr9tQED9H44gCmp6HAdmemAzU3n84H3dGkuWTKvE23JgHMW8gct');
      if (l.getAddress() !== '34AgLJhwXrvmkZS1o5TrcdeevMt22Nar53') {
        throw new Error('failed to generate segwit P2SH address from WIF');
      }

      //

      let wallet = new SegwitP2SHWallet();
      wallet.setSecret('Ky1vhqYGCiCbPd8nmbUeGfwLdXB1h5aGwxHwpXrzYRfY5cTZPDo4');
      assertStrictEqual(wallet.getAddress(), '3CKN8HTCews4rYJYsyub5hjAVm5g5VFdQJ');

      utxos = [
        {
          txid: 'a56b44080cb606c0bd90e77fcd4fb34c863e68e5562e75b4386e611390eb860c',
          vout: 0,
          value: 300000,
        },
      ];

      txNew = wallet.createTransaction(utxos, [{ value: 90000, address: '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB' }], 1, wallet.getAddress());
      let tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
      assertStrictEqual(
        txNew.tx.toHex(),
        '020000000001010c86eb9013616e38b4752e56e5683e864cb34fcd7fe790bdc006b60c08446ba50000000017160014139dc70d73097f9d775f8a3280ba3e3435515641ffffffff02905f0100000000001976a914aa381cd428a4e91327fd4434aa0a08ff131f1a5a88ac6f3303000000000017a914749118baa93fb4b88c28909c8bf0a8202a0484f487024730440220086b55a771f37daadbe64fe557a32fd68ee92995445af0b0a5b9343db67505e1022064c9a9778a19a0276761af69b8917d19ed4b791c785dd8cb4aae327f2a6b526f012103a5de146762f84055db3202c1316cd9008f16047f4f408c1482fdb108217eda0800000000',
      );
      assertStrictEqual(tx.ins.length, 1);
      assertStrictEqual(tx.outs.length, 2);
      assertStrictEqual('1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB', bitcoin.address.fromOutputScript(tx.outs[0].script)); // to address
      assertStrictEqual(bitcoin.address.fromOutputScript(tx.outs[1].script), wallet.getAddress()); // change address

      //

      const data2encrypt = 'really long data string';
      let crypted = encryption.encrypt(data2encrypt, 'password');
      let decrypted = encryption.decrypt(crypted, 'password');

      if (decrypted !== data2encrypt) {
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
        throw new Error('bip49 is not ok');
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

        let hd4 = new HDSegwitBech32Wallet();
        hd4._xpub = 'zpub6r7jhKKm7BAVx3b3nSnuadY1WnshZYkhK8gKFoRLwK9rF3Mzv28BrGcCGA3ugGtawi1WLb2vyjQAX9ZTDGU5gNk2bLdTc3iEXr6tzR1ipNP';
        await hd4.fetchBalance();
        if (hd4.getBalance() !== 200000) throw new Error('Could not fetch HD Bech32 balance');
        await hd4.fetchTransactions();
        if (hd4.getTransactions().length !== 4) throw new Error('Could not fetch HD Bech32 transactions');
      } else {
        // skipping RN-specific test
      }

      //

      if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
        const hex = await BlueCrypto.scrypt('717765727479', '4749345a22b23cf3', 64, 8, 8, 32); // using non-default parameters to speed it up (not-bip38 compliant)
        if (hex.toUpperCase() !== 'F36AB2DC12377C788D61E6770126D8A01028C8F6D8FE01871CE0489A1F696A90')
          throw new Error('react-native-blue-crypto is not ok');
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
                    <BlueText testID="SelfTestOk" h4>
                      OK
                    </BlueText>
                  </View>
                );
              } else {
                return (
                  <View style={{ alignItems: 'center' }}>
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
