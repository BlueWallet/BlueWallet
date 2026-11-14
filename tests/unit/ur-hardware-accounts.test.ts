import assert from 'assert';
import { CryptoHDKey, CryptoKeypath, CryptoMultiAccounts, PathComponent } from '@keystonehq/bc-ur-registry/dist';
import { UR, UREncoder } from '@ngraveio/bc-ur';

import { BlueURDecoder, decodeUR, encodeUR } from '../../blue_modules/ur';
import { MultisigCosigner } from '../../class/multisig-cosigner';
import startImport from '../../class/wallet-import';
import { TWallet } from '../../class/wallets/types';
import { WatchOnlyWallet } from '../../class/wallets/watch-only-wallet';

// CBOR of a crypto-multi-accounts payload as Keystone 3 Pro builds it for Bitget: 10 ETH keys, 4 BTC keys, 1 TON key.
// From KeystoneHQ/keystone3-firmware rust/apps/wallets/src/bitget.rs, test_generate_with_ton_keys
const keystoneMultiAccountsCbor =
  'a5011a1250b6bc0291d9012fa802f403582103c4ad25226a98764f7b753b6c763be112c940182e0b6698944c9def253cec4676045820bf103cfabcab325a7463ab5c432a4042109279d6c3531c8c5ea712684cf31f3706d90130a30186182cf5183cf500f5021a1250b6bc030307d90130a2018400f480f40300081a63c5ea6709684b657973746f6e650a706163636f756e742e7374616e64617264d9012fa802f403582103c4ad25226a98764f7b753b6c763be112c940182e0b6698944c9def253cec4676045820bf103cfabcab325a7463ab5c432a4042109279d6c3531c8c5ea712684cf31f3706d90130a30186182cf5183cf500f5021a1250b6bc030307d90130a2018280f40300081a63c5ea6709684b657973746f6e650a756163636f756e742e6c65646765725f6c6567616379d9012fa602f403582103de2f443b5070e839d6a209ed1afaadfd43daf7bc610a1fefef201a3aca5350ee06d90130a3018a182cf5183cf500f500f400f4021a1250b6bc0303081a769cd41a09684b657973746f6e650a736163636f756e742e6c65646765725f6c697665d9012fa602f403582103a96bae34b46e82eee9c5beae52e446693b5c2e365714b223adea7caae47e1b7f06d90130a3018a182cf5183cf501f500f400f4021a1250b6bc0303081a998dec6209684b657973746f6e650a736163636f756e742e6c65646765725f6c697665d9012fa602f4035821029299ea371a1c6cdcc75b91d26322a2dbdfedb58285e33760a2af82cfee1a7a6e06d90130a3018a182cf5183cf502f500f400f4021a1250b6bc0303081ac49452d709684b657973746f6e650a736163636f756e742e6c65646765725f6c697665d9012fa602f4035821030f1808f972aed2b8e01d92b09b9c0d55b994592fb5599557e0d4828705204a4106d90130a3018a182cf5183cf503f500f400f4021a1250b6bc0303081a0823c44c09684b657973746f6e650a736163636f756e742e6c65646765725f6c697665d9012fa602f4035821021c885e79f19ba2658755952801366f00f5304db8597eb72a78a6886d8175037d06d90130a3018a182cf5183cf504f500f400f4021a1250b6bc0303081aef4e5bae09684b657973746f6e650a736163636f756e742e6c65646765725f6c697665d9012fa602f4035821037653d3a64a3d1fce16d5693e044e9aea644082371f4d31f6eb83096b5b84d97b06d90130a3018a182cf5183cf505f500f400f4021a1250b6bc0303081a364c571b09684b657973746f6e650a736163636f756e742e6c65646765725f6c697665d9012fa602f403582103ded46d3bc515112c1c99b5f5b5f6c4abc76cc40d98ba4c1808c97038fe976ff606d90130a3018a182cf5183cf506f500f400f4021a1250b6bc0303081a456759fc09684b657973746f6e650a736163636f756e742e6c65646765725f6c697665d9012fa602f403582102447d94e1937819a79a0ef56cd7b7a29de7c80a45b34480ef0b593083e418557906d90130a3018a182cf5183cf507f500f400f4021a1250b6bc0303081a09f362d709684b657973746f6e650a736163636f756e742e6c65646765725f6c697665d9012fa602f403582103d94fb59028252ab9353ee376e868cfd59e9d0bc24ef35fe1b06310cd0e4e908b06d90130a3018a182cf5183cf508f500f400f4021a1250b6bc0303081a4e09767009684b657973746f6e650a736163636f756e742e6c65646765725f6c697665d9012fa602f4035821034d53b1c2630e12b853b96d70fb671363d5d4ec9406f722b4deea1f2a9eb6e76406d90130a3018a182cf5183cf509f500f400f4021a1250b6bc0303081ac418564209684b657973746f6e650a736163636f756e742e6c65646765725f6c697665d9012fa702f40358210246696468fa5c46647bdd186f568983e2a26773dc5b4c174790fee7ef9b9a7c9904582051872c7bb8270a7655ae15d738bb21379962ff11fb048b55630395afcfef442806d90130a30186182cf500f500f5021a1250b6bc030307d90130a2018280f40300081ab5d6f45009684b657973746f6e65d9012fa702f403582103ab6a1908b437179b914dc3cf4b829d7387adf60fdee483e9c748d5ee79ba4be4045820bad8f929afd65c4b3ff78db1a386062374f2d2e6552e9fdc59aa7dd9b5db6e2c06d90130a301861831f500f500f5021a1250b6bc030307d90130a2018280f40300081a197077c809684b657973746f6e65d9012fa702f40358210262ba42544acc4223c74511b37bae54de22565f25f8034f5af8aa10a04c3621b9045820de47dd17679605b84abf439bdf5477c6cb94ff5a541d3cb1734afebfa3d3fdb906d90130a301861854f500f500f5021a1250b6bc030307d90130a2018280f40300081a9f6b7e4b09684b657973746f6e65d9012fa702f403582103e0db6ca7c71e72a40091141b9dc4596ab3a9192ac41eebe1f2b048c654423ecb045820a75805b89c5079ba74e9002c3e587f7c97ea8018ab1d5245638a45de3c845e0b06d90130a301861856f500f500f5021a1250b6bc030307d90130a2018280f40300081a0484004d09684b657973746f6e65d9012fa2035820895881fe5bab8b88e450055ff6916bf2bf41bc315325cee7975f33069beb079c06d90130a20186182cf519025ff500f5021a1250b6bc036e4b657973746f6e6520332050726f047828626339633466373135376165363937643433346163383536323332306564353335653737373638300565312e372e30';

// the 4 BTC xpubs that test feeds in, with the version bytes BlueWallet expects for each path
const expected = [
  {
    ExtPubKey: 'xpub6CzHiXpZKvPYnCwnd6qq511yn8B63yB8rCtxsY4azeuCxPYJn6B7KNEa6sDCkNAj54H5AW3zYY8QLSzG6qe7SZBvKW3ighdPGTYQgDXxfHQ',
    MasterFingerprint: '1250B6BC',
    AccountKeyPath: "m/44'/0'/0'",
  },
  {
    ExtPubKey: 'ypub6Wfss94o2pgrkaxVqpAEQcmPM9dBbk6y5o5mSfSDhnxYeoG2QWuN2s9qYRWXcZi7Hm4imgUYdNY5Z9KFfnPp6cUjhyhg5KCsFBJYG8NU39g',
    MasterFingerprint: '1250B6BC',
    AccountKeyPath: "m/49'/0'/0'",
  },
  {
    ExtPubKey: 'zpub6rVFyUxKL1XPzXNPjiaJEc2DRmsQJwTXGLCdRrxc2jLf9PDdHpMoC8dDGerx9izKyyBiRZ1e5dwqBAYryg7QoCxA1vLpqAFTUQ62NkS8CKq',
    MasterFingerprint: '1250B6BC',
    AccountKeyPath: "m/84'/0'/0'",
  },
  {
    ExtPubKey: 'zpub6qMDoxCg2CeHCHybMQPy2Nz9xw1R9WxdUHwwbNRCNHrLSaAztafEAXjpUVyzAdKTVUxFDWK7rbAP8bbtgTQL7C6rX1wccU6URRysgpoz8ri',
    MasterFingerprint: '1250B6BC',
    AccountKeyPath: "m/86'/0'/0'",
  },
];

// crypto-account as Keystone 3 Pro exports it for BlueWallet: wpkh, pkh, sh(wpkh), tr.
// From KeystoneHQ/keystone3-firmware rust/apps/wallets/src/blue_wallet.rs, test_generate_crypto_account
const keystoneAccountHead = 'a2011a73c5da0a0284';
const keystoneAccountOutputs = [
  'd90194d9012fa702f403582102707a62fdacc26ea9b63b1c197906f56ee0180d0bcf1966e1a2da34f5f3a09a9b0458204a53a0ab21b9dc95869c4e92a161194e03c0ef3ff5014ac692f433c4765490fc05d90131a20100020006d90130a301861854f500f500f5021a73c5da0a030307d90130a2018400f480f40300081a7ef32bdb',
  'd90193d9012fa702f403582103774c910fcf07fa96886ea794f0d5caed9afe30b44b83f7e213bb92930e7df4bd0458203da4bc190a2680111d31fadfdc905f2a7f6ce77c6f109919116f253d4344521905d90131a20100020006d90130a30186182cf500f500f5021a73c5da0a030307d90130a2018400f480f40300081a155bca59',
  'd90190d90194d9012fa702f403582102f1f347891b20f7568eae3ec9869fbfb67bcab6f358326f10ecc42356bd55939d0458206eaae365ae0e0a0aab84325cfe7cd76c3b909035f889e7d3f1b847a9a0797ecb05d90131a20100020006d90130a301861831f500f500f5021a73c5da0a030307d90130a2018400f480f40300081a3d05ff75',
  'd90199d9012fa702f403582103418278a2885c8bb98148158d1474634097a179c642f23cf1cc04da629ac6f0fb045820c61a8f27e98182314d2444da3e600eb5836ec8ad183c86c311f95df8082b18aa05d90131a20100020006d90130a301861856f500f500f5021a73c5da0a030307d90130a2018400f480f40300081a035270da',
];
const expectedAccount = [
  {
    ExtPubKey: 'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs',
    MasterFingerprint: '73C5DA0A',
    AccountKeyPath: "m/84'/0'/0'",
  },
  {
    ExtPubKey: 'xpub6BosfCnifzxcFwrSzQiqu2DBVTshkCXacvNsWGYJVVhhawA7d4R5WSWGFNbi8Aw6ZRc1brxMyWMzG3DSSSSoekkudhUd9yLb6qx39T9nMdj',
    MasterFingerprint: '73C5DA0A',
    AccountKeyPath: "m/44'/0'/0'",
  },
  {
    ExtPubKey: 'ypub6Ww3ibxVfGzLrAH1PNcjyAWenMTbbAosGNB6VvmSEgytSER9azLDWCxoJwW7Ke7icmizBMXrzBx9979FfaHxHcrArf3zbeJJJUZPf663zsP',
    MasterFingerprint: '73C5DA0A',
    AccountKeyPath: "m/49'/0'/0'",
  },
  {
    ExtPubKey: 'zpub6qLiJCzi7t1C7qRZx8ULcy2eGbXpmbbQZmu3znjqoR4VZADKELunndvcw4iSVaGx2KhviLLXuB3vcyGcdd2q8XXBQJc5T5qrtorRowa1zfs',
    MasterFingerprint: '73C5DA0A',
    AccountKeyPath: "m/86'/0'/0'",
  },
];

const decode = (cbor: Buffer, type: string, fragmentLength: number): string => {
  const encoder = new UREncoder(new UR(cbor, type), fragmentLength);
  const decoder = new BlueURDecoder();
  while (!decoder.isComplete()) decoder.receivePart(encoder.nextPart().toUpperCase());
  return decoder.toString();
};

describe('BlueURDecoder hardware wallet accounts', () => {
  it('crypto-multi-accounts: keeps only bitcoin keys', () => {
    const cbor = Buffer.from(keystoneMultiAccountsCbor, 'hex');
    assert.deepStrictEqual(JSON.parse(decode(cbor, 'crypto-multi-accounts', 400)), expected);
  });

  it('crypto-hdkey: single bitcoin key', () => {
    const keys = CryptoMultiAccounts.fromCBOR(Buffer.from(keystoneMultiAccountsCbor, 'hex')).getKeys();
    const bitcoinKeys = keys.filter(key => key.getOrigin().getComponents()[1].getIndex() === 0);
    assert.strictEqual(bitcoinKeys.length, 4);
    bitcoinKeys.forEach((key, i) => {
      assert.deepStrictEqual(JSON.parse(decode(key.toCBOR(), 'crypto-hdkey', 2000)), [expected[i]]);
    });

    // a key with no script around it: the default multisig paths tell the prefix
    const prefixes = [[45], [48, 0, 0, 1], [48, 0, 0, 2]].map(path => {
      const origin = new CryptoKeypath(path.map(index => new PathComponent({ index, hardened: true })));
      const key = new CryptoHDKey({ isMaster: false, key: keys[0].getKey(), chainCode: keys[0].getChainCode(), origin });
      return JSON.parse(decode(key.toCBOR(), 'crypto-hdkey', 2000))[0].ExtPubKey.slice(0, 4);
    });
    assert.deepStrictEqual(prefixes, ['xpub', 'Ypub', 'Zpub']);
  });

  it('crypto-account: taproot output goes first', () => {
    // the registry library does not know the tr() tag and reports such an output with no script expressions
    const [wpkh, pkh, shWpkh, tr] = keystoneAccountOutputs;
    const cbor = Buffer.from(keystoneAccountHead + tr + wpkh + pkh + shWpkh, 'hex');
    const [a, b, c, d] = expectedAccount;
    assert.deepStrictEqual(JSON.parse(decode(cbor, 'crypto-account', 300)), [d, a, b, c]);

    const part = new UREncoder(new UR(cbor, 'crypto-account'), 2000).nextPart();
    assert.deepStrictEqual(JSON.parse(Buffer.from(decodeUR([part]) ?? '', 'hex').toString()), d);
  });

  it('crypto-account: every output is judged on its own', () => {
    const [wpkh, , , tr] = keystoneAccountOutputs;
    const head = keystoneAccountHead.slice(0, -2) + '82';
    const wsh = wpkh.replace('d90194', 'd90191');
    assert.deepStrictEqual(JSON.parse(decode(Buffer.from(head + wsh + tr, 'hex'), 'crypto-account', 300)), [
      {
        ...expectedAccount[0],
        ExtPubKey: 'Zpub739WFCnqb8H6bozqRWNgL4NwrVvUUDaa5UodTovoPXuLnoVJTvkwKA6b5ioUif4ntuhU53ob9LUdZ66F3uNGoX8S6gzjGa1yvYFtkDRknR2',
      },
      expectedAccount[3],
    ]);

    // pkh() of a bare public key, from BCR-2020-010: no HD key, the account is rejected rather than imported in part
    const pkhEcKey = 'd90193d90132a103582102c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5';
    assert.throws(() => decode(Buffer.from(head + wpkh + pkhEcKey, 'hex'), 'crypto-account', 300), /without a usable HD key/);
  });

  it('crypto-account: origin without depth, multisig keys', async () => {
    // UR from the sparrowwallet/hummingbird tests; the xpubs are the ones BCR-2020-015 lists for it, with BlueWallet version bytes
    const decoder = new BlueURDecoder();
    decoder.receivePart(
      'ur:crypto-account/oeadcyemrewytyaolntaadmutaaddloxaxhdclaxwmfmdeiamecsdsemgtvsjzcncygrkowtrontzschgezokstswkkscfmklrtauteyaahdcxiehfonurdppfyntapejpproypegrdawkgmaewejlsfdtsrfybdehcaflmtrlbdhpamtaaddyoyadlncsdwykaeykaeykaycynlytsnyltaadmhtaadmwtaaddloxaxhdclaostvelfemdyynwydwyaievosrgmambklovabdgypdglldvespsthysadamhpmjeinaahdcxntdllnaaeykoytdacygegwhgjsiyonpywmcmrpwphsvodsrerozsbyaxluzcoxdpamtaaddyoyadlncsehykaeykaeykaycypdbskeuytaadmwtaaddloxaxhdclaxzcfxeegdrpmogrgwkbzctlttweadkiengrwlhtprremouoluutqdpfbncedkynfhaahdcxjpwevdeogthttkmeswzcolcpsaahcfnshkhtehytclmnteatmoteadtlwynnftloamtaaddyoyadlncsghykaeykaeykaycybthlvytstaadmhtaaddloxaxhdclaxhhsnhdrpftdwuocntilydibehnecmovdfekpjkclcslasbhkpawsaddmcmmnahnyaahdcxlotedtndfymyltclhlmtpfsadscnhtztaolbnnkistaedegwfmmedreetnwmcycnamtaaddyoyadlfcsdpykaycyemrewytytaadmhtaadmetaaddloxaxhdclaxdwkswmztpytnswtsecnblfbayajkdldeclqzzolrsnhljedsgminetytbnahatbyaahdcxkkguwsvyimjkvwteytwztyswvendtpmncpasfrrylprnhtkblndrgrmkoyjtbkrpamtaaddyoyadlocsdyykaeykaeykadykaycyhkrpnddrtaadmetaaddloxaxhdclaohnhffmvsbndslrfgclpfjejyatbdpebacnzokotofxntaoemvskpaowmryfnotfgaahdcxdlnbvecentssfsssgylnhkrstoytecrdlyadrekirfaybglahltalsrfcaeerobwamtaaddyoyadlocsdyykaeykaeykaoykaycyhkrpnddrgdaogykb',
    );
    const expectedKeys = [
      ["m/44'/0'/0'", 'xpub6CnQkivUEH9bSbWVWfDLCtigKKgnSWGaVSRyCbN2QNBJzuvHT1vUQpgSpY1NiVvoeNEuVwk748Cn9G3NtbQB1aGGsEL7aYEnjVWgjj9tefu'],
      ["m/49'/0'/0'", 'ypub6XigKNuynEwE6GiLmrSfVKCa4R5yJybnoJWjr5qsQVAGkPtHZeFUQMcAuBVnC8Qqu7tgXH92EGvqQvdW2XEwR7jsDhGnfRz5hUBcezhjqpL'],
      ["m/84'/0'/0'", 'zpub6qQzfPRBjbGVHz7SiPbrSnt77iRsrFRXMdWng2jWSZUbCiWTsYGLoBQ4sFRnUxDF1N3KXdV2RETtyNnhQqtJvJVSZVHEXeupW5gighTMoZg'],
      ["m/45'", 'xpub68JFLJTH96GUqC6SoVw5c2qyLSt776PGu5xde8ddVACuPYyarvSL827TbZGavuNbKQ8DG3VP9fCXPhQRBgPrS4MPG3zaZgwAGuPHYvVuY9X'],
      ["m/48'/0'/0'/1'", 'Ypub6jvW62AgxwWefTBi58HAe5XRCHBUyWbHmncYJtaa2mxqeN2eMw3BJUK2d5UBw8fhVqt8xhVz92NK77bjmgvDGmCvLXqaePsj8YELrpuEG6b'],
      ["m/48'/0'/0'/2'", 'Zpub74kmPgqc7d48YZeTKqxjeuBMwRDuohKn8wAnzjYCJhKQ6GN2a9tBNQfduSiyqg1mk7phV68cZDABtDqoBZgM1r6hdzXYhpSEnQA1mgBoqP5'],
    ];
    assert.deepStrictEqual(
      JSON.parse(decoder.toString()),
      expectedKeys.map(([AccountKeyPath, ExtPubKey]) => ({ ExtPubKey, MasterFingerprint: '37B5EED4', AccountKeyPath })),
    );

    // the multisig keys (sh, sh(wsh), wsh) keep their prefix when BlueWallet shares them as a QR and scans it back
    for (const [path, xpub] of expectedKeys.slice(3)) {
      const [part] = encodeUR(MultisigCosigner.exportToJson('37B5EED4', xpub, path), 2000);
      const scanned = JSON.parse(Buffer.from(decodeUR([part]) ?? '', 'hex').toString());
      assert.deepStrictEqual(scanned, { ExtPubKey: xpub, MasterFingerprint: '37B5EED4', AccountKeyPath: path });
    }

    // wallet import offers the single sig keys only (offline: no Electrum, every wallet counts as used)
    const paths: (string | undefined)[] = [];
    const onWallet = (w: TWallet) => paths.push((w as WatchOnlyWallet).getDerivationPath());
    const importOffline = (text: string) =>
      startImport(
        text,
        false,
        false,
        true,
        () => {},
        onWallet,
        async () => '',
      ).promise;
    await importOffline(decoder.toString());
    // nor a legacy multisig key on a BIP48 path, which is a plain xpub
    await importOffline(
      JSON.stringify([{ ExtPubKey: expectedKeys[3][1], MasterFingerprint: '37B5EED4', AccountKeyPath: "m/48'/0'/0'/0'" }]),
    );
    assert.deepStrictEqual(paths, ["m/44'/0'/0'", "m/49'/0'/0'", "m/84'/0'/0'"]);
  });
});
