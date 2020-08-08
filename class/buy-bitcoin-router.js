import { getSystemName } from 'react-native-device-info';
import { AppStorage, LightningCustodianWallet, WatchOnlyWallet } from './';
import { Linking } from 'react-native';
import * as NavigationService from '../NavigationService';
const currency = require('../blue_modules/currency');
const BlueApp: AppStorage = require('../BlueApp');

export default class BuyBitcoinRouter {
  static navigate(wallet, params = {}, returnState = false) {
    if (getSystemName() === 'Mac OS X') {
      (async () => {
        let preferredCurrency = await currency.getPreferredCurrency();
        preferredCurrency = preferredCurrency.endPointKey;

        /**  @type {AbstractHDWallet|WatchOnlyWallet|LightningCustodianWallet}   */

        let address = '';

        if (WatchOnlyWallet.type === wallet.type && !wallet.isHd()) {
          // plain watchonly - just get the address
          address = wallet.getAddress();
        } else {
          // otherwise, lets call widely-used getAddressAsync()

          try {
            address = await Promise.race([wallet.getAddressAsync(), BlueApp.sleep(2000)]);
          } catch (_) {}

          if (!address) {
            // either sleep expired or getAddressAsync threw an exception
            if (LightningCustodianWallet.type === wallet.type) {
              // not much we can do, lets hope refill address was cached previously
              address = wallet.getAddress() || '';
            } else {
              // plain hd wallet (either HD or watchonly-wrapped). trying next free address
              address = wallet._getExternalAddressByIndex(wallet.getNextFreeAddressIndex());
            }
          }
        }

        const { safelloStateToken } = params;

        let uri = 'https://bluewallet.io/buy-bitcoin-redirect.html?address=' + address;

        if (safelloStateToken) {
          uri += '&safelloStateToken=' + safelloStateToken;
        }

        if (preferredCurrency) {
          uri += '&currency=' + preferredCurrency;
        }

        Linking.openURL(uri);
      })();
    } else {
      if (params.length > 0) {
        NavigationService.navigate('BuyBitcoin', { params });
        if (returnState) {
          return ['BuyBitcoin', params];
        }
      } else {
        NavigationService.navigate('BuyBitcoin', { wallet });
        if (returnState) {
          return ['BuyBitcoin', { wallet }];
        }
      }
    }
  }
}
