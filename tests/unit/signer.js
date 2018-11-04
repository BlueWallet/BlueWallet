/* global describe, it */

let assert = require('assert')

describe('unit - signer', function () {
  describe('createSegwitTransaction()', function () {
    it('should return valid tx hex for segwit transactions', function (done) {
      let signer = require('../../models/signer')
      let utxos = [{ txid: '1e1a8cced5580eecd0ac15845fc3adfafbb0f5944a54950e4a16b8f6d1e9b715', vout: 1, address: '3Bsssbs4ANCGNETvGLJ3Fvri6SiVnH1fbi', account: '3Bsssbs4ANCGNETvGLJ3Fvri6SiVnH1fbi', scriptPubKey: 'a9146fbf1cee74734503297e46a0db3e3fbb06f2e9d387', amount: 0.001, confirmations: 108, spendable: false, solvable: false, safe: true }]
      let tx = signer.createSegwitTransaction(utxos, '1Pb81K1xJnMjUfFgKUbva6gr1HCHXxHVnr', 0.001, 0.0001, 'KyWpryAKPiXXbipxWhtprZjSLVjp22sxbVnJssq2TCNQxs1SuMeD')
      assert.equal(tx, '0100000000010115b7e9d1f6b8164a0e95544a94f5b0fbfaadc35f8415acd0ec0e58d5ce8c1a1e0100000017160014f90e5bca5635b84bd828064586bd7eb117fee9a9ffffffff01905f0100000000001976a914f7c6c1f9f6142107ed293c8fbf85fbc49eb5f1b988ac02473044022023eef496f43936550e08898d10b254ee910dfd19268341edb2f61b873ccba25502204b722787fabc37c2c9e9575832331b0ba0c3f7cd0c18a6fb90027f4327bd8d850121039425479ea581ebc7f55959da8c2e1a1063491768860386335dd4630b5eeacfc500000000')
      done()
    })

    it('should return valid tx hex for RBF-able segwit transactions', function (done) {
      let signer = require('../../models/signer')
      let utxos = [{ txid: '1e1a8cced5580eecd0ac15845fc3adfafbb0f5944a54950e4a16b8f6d1e9b715', vout: 1, address: '3Bsssbs4ANCGNETvGLJ3Fvri6SiVnH1fbi', account: '3Bsssbs4ANCGNETvGLJ3Fvri6SiVnH1fbi', scriptPubKey: 'a9146fbf1cee74734503297e46a0db3e3fbb06f2e9d387', amount: 0.1, confirmations: 108, spendable: false, solvable: false, safe: true }]
      let txhex = signer.createSegwitTransaction(utxos, '1Pb81K1xJnMjUfFgKUbva6gr1HCHXxHVnr', 0.001, 0.0001, 'KyWpryAKPiXXbipxWhtprZjSLVjp22sxbVnJssq2TCNQxs1SuMeD', '3Bsssbs4ANCGNETvGLJ3Fvri6SiVnH1fbi', 0)
      assert.equal(txhex, '0100000000010115b7e9d1f6b8164a0e95544a94f5b0fbfaadc35f8415acd0ec0e58d5ce8c1a1e0100000017160014f90e5bca5635b84bd828064586bd7eb117fee9a90000000002905f0100000000001976a914f7c6c1f9f6142107ed293c8fbf85fbc49eb5f1b988ace00f97000000000017a9146fbf1cee74734503297e46a0db3e3fbb06f2e9d38702483045022100bd687693e57161282a80affb82f18386cbf319bca72ca2c16320b0f3b087bee802205e22a9a16b86628ea08eab83aebec1348c476e9d0c90cd41aa73c47f50d86aab0121039425479ea581ebc7f55959da8c2e1a1063491768860386335dd4630b5eeacfc500000000')
      // now, testing change addess, destination address, amounts & fees...
      let bitcoinjs = require('bitcoinjs-lib')
      let tx = bitcoinjs.Transaction.fromHex(txhex)
      assert.equal(bitcoinjs.address.fromOutputScript(tx.outs[0].script), '1Pb81K1xJnMjUfFgKUbva6gr1HCHXxHVnr')
      assert.equal(bitcoinjs.address.fromOutputScript(tx.outs[1].script), '3Bsssbs4ANCGNETvGLJ3Fvri6SiVnH1fbi')
      assert.equal(tx.outs[0].value, 90000) // 0.0009 because we deducted fee 0.0001
      assert.equal(tx.outs[1].value, 9900000) // 0.099 because 0.1 - 0.001
      done()
    })

    it('should create Replace-By-Fee tx, given txhex', () => {
      let txhex = '0100000000010115b7e9d1f6b8164a0e95544a94f5b0fbfaadc35f8415acd0ec0e58d5ce8c1a1e0100000017160014f90e5bca5635b84bd828064586bd7eb117fee9a90000000002905f0100000000001976a914f7c6c1f9f6142107ed293c8fbf85fbc49eb5f1b988ace00f97000000000017a9146fbf1cee74734503297e46a0db3e3fbb06f2e9d38702483045022100bd687693e57161282a80affb82f18386cbf319bca72ca2c16320b0f3b087bee802205e22a9a16b86628ea08eab83aebec1348c476e9d0c90cd41aa73c47f50d86aab0121039425479ea581ebc7f55959da8c2e1a1063491768860386335dd4630b5eeacfc500000000'
      let signer = require('../../models/signer')
      let bitcoinjs = require('bitcoinjs-lib')
      let dummyUtxodata = {
        '15b7e9d1f6b8164a0e95544a94f5b0fbfaadc35f8415acd0ec0e58d5ce8c1a1e': { // txid we use output from
          1: 666 // output index and it's value in satoshi
        }
      }
      let newhex = signer.createRBFSegwitTransaction(txhex, {'1Pb81K1xJnMjUfFgKUbva6gr1HCHXxHVnr': '3BDsBDxDimYgNZzsqszNZobqQq3yeUoJf2'}, 0.0001, 'KyWpryAKPiXXbipxWhtprZjSLVjp22sxbVnJssq2TCNQxs1SuMeD', dummyUtxodata)
      let oldTx = bitcoinjs.Transaction.fromHex(txhex)
      let newTx = bitcoinjs.Transaction.fromHex(newhex)
      // just checking old tx...
      assert.equal(bitcoinjs.address.fromOutputScript(oldTx.outs[0].script), '1Pb81K1xJnMjUfFgKUbva6gr1HCHXxHVnr') // old DESTINATION address
      assert.equal(bitcoinjs.address.fromOutputScript(oldTx.outs[1].script), '3Bsssbs4ANCGNETvGLJ3Fvri6SiVnH1fbi') // old CHANGE address
      assert.equal(oldTx.outs[0].value, 90000) // 0.0009 because we deducted fee 0.0001
      assert.equal(oldTx.outs[1].value, 9900000) // 0.099 because 0.1 - 0.001
      // finaly, new tx checks...
      assert.equal(oldTx.outs[0].value, newTx.outs[0].value) // DESTINATION output amount remains unchanged
      assert.equal(oldTx.outs[1].value - newTx.outs[1].value, 0.0001 * 100000000) // CHANGE output decreased on the amount of fee delta
      assert.equal(bitcoinjs.address.fromOutputScript(newTx.outs[0].script), '3BDsBDxDimYgNZzsqszNZobqQq3yeUoJf2') // new DESTINATION address
      assert.equal(bitcoinjs.address.fromOutputScript(newTx.outs[1].script), '3Bsssbs4ANCGNETvGLJ3Fvri6SiVnH1fbi') // CHANGE address remains
      assert.equal(oldTx.ins[0].sequence + 1, newTx.ins[0].sequence)
    })

    it('should return valid tx hex for segwit transactions with multiple inputs', function (done) {
      let signer = require('../../models/signer')
      let utxos = [ { 'txid': '4e2a536aaf6b0b8a4f439d0343436cd321b8bac9840a24d13b8eed484a257b0b', 'vout': 0, 'address': '3NBtBset4qPD8DZeLw4QbFi6SNjNL8hg7x', 'account': '3NBtBset4qPD8DZeLw4QbFi6SNjNL8hg7x', 'scriptPubKey': 'a914e0d81f03546ab8f29392b488ec62ab355ee7c57387', 'amount': 0.00090000, 'confirmations': 67, 'spendable': false, 'solvable': false, 'safe': true }, { 'txid': '09e1b78d4ecd95dd4c7dbc840a2619da6d02caa345a63b2733f3972666462fbd', 'vout': 0, 'address': '3NBtBset4qPD8DZeLw4QbFi6SNjNL8hg7x', 'account': '3NBtBset4qPD8DZeLw4QbFi6SNjNL8hg7x', 'scriptPubKey': 'a914e0d81f03546ab8f29392b488ec62ab355ee7c57387', 'amount': 0.00190000, 'confirmations': 142, 'spendable': false, 'solvable': false, 'safe': true } ]
      let tx = signer.createSegwitTransaction(utxos, '1Pb81K1xJnMjUfFgKUbva6gr1HCHXxHVnr', 0.0028, 0.0002, 'L4iRvejJG9gRhKVc3rZm5haoyd4EuCi77G91DnXRrvNDqiXktkXh')
      assert.equal(tx, '010000000001020b7b254a48ed8e3bd1240a84c9bab821d36c4343039d434f8a0b6baf6a532a4e00000000171600141e16a923b1a9e8d0c2a044030608a6aa13f97e9affffffffbd2f46662697f333273ba645a3ca026dda19260a84bc7d4cdd95cd4e8db7e10900000000171600141e16a923b1a9e8d0c2a044030608a6aa13f97e9affffffff01a0f70300000000001976a914f7c6c1f9f6142107ed293c8fbf85fbc49eb5f1b988ac02483045022100b3e001b880a7a18294640165cc40c777669534803cee7206c8d3f03531bb315502204642a4569576a2e9e77342c7a9aaa508a21248b7720fe0f9e6d76713951c133001210314389c888e9669ae05739819fc7c43d7a50fdeabd2a8951f9607c8cad394fd4b02473044022078bd4f47178ce13c4fbf77c5ce78c80ac10251aa053c68c8febb21ce228f844e02207b02bdd754fbc2df9f62ea98e7dbd6c43e760b8f78c7c00b43512a06b498adb501210314389c888e9669ae05739819fc7c43d7a50fdeabd2a8951f9607c8cad394fd4b00000000')
      done()
    })

    it('should return valid tx hex for segwit transactions with change address', function (done) {
      let signer = require('../../models/signer')
      let utxos = [ { 'txid': '160559030484800a77f9b38717bb0217e87bfeb47b92e2e5bad6316ad9d8d360', 'vout': 1, 'address': '3NBtBset4qPD8DZeLw4QbFi6SNjNL8hg7x', 'account': '3NBtBset4qPD8DZeLw4QbFi6SNjNL8hg7x', 'scriptPubKey': 'a914e0d81f03546ab8f29392b488ec62ab355ee7c57387', 'amount': 0.00400000, 'confirmations': 271, 'spendable': false, 'solvable': false, 'safe': true } ]
      let tx = signer.createSegwitTransaction(utxos, '1Pb81K1xJnMjUfFgKUbva6gr1HCHXxHVnr', 0.002, 0.0001, 'L4iRvejJG9gRhKVc3rZm5haoyd4EuCi77G91DnXRrvNDqiXktkXh')
      assert.equal(tx, '0100000000010160d3d8d96a31d6bae5e2927bb4fe7be81702bb1787b3f9770a8084040359051601000000171600141e16a923b1a9e8d0c2a044030608a6aa13f97e9affffffff0230e60200000000001976a914f7c6c1f9f6142107ed293c8fbf85fbc49eb5f1b988ac400d03000000000017a914e0d81f03546ab8f29392b488ec62ab355ee7c573870247304402202c962e14ae6abd45dc9613d2f088ad487e805670548e244deb25d762b310a60002204f12c7f9b8da3567b39906ff6c46b27ce087e7ae91bbe34fb1cdee1b994b9d3001210314389c888e9669ae05739819fc7c43d7a50fdeabd2a8951f9607c8cad394fd4b00000000')
      done()
    })



    it('should return valid tx hex for segwit transactions if change is too small so it causes @dust error', function (done) {
      // checking that change amount is at least 3x of fee, otherwise screw the change, just add it to fee
      let signer = require('../../models/signer')
      let utxos = [ { 'txid': '160559030484800a77f9b38717bb0217e87bfeb47b92e2e5bad6316ad9d8d360', 'vout': 1, 'address': '3NBtBset4qPD8DZeLw4QbFi6SNjNL8hg7x', 'account': '3NBtBset4qPD8DZeLw4QbFi6SNjNL8hg7x', 'scriptPubKey': 'a914e0d81f03546ab8f29392b488ec62ab355ee7c57387', 'amount': 0.00400000, 'confirmations': 271, 'spendable': false, 'solvable': false, 'safe': true } ]
      let txhex = signer.createSegwitTransaction(utxos, '1Pb81K1xJnMjUfFgKUbva6gr1HCHXxHVnr', 0.003998, 0.000001, 'L4iRvejJG9gRhKVc3rZm5haoyd4EuCi77G91DnXRrvNDqiXktkXh')
      let bitcoin = require('bitcoinjs-lib')
      let tx = bitcoin.Transaction.fromHex(txhex);
      assert.equal(tx.ins.length, 1);
      assert.equal(tx.outs.length, 1); // only 1 output, which means change is neglected
      assert.equal(tx.outs[0].value, 399700);
      done()
    })
  })

  describe('WIF2address()', function () {
    it('should convert WIF to segwit P2SH address', function (done) {
      let signer = require('../../models/signer')
      let address = signer.WIF2segwitAddress('L55uHs7pyz7rP18K38kB7kqDVNJaeYFzJtZyC3ZjD2c684dzXQWs')
      assert.equal('3FSL9x8P8cQ74iW2HLP6JPGPRgc4K2FnsU', address)
      done()
    })
  })

  describe('generateNewAddress()', function () {
    it('should generate new address', function (done) {
      let signer = require('../../models/signer')
      let address = signer.generateNewSegwitAddress()
      assert.ok(address.WIF)
      assert.ok(address.address)
      assert.equal(address.address, signer.WIF2segwitAddress(address.WIF))
      done()
    })
  })

  describe('URI()', function () {
    it('should form correct payment url', function (done) {
      let signer = require('../../models/signer')
      let url = signer.URI({
        address: '3Bsssbs4ANCGNETvGLJ3Fvri6SiVnH1fbi',
        message: 'For goods & services',
        label: 'nolabel',
        amount: 1000000
      })
      assert.equal(url, 'bitcoin:3Bsssbs4ANCGNETvGLJ3Fvri6SiVnH1fbi?amount=0.01&message=For%20goods%20%26%20services&label=nolabel')

      url = signer.URI({
        address: '1DzJepHCRD2C9vpFjk11eXJi97juEZ3ftv',
        message: 'wheres the money lebowski',
        amount: 400000
      })
      assert.equal(url, 'bitcoin:1DzJepHCRD2C9vpFjk11eXJi97juEZ3ftv?amount=0.004&message=wheres%20the%20money%20lebowski')
      done()
    })
  })

  describe('createTransaction()', () => {
    const signer = require('../../models/signer')
    it('should return valid TX hex for legacy transactions', () => {
      let utxos = [{
        txid: '2f445cf016fa2772db7d473bff97515355b4e6148e1c980ce351d47cf54c517f',
        vout: 1,
        address: '3Bsssbs4ANCGNETvGLJ3Fvri6SiVnH1fbi',
        account: '3Bsssbs4ANCGNETvGLJ3Fvri6SiVnH1fbi',
        scriptPubKey: 'a9146fbf1cee74734503297e46a0db3e3fbb06f2e9d387',
        amount: 0.01,
        confirmations: 108,
        spendable: false,
        solvable: false,
        safe: true }]
      let toAddr = '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB'
      let amount = 0.001
      let fee = 0.0001
      let WIF = 'KzbTHhzzZyVhkTYpuReMBkE7zUvvDEZtavq1DJV85MtBZyHK1TTF'
      let fromAddr = '179JSjDc9Dh9pWWq9qv35sZsXQAV6VdE1E'
      let txHex = signer.createTransaction(utxos, toAddr, amount, fee, WIF, fromAddr)
      assert.equal(txHex, '01000000017f514cf57cd451e30c981c8e14e6b455535197ff3b477ddb7227fa16f05c442f010000006b483045022100c5d6b024db144aa1f0cb6d6212c326c9753f4144fd69947c1f38657944b92022022039214118b745afe6e031f96f3e98e705979f2b9f9cbbc6a91e11c89c811a3292012103f5438d524ad1cc288963466d6ef1a27d83183f7e9b7fe30879ecdae887692a31ffffffff02905f0100000000001976a914aa381cd428a4e91327fd4434aa0a08ff131f1a5a88aca0bb0d00000000001976a9144362a4c0dbf5102238164d1ec97f3b518bb651cd88ac00000000')
    })
  })
})
