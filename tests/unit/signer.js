/* global describe, it */
const assert = require('assert');
const bitcoinjs = require('bitcoinjs-lib');

describe('unit - signer', function() {
  describe('createSegwitTransaction()', function() {
    it('should return valid tx hex for segwit transactions', function(done) {
      const signer = require('../../models/signer');
      const utxos = [
        {
          txid: '1e1a8cced5580eecd0ac15845fc3adfafbb0f5944a54950e4a16b8f6d1e9b715',
          vout: 1,
          address: 'RSvwNKBtqEhbNNF4A7mcUcJ3ZiR7FUSJVn',
          account: 'RSvwNKBtqEhbNNF4A7mcUcJ3ZiR7FUSJVn',
          scriptPubKey: 'a914c19daa4f3035e18a71abc63ababc4d3da8f2840f87',
          value: 0.001,
          confirmations: 108,
          spendable: true,
          solvable: false,
          safe: true,
        },
      ];
      const tx = signer.createSegwitTransaction(
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

    it('should return valid tx hex for RBF-able segwit transactions', function(done) {
      const signer = require('../../models/signer');
      const utxos = [
        {
          txid: '1e1a8cced5580eecd0ac15845fc3adfafbb0f5944a54950e4a16b8f6d1e9b715',
          vout: 1,
          address: 'RPuRPTc9o6DMLsESyhDSkPoinH4JX1RG26',
          account: 'RPuRPTc9o6DMLsESyhDSkPoinH4JX1RG26',
          scriptPubKey: 'a9146fbf1cee74734503297e46a0db3e3fbb06f2e9d387',
          value: 0.1,
          confirmations: 108,
          spendable: false,
          solvable: false,
          safe: true,
        },
      ];
      const txhex = signer.createSegwitTransaction(
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
      assert.equal(bitcoinjs.address.fromOutputScript(tx.outs[0].script), 'YQgWXHY2QduhjqMkJHywzDfhx1ntumM5Ht');
      assert.equal(bitcoinjs.address.fromOutputScript(tx.outs[1].script), 'RPuRPTc9o6DMLsESyhDSkPoinH4JX1RG26');
      assert.equal(tx.outs[0].value, 90000); // 0.0009 because we deducted fee 0.0001
      assert.equal(tx.outs[1].value, 9900000); // 0.099 because 0.1 - 0.001
      done();
    });

    it('should create Replace-By-Fee tx, given txhex', () => {
      const txhex =
        '0100000000010115b7e9d1f6b8164a0e95544a94f5b0fbfaadc35f8415acd0ec0e58d5ce8c1a1e0100000017160014ac19842ed4543c10fbe074f0b9e19f973f0e1d630000000002905f0100000000001976a9140e75eb2af3599acf900cf0b7e666027b105cf3db88ace00f97000000000017a914a06bd87fce37f45094aba65d6ac1e98631ac0759870247304402203aa7c0623bf490d0d7397fd40a003fcb8379a846dbf160d5f6bd267fd2967075022068faf20cd31852825e71911ce3037569ed3929a5a5688adce63bef525bf912950121039a5f64c819f73ca1655e5514a1ddc4ea6911804718876fd93c33f3208f2f645300000000';
      const signer = require('../../models/signer');
      const dummyUtxodata = {
        '1e1a8cced5580eecd0ac15845fc3adfafbb0f5944a54950e4a16b8f6d1e9b715': {
          // txid we use output from
          1: 10000000, // output index and it's value in satoshi
        },
      };
      const newhex = signer.createRBFSegwitTransaction(
        txhex,
        {
          YQgWXHY2QduhjqMkJHywzDfhx1ntumM5Ht: 'RNAFqLmCjZunuhnNpmgF6nTs8KzQddnZDm',
        },
        0.0001,
        'KwWc7DAYgzgRdBcvKD844SC5cHWZ1HY5TxqUACohH59uiH4RNrXT',
        dummyUtxodata,
      );
      const oldTx = bitcoinjs.Transaction.fromHex(txhex);
      const newTx = bitcoinjs.Transaction.fromHex(newhex);
      // just checking old tx...
      assert.equal(bitcoinjs.address.fromOutputScript(oldTx.outs[0].script), 'YQgWXHY2QduhjqMkJHywzDfhx1ntumM5Ht'); // old DESTINATION address
      assert.equal(bitcoinjs.address.fromOutputScript(oldTx.outs[1].script), 'RPuRPTc9o6DMLsESyhDSkPoinH4JX1RG26'); // old CHANGE address
      assert.equal(oldTx.outs[0].value, 90000); // 0.0009 because we deducted fee 0.0001
      assert.equal(oldTx.outs[1].value, 9900000); // 0.099 because 0.1 - 0.001
      // finaly, new tx checks...
      assert.equal(oldTx.outs[0].value, newTx.outs[0].value); // DESTINATION output amount remains unchanged
      assert.equal(oldTx.outs[1].value - newTx.outs[1].value, 0.0001 * 100000000); // CHANGE output decreased on the amount of fee delta
      assert.equal(bitcoinjs.address.fromOutputScript(newTx.outs[0].script), 'RNAFqLmCjZunuhnNpmgF6nTs8KzQddnZDm'); // new DESTINATION address
      assert.equal(bitcoinjs.address.fromOutputScript(newTx.outs[1].script), 'RPuRPTc9o6DMLsESyhDSkPoinH4JX1RG26'); // CHANGE address remains
      assert.equal(oldTx.ins[0].sequence + 1, newTx.ins[0].sequence);
    });

    it('should return valid tx hex for segwit transactions with multiple inputs', function(done) {
      const signer = require('../../models/signer');
      const utxos = [
        {
          txid: '4e2a536aaf6b0b8a4f439d0343436cd321b8bac9840a24d13b8eed484a257b0b',
          vout: 0,
          address: 'RW4r92uBxhsG3YRgaxb481dKfJ5hhvrdsC',
          account: 'RW4r92uBxhsG3YRgaxb481dKfJ5hhvrdsC',
          scriptPubKey: 'a914e4050160d7beb7404aa2757227cd2e8435cb804087',
          value: 0.0009,
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
          value: 0.0019,
          confirmations: 142,
          spendable: false,
          solvable: false,
          safe: true,
        },
      ];
      const tx = signer.createSegwitTransaction(
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

    it('should return valid tx hex for segwit transactions with change address', function(done) {
      const signer = require('../../models/signer');
      const utxos = [
        {
          txid: '160559030484800a77f9b38717bb0217e87bfeb47b92e2e5bad6316ad9d8d360',
          vout: 1,
          address: 'RW4r92uBxhsG3YRgaxb481dKfJ5hhvrdsC',
          account: 'RW4r92uBxhsG3YRgaxb481dKfJ5hhvrdsC',
          scriptPubKey: 'a914e4050160d7beb7404aa2757227cd2e8435cb804087',
          value: 0.004,
          confirmations: 271,
          spendable: false,
          solvable: false,
          safe: true,
        },
      ];
      const tx = signer.createSegwitTransaction(
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

    it('should return valid tx hex for segwit transactions if change is too small so it causes @dust error', function(done) {
      // checking that change amount is at least 3x of fee, otherwise screw the change, just add it to fee
      const signer = require('../../models/signer');
      const utxos = [
        {
          txid: '160559030484800a77f9b38717bb0217e87bfeb47b92e2e5bad6316ad9d8d360',
          vout: 1,
          address: 'RW4r92uBxhsG3YRgaxb481dKfJ5hhvrdsC',
          account: 'RW4r92uBxhsG3YRgaxb481dKfJ5hhvrdsC',
          scriptPubKey: 'a914e4050160d7beb7404aa2757227cd2e8435cb804087',
          value: 0.004,
          confirmations: 271,
          spendable: false,
          solvable: false,
          safe: true,
        },
      ];
      const txhex = signer.createSegwitTransaction(
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
    it('should return valid TX hex for legacy transactions', () => {
      const utxos = [
        {
          txid: '2f445cf016fa2772db7d473bff97515355b4e6148e1c980ce351d47cf54c517f',
          vout: 1,
          address: 'RPuRPTc9o6DMLsESyhDSkPoinH4JX1RG26',
          account: 'RPuRPTc9o6DMLsESyhDSkPoinH4JX1RG26',
          scriptPubKey: 'a9146fbf1cee74734503297e46a0db3e3fbb06f2e9d387',
          value: 0.01,
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
      const txHex = signer.createTransaction(utxos, toAddr, value, fee, WIF, fromAddr);
      assert.equal(
        txHex,
        '01000000017f514cf57cd451e30c981c8e14e6b455535197ff3b477ddb7227fa16f05c442f010000006b483045022100dd8944c1549ee02762c031290cd1f97745c74bab72a78112beac905df5297c79022070d098a067a99c16ab817fbeed3be7b757d601af9bdf82438b208d799e71e22f012103f5438d524ad1cc288963466d6ef1a27d83183f7e9b7fe30879ecdae887692a31ffffffff02905f0100000000001976a9148cfc1bb2ab27001434bcf722038027b6fa600def88aca0bb0d00000000001976a914b620047e2947a5c036aff69c677a75b58923168488ac00000000',
      );
    });
  });
});
