/* global describe, it */
import config from '../../config';

const assert = require('assert');
const bitcoinjs = require('bitcoinjs-lib');

describe('unit - signer', function() {
  describe('createSegwitTransaction()', function() {
    it('should return valid tx hex for segwit transactions', async function(done) {
      const signer = require('../../models/signer');
      const utxos = [
        {
          txid: '1e1a8cced5580eecd0ac15845fc3adfafbb0f5944a54950e4a16b8f6d1e9b715',
          vout: 1,
          address: 'RSvwNKBtqEhbNNF4A7mcUcJ3ZiR7FUSJVn',
          account: 'RSvwNKBtqEhbNNF4A7mcUcJ3ZiR7FUSJVn',
          scriptPubKey: 'a914c19daa4f3035e18a71abc63ababc4d3da8f2840f87',
          value: 100000,
          confirmations: 108,
          spendable: true,
          solvable: false,
          safe: true,
        },
      ];
      const { tx } = await signer.createSegwitTransaction(
        utxos,
        'YQgWXHY2QduhjqMkJHywzDfhx1ntumM5Ht',
        0.001,
        0.0001,
        'KxAQ435Q193azgg8qgP5GY9291roo2kTRniSxmaWaHy3SfB1si3E',
      );
      assert.strictEqual(
        tx,
        '0100000000010115b7e9d1f6b8164a0e95544a94f5b0fbfaadc35f8415acd0ec0e58d5ce8c1a1e0100000017160014cdcbe2bdb67b6ceece9f96f917362396a0697775ffffffff01905f0100000000001976a9140e75eb2af3599acf900cf0b7e666027b105cf3db88ac02473044022062dd7f00917781bd12cf59649f53f8b57d1bf83168d8bf295b3ae80d183df72402207b102b3158064eeddb6d951b3df00b0efafdb5c6fede25ba43226dab73895a96012102504f1fce9ec0517c2997374a69637fb7a351a2a3e3cf82457bfe0a894eb1821500000000',
      );
      done();
    });

    it('should return valid tx hex for RBF-able segwit transactions', async function(done) {
      const signer = require('../../models/signer');
      const utxos = [
        {
          txid: '1e1a8cced5580eecd0ac15845fc3adfafbb0f5944a54950e4a16b8f6d1e9b715',
          vout: 1,
          address: 'RPuRPTc9o6DMLsESyhDSkPoinH4JX1RG26',
          account: 'RPuRPTc9o6DMLsESyhDSkPoinH4JX1RG26',
          scriptPubKey: 'a9146fbf1cee74734503297e46a0db3e3fbb06f2e9d387',
          value: 10000000,
          confirmations: 108,
          spendable: false,
          solvable: false,
          safe: true,
        },
      ];
      const { tx: txhex } = await signer.createSegwitTransaction(
        utxos,
        'YQgWXHY2QduhjqMkJHywzDfhx1ntumM5Ht',
        0.001,
        0.0001,
        'KwWc7DAYgzgRdBcvKD844SC5cHWZ1HY5TxqUACohH59uiH4RNrXT',
        'RPuRPTc9o6DMLsESyhDSkPoinH4JX1RG26',
        0,
      );
      assert.equal(
        txhex,
        '0100000000010115b7e9d1f6b8164a0e95544a94f5b0fbfaadc35f8415acd0ec0e58d5ce8c1a1e0100000017160014ac19842ed4543c10fbe074f0b9e19f973f0e1d630000000002905f0100000000001976a9140e75eb2af3599acf900cf0b7e666027b105cf3db88ace00f97000000000017a914a06bd87fce37f45094aba65d6ac1e98631ac0759870247304402203aa7c0623bf490d0d7397fd40a003fcb8379a846dbf160d5f6bd267fd2967075022068faf20cd31852825e71911ce3037569ed3929a5a5688adce63bef525bf912950121039a5f64c819f73ca1655e5514a1ddc4ea6911804718876fd93c33f3208f2f645300000000',
      );
      // now, testing change addess, destination address, amounts & fees...
      const tx = bitcoinjs.Transaction.fromHex(txhex);
      assert.equal(
        bitcoinjs.address.fromOutputScript(tx.outs[0].script, config.network),
        'YQgWXHY2QduhjqMkJHywzDfhx1ntumM5Ht',
      );
      assert.equal(
        bitcoinjs.address.fromOutputScript(tx.outs[1].script, config.network),
        'RPuRPTc9o6DMLsESyhDSkPoinH4JX1RG26',
      );
      assert.equal(tx.outs[0].value, 90000); // 0.0009 because we deducted fee 0.0001
      assert.equal(tx.outs[1].value, 9900000); // 0.099 because 0.1 - 0.001
      done();
    });

    it('should return valid tx hex for segwit transactions with multiple inputs', async function(done) {
      const signer = require('../../models/signer');
      const utxos = [
        {
          txid: '4e2a536aaf6b0b8a4f439d0343436cd321b8bac9840a24d13b8eed484a257b0b',
          vout: 0,
          address: 'RW4r92uBxhsG3YRgaxb481dKfJ5hhvrdsC',
          account: 'RW4r92uBxhsG3YRgaxb481dKfJ5hhvrdsC',
          scriptPubKey: 'a914e4050160d7beb7404aa2757227cd2e8435cb804087',
          value: 90000,
          confirmations: 67,
          spendable: false,
          solvable: false,
          safe: true,
        },
        {
          txid: '09e1b78d4ecd95dd4c7dbc840a2619da6d02caa345a63b2733f3972666462fbd',
          vout: 0,
          address: 'RW4r92uBxhsG3YRgaxb481dKfJ5hhvrdsC',
          account: 'RW4r92uBxhsG3YRgaxb481dKfJ5hhvrdsC',
          scriptPubKey: 'a914e4050160d7beb7404aa2757227cd2e8435cb804087',
          value: 190000,
          confirmations: 142,
          spendable: false,
          solvable: false,
          safe: true,
        },
      ];
      const { tx } = await signer.createSegwitTransaction(
        utxos,
        'YQgWXHY2QduhjqMkJHywzDfhx1ntumM5Ht',
        0.0028,
        0.0002,
        'L4Ax2X9GKbR889nvZEbKSqK3moHzwBnYNwioFgJcg7Jr2VXung2e',
      );
      assert.equal(
        tx,
        '010000000001020b7b254a48ed8e3bd1240a84c9bab821d36c4343039d434f8a0b6baf6a532a4e0000000017160014096b66fa103012a253f943b68af354d7d3229f14ffffffffbd2f46662697f333273ba645a3ca026dda19260a84bc7d4cdd95cd4e8db7e1090000000017160014096b66fa103012a253f943b68af354d7d3229f14ffffffff01a0f70300000000001976a9140e75eb2af3599acf900cf0b7e666027b105cf3db88ac0247304402202e64db0cf8675cc839fea165f8f0d6eae9cc6ac30e19c64870887c75907458b202205776f7cdff8af7db04f4558e60393030d3afbf0eefbe715db7e4112ad58c63850121037dae990e65137ea8db30521ff22e2a343a485f6ba37c9e7aa860c680e9467f8c02483045022100b2fd35bd10136b5683eb187f3d604a66cf74ff1522249043f9bfe0df0e89549702207e7ce830659b8cc62ea10e06e113ddea34340ab5975955267251cb0b2ac1854b0121037dae990e65137ea8db30521ff22e2a343a485f6ba37c9e7aa860c680e9467f8c00000000',
      );
      done();
    });

    it('should return valid tx hex for segwit transactions with change address', async function(done) {
      const signer = require('../../models/signer');
      const utxos = [
        {
          txid: '160559030484800a77f9b38717bb0217e87bfeb47b92e2e5bad6316ad9d8d360',
          vout: 1,
          address: 'RW4r92uBxhsG3YRgaxb481dKfJ5hhvrdsC',
          account: 'RW4r92uBxhsG3YRgaxb481dKfJ5hhvrdsC',
          scriptPubKey: 'a914e4050160d7beb7404aa2757227cd2e8435cb804087',
          value: 400000,
          confirmations: 271,
          spendable: false,
          solvable: false,
          safe: true,
        },
      ];
      const { tx } = await signer.createSegwitTransaction(
        utxos,
        'YQgWXHY2QduhjqMkJHywzDfhx1ntumM5Ht',
        0.002,
        0.0001,
        'L4Ax2X9GKbR889nvZEbKSqK3moHzwBnYNwioFgJcg7Jr2VXung2e',
      );
      assert.equal(
        tx,
        '0100000000010160d3d8d96a31d6bae5e2927bb4fe7be81702bb1787b3f9770a808404035905160100000017160014096b66fa103012a253f943b68af354d7d3229f14ffffffff0230e60200000000001976a9140e75eb2af3599acf900cf0b7e666027b105cf3db88ac400d03000000000017a914e4050160d7beb7404aa2757227cd2e8435cb8040870247304402204a17a38fe362d6a17e9375c2908f08442b1f3f311a4f30a5c633930072b1eb9402203ad5e45bfec5a8a3e8154f825f5a7767cf351a75b0f4da1ecce9e6f1a42bfcd70121037dae990e65137ea8db30521ff22e2a343a485f6ba37c9e7aa860c680e9467f8c00000000',
      );
      done();
    });

    it('should return valid tx hex for segwit transactions if change is too small so it causes @dust error', async function(done) {
      // checking that change amount is at least 3x of fee, otherwise screw the change, just add it to fee
      const signer = require('../../models/signer');
      const utxos = [
        {
          txid: '160559030484800a77f9b38717bb0217e87bfeb47b92e2e5bad6316ad9d8d360',
          vout: 1,
          address: 'RW4r92uBxhsG3YRgaxb481dKfJ5hhvrdsC',
          account: 'RW4r92uBxhsG3YRgaxb481dKfJ5hhvrdsC',
          scriptPubKey: 'a914e4050160d7beb7404aa2757227cd2e8435cb804087',
          value: 400000,
          confirmations: 271,
          spendable: false,
          solvable: false,
          safe: true,
        },
      ];
      const { tx: txhex } = await signer.createSegwitTransaction(
        utxos,
        'YQgWXHY2QduhjqMkJHywzDfhx1ntumM5Ht',
        0.003998,
        0.000001,
        'L4Ax2X9GKbR889nvZEbKSqK3moHzwBnYNwioFgJcg7Jr2VXung2e',
      );
      const bitcoin = bitcoinjs;
      const tx = bitcoin.Transaction.fromHex(txhex);
      assert.equal(tx.ins.length, 1);
      assert.equal(tx.outs.length, 1); // only 1 output, which means change is neglected
      assert.equal(tx.outs[0].value, 399700);
      done();
    });
  });

  describe('WIF2address()', function() {
    it('should convert WIF to segwit P2SH address', function(done) {
      const signer = require('../../models/signer');
      const address = signer.WIF2segwitAddress('L55uHs7pyz7rP18K38kB7kqDVNJaeYFzJtZyC3ZjD2c684dzXQWs');
      assert.equal(address, 'RP2WJvXEBXtJ3ZAndQhcyHEf3RmwUYpMWz');
      done();
    });
  });

  describe('generateNewAddress()', function() {
    it('should generate new address', function(done) {
      const signer = require('../../models/signer');
      const address = signer.generateNewSegwitAddress();
      assert.ok(address.WIF);
      assert.ok(address.address);
      assert.equal(address.address, signer.WIF2segwitAddress(address.WIF));
      done();
    });
  });

  describe('URI()', function() {
    it('should form correct payment url', function(done) {
      const signer = require('../../models/signer');
      let url = signer.URI({
        address: 'RPuRPTc9o6DMLsESyhDSkPoinH4JX1RG26',
        message: 'For goods & services',
        label: 'nolabel',
        amount: 1000000,
      });
      assert.equal(
        url,
        'bitcoin:RPuRPTc9o6DMLsESyhDSkPoinH4JX1RG26?amount=0.01&message=For%20goods%20%26%20services&label=nolabel',
      );

      url = signer.URI({
        address: 'YRMDysNqxPQiHee3NodziKKsHhRvysur63',
        message: 'wheres the money lebowski',
        amount: 400000,
      });
      assert.equal(
        url,
        'bitcoin:YRMDysNqxPQiHee3NodziKKsHhRvysur63?amount=0.004&message=wheres%20the%20money%20lebowski',
      );
      done();
    });
  });

  describe('createTransaction()', () => {
    const signer = require('../../models/signer');
    it('should return valid TX hex for legacy transactions', async () => {
      const utxos = [
        {
          txid: '2f445cf016fa2772db7d473bff97515355b4e6148e1c980ce351d47cf54c517f',
          vout: 1,
          address: 'RPuRPTc9o6DMLsESyhDSkPoinH4JX1RG26',
          account: 'RPuRPTc9o6DMLsESyhDSkPoinH4JX1RG26',
          scriptPubKey: 'a9146fbf1cee74734503297e46a0db3e3fbb06f2e9d387',
          value: 1000000,
          confirmations: 108,
          spendable: false,
          solvable: false,
          safe: true,
        },
      ];
      const toAddr = 'YcDWR7Qv7fNMs5y8Dy2xpAd3h7jMzJz6pL';
      const value = 0.001;
      const fee = 0.0001;
      const WIF = 'KzbTHhzzZyVhkTYpuReMBkE7zUvvDEZtavq1DJV85MtBZyHK1TTF';
      const fromAddr = 'Yfy3915VPWXgnSxgs14em39uB7fXBy4MSE';
      const { tx: txHex } = await signer.createTransaction(utxos, toAddr, value, fee, WIF, fromAddr);
      assert.equal(
        txHex,
        '01000000017f514cf57cd451e30c981c8e14e6b455535197ff3b477ddb7227fa16f05c442f010000006b483045022100dd8944c1549ee02762c031290cd1f97745c74bab72a78112beac905df5297c79022070d098a067a99c16ab817fbeed3be7b757d601af9bdf82438b208d799e71e22f012103f5438d524ad1cc288963466d6ef1a27d83183f7e9b7fe30879ecdae887692a31ffffffff02905f0100000000001976a9148cfc1bb2ab27001434bcf722038027b6fa600def88aca0bb0d00000000001976a914b620047e2947a5c036aff69c677a75b58923168488ac00000000',
      );
    });
  });

  describe('signAndFinalizePSBT()', () => {
    const signer = require('../../models/signer');

    it('should not finalize Recovery tx on AR with 1 signature', () => {
      const encodedPsbt =
        'cHNidP8BAHwCAAAAAvFFXw/jEkj9oodfts21YloovVzXuEjn3+ibk4IMw1FSAAAAAAD/////0OrPhAd3IHzdUpx0IHEI4l9rPDrUHwWtwSiD4iZuKkoAAAAAAP////8BwFsaJggAAAAXqRTqXT1MLehcj8Hsi1AeIzUb9kVuAYcAAAAAAAEBIADPFBMEAAAAF6kUGEm2GetgNT0MF4Erk9uUqbpF9wmHIgIDSKLP8tIdxDKH9zHU7hkqOHm2SuKg+NGPfwv2FaYqqFZHMEQCIHJzTC2RyW7QV3B7mum6f7Aji9HeiznGMh9W/NpVpGTOAiBP2ImasPsksSNedfSfPdnpVel0elcdoYl7lG3kYmO+QgEBBCIAIH953cHpDUj6TezroxEyYzg86FMn49XG4GzOwKs+ibYXAQVLY1FnUmghA0iiz/LSHcQyh/cx1O4ZKjh5tkrioPjRj38L9hWmKqhWIQLs7BAKy4nzBJKFrgHn8D+0aea1TUSw88gkCxlY6JPLjFKuAAEBIADPFBMEAAAAF6kUGEm2GetgNT0MF4Erk9uUqbpF9wmHIgIDSKLP8tIdxDKH9zHU7hkqOHm2SuKg+NGPfwv2FaYqqFZHMEQCIH0yFwBG/I9/e7X+gp9xQjhkh2zxWk9BYRpvlX5xQ4TZAiB84/RCLdjnlFhZIPupsYff7TDYQprb/Txw7DqTtZhr4wEBBCIAIH953cHpDUj6TezroxEyYzg86FMn49XG4GzOwKs+ibYXAQVLY1FnUmghA0iiz/LSHcQyh/cx1O4ZKjh5tkrioPjRj38L9hWmKqhWIQLs7BAKy4nzBJKFrgHn8D+0aea1TUSw88gkCxlY6JPLjFKuAAEAFgAUg9grzH1XGRHCnWpxlAEMWpLdPOUA';

      assert.throws(() => {
        signer.signAndFinalizePSBT(encodedPsbt, [], bitcoinjs.VaultTxType.Recovery);
      }, new RegExp('Can not finalize input'));
    });

    it('should finalize Recovery tx on AR', () => {
      const privateKey = Buffer.from('79d6d5075b87e759c955d413bff5065f0156b275ece1e500e37bf36f6a186543', 'hex');
      const keyPairs = [bitcoinjs.ECPair.fromPrivateKey(privateKey, { network: config.network })];
      // Signed with one signatures
      const encodedPsbt =
        'cHNidP8BAHwCAAAAAvFFXw/jEkj9oodfts21YloovVzXuEjn3+ibk4IMw1FSAAAAAAD/////0OrPhAd3IHzdUpx0IHEI4l9rPDrUHwWtwSiD4iZuKkoAAAAAAP////8BwFsaJggAAAAXqRTqXT1MLehcj8Hsi1AeIzUb9kVuAYcAAAAAAAEBIADPFBMEAAAAF6kUGEm2GetgNT0MF4Erk9uUqbpF9wmHIgIDSKLP8tIdxDKH9zHU7hkqOHm2SuKg+NGPfwv2FaYqqFZHMEQCIHJzTC2RyW7QV3B7mum6f7Aji9HeiznGMh9W/NpVpGTOAiBP2ImasPsksSNedfSfPdnpVel0elcdoYl7lG3kYmO+QgEBBCIAIH953cHpDUj6TezroxEyYzg86FMn49XG4GzOwKs+ibYXAQVLY1FnUmghA0iiz/LSHcQyh/cx1O4ZKjh5tkrioPjRj38L9hWmKqhWIQLs7BAKy4nzBJKFrgHn8D+0aea1TUSw88gkCxlY6JPLjFKuAAEBIADPFBMEAAAAF6kUGEm2GetgNT0MF4Erk9uUqbpF9wmHIgIDSKLP8tIdxDKH9zHU7hkqOHm2SuKg+NGPfwv2FaYqqFZHMEQCIH0yFwBG/I9/e7X+gp9xQjhkh2zxWk9BYRpvlX5xQ4TZAiB84/RCLdjnlFhZIPupsYff7TDYQprb/Txw7DqTtZhr4wEBBCIAIH953cHpDUj6TezroxEyYzg86FMn49XG4GzOwKs+ibYXAQVLY1FnUmghA0iiz/LSHcQyh/cx1O4ZKjh5tkrioPjRj38L9hWmKqhWIQLs7BAKy4nzBJKFrgHn8D+0aea1TUSw88gkCxlY6JPLjFKuAAEAFgAUg9grzH1XGRHCnWpxlAEMWpLdPOUA';

      const { tx, fee } = signer.signAndFinalizePSBT(encodedPsbt, keyPairs, bitcoinjs.VaultTxType.Recovery);
      assert.strictEqual(
        tx.toHex(),
        '02000000000102f1455f0fe31248fda2875fb6cdb5625a28bd5cd7b848e7dfe89b93820cc3515200000000232200207f79ddc1e90d48fa4deceba3113263383ce85327e3d5c6e06ccec0ab3e89b617ffffffffd0eacf840777207cdd529c74207108e25f6b3c3ad41f05adc12883e2266e2a4a00000000232200207f79ddc1e90d48fa4deceba3113263383ce85327e3d5c6e06ccec0ab3e89b617ffffffff01c05b1a260800000017a914ea5d3d4c2de85c8fc1ec8b501e23351bf6456e01870500473044022072734c2d91c96ed057707b9ae9ba7fb0238bd1de8b39c6321f56fcda55a464ce02204fd8899ab0fb24b1235e75f49f3dd9e955e9747a571da1897b946de46263be420148304502210086466a0cbe4d52fbb47a672e9369d7b5f7ad99d5e069cfea5019b41347dc24aa0220674a337ddf9321957f76e0d88a9356e5e063ef17c076b3d9cb5c1cfb104ae79a01004b6351675268210348a2cff2d21dc43287f731d4ee192a3879b64ae2a0f8d18f7f0bf615a62aa8562102ecec100acb89f3049285ae01e7f03fb469e6b54d44b0f3c8240b1958e893cb8c52ae050047304402207d32170046fc8f7f7bb5fe829f71423864876cf15a4f41611a6f957e714384d902207ce3f4422dd8e794585920fba9b187dfed30d8429adbfd3c70ec3a93b5986be30147304402204e19d94a00d68ba6f3246a1bfcdedff6f2e540a3783ddc7fac02621cc0af694d02206982b3329d0586196636c16aed11f7bec20b97ea82cbfff11dac6913834c3cba01004b6351675268210348a2cff2d21dc43287f731d4ee192a3879b64ae2a0f8d18f7f0bf615a62aa8562102ecec100acb89f3049285ae01e7f03fb469e6b54d44b0f3c8240b1958e893cb8c52ae00000000',
      );
      assert.strictEqual(fee, 1000000);
    });

    it('should not finalize Instant and Recovery txs on AIR with 1 signature', () => {
      // Signed with one signature
      const encodedPsbt =
        'cHNidP8BAHwCAAAAAmv6sXdIrFOW5fBzxXIxWXbxte4H8zHUirswgDXeI+lgAAAAAAD/////UFLc6Ktri7w6lx/OaUygIQJKa3gGqTSe+ztmddzCt98AAAAAAP////8BwFsaJggAAAAXqRSKFKqZerbgpJGOZ3dFMKukDjPnVIcAAAAAAAEBIADPFBMEAAAAF6kUnngShumtX0yV068HkvVJ2urlB/eHIgICH/Ds4O/WQj5CfY/ciYRFeCWqZ0j6kaJN8yF/ofDjlNNHMEQCIHMeO6GRfUxFbC58tjIWKW6hyhKCMeXWkH50royamWaSAiBtt0R6mmf1CluPyZAercvrKav8MdiN8FuuCBBGfqwK1QEBBCIAIGA1ZYA+WFdhN67w8SH0LDDNbHGoVmJYF+Tc29AdO9lFAQVxY1FnY1JnU2hoIQIf8Ozg79ZCPkJ9j9yJhEV4JapnSPqRok3zIX+h8OOU0yEC7OwQCsuJ8wSSha4B5/A/tGnmtU1EsPPIJAsZWOiTy4whAmNFGlLz065pGJaeHFzpNHQxhVeEge+BMDNq0XJrph3bU64AAQEgAM8UEwQAAAAXqRSeeBKG6a1fTJXTrweS9Una6uUH94ciAgIf8Ozg79ZCPkJ9j9yJhEV4JapnSPqRok3zIX+h8OOU00cwRAIgHLqA+XkWe8qYboVhRIpeudNChx8qqS6vAy/lL9UzXcECIHoRnppsu4lPWKUL/ZwDx5xBcsA22ZWqeMGo1gIgBkCXAQEEIgAgYDVlgD5YV2E3rvDxIfQsMM1scahWYlgX5Nzb0B072UUBBXFjUWdjUmdTaGghAh/w7ODv1kI+Qn2P3ImERXglqmdI+pGiTfMhf6Hw45TTIQLs7BAKy4nzBJKFrgHn8D+0aea1TUSw88gkCxlY6JPLjCECY0UaUvPTrmkYlp4cXOk0dDGFV4SB74EwM2rRcmumHdtTrgABABYAFKSa1hvZyhS5D4xq9qde45XuyZWtAA==';

      assert.throws(() => {
        signer.signAndFinalizePSBT(encodedPsbt, [], bitcoinjs.VaultTxType.Instant);
      }, new RegExp('Can not finalize input'));

      assert.throws(() => {
        signer.signAndFinalizePSBT(encodedPsbt, [], bitcoinjs.VaultTxType.Recovery);
      }, new RegExp('Can not finalize input'));
    });

    it('should not finalize Recovery tx on AIR with 2 signatures', () => {
      const privateKey = Buffer.from('79d6d5075b87e759c955d413bff5065f0156b275ece1e500e37bf36f6a186543', 'hex');
      const keyPairs = [bitcoinjs.ECPair.fromPrivateKey(privateKey, { network: config.network })];
      // Signed with one signature
      const encodedPsbt =
        'cHNidP8BAHwCAAAAAmv6sXdIrFOW5fBzxXIxWXbxte4H8zHUirswgDXeI+lgAAAAAAD/////UFLc6Ktri7w6lx/OaUygIQJKa3gGqTSe+ztmddzCt98AAAAAAP////8BwFsaJggAAAAXqRSKFKqZerbgpJGOZ3dFMKukDjPnVIcAAAAAAAEBIADPFBMEAAAAF6kUnngShumtX0yV068HkvVJ2urlB/eHIgICH/Ds4O/WQj5CfY/ciYRFeCWqZ0j6kaJN8yF/ofDjlNNHMEQCIHMeO6GRfUxFbC58tjIWKW6hyhKCMeXWkH50royamWaSAiBtt0R6mmf1CluPyZAercvrKav8MdiN8FuuCBBGfqwK1QEBBCIAIGA1ZYA+WFdhN67w8SH0LDDNbHGoVmJYF+Tc29AdO9lFAQVxY1FnY1JnU2hoIQIf8Ozg79ZCPkJ9j9yJhEV4JapnSPqRok3zIX+h8OOU0yEC7OwQCsuJ8wSSha4B5/A/tGnmtU1EsPPIJAsZWOiTy4whAmNFGlLz065pGJaeHFzpNHQxhVeEge+BMDNq0XJrph3bU64AAQEgAM8UEwQAAAAXqRSeeBKG6a1fTJXTrweS9Una6uUH94ciAgIf8Ozg79ZCPkJ9j9yJhEV4JapnSPqRok3zIX+h8OOU00cwRAIgHLqA+XkWe8qYboVhRIpeudNChx8qqS6vAy/lL9UzXcECIHoRnppsu4lPWKUL/ZwDx5xBcsA22ZWqeMGo1gIgBkCXAQEEIgAgYDVlgD5YV2E3rvDxIfQsMM1scahWYlgX5Nzb0B072UUBBXFjUWdjUmdTaGghAh/w7ODv1kI+Qn2P3ImERXglqmdI+pGiTfMhf6Hw45TTIQLs7BAKy4nzBJKFrgHn8D+0aea1TUSw88gkCxlY6JPLjCECY0UaUvPTrmkYlp4cXOk0dDGFV4SB74EwM2rRcmumHdtTrgABABYAFKSa1hvZyhS5D4xq9qde45XuyZWtAA==';

      assert.throws(() => {
        signer.signAndFinalizePSBT(encodedPsbt, keyPairs, bitcoinjs.VaultTxType.Recovery);
      }, new RegExp('Can not finalize input'));
    });

    it('should finalize Instant tx on AIR', () => {
      const privateKey = Buffer.from('79d6d5075b87e759c955d413bff5065f0156b275ece1e500e37bf36f6a186543', 'hex');
      const keyPairs = [bitcoinjs.ECPair.fromPrivateKey(privateKey, { network: config.network })];
      // Signed with one signature
      const encodedPsbt =
        'cHNidP8BAHwCAAAAAmv6sXdIrFOW5fBzxXIxWXbxte4H8zHUirswgDXeI+lgAAAAAAD/////UFLc6Ktri7w6lx/OaUygIQJKa3gGqTSe+ztmddzCt98AAAAAAP////8BwFsaJggAAAAXqRSKFKqZerbgpJGOZ3dFMKukDjPnVIcAAAAAAAEBIADPFBMEAAAAF6kUnngShumtX0yV068HkvVJ2urlB/eHIgICH/Ds4O/WQj5CfY/ciYRFeCWqZ0j6kaJN8yF/ofDjlNNHMEQCIHMeO6GRfUxFbC58tjIWKW6hyhKCMeXWkH50royamWaSAiBtt0R6mmf1CluPyZAercvrKav8MdiN8FuuCBBGfqwK1QEBBCIAIGA1ZYA+WFdhN67w8SH0LDDNbHGoVmJYF+Tc29AdO9lFAQVxY1FnY1JnU2hoIQIf8Ozg79ZCPkJ9j9yJhEV4JapnSPqRok3zIX+h8OOU0yEC7OwQCsuJ8wSSha4B5/A/tGnmtU1EsPPIJAsZWOiTy4whAmNFGlLz065pGJaeHFzpNHQxhVeEge+BMDNq0XJrph3bU64AAQEgAM8UEwQAAAAXqRSeeBKG6a1fTJXTrweS9Una6uUH94ciAgIf8Ozg79ZCPkJ9j9yJhEV4JapnSPqRok3zIX+h8OOU00cwRAIgHLqA+XkWe8qYboVhRIpeudNChx8qqS6vAy/lL9UzXcECIHoRnppsu4lPWKUL/ZwDx5xBcsA22ZWqeMGo1gIgBkCXAQEEIgAgYDVlgD5YV2E3rvDxIfQsMM1scahWYlgX5Nzb0B072UUBBXFjUWdjUmdTaGghAh/w7ODv1kI+Qn2P3ImERXglqmdI+pGiTfMhf6Hw45TTIQLs7BAKy4nzBJKFrgHn8D+0aea1TUSw88gkCxlY6JPLjCECY0UaUvPTrmkYlp4cXOk0dDGFV4SB74EwM2rRcmumHdtTrgABABYAFKSa1hvZyhS5D4xq9qde45XuyZWtAA==';

      const { tx, fee } = signer.signAndFinalizePSBT(encodedPsbt, keyPairs, bitcoinjs.VaultTxType.Instant);
      assert.strictEqual(
        tx.toHex(),
        '020000000001026bfab17748ac5396e5f073c572315976f1b5ee07f331d48abb308035de23e9600000000023220020603565803e58576137aef0f121f42c30cd6c71a856625817e4dcdbd01d3bd945ffffffff5052dce8ab6b8bbc3a971fce694ca021024a6b7806a9349efb3b6675dcc2b7df0000000023220020603565803e58576137aef0f121f42c30cd6c71a856625817e4dcdbd01d3bd945ffffffff01c05b1a260800000017a9148a14aa997ab6e0a4918e67774530aba40e33e7548706004730440220731e3ba1917d4c456c2e7cb63216296ea1ca128231e5d6907e74ae8c9a99669202206db7447a9a67f50a5b8fc9901eadcbeb29abfc31d88df05bae0810467eac0ad5014730440220710b37a8159689ef5d447d822b67b340ef0ad368fa48ff2d7adaa4f008b3df3d022068766833f15bd992661f30fd202f090837c46eee2de2cf4281b39c53991a9ff8010101007163516763526753686821021ff0ece0efd6423e427d8fdc8984457825aa6748fa91a24df3217fa1f0e394d32102ecec100acb89f3049285ae01e7f03fb469e6b54d44b0f3c8240b1958e893cb8c210263451a52f3d3ae6918969e1c5ce934743185578481ef8130336ad1726ba61ddb53ae060047304402201cba80f979167bca986e8561448a5eb9d342871f2aa92eaf032fe52fd5335dc102207a119e9a6cbb894f58a50bfd9c03c79c4172c036d995aa78c1a8d6022006409701473044022072113e7890287e2a855bc640f838f7ac394af4a475a10df9412bd0c9c3a71bd802205f2712d3466eed204cfdb871493a9957a0c75f4484c239ea996cdca02157dd9c010101007163516763526753686821021ff0ece0efd6423e427d8fdc8984457825aa6748fa91a24df3217fa1f0e394d32102ecec100acb89f3049285ae01e7f03fb469e6b54d44b0f3c8240b1958e893cb8c210263451a52f3d3ae6918969e1c5ce934743185578481ef8130336ad1726ba61ddb53ae00000000',
      );
      assert.strictEqual(fee, 1000000);
    });

    it('should finalize Recovery tx on AIR', () => {
      const privateKey = Buffer.from('0cc52b3faa941f13d3ea4b2fea29a2259b58ffca1ddf3069ab2d21d7f793a960', 'hex');
      const keyPairs = [bitcoinjs.ECPair.fromPrivateKey(privateKey, { network: config.network })];
      // Signed with two signatures
      const encodedPsbt =
        'cHNidP8BAHwCAAAAAsPSuj1koi4un+ahen1mU5yC0eqa5bKiEww/o5U9eR7OAAAAAAD//////mG/Hz9+41BN2BI8H8vqvhGe9Gfh2Ah/AqO1AunIK9oAAAAAAP////8BwFsaJggAAAAXqRQNMLZW9RTWdI4EMyyE+IU04ddEEocAAAAAAAEBIADPFBMEAAAAF6kUe0vIPVqEvXbtnRrGkNHpz7V6Fu2HIgICqf9P4M5XB4xo/z7YOOn/gP3MiG7fwm8CAWcaYPszmElHMEQCIDI6cDlCA4CVfcwftbD52yd2yG5E64zaygc+uZW/Y5urAiBngae+vkTO873H1fofau+2dmiLjaX1K+VsFuTWHbgu4QEiAgLs7BAKy4nzBJKFrgHn8D+0aea1TUSw88gkCxlY6JPLjEcwRAIgE5rxLfpBubLcZjHUetovSSivYW76wHLB6iarrBbmE6ICIEl553fYGWtkDiovyvVdENTDb/86ya4fDmDAo9oSJdG0AQEEIgAgAgOstP2Xc9QviFFl6+Tk+S62ZSpM1GQfC/RtTsA1XDEBBXFjUWdjUmdTaGghAqn/T+DOVweMaP8+2Djp/4D9zIhu38JvAgFnGmD7M5hJIQLs7BAKy4nzBJKFrgHn8D+0aea1TUSw88gkCxlY6JPLjCECY0UaUvPTrmkYlp4cXOk0dDGFV4SB74EwM2rRcmumHdtTrgABASAAzxQTBAAAABepFHtLyD1ahL127Z0axpDR6c+1ehbthyICAqn/T+DOVweMaP8+2Djp/4D9zIhu38JvAgFnGmD7M5hJRzBEAiB2gm11G1v6dwtHXjQkMbbW92V/oAssCt35EQVl2IlzlwIgFX6pPw7KF72ftwaPJfw+JnlMLXv5Ync4YSm8YlLehlUBIgIC7OwQCsuJ8wSSha4B5/A/tGnmtU1EsPPIJAsZWOiTy4xHMEQCIFSLRDrBp8qkS6cuqRzU0oM/UA6nh0p2g2fc0SOy6DKsAiA150WwIaFx7mnd0u6di5+wmqlIZe1hvJxbD9ChmQOp/wEBBCIAIAIDrLT9l3PUL4hRZevk5PkutmUqTNRkHwv0bU7ANVwxAQVxY1FnY1JnU2hoIQKp/0/gzlcHjGj/Ptg46f+A/cyIbt/CbwIBZxpg+zOYSSEC7OwQCsuJ8wSSha4B5/A/tGnmtU1EsPPIJAsZWOiTy4whAmNFGlLz065pGJaeHFzpNHQxhVeEge+BMDNq0XJrph3bU64AAQAWABT6q/JZyb5MO4Rs1Hp8Ma3jMNUk0gA=';

      const { tx, fee } = signer.signAndFinalizePSBT(encodedPsbt, keyPairs, bitcoinjs.VaultTxType.Recovery);
      assert.strictEqual(
        tx.toHex(),
        '02000000000102c3d2ba3d64a22e2e9fe6a17a7d66539c82d1ea9ae5b2a2130c3fa3953d791ece00000000232200200203acb4fd9773d42f885165ebe4e4f92eb6652a4cd4641f0bf46d4ec0355c31fffffffffe61bf1f3f7ee3504dd8123c1fcbeabe119ef467e1d8087f02a3b502e9c82bda00000000232200200203acb4fd9773d42f885165ebe4e4f92eb6652a4cd4641f0bf46d4ec0355c31ffffffff01c05b1a260800000017a9140d30b656f514d6748e04332c84f88534e1d744128707004730440220323a7039420380957dcc1fb5b0f9db2776c86e44eb8cdaca073eb995bf639bab02206781a7bebe44cef3bdc7d5fa1f6aefb676688b8da5f52be56c16e4d61db82ee1014730440220139af12dfa41b9b2dc6631d47ada2f4928af616efac072c1ea26abac16e613a202204979e777d8196b640e2a2fcaf55d10d4c36fff3ac9ae1f0e60c0a3da1225d1b401483045022100dbdd84d3bb9ac480a4c0b9b8c9b618cc5a69865f7eaa2f4bed73c23065c2aee302206f11775c46bc66105daa5f5f29e209a259af9476e5b5138d6761cc22b13ec5c1010000716351676352675368682102a9ff4fe0ce57078c68ff3ed838e9ff80fdcc886edfc26f0201671a60fb3398492102ecec100acb89f3049285ae01e7f03fb469e6b54d44b0f3c8240b1958e893cb8c210263451a52f3d3ae6918969e1c5ce934743185578481ef8130336ad1726ba61ddb53ae0700473044022076826d751b5bfa770b475e342431b6d6f7657fa00b2c0addf9110565d88973970220157ea93f0eca17bd9fb7068f25fc3e26794c2d7bf96277386129bc6252de8655014730440220548b443ac1a7caa44ba72ea91cd4d2833f500ea7874a768367dcd123b2e832ac022035e745b021a171ee69ddd2ee9d8b9fb09aa94865ed61bc9c5b0fd0a19903a9ff01473044022043f52bdff1b5325ad6bbce5ca1dee650c8e37ae3b419c8dfe8124f7069d5b82e022056f19c4af410e3b0d0a3bc11e6e415aae4013a987283ca4c0f5f822a19ecaffc010000716351676352675368682102a9ff4fe0ce57078c68ff3ed838e9ff80fdcc886edfc26f0201671a60fb3398492102ecec100acb89f3049285ae01e7f03fb469e6b54d44b0f3c8240b1958e893cb8c210263451a52f3d3ae6918969e1c5ce934743185578481ef8130336ad1726ba61ddb53ae00000000',
      );
      assert.strictEqual(fee, 1000000);
    });
  });
});
