import URL from 'url';
import { fetch } from '../util/fetch';

export type AztecoVoucher = {
  c1: string;
  c2: string;
  c3: string;
  c4: string;
};

export default class Azteco {
  /**
   * Redeems an Azteco bitcoin voucher.
   *
   * @param {AztecoVoucher} voucher - 16-digit voucher code in groups of 4.
   * @param {string} address - Bitcoin address to send the redeemed bitcoin to.
   *
   * @returns {Promise<boolean>} Successfully redeemed or not. This method does not throw exceptions
   */
  static async redeem(voucher: AztecoVoucher, address: string): Promise<boolean> {
    const baseURI = 'https://azte.co/';
    const url = `${baseURI}blue_despatch.php?CODE_1=${voucher.c1}&CODE_2=${voucher.c2}&CODE_3=${voucher.c3}&CODE_4=${voucher.c4}&ADDRESS=${address}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
      });
      return response && response.status === 200;
    } catch (_) {
      return false;
    }
  }

  static isRedeemUrl(u: string): boolean {
    return u.startsWith('https://azte.co');
  }

  static getParamsFromUrl(u: string): { aztecoVoucher: AztecoVoucher } {
    const urlObject = URL.parse(u, true); // eslint-disable-line n/no-deprecated-api
    const q = urlObject.query;

    // new format https://azte.co/redeem?code=1111222233334444
    if (typeof q.code === 'string' && q.code.length === 16) {
      return {
        aztecoVoucher: {
          c1: q.code.substring(0, 4),
          c2: q.code.substring(4, 8),
          c3: q.code.substring(8, 12),
          c4: q.code.substring(12, 16),
        },
      };
    }

    // old format https://azte.co?c1=1111&c2=2222&c3=3333&c4=4444
    if (
      typeof q.c1 === 'string' &&
      typeof q.c2 === 'string' &&
      typeof q.c3 === 'string' &&
      typeof q.c4 === 'string' &&
      q.c1.length === 4 &&
      q.c2.length === 4 &&
      q.c3.length === 4 &&
      q.c4.length === 4
    ) {
      return {
        aztecoVoucher: {
          c1: q.c1,
          c2: q.c2,
          c3: q.c3,
          c4: q.c4,
        },
      };
    }

    // if the url does not match any of the formats, throw an error
    throw new Error('Invalid Azteco URL');
  }
}
