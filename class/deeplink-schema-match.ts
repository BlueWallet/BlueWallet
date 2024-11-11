import bip21, { TOptions } from 'bip21';
import * as bitcoin from 'bitcoinjs-lib';
import URL from 'url';

import { readFileOutsideSandbox } from '../blue_modules/fs';
import { Chain } from '../models/bitcoinUnits';
import { WatchOnlyWallet } from './';
import Azteco from './azteco';
import Lnurl from './lnurl';
import type { TWallet } from './wallets/types';

export type TCompletionHandlerParams = [string, object];
type TContext = {
  wallets: TWallet[];
  saveToDisk: () => void;
  addWallet: (wallet: TWallet) => void;
  setSharedCosigner: (cosigner: string) => void;
};

type TBothBitcoinAndLightning = { bitcoin: string; lndInvoice: string } | undefined;

class DeeplinkSchemaMatch {
  static hasSchema(schemaString: string): boolean {
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
   * If the content is recognizable, creates a dictionary with the respective
   * navigation dictionary required by react-navigation.
   *
   * @param event {{url: string}} URL deeplink as passed to app, e.g. `bitcoin:bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7?amount=666&label=Yo`
   * @param context {TContext} Context containing wallets and utility methods
   * @returns {Promise<TCompletionHandlerParams | void>} Promise resolving to navigation parameters
   */
  static async navigationRouteFor(
    event: { url: string },
    context: TContext = { wallets: [], saveToDisk: () => {}, addWallet: () => {}, setSharedCosigner: () => {} },
  ): Promise<TCompletionHandlerParams | void> {
    if (!event.url || typeof event.url !== 'string') {
      return;
    }

    // Normalize the URL by removing specific prefixes
    if (event.url.toLowerCase().startsWith('bluewallet:bitcoin:') || event.url.toLowerCase().startsWith('bluewallet:lightning:')) {
      event.url = event.url.substring(11);
    } else if (event.url.toLocaleLowerCase().startsWith('bluewallet://widget?action=')) {
      event.url = event.url.substring('bluewallet://'.length);
    }

    // Handle widget actions
    if (DeeplinkSchemaMatch.isWidgetAction(event.url)) {
      if (context.wallets.length > 0) {
        const wallet = context.wallets[0];
        const action = event.url.split('widget?action=')[1];
        if (wallet.chain === Chain.ONCHAIN) {
          if (action === 'openSend') {
            return [
              'SendDetailsRoot',
              {
                screen: 'SendDetails',
                params: {
                  walletID: wallet.getID(),
                },
              },
            ];
          } else if (action === 'openReceive') {
            return [
              'ReceiveDetailsRoot',
              {
                screen: 'ReceiveDetails',
                params: {
                  walletID: wallet.getID(),
                },
              },
            ];
          }
        } else if (wallet.chain === Chain.OFFCHAIN) {
          if (action === 'openSend') {
            return [
              'ScanLndInvoiceRoot',
              {
                screen: 'ScanLndInvoice',
                params: {
                  walletID: wallet.getID(),
                },
              },
            ];
          } else if (action === 'openReceive') {
            return [
              'LNDCreateInvoiceRoot',
              {
                screen: 'LNDCreateInvoice',
                params: { walletID: wallet.getID() },
              },
            ];
          }
        }
      }
    }

    // Handle possibly signed PSBT files
    if (DeeplinkSchemaMatch.isPossiblySignedPSBTFile(event.url)) {
      try {
        const file = await readFileOutsideSandbox(decodeURI(event.url));
        if (file) {
          return [
            'SendDetailsRoot',
            {
              screen: 'PsbtWithHardwareWallet',
              params: {
                deepLinkPSBT: file,
              },
            },
          ];
        }
      } catch (e) {
        console.warn(e);
      }
      return;
    }

    // Handle possibly cosigner files
    if (DeeplinkSchemaMatch.isPossiblyCosignerFile(event.url)) {
      try {
        const file = await readFileOutsideSandbox(decodeURI(event.url));
        // Checks whether the necessary json keys are present in order to set a cosigner,
        // doesn't validate the values this happens later
        if (file && this.hasNeededJsonKeysForMultiSigSharing(file)) {
          context.setSharedCosigner(file);
        }
      } catch (e) {
        console.warn(e);
      }
      return;
    }

    // Handle both Bitcoin and Lightning URIs
    let isBothBitcoinAndLightning: TBothBitcoinAndLightning;
    try {
      isBothBitcoinAndLightning = DeeplinkSchemaMatch.isBothBitcoinAndLightning(event.url);
    } catch (e) {
      console.log(e);
      isBothBitcoinAndLightning = undefined;
    }

    if (isBothBitcoinAndLightning) {
      return [
        'SelectWallet',
        {
          onWalletSelect: (wallet: TWallet, { navigation }: any) => {
            navigation.pop(); // close select wallet screen
            navigation.navigate(...DeeplinkSchemaMatch.isBothBitcoinAndLightningOnWalletSelect(wallet, isBothBitcoinAndLightning));
          },
        },
      ];
    }

    // Handle individual Bitcoin and Lightning URIs
    if (DeeplinkSchemaMatch.isBitcoinAddress(event.url)) {
      return [
        'SendDetailsRoot',
        {
          screen: 'SendDetails',
          params: {
            uri: event.url.replace('://', ':'),
          },
        },
      ];
    } else if (DeeplinkSchemaMatch.isLightningInvoice(event.url)) {
      return [
        'ScanLndInvoiceRoot',
        {
          screen: 'ScanLndInvoice',
          params: {
            uri: event.url.replace('://', ':'),
          },
        },
      ];
    } else if (DeeplinkSchemaMatch.isLnUrl(event.url)) {
      // At this point we cannot tell if it is lnurl-pay or lnurl-withdraw since it needs additional async call
      // to the server, which is undesirable here, so LNDCreateInvoice screen will handle it for us and will
      // redirect user to LnurlPay screen if necessary
      return [
        'LNDCreateInvoiceRoot',
        {
          screen: 'LNDCreateInvoice',
          params: {
            uri: event.url.replace('lightning:', '').replace('LIGHTNING:', ''),
          },
        },
      ];
    } else if (Lnurl.isLightningAddress(event.url)) {
      // This might be not just an email but a lightning address
      // @see https://lightningaddress.com
      return [
        'ScanLndInvoiceRoot',
        {
          screen: 'ScanLndInvoice',
          params: {
            uri: event.url,
          },
        },
      ];
    } else if (Azteco.isRedeemUrl(event.url)) {
      return [
        'AztecoRedeemRoot',
        {
          screen: 'AztecoRedeem',
          params: Azteco.getParamsFromUrl(event.url),
        },
      ];
    } else if (new WatchOnlyWallet().setSecret(event.url).init().valid()) {
      return [
        'AddWalletRoot',
        {
          screen: 'ImportWallet',
          params: {
            triggerImport: true,
            label: event.url,
          },
        },
      ];
    }

    // Handle other bluewallet protocols
    const urlObject = URL.parse(event.url, true); // eslint-disable-line n/no-deprecated-api
    if (urlObject.protocol === 'bluewallet:' || urlObject.protocol === 'lapp:' || urlObject.protocol === 'blue:') {
      switch (urlObject.host) {
        case 'setelectrumserver':
          return [
            'ElectrumSettings',
            {
              server: DeeplinkSchemaMatch.getServerFromSetElectrumServerAction(event.url),
            },
          ];
        case 'setlndhuburl':
          return [
            'LightningSettings',
            {
              url: DeeplinkSchemaMatch.getUrlFromSetLndhubUrlAction(event.url),
            },
          ];
        default:
          break;
      }
    }
    return undefined;
  }

  /**
   * Extracts server from a deeplink like `bluewallet:setelectrumserver?server=electrum1.bluewallet.io%3A443%3As`
   * returns FALSE if none found
   *
   * @param url {string}
   * @return {string|boolean}
   */
  static getServerFromSetElectrumServerAction(url: string): string | false {
    if (!url.startsWith('bluewallet:setelectrumserver') && !url.startsWith('setelectrumserver')) return false;
    const splt = url.split('server=');
    if (splt[1]) return decodeURIComponent(splt[1]);
    return false;
  }

  /**
   * Extracts url from a deeplink like `bluewallet:setlndhuburl?url=https%3A%2F%2Flndhub.herokuapp.com`
   * returns FALSE if none found
   *
   * @param url {string}
   * @return {string|boolean}
   */
  static getUrlFromSetLndhubUrlAction(url: string): string | false {
    if (!url.startsWith('bluewallet:setlndhuburl') && !url.startsWith('setlndhuburl')) return false;
    const splt = url.split('url=');
    if (splt[1]) return decodeURIComponent(splt[1]);
    return false;
  }

  static isTXNFile(filePath: string): boolean {
    return (
      (filePath.toLowerCase().startsWith('file:') || filePath.toLowerCase().startsWith('content:')) &&
      filePath.toLowerCase().endsWith('.txn')
    );
  }

  static isPossiblySignedPSBTFile(filePath: string): boolean {
    return (
      (filePath.toLowerCase().startsWith('file:') || filePath.toLowerCase().startsWith('content:')) &&
      filePath.toLowerCase().endsWith('-signed.psbt')
    );
  }

  static isPossiblyPSBTFile(filePath: string): boolean {
    return (
      (filePath.toLowerCase().startsWith('file:') || filePath.toLowerCase().startsWith('content:')) &&
      filePath.toLowerCase().endsWith('.psbt')
    );
  }

  static isPossiblyCosignerFile(filePath: string): boolean {
    return (
      (filePath.toLowerCase().startsWith('file:') || filePath.toLowerCase().startsWith('content:')) &&
      filePath.toLowerCase().endsWith('.bwcosigner')
    );
  }

  static isBothBitcoinAndLightningOnWalletSelect(wallet: TWallet, uri: any): TCompletionHandlerParams {
    if (wallet.chain === Chain.ONCHAIN) {
      return [
        'SendDetailsRoot',
        {
          screen: 'SendDetails',
          params: {
            uri: uri.bitcoin,
            walletID: wallet.getID(),
          },
        },
      ];
    } else {
      return [
        'ScanLndInvoiceRoot',
        {
          screen: 'ScanLndInvoice',
          params: {
            uri: uri.lndInvoice,
            walletID: wallet.getID(),
          },
        },
      ];
    }
  }

  static isBitcoinAddress(address: string): boolean {
    address = address.replace('://', ':').replace('bitcoin:', '').replace('BITCOIN:', '').replace('bitcoin=', '').split('?')[0];
    try {
      bitcoin.address.toOutputScript(address);
      return true;
    } catch {
      return false;
    }
  }

  static isLightningInvoice(invoice: string): boolean {
    const lowerInvoice = invoice.toLowerCase();
    return lowerInvoice.startsWith('lightning:lnb') || lowerInvoice.startsWith('lightning://lnb') || lowerInvoice.startsWith('lnb');
  }

  static isLnUrl(text: string): boolean {
    return Lnurl.isLnurl(text);
  }

  static isWidgetAction(text: string): boolean {
    return text.startsWith('widget?action=');
  }

  static hasNeededJsonKeysForMultiSigSharing(str: string): boolean {
    let obj;

    // Check if it's a valid JSON
    try {
      obj = JSON.parse(str);
    } catch {
      return false;
    }

    // Check for the existence and type of the keys
    return typeof obj.xfp === 'string' && typeof obj.xpub === 'string' && typeof obj.path === 'string';
  }

  static isBothBitcoinAndLightning(url: string): TBothBitcoinAndLightning {
    if (url.includes('lightning') && (url.includes('bitcoin') || url.includes('BITCOIN'))) {
      const txInfo = url.split(/(bitcoin:\/\/|BITCOIN:\/\/|bitcoin:|BITCOIN:|lightning:|lightning=|bitcoin=)+/);
      let btc: string | false = false;
      let lndInvoice: string | false = false;
      for (const [index, value] of txInfo.entries()) {
        try {
          // Inside try-catch. We don't want to crash in case of an out-of-bounds error.
          if (value.startsWith('bitcoin') || value.startsWith('BITCOIN')) {
            btc = `bitcoin:${txInfo[index + 1]}`;
            if (!DeeplinkSchemaMatch.isBitcoinAddress(btc)) {
              btc = false;
              break;
            }
          } else if (value.startsWith('lightning')) {
            const lnpart = txInfo[index + 1].split('&').find(el => el.toLowerCase().startsWith('ln'));
            if (lnpart) {
              lndInvoice = `lightning:${lnpart}`;
              if (!this.isLightningInvoice(lndInvoice)) {
                lndInvoice = false;
                break;
              }
            }
          }
        } catch (e) {
          console.log(e);
        }
        if (btc && lndInvoice) break;
      }
      if (btc && lndInvoice) {
        return { bitcoin: btc, lndInvoice };
      }
    }
    return undefined;
  }

  static bip21decode(uri?: string) {
    if (!uri) {
      throw new Error('No URI provided');
    }
    let replacedUri = uri;
    for (const replaceMe of ['BITCOIN://', 'bitcoin://', 'BITCOIN:']) {
      replacedUri = replacedUri.replace(replaceMe, 'bitcoin:');
    }

    return bip21.decode(replacedUri);
  }

  static bip21encode(address: string, options: TOptions): string {
    for (const key in options) {
      if (key === 'label' && String(options[key]).replace(' ', '').length === 0) {
        delete options[key];
      }
      if (key === 'amount' && !(Number(options[key]) > 0)) {
        delete options[key];
      }
    }
    return bip21.encode(address, options);
  }

  static decodeBitcoinUri(uri: string) {
    let amount;
    let address = uri || '';
    let memo = '';
    let payjoinUrl = '';
    try {
      const parsedBitcoinUri = DeeplinkSchemaMatch.bip21decode(uri);
      address = parsedBitcoinUri.address ? parsedBitcoinUri.address.toString() : address;
      if ('options' in parsedBitcoinUri) {
        if (parsedBitcoinUri.options.amount) {
          amount = Number(parsedBitcoinUri.options.amount);
        }
        if (parsedBitcoinUri.options.label) {
          memo = parsedBitcoinUri.options.label;
        }
        if (parsedBitcoinUri.options.pj) {
          payjoinUrl = parsedBitcoinUri.options.pj;
        }
      }
    } catch (_) {}
    return { address, amount, memo, payjoinUrl };
  }
}

export default DeeplinkSchemaMatch;
