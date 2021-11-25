import { LegacyWallet, SegwitBech32Wallet, SegwitP2SHWallet } from '../../class';
import { HodlHodlApi } from '../../class/hodl-hodl-api';
import { ECPair } from 'ecpair';

const bitcoin = require('bitcoinjs-lib');
const assert = require('assert');

it.skip('can verify escrow address', () => {
  const encryptedSeed =
    'ES1:b2dc8bd89782f70ef11ff1d1c6bf6adde0bea78fb959391de48f49acbf7f9766ca128b89c1a9a013d158b6c4dabee77997f8a15764d1b083f213b1d6aa9fb3a14a1edb406930a25423a1df3be72306f120b08972cea669dba1284bd8:bf5af8737529b419cc20935a1c05c742:pbkdf2:10000';
  const encryptPassword = 'Qwert12345';
  const address = '34n3rBtPA16BQYWycphnhK7C9DoucWb527';
  const index = 10298;
  const witnessScript =
    '522103dc0edfea797214be15a69148bfb1dffa1c8295c05300b7632143a77d918b4a0821031fec42b60942633616aff7e245796b5caae6bf59ef5ba688b0a59f33f08b2896210351fd6e52d38a37b9834909e3f8345c471346e1f5990ec00dafcc53e238d3c7c553ae';

  const Hodl = new HodlHodlApi();
  assert.ok(Hodl.verifyEscrowAddress(encryptedSeed, encryptPassword, index, address, witnessScript));
  assert.ok(!Hodl.verifyEscrowAddress(encryptedSeed, encryptPassword, index, '3QDf45WU88t2kEBJTHcTPvtrXZx88SkmKC', witnessScript));
});

it('can create escrow address', () => {
  const keyPairServer = ECPair.fromPrivateKey(Buffer.from('9a8cfd0e33a37c90a46d358c84ca3d8dd089ed35409a6eb1973148c0df492288', 'hex'));
  const keyPairSeller = ECPair.fromPrivateKey(Buffer.from('ab4163f517bfac01d7acd3a1e398bfb28b53ebd162cb1dd767cc63ae8069ef37', 'hex'));
  const keyPairBuyer = ECPair.fromPrivateKey(Buffer.from('b4ab9ed098b6d4b308deaefce5079f4203c43cfb51b699dd35dcc0f1ae5906fd', 'hex'));

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

  const signedByServerReleaseTransaction =
    '01000000000101356493a6b93bf17e66d7ec12f1a54e279da17f669f41bf11405a6f2617e1022501000000232200208ec72df31adaa132e40a5f5033589c0e18b67a64cdc65e9c75027fe1efd10f4cffffffff02227e010000000000160014b1c61a73a529c315a1f2b87df12c7948d86ba10c26020000000000001976a914d0b77eb1502c81c4093da9aa6eccfdf560cdd6b288ac040047304402205a447563db8e74177a1fbcdcfe7b7b22556c39d68c17ffe0a4a02609d78c83130220772fbf3261b6031a915eca7e441092df3fe6e4c7d4f389c4921c1f18661c20f401460000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000069522103141024b18929bfec5b567c12b1693d4ae02783873e2e3aa444f0d6950cb97dee210208137b6cb23cef02c0529948a2ed12fbeed0813cce555de073319f56e215ee1b21035ed5825258d4f1685df804f21296b9957cd319cf5949ace92fa5767eb7a946f253ae00000000';

  const txDecoded = bitcoin.Transaction.fromHex(signedByServerReleaseTransaction);
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

  for (const out of txDecoded.outs) {
    const scripthex = out.script.toString('hex');
    const address =
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

/**
 * Use only for development.
 * Run via `NODE_OPTIONS=--insecure-http-parser=true ./node_modules/.bin/jest  tests/integration/hodlhodl.test.js`
 * Also, process.env.HODLHODL_USERAGENT might be needed.
 * All those a part of HodlHodl DDOS protection.
 */
describe.skip('HodlHodl API', function () {
  it('can fetch countries & and own country code', async () => {
    if (process.env.GITHUB_ACTIONS) {
      // dont run here as it always fails
      return;
    }
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 200 * 1000;
    const Hodl = new HodlHodlApi();
    const countries = await Hodl.getCountries();
    assert.ok(countries[0]);
    assert.ok(countries[0].code);
    assert.ok(countries[0].name);
    assert.ok(countries[0].native_name);
    assert.ok(countries[0].currency_code);
    assert.ok(countries[0].currency_name);
  });

  it('can get offers', async () => {
    if (process.env.GITHUB_ACTIONS) {
      // dont run here as it always fails
      return;
    }
    const Hodl = new HodlHodlApi();
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
    assert.ok(typeof offers[0].title !== 'undefined', JSON.stringify(offers[0], null, 2));
    assert.ok(typeof offers[0].description !== 'undefined', JSON.stringify(offers[0], null, 2));
    assert.ok(offers[0].price);
    assert.ok(offers[0].payment_method_instructions);
    assert.ok(offers[0].trader);
  });

  it('can get offer', async () => {
    if (process.env.GITHUB_ACTIONS) {
      // dont run here as it always fails
      return;
    }
    if (!process.env.HODLHODL_OFFER_ID) return;
    const Hodl = new HodlHodlApi();
    const offer = await Hodl.getOffer(process.env.HODLHODL_OFFER_ID);
    assert.ok(offer.id);
    assert.ok(offer.version);
  });

  it('can accept offer', async () => {
    if (process.env.GITHUB_ACTIONS) {
      // dont run here as it always fails
      return;
    }
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 200 * 1000;
    if (!process.env.HODLHODL_OFFER_ID) return;
    const Hodl = new HodlHodlApi();
    const offer = await Hodl.getOffer(process.env.HODLHODL_OFFER_ID);
    assert.strictEqual(offer.side, 'sell');
    const paymentMethodInstructionId = offer.payment_method_instructions[0].id;
    const paymentMethodInstructionVersion = offer.payment_method_instructions[0].version;
    const fiatValue = 100;
    const contract = await Hodl.acceptOffer(
      offer.id,
      offer.version,
      paymentMethodInstructionId,
      paymentMethodInstructionVersion,
      fiatValue,
    );
    console.warn({ contract });
  });

  it('can get contract', async () => {
    if (process.env.GITHUB_ACTIONS) {
      // dont run here as it always fails
      return;
    }
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 200 * 1000;
    if (!process.env.HODLHODL_CONTRACT_ID) return;
    const Hodl = new HodlHodlApi();
    const contract = await Hodl.getContract(process.env.HODLHODL_CONTRACT_ID);
    assert.ok(contract.your_role);
    assert.ok(contract.volume);
    assert.ok(contract.escrow);
  });

  it('can mark contract as confirmed', async () => {
    if (process.env.GITHUB_ACTIONS) {
      // dont run here as it always fails
      return;
    }
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 200 * 1000;
    if (!process.env.HODLHODL_CONTRACT_ID) return;
    const Hodl = new HodlHodlApi();
    const result = await Hodl.markContractAsConfirmed(process.env.HODLHODL_CONTRACT_ID);
    console.warn(result);
  });

  it('can get payment methods', async () => {
    if (process.env.GITHUB_ACTIONS) {
      // dont run here as it always fails
      return;
    }
    const Hodl = new HodlHodlApi();
    const methods = await Hodl.getPaymentMethods(HodlHodlApi.FILTERS_COUNTRY_VALUE_GLOBAL);
    assert.ok(methods[0]);
    assert.ok(methods[0].id);
    assert.ok(methods[0].type);
    assert.ok(methods[0].name);
  });

  it('cat get currencies', async () => {
    if (process.env.GITHUB_ACTIONS) {
      // dont run here as it always fails
      return;
    }
    const Hodl = new HodlHodlApi();
    const currencies = await Hodl.getCurrencies();
    assert.ok(currencies[0]);
    assert.ok(currencies[0].code);
    assert.ok(currencies[0].name);
    assert.ok(currencies[0].type);
  });

  it('cat get myself', async () => {
    if (process.env.GITHUB_ACTIONS) {
      // dont run here as it always fails
      return;
    }
    const Hodl = new HodlHodlApi();
    const myself = await Hodl.getMyself();
    assert.ok(myself.encrypted_seed);
  });

  it('can create signature for autologin', async () => {
    const Hodl = new HodlHodlApi('');
    const sig = Hodl.createSignature(
      'iqZC7uUmx4sVeIwFQN2YqGT5SyrXNLhxVX7QMGUeJK1CDdy87OcrOt3QvPE5LFC56Lgu7WLlg12U55Vy',
      'cce14197a08ebab7cfbb41cfce9fe91e0f31d572d3f48571ca3c30bfd516f769',
      1589980224,
    );
    assert.strictEqual(sig, '1d2a51ca2c54ff9107a3460b22f01bc877e527a9a719d81b32038741332159fc');
  });
});
