/* global describe, it */
import Lnurl from '../../class/lnurl';
const assert = require('assert');

describe('LNURL', function () {
  it('can findlnurl', () => {
    const lnurlExample = 'LNURL1DP68GURN8GHJ7MRWW3UXYMM59E3XJEMNW4HZU7RE0GHKCMN4WFKZ7URP0YLH2UM9WF5KG0FHXYCNV9G9W58';
    const found = Lnurl.findlnurl(lnurlExample);
    assert.strictEqual(found, 'lnurl1dp68gurn8ghj7mrww3uxymm59e3xjemnw4hzu7re0ghkcmn4wfkz7urp0ylh2um9wf5kg0fhxycnv9g9w58');
  });

  it('can getUrlFromLnurl()', () => {
    assert.strictEqual(
      Lnurl.getUrlFromLnurl('LNURL1DP68GURN8GHJ7MRWW3UXYMM59E3XJEMNW4HZU7RE0GHKCMN4WFKZ7URP0YLH2UM9WF5KG0FHXYCNV9G9W58'),
      'https://lntxbot.bigsun.xyz/lnurl/pay?userid=7116',
    );
    assert.strictEqual(Lnurl.getUrlFromLnurl('bs'), false);
  });

  it('can isLnurl()', () => {
    assert.ok(Lnurl.isLnurl('LNURL1DP68GURN8GHJ7MRWW3UXYMM59E3XJEMNW4HZU7RE0GHKCMN4WFKZ7URP0YLH2UM9WF5KG0FHXYCNV9G9W58'));
    assert.ok(!Lnurl.isLnurl('bs'));
  });

  it('can callLnurlPayService() and requestBolt11FromLnurlPayService()', async () => {
    const LN = new Lnurl('LNURL1DP68GURN8GHJ7MRWW3UXYMM59E3XJEMNW4HZU7RE0GHKCMN4WFKZ7URP0YLH2UM9WF5KG0FHXYCNV9G9W58');

    // poor-man's mock:
    LN._fetchGet = LN.fetchGet;
    LN.fetchGet = () => {
      return {
        status: 'OK',
        callback: 'https://lntxbot.bigsun.xyz/lnurl/pay/callback?userid=7116',
        tag: 'payRequest',
        maxSendable: 1000000000,
        minSendable: 1000,
        metadata: '[["text/plain","Fund @overtorment account on t.me/lntxbot."]]',
      };
    };
    const lnurlpayPayload = await LN.callLnurlPayService();
    assert.deepStrictEqual(lnurlpayPayload, {
      amount: 1,
      callback: 'https://lntxbot.bigsun.xyz/lnurl/pay/callback?userid=7116',
      description: 'Fund @overtorment account on t.me/lntxbot.',
      domain: 'lntxbot.bigsun.xyz',
      fixed: false,
      image: undefined,
      max: 1000000,
      metadata: '[["text/plain","Fund @overtorment account on t.me/lntxbot."]]',
      min: 1,
    });

    // mock:
    LN.fetchGet = () => {
      return {
        status: 'OK',
        successAction: null,
        routes: [],
        pr:
          'lnbc20n1p03s853pp58v9lrqahj2zyuzsdqqm3wnt2damlnkkuzwm8s7jkmnauhtkq4fjshp5z766racq95ncpk27nksev2ntu8wte77zd46g8uvzlnm5hhwukjrqcqzysxq9p5hsqrzjq29zewx4rezd04lpprpwsz5cesrfz30qtfkjqfw0249a3pn0uv5exzdefqqqxecqqqqqqqlgqqqq03sq9qsp52guktgy9u0xpky06n7slhjcvkassj0xpc3t9wadfsa0sl5x4fz9s9qy9qsqff5ycjg6xh3cc0vf8wxzxdajrdl9pka3nl3v37vcqj0qrdkzhsqxs8atfnxm2xenlkz7fpghlnuypux7hdp63zct3fr9px2e349kyqspu3gswx',
        disposable: false,
      };
    };
    const rez = await LN.requestBolt11FromLnurlPayService(2);
    assert.deepStrictEqual(rez, {
      status: 'OK',
      successAction: null,
      routes: [],
      pr:
        'lnbc20n1p03s853pp58v9lrqahj2zyuzsdqqm3wnt2damlnkkuzwm8s7jkmnauhtkq4fjshp5z766racq95ncpk27nksev2ntu8wte77zd46g8uvzlnm5hhwukjrqcqzysxq9p5hsqrzjq29zewx4rezd04lpprpwsz5cesrfz30qtfkjqfw0249a3pn0uv5exzdefqqqxecqqqqqqqlgqqqq03sq9qsp52guktgy9u0xpky06n7slhjcvkassj0xpc3t9wadfsa0sl5x4fz9s9qy9qsqff5ycjg6xh3cc0vf8wxzxdajrdl9pka3nl3v37vcqj0qrdkzhsqxs8atfnxm2xenlkz7fpghlnuypux7hdp63zct3fr9px2e349kyqspu3gswx',
      disposable: false,
    });

    assert.strictEqual(LN.getSuccessAction(), null);
    assert.strictEqual(LN.getDomain(), 'lntxbot.bigsun.xyz');
    assert.strictEqual(LN.getDescription(), 'Fund @overtorment account on t.me/lntxbot.');
    assert.strictEqual(LN.getImage(), undefined);
    assert.strictEqual(LN.getLnurl(), 'LNURL1DP68GURN8GHJ7MRWW3UXYMM59E3XJEMNW4HZU7RE0GHKCMN4WFKZ7URP0YLH2UM9WF5KG0FHXYCNV9G9W58');
    assert.strictEqual(LN.getDisposable(), false);
  });

  it('can decipher AES', () => {
    const ciphertext = 'vCWn4TMhIKubUc5+aBVfvw==';
    const iv = 'eTGduB45hWTOxHj1dR+LJw==';
    const preimage = 'bf62911aa53c017c27ba34391f694bc8bf8aaf59b4ebfd9020e66ac0412e189b';

    assert.strictEqual(Lnurl.decipherAES(ciphertext, preimage, iv), '1234');
  });
});
