import { Authenticator } from '../../class';
import config from '../../config';

const assert = require('assert');
const bitcoinjs = require('bitcoinjs-lib');
global.crypto = require('crypto'); // shall be used by tests under nodejs CLI, but not in RN environment

global.net = require('net'); // needed by Electrum client. For RN it is proviced in shim.js
const BlueElectrum = require('../../BlueElectrum');

afterAll(async () => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
  return new Promise(resolve => setTimeout(resolve, 10000)); // simple sleep to wait for all timeouts termination
});

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  await BlueElectrum.waitTillConnected();
});

describe('authenticator', () => {
  describe('signAndFinalizePSBT()', () => {
    const arAuthenticator = new Authenticator();
    const airAuthenticator = new Authenticator();
    const foreignAuthenticator = new Authenticator();

    beforeAll(() => {
      const arPrivateKey = Buffer.from('79d6d5075b87e759c955d413bff5065f0156b275ece1e500e37bf36f6a186543', 'hex');
      arAuthenticator.keyPair = bitcoinjs.ECPair.fromPrivateKey(arPrivateKey, {
        network: config.network,
      });
      const airPrivateKey = Buffer.from('0cc52b3faa941f13d3ea4b2fea29a2259b58ffca1ddf3069ab2d21d7f793a960', 'hex');
      airAuthenticator.keyPair = bitcoinjs.ECPair.fromPrivateKey(airPrivateKey, {
        network: config.network,
      });
      const foreignPrivateKey = Buffer.from('915dc1ac477d1fe606cd4deeba7b297669d374354f6f866f021633b340a2acdb', 'hex');
      foreignAuthenticator.keyPair = bitcoinjs.ECPair.fromPrivateKey(foreignPrivateKey, {
        network: config.network,
      });
    });

    it('should finalize Recovery tx on AR', async function() {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 30 * 1000;

      // Signed with one signature
      const encodedPsbt =
        'cHNidP8BAHwCAAAAAvFFXw/jEkj9oodfts21YloovVzXuEjn3+ibk4IMw1FSAAAAAAD/////0OrPhAd3IHzdUpx0IHEI4l9rPDrUHwWtwSiD4iZuKkoAAAAAAP////8BwFsaJggAAAAXqRTqXT1MLehcj8Hsi1AeIzUb9kVuAYcAAAAAAAEBIADPFBMEAAAAF6kUGEm2GetgNT0MF4Erk9uUqbpF9wmHIgIDSKLP8tIdxDKH9zHU7hkqOHm2SuKg+NGPfwv2FaYqqFZHMEQCIHJzTC2RyW7QV3B7mum6f7Aji9HeiznGMh9W/NpVpGTOAiBP2ImasPsksSNedfSfPdnpVel0elcdoYl7lG3kYmO+QgEBBCIAIH953cHpDUj6TezroxEyYzg86FMn49XG4GzOwKs+ibYXAQVLY1FnUmghA0iiz/LSHcQyh/cx1O4ZKjh5tkrioPjRj38L9hWmKqhWIQLs7BAKy4nzBJKFrgHn8D+0aea1TUSw88gkCxlY6JPLjFKuAAEBIADPFBMEAAAAF6kUGEm2GetgNT0MF4Erk9uUqbpF9wmHIgIDSKLP8tIdxDKH9zHU7hkqOHm2SuKg+NGPfwv2FaYqqFZHMEQCIH0yFwBG/I9/e7X+gp9xQjhkh2zxWk9BYRpvlX5xQ4TZAiB84/RCLdjnlFhZIPupsYff7TDYQprb/Txw7DqTtZhr4wEBBCIAIH953cHpDUj6TezroxEyYzg86FMn49XG4GzOwKs+ibYXAQVLY1FnUmghA0iiz/LSHcQyh/cx1O4ZKjh5tkrioPjRj38L9hWmKqhWIQLs7BAKy4nzBJKFrgHn8D+0aea1TUSw88gkCxlY6JPLjFKuAAEAFgAUg9grzH1XGRHCnWpxlAEMWpLdPOUA';

      const txData = await arAuthenticator.signAndFinalizePSBT(encodedPsbt);

      assert.strictEqual(
        txData.tx.toHex(),
        '02000000000102f1455f0fe31248fda2875fb6cdb5625a28bd5cd7b848e7dfe89b93820cc3515200000000232200207f79ddc1e90d48fa4deceba3113263383ce85327e3d5c6e06ccec0ab3e89b617ffffffffd0eacf840777207cdd529c74207108e25f6b3c3ad41f05adc12883e2266e2a4a00000000232200207f79ddc1e90d48fa4deceba3113263383ce85327e3d5c6e06ccec0ab3e89b617ffffffff01c05b1a260800000017a914ea5d3d4c2de85c8fc1ec8b501e23351bf6456e01870500473044022072734c2d91c96ed057707b9ae9ba7fb0238bd1de8b39c6321f56fcda55a464ce02204fd8899ab0fb24b1235e75f49f3dd9e955e9747a571da1897b946de46263be420148304502210086466a0cbe4d52fbb47a672e9369d7b5f7ad99d5e069cfea5019b41347dc24aa0220674a337ddf9321957f76e0d88a9356e5e063ef17c076b3d9cb5c1cfb104ae79a01004b6351675268210348a2cff2d21dc43287f731d4ee192a3879b64ae2a0f8d18f7f0bf615a62aa8562102ecec100acb89f3049285ae01e7f03fb469e6b54d44b0f3c8240b1958e893cb8c52ae050047304402207d32170046fc8f7f7bb5fe829f71423864876cf15a4f41611a6f957e714384d902207ce3f4422dd8e794585920fba9b187dfed30d8429adbfd3c70ec3a93b5986be30147304402204e19d94a00d68ba6f3246a1bfcdedff6f2e540a3783ddc7fac02621cc0af694d02206982b3329d0586196636c16aed11f7bec20b97ea82cbfff11dac6913834c3cba01004b6351675268210348a2cff2d21dc43287f731d4ee192a3879b64ae2a0f8d18f7f0bf615a62aa8562102ecec100acb89f3049285ae01e7f03fb469e6b54d44b0f3c8240b1958e893cb8c52ae00000000',
      );
      assert.strictEqual(txData.fee, 1000000);
      assert.strictEqual(txData.vaultTxType, bitcoinjs.VaultTxType.Recovery);
      assert.deepStrictEqual(txData.recipients, [
        { address: 'RWePto2x2BAyCMHDyp7yUbdBqLk3jYEsFT', value: 34999000000 },
      ]);
    });

    it('should finalize Instant tx on AIR', async function() {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 30 * 1000;
      // Signed with one signature
      const encodedPsbt =
        'cHNidP8BAHwCAAAAAmv6sXdIrFOW5fBzxXIxWXbxte4H8zHUirswgDXeI+lgAAAAAAD/////UFLc6Ktri7w6lx/OaUygIQJKa3gGqTSe+ztmddzCt98AAAAAAP////8BwFsaJggAAAAXqRSKFKqZerbgpJGOZ3dFMKukDjPnVIcAAAAAAAEBIADPFBMEAAAAF6kUnngShumtX0yV068HkvVJ2urlB/eHIgICH/Ds4O/WQj5CfY/ciYRFeCWqZ0j6kaJN8yF/ofDjlNNHMEQCIHMeO6GRfUxFbC58tjIWKW6hyhKCMeXWkH50royamWaSAiBtt0R6mmf1CluPyZAercvrKav8MdiN8FuuCBBGfqwK1QEBBCIAIGA1ZYA+WFdhN67w8SH0LDDNbHGoVmJYF+Tc29AdO9lFAQVxY1FnY1JnU2hoIQIf8Ozg79ZCPkJ9j9yJhEV4JapnSPqRok3zIX+h8OOU0yEC7OwQCsuJ8wSSha4B5/A/tGnmtU1EsPPIJAsZWOiTy4whAmNFGlLz065pGJaeHFzpNHQxhVeEge+BMDNq0XJrph3bU64AAQEgAM8UEwQAAAAXqRSeeBKG6a1fTJXTrweS9Una6uUH94ciAgIf8Ozg79ZCPkJ9j9yJhEV4JapnSPqRok3zIX+h8OOU00cwRAIgHLqA+XkWe8qYboVhRIpeudNChx8qqS6vAy/lL9UzXcECIHoRnppsu4lPWKUL/ZwDx5xBcsA22ZWqeMGo1gIgBkCXAQEEIgAgYDVlgD5YV2E3rvDxIfQsMM1scahWYlgX5Nzb0B072UUBBXFjUWdjUmdTaGghAh/w7ODv1kI+Qn2P3ImERXglqmdI+pGiTfMhf6Hw45TTIQLs7BAKy4nzBJKFrgHn8D+0aea1TUSw88gkCxlY6JPLjCECY0UaUvPTrmkYlp4cXOk0dDGFV4SB74EwM2rRcmumHdtTrgABABYAFKSa1hvZyhS5D4xq9qde45XuyZWtAA==';

      const txData = await airAuthenticator.signAndFinalizePSBT(encodedPsbt);

      assert.strictEqual(
        txData.tx.toHex(),
        '020000000001026bfab17748ac5396e5f073c572315976f1b5ee07f331d48abb308035de23e9600000000023220020603565803e58576137aef0f121f42c30cd6c71a856625817e4dcdbd01d3bd945ffffffff5052dce8ab6b8bbc3a971fce694ca021024a6b7806a9349efb3b6675dcc2b7df0000000023220020603565803e58576137aef0f121f42c30cd6c71a856625817e4dcdbd01d3bd945ffffffff01c05b1a260800000017a9148a14aa997ab6e0a4918e67774530aba40e33e7548706004730440220731e3ba1917d4c456c2e7cb63216296ea1ca128231e5d6907e74ae8c9a99669202206db7447a9a67f50a5b8fc9901eadcbeb29abfc31d88df05bae0810467eac0ad50147304402206941aec7c1e17d6f4da3608302a34b413ec238b5fb221e8ecd48c8456280d20202202259818c826dc8c09295c6e141f15cdf2aa9042dac7601260ab875a6b75a0add010101007163516763526753686821021ff0ece0efd6423e427d8fdc8984457825aa6748fa91a24df3217fa1f0e394d32102ecec100acb89f3049285ae01e7f03fb469e6b54d44b0f3c8240b1958e893cb8c210263451a52f3d3ae6918969e1c5ce934743185578481ef8130336ad1726ba61ddb53ae060047304402201cba80f979167bca986e8561448a5eb9d342871f2aa92eaf032fe52fd5335dc102207a119e9a6cbb894f58a50bfd9c03c79c4172c036d995aa78c1a8d6022006409701473044022033589e6c162b448256b11345085d55db801bddb3219619dd5d64ec35502d381c02200b3424412ad227be2a1ecd7d8f31806c66b569d59d0fa9bd4847a609c0966ab0010101007163516763526753686821021ff0ece0efd6423e427d8fdc8984457825aa6748fa91a24df3217fa1f0e394d32102ecec100acb89f3049285ae01e7f03fb469e6b54d44b0f3c8240b1958e893cb8c210263451a52f3d3ae6918969e1c5ce934743185578481ef8130336ad1726ba61ddb53ae00000000',
      );
      assert.strictEqual(txData.fee, 1000000);
      assert.strictEqual(txData.vaultTxType, bitcoinjs.VaultTxType.Instant);
      assert.deepStrictEqual(txData.recipients, [
        { address: 'RMsJ5v4NYtVQE6xy34yRUdowNDCGkbPk1p', value: 34999000000 },
      ]);
    });

    it('should finalize Recovery tx on AIR', async function() {
      // Signed with two signatures
      const encodedPsbt =
        'cHNidP8BAHwCAAAAAsPSuj1koi4un+ahen1mU5yC0eqa5bKiEww/o5U9eR7OAAAAAAD//////mG/Hz9+41BN2BI8H8vqvhGe9Gfh2Ah/AqO1AunIK9oAAAAAAP////8BwFsaJggAAAAXqRQNMLZW9RTWdI4EMyyE+IU04ddEEocAAAAAAAEBIADPFBMEAAAAF6kUe0vIPVqEvXbtnRrGkNHpz7V6Fu2HIgICqf9P4M5XB4xo/z7YOOn/gP3MiG7fwm8CAWcaYPszmElHMEQCIDI6cDlCA4CVfcwftbD52yd2yG5E64zaygc+uZW/Y5urAiBngae+vkTO873H1fofau+2dmiLjaX1K+VsFuTWHbgu4QEiAgLs7BAKy4nzBJKFrgHn8D+0aea1TUSw88gkCxlY6JPLjEcwRAIgE5rxLfpBubLcZjHUetovSSivYW76wHLB6iarrBbmE6ICIEl553fYGWtkDiovyvVdENTDb/86ya4fDmDAo9oSJdG0AQEEIgAgAgOstP2Xc9QviFFl6+Tk+S62ZSpM1GQfC/RtTsA1XDEBBXFjUWdjUmdTaGghAqn/T+DOVweMaP8+2Djp/4D9zIhu38JvAgFnGmD7M5hJIQLs7BAKy4nzBJKFrgHn8D+0aea1TUSw88gkCxlY6JPLjCECY0UaUvPTrmkYlp4cXOk0dDGFV4SB74EwM2rRcmumHdtTrgABASAAzxQTBAAAABepFHtLyD1ahL127Z0axpDR6c+1ehbthyICAqn/T+DOVweMaP8+2Djp/4D9zIhu38JvAgFnGmD7M5hJRzBEAiB2gm11G1v6dwtHXjQkMbbW92V/oAssCt35EQVl2IlzlwIgFX6pPw7KF72ftwaPJfw+JnlMLXv5Ync4YSm8YlLehlUBIgIC7OwQCsuJ8wSSha4B5/A/tGnmtU1EsPPIJAsZWOiTy4xHMEQCIFSLRDrBp8qkS6cuqRzU0oM/UA6nh0p2g2fc0SOy6DKsAiA150WwIaFx7mnd0u6di5+wmqlIZe1hvJxbD9ChmQOp/wEBBCIAIAIDrLT9l3PUL4hRZevk5PkutmUqTNRkHwv0bU7ANVwxAQVxY1FnY1JnU2hoIQKp/0/gzlcHjGj/Ptg46f+A/cyIbt/CbwIBZxpg+zOYSSEC7OwQCsuJ8wSSha4B5/A/tGnmtU1EsPPIJAsZWOiTy4whAmNFGlLz065pGJaeHFzpNHQxhVeEge+BMDNq0XJrph3bU64AAQAWABT6q/JZyb5MO4Rs1Hp8Ma3jMNUk0gA=';

      const txData = await airAuthenticator.signAndFinalizePSBT(encodedPsbt);

      assert.strictEqual(
        txData.tx.toHex(),
        '02000000000102c3d2ba3d64a22e2e9fe6a17a7d66539c82d1ea9ae5b2a2130c3fa3953d791ece00000000232200200203acb4fd9773d42f885165ebe4e4f92eb6652a4cd4641f0bf46d4ec0355c31fffffffffe61bf1f3f7ee3504dd8123c1fcbeabe119ef467e1d8087f02a3b502e9c82bda00000000232200200203acb4fd9773d42f885165ebe4e4f92eb6652a4cd4641f0bf46d4ec0355c31ffffffff01c05b1a260800000017a9140d30b656f514d6748e04332c84f88534e1d744128707004730440220323a7039420380957dcc1fb5b0f9db2776c86e44eb8cdaca073eb995bf639bab02206781a7bebe44cef3bdc7d5fa1f6aefb676688b8da5f52be56c16e4d61db82ee1014730440220139af12dfa41b9b2dc6631d47ada2f4928af616efac072c1ea26abac16e613a202204979e777d8196b640e2a2fcaf55d10d4c36fff3ac9ae1f0e60c0a3da1225d1b401483045022100dbdd84d3bb9ac480a4c0b9b8c9b618cc5a69865f7eaa2f4bed73c23065c2aee302206f11775c46bc66105daa5f5f29e209a259af9476e5b5138d6761cc22b13ec5c1010000716351676352675368682102a9ff4fe0ce57078c68ff3ed838e9ff80fdcc886edfc26f0201671a60fb3398492102ecec100acb89f3049285ae01e7f03fb469e6b54d44b0f3c8240b1958e893cb8c210263451a52f3d3ae6918969e1c5ce934743185578481ef8130336ad1726ba61ddb53ae0700473044022076826d751b5bfa770b475e342431b6d6f7657fa00b2c0addf9110565d88973970220157ea93f0eca17bd9fb7068f25fc3e26794c2d7bf96277386129bc6252de8655014730440220548b443ac1a7caa44ba72ea91cd4d2833f500ea7874a768367dcd123b2e832ac022035e745b021a171ee69ddd2ee9d8b9fb09aa94865ed61bc9c5b0fd0a19903a9ff01473044022043f52bdff1b5325ad6bbce5ca1dee650c8e37ae3b419c8dfe8124f7069d5b82e022056f19c4af410e3b0d0a3bc11e6e415aae4013a987283ca4c0f5f822a19ecaffc010000716351676352675368682102a9ff4fe0ce57078c68ff3ed838e9ff80fdcc886edfc26f0201671a60fb3398492102ecec100acb89f3049285ae01e7f03fb469e6b54d44b0f3c8240b1958e893cb8c210263451a52f3d3ae6918969e1c5ce934743185578481ef8130336ad1726ba61ddb53ae00000000',
      );
      assert.strictEqual(txData.fee, 1000000);
      assert.strictEqual(txData.vaultTxType, bitcoinjs.VaultTxType.Recovery);
      assert.deepStrictEqual(txData.recipients, [
        { address: 'RAUwDbbeFumeZQSsBaJnhWkSxam8m2734T', value: 34999000000 },
      ]);
    });

    it('should not finalize Recovery tx on AR', async function() {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 30 * 1000;
      // Signed with one signature
      const encodedPsbt =
        'cHNidP8BAHwCAAAAAvFFXw/jEkj9oodfts21YloovVzXuEjn3+ibk4IMw1FSAAAAAAD/////0OrPhAd3IHzdUpx0IHEI4l9rPDrUHwWtwSiD4iZuKkoAAAAAAP////8BwFsaJggAAAAXqRTqXT1MLehcj8Hsi1AeIzUb9kVuAYcAAAAAAAEBIADPFBMEAAAAF6kUGEm2GetgNT0MF4Erk9uUqbpF9wmHIgIDSKLP8tIdxDKH9zHU7hkqOHm2SuKg+NGPfwv2FaYqqFZHMEQCIHJzTC2RyW7QV3B7mum6f7Aji9HeiznGMh9W/NpVpGTOAiBP2ImasPsksSNedfSfPdnpVel0elcdoYl7lG3kYmO+QgEBBCIAIH953cHpDUj6TezroxEyYzg86FMn49XG4GzOwKs+ibYXAQVLY1FnUmghA0iiz/LSHcQyh/cx1O4ZKjh5tkrioPjRj38L9hWmKqhWIQLs7BAKy4nzBJKFrgHn8D+0aea1TUSw88gkCxlY6JPLjFKuAAEBIADPFBMEAAAAF6kUGEm2GetgNT0MF4Erk9uUqbpF9wmHIgIDSKLP8tIdxDKH9zHU7hkqOHm2SuKg+NGPfwv2FaYqqFZHMEQCIH0yFwBG/I9/e7X+gp9xQjhkh2zxWk9BYRpvlX5xQ4TZAiB84/RCLdjnlFhZIPupsYff7TDYQprb/Txw7DqTtZhr4wEBBCIAIH953cHpDUj6TezroxEyYzg86FMn49XG4GzOwKs+ibYXAQVLY1FnUmghA0iiz/LSHcQyh/cx1O4ZKjh5tkrioPjRj38L9hWmKqhWIQLs7BAKy4nzBJKFrgHn8D+0aea1TUSw88gkCxlY6JPLjFKuAAEAFgAUg9grzH1XGRHCnWpxlAEMWpLdPOUA';

      await assert.rejects(async () => {
        await foreignAuthenticator.signAndFinalizePSBT(encodedPsbt);
      }, new RegExp('Unable to sign tx with authenticator'));
    });

    it('should not finalize Instant tx on AIR', async function() {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 30 * 1000;
      // Signed with one signature
      const encodedPsbt =
        'cHNidP8BAHwCAAAAAmv6sXdIrFOW5fBzxXIxWXbxte4H8zHUirswgDXeI+lgAAAAAAD/////UFLc6Ktri7w6lx/OaUygIQJKa3gGqTSe+ztmddzCt98AAAAAAP////8BwFsaJggAAAAXqRSKFKqZerbgpJGOZ3dFMKukDjPnVIcAAAAAAAEBIADPFBMEAAAAF6kUnngShumtX0yV068HkvVJ2urlB/eHIgICH/Ds4O/WQj5CfY/ciYRFeCWqZ0j6kaJN8yF/ofDjlNNHMEQCIHMeO6GRfUxFbC58tjIWKW6hyhKCMeXWkH50royamWaSAiBtt0R6mmf1CluPyZAercvrKav8MdiN8FuuCBBGfqwK1QEBBCIAIGA1ZYA+WFdhN67w8SH0LDDNbHGoVmJYF+Tc29AdO9lFAQVxY1FnY1JnU2hoIQIf8Ozg79ZCPkJ9j9yJhEV4JapnSPqRok3zIX+h8OOU0yEC7OwQCsuJ8wSSha4B5/A/tGnmtU1EsPPIJAsZWOiTy4whAmNFGlLz065pGJaeHFzpNHQxhVeEge+BMDNq0XJrph3bU64AAQEgAM8UEwQAAAAXqRSeeBKG6a1fTJXTrweS9Una6uUH94ciAgIf8Ozg79ZCPkJ9j9yJhEV4JapnSPqRok3zIX+h8OOU00cwRAIgHLqA+XkWe8qYboVhRIpeudNChx8qqS6vAy/lL9UzXcECIHoRnppsu4lPWKUL/ZwDx5xBcsA22ZWqeMGo1gIgBkCXAQEEIgAgYDVlgD5YV2E3rvDxIfQsMM1scahWYlgX5Nzb0B072UUBBXFjUWdjUmdTaGghAh/w7ODv1kI+Qn2P3ImERXglqmdI+pGiTfMhf6Hw45TTIQLs7BAKy4nzBJKFrgHn8D+0aea1TUSw88gkCxlY6JPLjCECY0UaUvPTrmkYlp4cXOk0dDGFV4SB74EwM2rRcmumHdtTrgABABYAFKSa1hvZyhS5D4xq9qde45XuyZWtAA==';

      await assert.rejects(async () => {
        await foreignAuthenticator.signAndFinalizePSBT(encodedPsbt);
      }, new RegExp('Unable to sign tx with authenticator'));
    });

    it('should not finalize Recovery tx on AIR', async function() {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 30 * 1000;
      // Signed with two signatures
      const encodedPsbt =
        'cHNidP8BAHwCAAAAAsPSuj1koi4un+ahen1mU5yC0eqa5bKiEww/o5U9eR7OAAAAAAD//////mG/Hz9+41BN2BI8H8vqvhGe9Gfh2Ah/AqO1AunIK9oAAAAAAP////8BwFsaJggAAAAXqRQNMLZW9RTWdI4EMyyE+IU04ddEEocAAAAAAAEBIADPFBMEAAAAF6kUe0vIPVqEvXbtnRrGkNHpz7V6Fu2HIgICqf9P4M5XB4xo/z7YOOn/gP3MiG7fwm8CAWcaYPszmElHMEQCIDI6cDlCA4CVfcwftbD52yd2yG5E64zaygc+uZW/Y5urAiBngae+vkTO873H1fofau+2dmiLjaX1K+VsFuTWHbgu4QEiAgLs7BAKy4nzBJKFrgHn8D+0aea1TUSw88gkCxlY6JPLjEcwRAIgE5rxLfpBubLcZjHUetovSSivYW76wHLB6iarrBbmE6ICIEl553fYGWtkDiovyvVdENTDb/86ya4fDmDAo9oSJdG0AQEEIgAgAgOstP2Xc9QviFFl6+Tk+S62ZSpM1GQfC/RtTsA1XDEBBXFjUWdjUmdTaGghAqn/T+DOVweMaP8+2Djp/4D9zIhu38JvAgFnGmD7M5hJIQLs7BAKy4nzBJKFrgHn8D+0aea1TUSw88gkCxlY6JPLjCECY0UaUvPTrmkYlp4cXOk0dDGFV4SB74EwM2rRcmumHdtTrgABASAAzxQTBAAAABepFHtLyD1ahL127Z0axpDR6c+1ehbthyICAqn/T+DOVweMaP8+2Djp/4D9zIhu38JvAgFnGmD7M5hJRzBEAiB2gm11G1v6dwtHXjQkMbbW92V/oAssCt35EQVl2IlzlwIgFX6pPw7KF72ftwaPJfw+JnlMLXv5Ync4YSm8YlLehlUBIgIC7OwQCsuJ8wSSha4B5/A/tGnmtU1EsPPIJAsZWOiTy4xHMEQCIFSLRDrBp8qkS6cuqRzU0oM/UA6nh0p2g2fc0SOy6DKsAiA150WwIaFx7mnd0u6di5+wmqlIZe1hvJxbD9ChmQOp/wEBBCIAIAIDrLT9l3PUL4hRZevk5PkutmUqTNRkHwv0bU7ANVwxAQVxY1FnY1JnU2hoIQKp/0/gzlcHjGj/Ptg46f+A/cyIbt/CbwIBZxpg+zOYSSEC7OwQCsuJ8wSSha4B5/A/tGnmtU1EsPPIJAsZWOiTy4whAmNFGlLz065pGJaeHFzpNHQxhVeEge+BMDNq0XJrph3bU64AAQAWABT6q/JZyb5MO4Rs1Hp8Ma3jMNUk0gA=';

      await assert.rejects(async () => {
        await foreignAuthenticator.signAndFinalizePSBT(encodedPsbt);
      }, new RegExp('Unable to sign tx with authenticator'));
    });
  });
});
