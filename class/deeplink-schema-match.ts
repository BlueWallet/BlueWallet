import bip21, { TOptions } from 'bip21';
import * as bitcoin from 'bitcoinjs-lib';
import URL from 'url';
import { readFileOutsideSandbox } from '../blue_modules/fs';
import { Chain } from '../models/bitcoinUnits';
import { WatchOnlyWallet } from './';
import Azteco from './azteco';
import Lnurl from './lnurl';
import type { TWallet } from './wallets/types';

type TCompletionHandlerParams = [string, object];
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

  static normalizeUrl(url: string): string {
    let normalizedUrl = url;

    if (normalizedUrl.toLowerCase().startsWith('bluewallet:bitcoin:') || normalizedUrl.toLowerCase().startsWith('bluewallet:lightning:')) {
      normalizedUrl = normalizedUrl.substring(11);
    } else if (normalizedUrl.toLocaleLowerCase().startsWith('bluewallet://widget?action=')) {
      normalizedUrl = normalizedUrl.substring('bluewallet://'.length);
    }

    return normalizedUrl;
  }

  static routeFromUrl(
    url: string,
    context: TContext = { wallets: [], saveToDisk: () => {}, addWallet: () => {}, setSharedCosigner: () => {} },
  ): TCompletionHandlerParams | undefined {
    const normalizedUrl = DeeplinkSchemaMatch.normalizeUrl(url);

    if (DeeplinkSchemaMatch.isWidgetAction(normalizedUrl) && context.wallets.length > 0) {
      const wallet = context.wallets[0];
      const action = normalizedUrl.split('widget?action=')[1];

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
        }

        if (action === 'openReceive') {
          return [
            'DetailViewStackScreensStack',
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
            'ScanLNDInvoiceRoot',
            {
              screen: 'ScanLNDInvoice',
              params: {
                walletID: wallet.getID(),
              },
            },
          ];
        }

        if (action === 'openReceive') {
          return ['LNDCreateInvoiceRoot', { screen: 'LNDCreateInvoice', params: { walletID: wallet.getID() } }];
        }
      }
    }

    let isBothBitcoinAndLightning: TBothBitcoinAndLightning;
    try {
      isBothBitcoinAndLightning = DeeplinkSchemaMatch.isBothBitcoinAndLightning(normalizedUrl);
    } catch (e) {
      console.log(e);
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

    if (DeeplinkSchemaMatch.isBitcoinAddress(normalizedUrl)) {
      return [
        'SendDetailsRoot',
        {
          screen: 'SendDetails',
          params: {
            uri: normalizedUrl.replace('://', ':'),
          },
        },
      ];
    }

    if (DeeplinkSchemaMatch.isLightningInvoice(normalizedUrl)) {
      return [
        'ScanLNDInvoiceRoot',
        {
          screen: 'ScanLNDInvoice',
          params: {
            uri: normalizedUrl.replace('://', ':'),
          },
        },
      ];
    }

    if (DeeplinkSchemaMatch.isLnUrl(normalizedUrl)) {
      // at this point we can not tell if it is lnurl-pay or lnurl-withdraw since it needs additional async call
      // to the server, which is undesirable here, so LNDCreateInvoice screen will handle it for us and will
      // redirect user to LnurlPay screen if necessary
      return [
        'LNDCreateInvoiceRoot',
        {
          screen: 'LNDCreateInvoice',
          params: {
            uri: normalizedUrl.replace('lightning:', '').replace('LIGHTNING:', ''),
          },
        },
      ];
    }

    if (Lnurl.isLightningAddress(normalizedUrl)) {
      // this might be not just an email but a lightning address
      // @see https://lightningaddress.com
      return [
        'ScanLNDInvoiceRoot',
        {
          screen: 'ScanLNDInvoice',
          params: {
            uri: normalizedUrl,
          },
        },
      ];
    }

    if (Azteco.isRedeemUrl(normalizedUrl)) {
      return [
        'AztecoRedeemRoot',
        {
          screen: 'AztecoRedeem',
          params: Azteco.getParamsFromUrl(normalizedUrl),
        },
      ];
    }

    if (new WatchOnlyWallet().setSecret(normalizedUrl).init().valid()) {
      return [
        'AddWalletRoot',
        {
          screen: 'ImportWallet',
          params: {
            triggerImport: true,
            label: normalizedUrl,
          },
        },
      ];
    }

    const urlObject = URL.parse(normalizedUrl, true); // eslint-disable-line n/no-deprecated-api
    if (urlObject.protocol === 'bluewallet:' || urlObject.protocol === 'lapp:' || urlObject.protocol === 'blue:') {
      switch (urlObject.host) {
        case 'setelectrumserver':
          return [
            'ElectrumSettings',
            {
              server: DeeplinkSchemaMatch.getServerFromSetElectrumServerAction(normalizedUrl),
            },
          ];
        case 'setlndhuburl':
          return [
            'LightningSettings',
            {
              url: DeeplinkSchemaMatch.getUrlFromSetLndhubUrlAction(normalizedUrl),
            },
          ];
      }
    }

    return undefined;
  }

  /**
   * Examines the content of the event parameter.
   * If the content is recognizable, create a dictionary with the respective
   * navigation dictionary required by react-navigation
   *
   * @param event {{url: string}} URL deeplink as passed to app, e.g. `bitcoin:bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7?amount=666&label=Yo`
   * @param completionHandler {function} Callback that returns [string, params: object]
   */
  static navigationRouteFor(
    event: { url: string },
    completionHandler: (args: TCompletionHandlerParams) => void,
    context: TContext = { wallets: [], saveToDisk: () => {}, addWallet: () => {}, setSharedCosigner: () => {} },
  ) {
    if (event.url === null) {
      return;
    }
    if (typeof event.url !== 'string') {
      return;
    }

    event.url = DeeplinkSchemaMatch.normalizeUrl(event.url);

    if (DeeplinkSchemaMatch.isPossiblyPSBTFile(event.url)) {
      readFileOutsideSandbox(decodeURI(event.url))
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

    if (DeeplinkSchemaMatch.isPossiblyCosignerFile(event.url)) {
      readFileOutsideSandbox(decodeURI(event.url))
        .then(file => {
          // checks whether the necessary json keys are present in order to set a cosigner,
          // doesn't validate the values this happens later
          if (!file || !this.hasNeededJsonKeysForMultiSigSharing(file)) {
            return;
          }
          context.setSharedCosigner(file);
        })
        .catch(e => console.warn(e));
      return;
    }

    const route = DeeplinkSchemaMatch.routeFromUrl(event.url, context);
    if (route) {
      completionHandler(route);
    }
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
    return filePath.toLowerCase().endsWith('.txn');
  }

  static isPossiblyPSBTFile(filePath: string): boolean {
    return filePath.toLowerCase().endsWith('.psbt');
  }

  static isPossiblyCosignerFile(filePath: string): boolean {
    return filePath.toLowerCase().endsWith('.bwcosigner');
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
        'ScanLNDInvoiceRoot',
        {
          screen: 'ScanLNDInvoice',
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
    let isValidBitcoinAddress = false;
    try {
      bitcoin.address.toOutputScript(address);
      isValidBitcoinAddress = true;
    } catch (err) {
      isValidBitcoinAddress = false;
    }
    return isValidBitcoinAddress;
  }

  static isLightningInvoice(invoice: string): boolean {
    let isValidLightningInvoice = false;
    if (
      invoice.toLowerCase().startsWith('lightning:lnb') ||
      invoice.toLowerCase().startsWith('lightning://lnb') ||
      invoice.toLowerCase().startsWith('lnb')
    ) {
      isValidLightningInvoice = true;
    }
    return isValidLightningInvoice;
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
    } catch (e) {
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
          // Inside try-catch. We dont wan't to  crash in case of an out-of-bounds error.
          if (value.startsWith('bitcoin') || value.startsWith('BITCOIN')) {
            btc = `bitcoin:${txInfo[index + 1]}`;
            if (!DeeplinkSchemaMatch.isBitcoinAddress(btc)) {
              btc = false;
              break;
            }
          } else if (value.startsWith('lightning')) {
            const lnpart = txInfo[index + 1].split('&').find(el => el.toLowerCase().startsWith('ln'));
            lndInvoice = `lightning:${lnpart}`;
            if (!this.isLightningInvoice(lndInvoice)) {
              lndInvoice = false;
              break;
            }
          }
        } catch (e) {
          console.log(e);
        }
        if (btc && lndInvoice) break;
      }
      if (btc && lndInvoice) {
        return { bitcoin: btc, lndInvoice };
      } else {
        return undefined;
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

  static bip21encode(address: string, options?: TOptions): string {
    // uppercase address if bech32 to satisfy BIP_0173
    const isBech32 = address.startsWith('bc1');
    if (isBech32) {
      address = address.toUpperCase();
    }

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
