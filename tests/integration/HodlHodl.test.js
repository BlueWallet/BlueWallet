/* global it, jasmine, describe */
import { LegacyWallet, SegwitBech32Wallet, SegwitP2SHWallet } from '../../class';
import { HodlHodlApi } from '../../class/hodl-hodl-api';

const bitcoin = require('bitcoinjs-lib');
const assert = require('assert');

it('can create escrow address', () => {
  const keyPairServer = bitcoin.ECPair.fromPrivateKey(
    Buffer.from('9a8cfd0e33a37c90a46d358c84ca3d8dd089ed35409a6eb1973148c0df492288', 'hex'),
  );
  const keyPairSeller = bitcoin.ECPair.fromPrivateKey(
    Buffer.from('ab4163f517bfac01d7acd3a1e398bfb28b53ebd162cb1dd767cc63ae8069ef37', 'hex'),
  );
  const keyPairBuyer = bitcoin.ECPair.fromPrivateKey(
    Buffer.from('b4ab9ed098b6d4b308deaefce5079f4203c43cfb51b699dd35dcc0f1ae5906fd', 'hex'),
  );

  const pubkeys = [
    keyPairServer.publicKey, // '03141024b18929bfec5b567c12b1693d4ae02783873e2e3aa444f0d6950cb97dee', // server
    keyPairSeller.publicKey, // '0208137b6cb23cef02c0529948a2ed12fbeed0813cce555de073319f56e215ee1b', // seller
    keyPairBuyer.publicKey, // '035ed5825258d4f1685df804f21296b9957cd319cf5949ace92fa5767eb7a946f2', // buyer
  ].map(hex => Buffer.from(hex, 'hex'));

  const p2shP2wshP2ms = bitcoin.payments.p2sh({
    redeem: bitcoin.payments.p2wsh({
      redeem: bitcoin.payments.p2ms({ m: 2, pubkeys }),
    }),
  });
  const address = p2shP2wshP2ms.address;
  // console.warn(p2sh_p2wsh_p2ms);

  assert.strictEqual(address, '391ygT71qeF7vbYjxsUZPzH6oDc7Rv4vTs');

  let signedByServerReleaseTransaction =
    '01000000000101356493a6b93bf17e66d7ec12f1a54e279da17f669f41bf11405a6f2617e1022501000000232200208ec72df31adaa132e40a5f5033589c0e18b67a64cdc65e9c75027fe1efd10f4cffffffff02227e010000000000160014b1c61a73a529c315a1f2b87df12c7948d86ba10c26020000000000001976a914d0b77eb1502c81c4093da9aa6eccfdf560cdd6b288ac040047304402205a447563db8e74177a1fbcdcfe7b7b22556c39d68c17ffe0a4a02609d78c83130220772fbf3261b6031a915eca7e441092df3fe6e4c7d4f389c4921c1f18661c20f401460000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000069522103141024b18929bfec5b567c12b1693d4ae02783873e2e3aa444f0d6950cb97dee210208137b6cb23cef02c0529948a2ed12fbeed0813cce555de073319f56e215ee1b21035ed5825258d4f1685df804f21296b9957cd319cf5949ace92fa5767eb7a946f253ae00000000';

  let txDecoded = bitcoin.Transaction.fromHex(signedByServerReleaseTransaction);
  // console.warn(txDecoded.ins[0].witness);

  // we always expect only one input:
  const psbt = new bitcoin.Psbt().addInput({
    hash: txDecoded.ins[0].hash,
    index: txDecoded.ins[0].index,
    witnessUtxo: {
      script: p2shP2wshP2ms.redeem.output,
      value: 100000,
    },
    // redeemScript,
    witnessScript: p2shP2wshP2ms.redeem.redeem.output,
  });

  for (let out of txDecoded.outs) {
    let scripthex = out.script.toString('hex');
    let address =
      LegacyWallet.scriptPubKeyToAddress(scripthex) ||
      SegwitP2SHWallet.scriptPubKeyToAddress(scripthex) ||
      SegwitBech32Wallet.scriptPubKeyToAddress(scripthex);
    psbt.addOutput({
      address,
      value: out.value,
    });
  }

  // psbt.signInput(0, keyPairServer);
  psbt.signInput(0, keyPairSeller);

  // console.warn('signature = ', psbt.data.inputs[0].partialSig[0].signature.toString('hex'));

  // let tx = psbt.finalizeAllInputs().extractTransaction();
  // console.log(tx.toHex());
});

describe('HodlHodl API', function() {
  it('can fetch countries & and own country code', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 200 * 1000;
    let Hodl = new HodlHodlApi();
    const countries = await Hodl.getCountries();
    assert.ok(countries[0]);
    assert.ok(countries[0].code);
    assert.ok(countries[0].name);
    assert.ok(countries[0].native_name);
    assert.ok(countries[0].currency_code);
    assert.ok(countries[0].currency_name);

    let countryCode = await Hodl.getMyCountryCode();
    assert.strictEqual(countryCode.length, 2);
  });

  it('can get offers', async () => {
    let Hodl = new HodlHodlApi();
    const offers = await Hodl.getOffers(
      {
        [HodlHodlApi.PAGINATION_LIMIT]: 10,
      },
      {
        [HodlHodlApi.FILTERS_COUNTRY]: HodlHodlApi.FILTERS_COUNTRY_VALUE_GLOBAL,
        [HodlHodlApi.FILTERS_SIDE]: HodlHodlApi.FILTERS_SIDE_VALUE_SELL,
        [HodlHodlApi.FILTERS_ASSET_CODE]: HodlHodlApi.FILTERS_ASSET_CODE_VALUE_BTC,
        [HodlHodlApi.FILTERS_INCLUDE_GLOBAL]: true,
      },
      {
        [HodlHodlApi.SORT_BY]: HodlHodlApi.SORT_BY_VALUE_PRICE,
        [HodlHodlApi.SORT_DIRECTION]: HodlHodlApi.SORT_DIRECTION_VALUE_ASC,
      },
    );

    assert.ok(offers[0]);
    assert.ok(offers[0].asset_code === 'BTC');
    assert.ok(offers[0].country_code);
    assert.ok(offers[0].side === HodlHodlApi.FILTERS_SIDE_VALUE_SELL);
    assert.ok(offers[0].title || offers[0].description || offers[1].title || offers[1].description, JSON.stringify(offers[0], null, 2));
    assert.ok(offers[0].price);
    assert.ok(offers[0].payment_method_instructions);
    assert.ok(offers[0].trader);
  });

  it('can get payment methods', async () => {
    let Hodl = new HodlHodlApi();
    const methods = await Hodl.getPaymentMethods(HodlHodlApi.FILTERS_COUNTRY_VALUE_GLOBAL);
    assert.ok(methods[0]);
    assert.ok(methods[0].id);
    assert.ok(methods[0].type);
    assert.ok(methods[0].name);
  });

  it('cat get currencies', async () => {
    let Hodl = new HodlHodlApi();
    const currencies = await Hodl.getCurrencies();
    assert.ok(currencies[0]);
    assert.ok(currencies[0].code);
    assert.ok(currencies[0].name);
    assert.ok(currencies[0].type);
  });
});
