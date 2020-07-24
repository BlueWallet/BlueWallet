import { AppStorage, LightningCustodianWallet } from './';
import AsyncStorage from '@react-native-community/async-storage';
import RNFS from 'react-native-fs';
import url from 'url';
import { Chain } from '../models/bitcoinUnits';
import Azteco from './azteco';
const bitcoin = require('bitcoinjs-lib');
const bip21 = require('bip21');
const BlueApp: AppStorage = require('../BlueApp');

class DeeplinkSchemaMatch {
  static hasSchema(schemaString) {
    if (typeof schemaString !== 'string' || schemaString.length <= 0) return false;
    const lowercaseString = schemaString.trim().toLowerCase();
    return (
      lowercaseString.startsWith('bitcoin:') ||
      lowercaseString.startsWith('lightning:') ||
      lowercaseString.startsWith('blue:') ||
      lowercaseString.startsWith('bluewallet:') ||
      lowercaseString.startsWith('lapp:')
    );
  }

  /**
   * Examines the content of the event parameter.
   * If the content is recognizable, create a dictionary with the respective
   * navigation dictionary required by react-navigation
   *
   * @param event {{url: string}} URL deeplink as passed to app, e.g. `bitcoin:bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7?amount=666&label=Yo`
   * @param completionHandler {function} Callback that returns [string, params: object]
   */
  static navigationRouteFor(event, completionHandler) {
    if (event.url === null) {
      return;
    }
    if (typeof event.url !== 'string') {
      return;
    }

    if (event.url.toLowerCase().startsWith('bluewallet:bitcoin:') || event.url.toLowerCase().startsWith('bluewallet:lightning:')) {
      event.url = event.url.substring(11);
    }

    if (DeeplinkSchemaMatch.isPossiblyPSBTFile(event.url)) {
      RNFS.readFile(event.url)
        .then(file => {
          if (file) {
            completionHandler([
              'SendDetailsRoot',
              {
                screen: 'PsbtWithHardwareWallet',
                params: {
                  deepLinkPSBT: file,
                },
              },
            ]);
          }
        })
        .catch(e => console.warn(e));
      return;
    }
    let isBothBitcoinAndLightning;
    try {
      isBothBitcoinAndLightning = DeeplinkSchemaMatch.isBothBitcoinAndLightning(event.url);
    } catch (e) {
      console.log(e);
    }
    if (isBothBitcoinAndLightning) {
      completionHandler([
        'SelectWallet',
        {
          onWalletSelect: (wallet, { navigation }) => {
            navigation.pop(); // close select wallet screen
            navigation.navigate(...DeeplinkSchemaMatch.isBothBitcoinAndLightningOnWalletSelect(wallet, isBothBitcoinAndLightning));
          },
        },
      ]);
    } else if (DeeplinkSchemaMatch.isBitcoinAddress(event.url)) {
      completionHandler([
        'SendDetailsRoot',
        {
          screen: 'SendDetails',
          params: {
            uri: event.url,
          },
        },
      ]);
    } else if (DeeplinkSchemaMatch.isLightningInvoice(event.url)) {
      completionHandler([
        'ScanLndInvoiceRoot',
        {
          screen: 'ScanLndInvoice',
          params: {
            uri: event.url,
          },
        },
      ]);
    } else if (DeeplinkSchemaMatch.isLnUrl(event.url)) {
      // at this point we can not tell if it is lnurl-pay or lnurl-withdraw since it needs additional async call
      // to the server, which is undesirable here, so LNDCreateInvoice screen will handle it for us and will
      // redirect user to LnurlPay screen if necessary
      completionHandler([
        'LNDCreateInvoiceRoot',
        {
          screen: 'LNDCreateInvoice',
          params: {
            uri: event.url,
          },
        },
      ]);
    } else if (DeeplinkSchemaMatch.isSafelloRedirect(event)) {
      const urlObject = url.parse(event.url, true); // eslint-disable-line node/no-deprecated-api

      const safelloStateToken = urlObject.query['safello-state-token'];
      let wallet;
      for (const w of BlueApp.getWallets()) {
        wallet = w;
        break;
      }

      completionHandler([
        'BuyBitcoin',
        {
          uri: event.url,
          safelloStateToken,
          wallet,
        },
      ]);
    } else if (Azteco.isRedeemUrl(event.url)) {
      completionHandler([
        'AztecoRedeemRoot',
        {
          screen: 'AztecoRedeem',
          params: Azteco.getParamsFromUrl(event.url),
        },
      ]);
    } else {
      const urlObject = url.parse(event.url, true); // eslint-disable-line node/no-deprecated-api
      console.log('parsed', event.url, 'into', urlObject);
      (async () => {
        if (urlObject.protocol === 'bluewallet:' || urlObject.protocol === 'lapp:' || urlObject.protocol === 'blue:') {
          switch (urlObject.host) {
            case 'openlappbrowser': {
              console.log('opening LAPP', urlObject.query.url);
              // searching for LN wallet:
              let haveLnWallet = false;
              for (const w of BlueApp.getWallets()) {
                if (w.type === LightningCustodianWallet.type) {
                  haveLnWallet = true;
                }
              }

              if (!haveLnWallet) {
                // need to create one
                const w = new LightningCustodianWallet();
                w.setLabel(w.typeReadable);

                try {
                  const lndhub = await AsyncStorage.getItem(AppStorage.LNDHUB);
                  if (lndhub) {
                    w.setBaseURI(lndhub);
                    w.init();
                  }
                  await w.createAccount();
                  await w.authorize();
                } catch (Err) {
                  // giving up, not doing anything
                  return;
                }
                BlueApp.wallets.push(w);
                await BlueApp.saveToDisk();
              }

              // now, opening lapp browser and navigating it to URL.
              // looking for a LN wallet:
              let lnWallet;
              for (const w of BlueApp.getWallets()) {
                if (w.type === LightningCustodianWallet.type) {
                  lnWallet = w;
                  break;
                }
              }

              if (!lnWallet) {
                // something went wrong
                return;
              }

              completionHandler([
                'LappBrowser',
                {
                  fromSecret: lnWallet.getSecret(),
                  fromWallet: lnWallet,
                  url: urlObject.query.url,
                },
              ]);
              break;
            }
          }
        }
      })();
    }
  }

  static isTXNFile(filePath) {
    return filePath.toLowerCase().startsWith('file:') && filePath.toLowerCase().endsWith('.txn');
  }

  static isPossiblyPSBTFile(filePath) {
    return filePath.toLowerCase().startsWith('file:') && filePath.toLowerCase().endsWith('-signed.psbt');
  }

  static isBothBitcoinAndLightningOnWalletSelect(wallet, uri) {
    if (wallet.chain === Chain.ONCHAIN) {
      return [
        'SendDetailsRoot',
        {
          screen: 'SendDetails',
          params: {
            uri: uri.bitcoin,
            fromWallet: wallet,
          },
        },
      ];
    } else if (wallet.chain === Chain.OFFCHAIN) {
      return [
        'ScanLndInvoiceRoot',
        {
          screen: 'ScanLndInvoice',
          params: {
            uri: uri.lndInvoice,
            fromSecret: wallet.getSecret(),
          },
        },
      ];
    }
  }

  static isBitcoinAddress(address) {
    address = address.replace('bitcoin:', '').replace('BITCOIN:', '').replace('bitcoin=', '').split('?')[0];
    let isValidBitcoinAddress = false;
    try {
      bitcoin.address.toOutputScript(address);
      isValidBitcoinAddress = true;
    } catch (err) {
      isValidBitcoinAddress = false;
    }
    return isValidBitcoinAddress;
  }

  static isLightningInvoice(invoice) {
    let isValidLightningInvoice = false;
    if (invoice.toLowerCase().startsWith('lightning:lnb') || invoice.toLowerCase().startsWith('lnb')) {
      isValidLightningInvoice = true;
    }
    return isValidLightningInvoice;
  }

  static isLnUrl(text) {
    if (text.toLowerCase().startsWith('lightning:lnurl') || text.toLowerCase().startsWith('lnurl')) {
      return true;
    }
    return false;
  }

  static isSafelloRedirect(event) {
    const urlObject = url.parse(event.url, true); // eslint-disable-line node/no-deprecated-api

    return !!urlObject.query['safello-state-token'];
  }

  static isBothBitcoinAndLightning(url) {
    if (url.includes('lightning') && (url.includes('bitcoin') || url.includes('BITCOIN'))) {
      const txInfo = url.split(/(bitcoin:|BITCOIN:|lightning:|lightning=|bitcoin=)+/);
      let bitcoin;
      let lndInvoice;
      for (const [index, value] of txInfo.entries()) {
        try {
          // Inside try-catch. We dont wan't to  crash in case of an out-of-bounds error.
          if (value.startsWith('bitcoin') || value.startsWith('BITCOIN')) {
            bitcoin = `bitcoin:${txInfo[index + 1]}`;
            if (!DeeplinkSchemaMatch.isBitcoinAddress(bitcoin)) {
              bitcoin = false;
              break;
            }
          } else if (value.startsWith('lightning')) {
            lndInvoice = `lightning:${txInfo[index + 1]}`;
            if (!this.isLightningInvoice(lndInvoice)) {
              lndInvoice = false;
              break;
            }
          }
        } catch (e) {
          console.log(e);
        }
        if (bitcoin && lndInvoice) break;
      }
      if (bitcoin && lndInvoice) {
        return { bitcoin, lndInvoice };
      } else {
        return undefined;
      }
    }
    return undefined;
  }

  static bip21decode(uri) {
    return bip21.decode(uri.replace('BITCOIN:', 'bitcoin:'));
  }

  static bip21encode() {
    return bip21.encode.apply(bip21, arguments);
  }
}

export default DeeplinkSchemaMatch;
