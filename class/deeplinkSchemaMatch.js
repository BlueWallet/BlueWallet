import { AppStorage, LightningCustodianWallet } from './';
import AsyncStorage from '@react-native-community/async-storage';
import BitcoinBIP70TransactionDecode from '../bip70/bip70';
const bitcoin = require('bitcoinjs-lib');
const BlueApp = require('../BlueApp');
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
   * @param {Object} event
   * @param {void} completionHandler
   */
  static navigationRouteFor(event, completionHandler) {
    if (event.url === null) {
      return;
    }
    if (typeof event.url !== 'string') {
      return;
    }
    let isBothBitcoinAndLightning;
    try {
      isBothBitcoinAndLightning = DeeplinkSchemaMatch.isBothBitcoinAndLightning(event.url);
    } catch (e) {
      console.log(e);
    }
    if (isBothBitcoinAndLightning) {
      completionHandler({
        routeName: 'HandleOffchainAndOnChain',
        params: {
          onWalletSelect: this.isBothBitcoinAndLightningWalletSelect,
        },
      });
    } else if (DeeplinkSchemaMatch.isBitcoinAddress(event.url) || BitcoinBIP70TransactionDecode.matchesPaymentURL(event.url)) {
      completionHandler({
        routeName: 'SendDetails',
        params: {
          uri: event.url,
        },
      });
    } else if (DeeplinkSchemaMatch.isLightningInvoice(event.url)) {
      completionHandler({
        routeName: 'ScanLndInvoice',
        params: {
          uri: event.url,
        },
      });
    } else if (DeeplinkSchemaMatch.isLnUrl(event.url)) {
      completionHandler({
        routeName: 'LNDCreateInvoice',
        params: {
          uri: event.url,
        },
      });
    } else if (DeeplinkSchemaMatch.isSafelloRedirect(event)) {
      let urlObject = url.parse(event.url, true) // eslint-disable-line

      const safelloStateToken = urlObject.query['safello-state-token'];

      completionHandler({
        routeName: 'BuyBitcoin',
        params: {
          uri: event.url,
          safelloStateToken,
        },
      });
    } else {
      let urlObject = url.parse(event.url, true); // eslint-disable-line
      console.log('parsed', urlObject);
      (async () => {
        if (urlObject.protocol === 'bluewallet:' || urlObject.protocol === 'lapp:' || urlObject.protocol === 'blue:') {
          switch (urlObject.host) {
            case 'openlappbrowser':
              console.log('opening LAPP', urlObject.query.url);
              // searching for LN wallet:
              let haveLnWallet = false;
              for (let w of BlueApp.getWallets()) {
                if (w.type === LightningCustodianWallet.type) {
                  haveLnWallet = true;
                }
              }

              if (!haveLnWallet) {
                // need to create one
                let w = new LightningCustodianWallet();
                w.setLabel(this.state.label || w.typeReadable);

                try {
                  let lndhub = await AsyncStorage.getItem(AppStorage.LNDHUB);
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
              for (let w of BlueApp.getWallets()) {
                if (w.type === LightningCustodianWallet.type) {
                  lnWallet = w;
                  break;
                }
              }

              if (!lnWallet) {
                // something went wrong
                return;
              }

              this.navigator &&
                this.navigator.dispatch(
                  completionHandler({
                    routeName: 'LappBrowser',
                    params: {
                      fromSecret: lnWallet.getSecret(),
                      fromWallet: lnWallet,
                      url: urlObject.query.url,
                    },
                  }),
                );
              break;
          }
        }
      })();
    }
  }

  static isBitcoinAddress(address) {
    address = address
      .replace('bitcoin:', '')
      .replace('bitcoin=', '')
      .split('?')[0];
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
    let urlObject = url.parse(event.url, true) // eslint-disable-line

    return !!urlObject.query['safello-state-token'];
  }

  static isBothBitcoinAndLightning(url) {
    if (url.includes('lightning') && url.includes('bitcoin')) {
      const txInfo = url.split(/(bitcoin:|lightning:|lightning=|bitcoin=)+/);
      let bitcoin;
      let lndInvoice;
      for (const [index, value] of txInfo.entries()) {
        try {
          // Inside try-catch. We dont wan't to  crash in case of an out-of-bounds error.
          if (value.startsWith('bitcoin')) {
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
}

export default DeeplinkSchemaMatch;
