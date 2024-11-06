import bip21, { TOptions } from 'bip21';
import * as bitcoin from 'bitcoinjs-lib';

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

  static getNavigationDetails(url: string) {
    // Simplify by focusing on custom cases
    if (url.toLowerCase().startsWith('bluewallet:bitcoin:') || url.toLowerCase().startsWith('bluewallet:lightning:')) {
      url = url.substring(11);
    }

    if (this.isBothBitcoinAndLightning(url)) {
      return {
        navigateTo: 'SelectWallet',
        params: { uri: this.isBothBitcoinAndLightning(url) },
      };
    }

    // Add further custom handling as needed
    return { navigateTo: 'DefaultScreen', params: {} };
  }

  static isBothBitcoinAndLightning(url: string): TBothBitcoinAndLightning {
    if (url.includes('lightning') && (url.includes('bitcoin') || url.includes('BITCOIN'))) {
      const txInfo = url.split(/(bitcoin:\/\/|BITCOIN:\/\/|bitcoin:|BITCOIN:|lightning:|lightning=|bitcoin=)+/);
      let btc: string | false = false;
      let lndInvoice: string | false = false;
      for (const [index, value] of txInfo.entries()) {
        try {
          if (value.startsWith('bitcoin') || value.startsWith('BITCOIN')) {
            btc = `bitcoin:${txInfo[index + 1]}`;
            if (!DeeplinkSchemaMatch.isBitcoinAddress(btc)) {
              btc = false;
              break;
            }
          } else if (value.startsWith('lightning')) {
            const lnpart = txInfo[index + 1].split('&').find((el) => el.toLowerCase().startsWith('ln'));
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
      }
    }
    return undefined;
  }

  static isBitcoinAddress(address: string): boolean {
    try {
      bitcoin.address.toOutputScript(address.replace('bitcoin:', ''));
      return true;
    } catch {
      return false;
    }
  }

  static isLightningInvoice(invoice: string): boolean {
    return invoice.toLowerCase().startsWith('lightning:lnb') || invoice.toLowerCase().startsWith('lnb');
  }

  static bip21decode(uri?: string) {
    if (!uri) throw new Error('No URI provided');
    return bip21.decode(uri.replace(/BITCOIN:\/\/|bitcoin:\/\//gi, 'bitcoin:'));
  }

  static bip21encode(address: string, options: TOptions): string {
    for (const key in options) {
      if (key === 'label' && !options[key].trim()) delete options[key];
      if (key === 'amount' && !(Number(options[key]) > 0)) delete options[key];
    }
    return bip21.encode(address, options);
  }

  static decodeBitcoinUri(uri: string) {
    let amount, address = uri, memo = '', payjoinUrl = '';
    try {
      const parsedUri = this.bip21decode(uri);
      address = parsedUri.address || address;
      amount = parsedUri.options.amount ? Number(parsedUri.options.amount) : undefined;
      memo = parsedUri.options.label || '';
      payjoinUrl = parsedUri.options.pj || '';
    } catch {}
    return { address, amount, memo, payjoinUrl };
  }
}

export default DeeplinkSchemaMatch;