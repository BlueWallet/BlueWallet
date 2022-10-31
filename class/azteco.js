import Frisbee from 'frisbee';
import url from 'url';

export default class Azteco {
  /**
   * Redeems an Azteco bitcoin voucher.
   *
   * @param {string[]} voucher - 16-digit voucher code in groups of 4.
   * @param {string} address - Bitcoin address to send the redeemed bitcoin to.
   *
   * @returns {Promise<boolean>} Successfully redeemed or not. This method does not throw exceptions
   */
  static async redeem(voucher, address) {
    const api = new Frisbee({
      baseURI: 'https://azte.co/',
    });
    const url = `/blue_despatch.php?CODE_1=${voucher[0]}&CODE_2=${voucher[1]}&CODE_3=${voucher[2]}&CODE_4=${voucher[3]}&ADDRESS=${address}`;

    try {
      const response = await api.get(url);
      return response && response.originalResponse && +response.originalResponse.status === 200;
    } catch (_) {
      return false;
    }
  }

  static isRedeemUrl(u) {
    return u.startsWith('https://azte.co');
  }

  static getParamsFromUrl(u) {
    const urlObject = url.parse(u, true); // eslint-disable-line n/no-deprecated-api
    return {
      uri: u,
      c1: urlObject.query.c1,
      c2: urlObject.query.c2,
      c3: urlObject.query.c3,
      c4: urlObject.query.c4,
    };
  }
}
