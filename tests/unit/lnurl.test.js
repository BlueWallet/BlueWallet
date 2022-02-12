import Lnurl from '../../class/lnurl';
const assert = require('assert');

describe('LNURL', function () {
  it('can findlnurl', () => {
    const base = 'lnurl1dp68gurn8ghj7mrww3uxymm59e3xjemnw4hzu7re0ghkcmn4wfkz7urp0ylh2um9wf5kg0fhxycnv9g9w58';
    assert.strictEqual(Lnurl.findlnurl(base), base);
    assert.strictEqual(Lnurl.findlnurl(base.toUpperCase()), base);
    assert.strictEqual(Lnurl.findlnurl('https://site.com/?lightning=' + base), base);
    assert.strictEqual(Lnurl.findlnurl('https://site.com/?lightning=' + base.toUpperCase()), base);
    assert.strictEqual(Lnurl.findlnurl('https://site.com/?nada=nada&lightning=' + base), base);
    assert.strictEqual(Lnurl.findlnurl('https://site.com/?nada=nada&lightning=' + base.toUpperCase()), base);
    assert.strictEqual(Lnurl.findlnurl('bs'), null);
    assert.strictEqual(Lnurl.findlnurl('https://site.com'), null);
    assert.strictEqual(Lnurl.findlnurl('https://site.com/?bs=' + base), null);
  });

  it('can getUrlFromLnurl()', () => {
    assert.strictEqual(
      Lnurl.getUrlFromLnurl('LNURL1DP68GURN8GHJ7MRWW3UXYMM59E3XJEMNW4HZU7RE0GHKCMN4WFKZ7URP0YLH2UM9WF5KG0FHXYCNV9G9W58'),
      'https://lntxbot.bigsun.xyz/lnurl/pay?userid=7116',
    );
    assert.strictEqual(
      Lnurl.getUrlFromLnurl(
        'https://lnbits.com/?lightning=LNURL1DP68GURN8GHJ7MRWVF5HGUEWVDHK6TMHD96XSERJV9MJ7CTSDYHHVVF0D3H82UNV9UM9JDENFPN5SMMK2359J5RKWVMKZ5ZVWAV4VJD63TM',
      ),
      'https://lnbits.com/withdraw/api/v1/lnurl/6Y73HgHovThYPvs7aPLwYV',
    );
    assert.strictEqual(Lnurl.getUrlFromLnurl('bs'), false);
  });

  it('can isLnurl()', () => {
    assert.ok(Lnurl.isLnurl('LNURL1DP68GURN8GHJ7MRWW3UXYMM59E3XJEMNW4HZU7RE0GHKCMN4WFKZ7URP0YLH2UM9WF5KG0FHXYCNV9G9W58'));
    assert.ok(
      Lnurl.isLnurl(
        'https://site.com/?lightning=LNURL1DP68GURN8GHJ7MRWW3UXYMM59E3XJEMNW4HZU7RE0GHKCMN4WFKZ7URP0YLH2UM9WF5KG0FHXYCNV9G9W58',
      ),
    );
    assert.ok(
      !Lnurl.isLnurl('https://site.com/?bs=LNURL1DP68GURN8GHJ7MRWW3UXYMM59E3XJEMNW4HZU7RE0GHKCMN4WFKZ7URP0YLH2UM9WF5KG0FHXYCNV9G9W58'),
    );
    assert.ok(!Lnurl.isLnurl('bs'));
  });

  it('can parseOnionUrl()', () => {
    const vectors = [
      {
        test: 'http://abc.onion/path',
        expected: ['http://abc.onion', '/path'],
      },
      {
        test: 'http://abc.onion:12345/path',
        expected: ['http://abc.onion:12345', '/path'],
      },
      {
        test: 'http://abc.onion/',
        expected: ['http://abc.onion', '/'],
      },
      {
        test: 'http://abc.onion',
        expected: ['http://abc.onion', undefined],
      },
      {
        test: 'https://abc.onion',
        expected: null,
      },
      {
        test: 'http://abc.com',
        expected: null,
      },
      {
        test: 'http://a@bc.onion',
        expected: null,
      },
      {
        test: 'http://a/bc.onion',
        expected: null,
      },
      {
        test: 'http://a:bc.onion',
        expected: null,
      },
    ];
    for (const { test, expected } of vectors) {
      assert.deepStrictEqual(Lnurl.parseOnionUrl(test), expected);
    }
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
      commentAllowed: undefined,
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
        pr: 'lnbc20n1p03s853pp58v9lrqahj2zyuzsdqqm3wnt2damlnkkuzwm8s7jkmnauhtkq4fjshp5z766racq95ncpk27nksev2ntu8wte77zd46g8uvzlnm5hhwukjrqcqzysxq9p5hsqrzjq29zewx4rezd04lpprpwsz5cesrfz30qtfkjqfw0249a3pn0uv5exzdefqqqxecqqqqqqqlgqqqq03sq9qsp52guktgy9u0xpky06n7slhjcvkassj0xpc3t9wadfsa0sl5x4fz9s9qy9qsqff5ycjg6xh3cc0vf8wxzxdajrdl9pka3nl3v37vcqj0qrdkzhsqxs8atfnxm2xenlkz7fpghlnuypux7hdp63zct3fr9px2e349kyqspu3gswx',
        disposable: false,
      };
    };
    const rez = await LN.requestBolt11FromLnurlPayService(2);
    assert.deepStrictEqual(rez, {
      status: 'OK',
      successAction: null,
      routes: [],
      pr: 'lnbc20n1p03s853pp58v9lrqahj2zyuzsdqqm3wnt2damlnkkuzwm8s7jkmnauhtkq4fjshp5z766racq95ncpk27nksev2ntu8wte77zd46g8uvzlnm5hhwukjrqcqzysxq9p5hsqrzjq29zewx4rezd04lpprpwsz5cesrfz30qtfkjqfw0249a3pn0uv5exzdefqqqxecqqqqqqqlgqqqq03sq9qsp52guktgy9u0xpky06n7slhjcvkassj0xpc3t9wadfsa0sl5x4fz9s9qy9qsqff5ycjg6xh3cc0vf8wxzxdajrdl9pka3nl3v37vcqj0qrdkzhsqxs8atfnxm2xenlkz7fpghlnuypux7hdp63zct3fr9px2e349kyqspu3gswx',
      disposable: false,
    });

    assert.strictEqual(LN.getSuccessAction(), null);
    assert.strictEqual(LN.getDomain(), 'lntxbot.bigsun.xyz');
    assert.strictEqual(LN.getDescription(), 'Fund @overtorment account on t.me/lntxbot.');
    assert.strictEqual(LN.getImage(), undefined);
    assert.strictEqual(LN.getLnurl(), 'LNURL1DP68GURN8GHJ7MRWW3UXYMM59E3XJEMNW4HZU7RE0GHKCMN4WFKZ7URP0YLH2UM9WF5KG0FHXYCNV9G9W58');
    assert.strictEqual(LN.getDisposable(), false);
    assert.strictEqual(LN.getCommentAllowed(), false);
  });

  it('can callLnurlPayService() and requestBolt11FromLnurlPayService() with comment', async () => {
    const LN = new Lnurl('lnurl1dp68gurn8ghj7cmgv96zucnvd9u8gampd3kx2apwvdhk6tmpwp5j7um9dejz6ar90p6q3eqkzd');

    // poor-man's mock:
    LN._fetchGet = LN.fetchGet;
    LN.fetchGet = () => {
      return {
        status: 'OK',
        callback: 'https://lntxbot.bigsun.xyz/lnurl/pay/callback?userid=7116',
        tag: 'payRequest',
        maxSendable: 1000000000,
        minSendable: 1000,
        metadata: '[["text/plain","Comment on lnurl-pay chat 📝"]]',
        commentAllowed: 144,
      };
    };
    const lnurlpayPayload = await LN.callLnurlPayService();
    assert.deepStrictEqual(lnurlpayPayload, {
      amount: 1,
      callback: 'https://lntxbot.bigsun.xyz/lnurl/pay/callback?userid=7116',
      commentAllowed: 144,
      description: 'Comment on lnurl-pay chat 📝',
      domain: 'lntxbot.bigsun.xyz',
      fixed: false,
      image: undefined,
      max: 1000000,
      metadata: '[["text/plain","Comment on lnurl-pay chat 📝"]]',
      min: 1,
    });

    assert.strictEqual(LN.getDomain(), 'lntxbot.bigsun.xyz');
    assert.strictEqual(LN.getDescription(), 'Comment on lnurl-pay chat 📝');
    assert.strictEqual(LN.getImage(), undefined);
    assert.strictEqual(LN.getLnurl(), 'lnurl1dp68gurn8ghj7cmgv96zucnvd9u8gampd3kx2apwvdhk6tmpwp5j7um9dejz6ar90p6q3eqkzd');
    assert.strictEqual(LN.getCommentAllowed(), 144);

    // mock only to get fetched url:
    let urlUsed = '';
    LN.fetchGet = urlToFetch => {
      urlUsed = urlToFetch;
      return {
        disposable: true,
        pr: 'lnbc100n1psj8g53pp50t7xmnvnzsm6y78kcvqqudlnnushc04sevtneessp463ndpf83qshp5nh0t5w4w5zh8jdnn5a03hk4pk279l3eex4nzazgkwmqpn7wga6hqcqzpgxqr23ssp5ddpxstde98ekccnvzms67h9uflxmpj939aj4rwc5xwru0x6nfkus9qyyssq55n5hn9gwmrzx2ekajlqshvu53u8h3p0npu7ng4d0lnttgueprzr4mtpwa83jrpz4skhdx3p0xnh9jc92ysnu8umuwa70hkxhp44svsq9u5uqr',
        successAction: null,
      };
    };

    try {
      await LN.requestBolt11FromLnurlPayService(10, 'hola pendejo!');
    } finally {
      assert.ok(urlUsed.includes('&comment=hola%20pendejo!'));
    }
  });

  it('can decipher AES', () => {
    const ciphertext = 'vCWn4TMhIKubUc5+aBVfvw==';
    const iv = 'eTGduB45hWTOxHj1dR+LJw==';
    const preimage = 'bf62911aa53c017c27ba34391f694bc8bf8aaf59b4ebfd9020e66ac0412e189b';

    assert.strictEqual(Lnurl.decipherAES(ciphertext, preimage, iv), '1234');
  });
});

describe('lightning address', function () {
  it('can getUrlFromLnurl()', () => {
    assert.strictEqual(Lnurl.getUrlFromLnurl('lnaddress@zbd.gg'), 'https://zbd.gg/.well-known/lnurlp/lnaddress');
    assert.strictEqual(Lnurl.getUrlFromLnurl('lnaddress@hidden.onion'), 'http://hidden.onion/.well-known/lnurlp/lnaddress');
  });

  it('can detect', async () => {
    assert.ok(Lnurl.isLightningAddress('lnaddress@zbd.gg'));
    assert.ok(Lnurl.isLightningAddress('avatar@st5owtpsa2e62yf64luxogbecj7lk3t5vmesshsnrzu2untyf2i4t4ad.onion'));
    assert.ok(Lnurl.isLightningAddress(' lnaddress@zbd.gg '));
    assert.ok(Lnurl.isLightningAddress(' lnaddress@zbd.gg '));
    assert.ok(Lnurl.isLightningAddress(' lnaddress@8.8.8.8 '));
    assert.ok(Lnurl.isLightningAddress(' lnaddress@hidden.onion '));
    assert.ok(!Lnurl.isLightningAddress(' bla bla '));
    assert.ok(!Lnurl.isLightningAddress(''));
    assert.ok(!Lnurl.isLightningAddress('@'));
    assert.ok(!Lnurl.isLightningAddress('@a'));
    assert.ok(!Lnurl.isLightningAddress('a@'));
  });

  it('can authenticate', async () => {
    const LN = new Lnurl(
      'LNURL1DP68GURN8GHJ7MRFVA58GMNFDENKCMM8D9HZUMRFWEJJ7MR0VA5KU0MTXY7NYVFEX93X2DFK8P3KVEFKVSEXZWR98PSNJVRRV5CRGCE3X4JKGE3HXPNXGCMPV5MXXVTZ89NXZENXXCURGCTRV93RVE35XQCXVCFSVSN8GCT884KX7EMFDCDKKXQ0',
    );

    // poor-man's mock:
    LN._fetchGet = LN.fetchGet;
    let requestedUri = -1;
    LN.fetchGet = actuallyRequestedUri => {
      requestedUri = actuallyRequestedUri;
      return {
        status: 'OK',
      };
    };

    await assert.doesNotReject(LN.authenticate('lndhub://dc56b8cf8ef3b60060cf:94eac57510de2738451d'));
    assert.strictEqual(
      requestedUri,
      'https://lightninglogin.live/login?k1=2191be568cfe6d2a8e8a90ce04c15edf70fdcae6c1b9faff684acab6f400fa0d&tag=login&sig=304502210093ab4ead8dd619f2ddb3d52bd4bb01725badcb2a3daa3870fb41a38096f9a37d0220464a32e94e13dcec20ea94b94df0fa52f45cd88b01d7247042136ad0c71752d2&key=03e7b61e57efff1925ab9082625400cae2c8ad88a984e7aa4987abb77818570018',
    );
  });

  it('returns the server error response as the reject error from lnurl-auth', async () => {
    const LN = new Lnurl(
      'LNURL1DP68GURN8GHJ7MRFVA58GMNFDENKCMM8D9HZUMRFWEJJ7MR0VA5KU0MTXY7NYVFEX93X2DFK8P3KVEFKVSEXZWR98PSNJVRRV5CRGCE3X4JKGE3HXPNXGCMPV5MXXVTZ89NXZENXXCURGCTRV93RVE35XQCXVCFSVSN8GCT884KX7EMFDCDKKXQ0',
    );

    // poor-man's mock:
    LN._fetchGet = LN.fetchGet;
    LN.fetchGet = () => {
      return {
        reason: 'Invalid signature',
        status: 'ERROR',
      };
    };

    await assert.rejects(LN.authenticate('lndhub://dc56b8cf8ef3b60060cf:94eac57510de2738451d'), err => {
      assert.strictEqual(err, 'Invalid signature');
      return true;
    });
  });

  it('works', async () => {
    const LN = new Lnurl('lnaddress@zbd.gg');

    // poor-man's mock:
    LN._fetchGet = LN.fetchGet;
    let requestedUri = -1;
    LN.fetchGet = actuallyRequestedUri => {
      requestedUri = actuallyRequestedUri;
      return {
        minSendable: 1000,
        maxSendable: 45000000,
        commentAllowed: 150,
        tag: 'payRequest',
        metadata: '[["text/plain","lnaddress - lightningaddress.com"],["text/identifier","lnaddress@zbd.gg"],["image/png;base64","img"]]',
        callback: 'https://api.zebedee.io/v0/process-static-charges/9a44621d-0665-44eb-96af-e06534311be5',
      };
    };

    const lnurlpayPayload = await LN.callLnurlPayService();
    assert.deepStrictEqual(lnurlpayPayload, {
      amount: 1,
      callback: 'https://api.zebedee.io/v0/process-static-charges/9a44621d-0665-44eb-96af-e06534311be5',
      commentAllowed: 150,
      description: 'lnaddress - lightningaddress.com',
      domain: 'api.zebedee.io',
      fixed: false,
      image: 'data:image/png;base64,img',
      max: 45000,
      metadata: '[["text/plain","lnaddress - lightningaddress.com"],["text/identifier","lnaddress@zbd.gg"],["image/png;base64","img"]]',
      min: 1,
    });

    assert.strictEqual(requestedUri, 'https://zbd.gg/.well-known/lnurlp/lnaddress');
  });

  it('works with onion', async () => {
    assert.ok(Lnurl.isLightningAddress('avatar@st5owtpsa2e62yf64luxogbecj7lk3t5vmesshsnrzu2untyf2i4t4ad.onion'));

    const LN = new Lnurl('avatar@st5owtpsa2e62yf64luxogbecj7lk3t5vmesshsnrzu2untyf2i4t4ad.onion');

    // poor-man's mock:
    LN._fetchGet = LN.fetchGet;
    let requestedUri = -1;
    LN.fetchGet = actuallyRequestedUri => {
      requestedUri = actuallyRequestedUri;
      return {
        status: 'OK',
        callback: 'http://st5owtpsa2e62yf64luxogbecj7lk3t5vmesshsnrzu2untyf2i4t4ad.onion/.well-known/lnurlp/avatar',
        tag: 'payRequest',
        maxSendable: 100000000,
        minSendable: 1000,
        metadata:
          '[["text/identifier", "avatar@st5owtpsa2e62yf64luxogbecj7lk3t5vmesshsnrzu2untyf2i4t4ad.onion"], ["text/plain", "Sats for avatar@st5owtpsa2e62yf64luxogbecj7lk3t5vmesshsnrzu2untyf2i4t4ad.onion"]]',
        commentAllowed: 0,
      };
    };

    const lnurlpayPayload = await LN.callLnurlPayService();
    assert.deepStrictEqual(lnurlpayPayload, {
      amount: 1,
      callback: 'http://st5owtpsa2e62yf64luxogbecj7lk3t5vmesshsnrzu2untyf2i4t4ad.onion/.well-known/lnurlp/avatar',
      commentAllowed: 0,
      description: 'Sats for avatar@st5owtpsa2e62yf64luxogbecj7lk3t5vmesshsnrzu2untyf2i4t4ad.onion',
      domain: 'st5owtpsa2e62yf64luxogbecj7lk3t5vmesshsnrzu2untyf2i4t4ad.onion',
      fixed: false,
      image: undefined,
      max: 100000,
      metadata:
        '[["text/identifier", "avatar@st5owtpsa2e62yf64luxogbecj7lk3t5vmesshsnrzu2untyf2i4t4ad.onion"], ["text/plain", "Sats for avatar@st5owtpsa2e62yf64luxogbecj7lk3t5vmesshsnrzu2untyf2i4t4ad.onion"]]',
      min: 1,
    });

    assert.strictEqual(requestedUri, 'http://st5owtpsa2e62yf64luxogbecj7lk3t5vmesshsnrzu2untyf2i4t4ad.onion/.well-known/lnurlp/avatar');
  });
});
