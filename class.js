import React, { Component } from 'react'
import { AsyncStorage } from 'react-native'
import Frisbee from 'frisbee'

let useBlockcypherTokens = false

let bitcoin = require('bitcoinjs-lib')
let signer = require('./models/signer')
let BigNumber = require('bignumber.js')
let isaac = require('isaac')
// alternative https://github.com/pointbiz/bitaddress.org/blob/master/src/securerandom.js

let assert = require('assert')

class AbstractWallet {
  constructor () {
    this.type = 'abstract'
    this.label = ''
    this.secret = '' // private key or recovery phrase
    this.balance = 0
    this.transactions = []
    this._address = false // cache
    this.utxo = []
  }

  getTransactions () {
    return this.transactions
  }

  getTypeReadable () {
    return this.type
  }

  /**
   *
   * @returns {string}
   */
  getLabel () {
    return this.label
  }

  getBalance () {
    return this.balance
  }

  setLabel (newLabel) {
    this.label = newLabel
    return this
  }

  getSecret () {
    return this.secret
  }

  setSecret (newSecret) {
    this.secret = newSecret
    return this
  }

  static fromJson (obj) {
    let obj2 = JSON.parse(obj)
    let temp = new this()
    for (let key2 of Object.keys(obj2)) {
      temp[key2] = obj2[key2]
    }

    return temp
  }

  getAddress () {}

  // createTx () { throw Error('not implemented') }
}

/**
 *  Has private key and address signle like "1ABCD....."
 *  (legacy P2PKH compressed)
 */
export class LegacyWallet extends AbstractWallet {
  constructor () {
    super()
    this.type = 'legacy'
  }

  generate () {
    function myRng (c) {
      let buf = new Buffer(c)
      let totalhex = ''
      for (let i = 0; i < c; i++) {
        let random_number = isaac.random()
        random_number = Math.floor(random_number * 255)
        let n = new BigNumber(random_number)
        let hex = n.toString(16)
        if (hex.length === 1) {
          hex = '0' + hex
        }
        totalhex += hex
      }
      totalhex = bitcoin.crypto.sha256('oh hai!' + totalhex).toString('hex')
      totalhex = bitcoin.crypto.sha256(totalhex).toString('hex')
      buf.fill(totalhex, 0, 'hex')
      return buf
    }
    this.secret = bitcoin.ECPair.makeRandom({ rng: myRng }).toWIF()
  }

  getTypeReadable () {
    return 'P2 PKH'
  }

  /**
   *
   * @returns {string}
   */
  getAddress () {
    if (this._address) return this._address
    let address
    try {
      let keyPair = bitcoin.ECPair.fromWIF(this.secret)
      address = keyPair.getAddress()
    } catch (err) {
      return false
    }

    return this._address = address
  }

  async fetchBalance () {
    let response
    let token = ((array) => {
      for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]
      }
      return array[0]
    })(['0326b7107b4149559d18ce80612ef812', 'a133eb7ccacd4accb80cb1225de4b155', '7c2b1628d27b4bd3bf8eaee7149c577f', 'f1e5a02b9ec84ec4bc8db2349022e5f5', 'e5926dbeb57145979153adc41305b183'])
    try {
      if (useBlockcypherTokens) {
        response = await fetch('https://api.blockcypher.com/v1/btc/main/addrs/' + this.getAddress() + '/balance?token=' + token)
      } else {
        response = await fetch('https://api.blockcypher.com/v1/btc/main/addrs/' + this.getAddress() + '/balance')
      }
      let json = await response.json()
      if (typeof json.final_balance === 'undefined') {
        throw 'Could not fetch balance from API'
      }
      this.balance = json.final_balance / 100000000
    } catch (err) {
      console.warn(err)
    }
  }

  async fetchUtxo () {
    let response
    let token = ((array) => {
      for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]
      }
      return array[0]
    })(['0326b7107b4149559d18ce80612ef812', 'a133eb7ccacd4accb80cb1225de4b155', '7c2b1628d27b4bd3bf8eaee7149c577f', 'f1e5a02b9ec84ec4bc8db2349022e5f5', 'e5926dbeb57145979153adc41305b183'])
    try {
      // TODO: hande case when there's more than 2000 UTXOs (do pagination)
      // TODO: (2000 is max UTXOs we can fetch in one call)
      if (useBlockcypherTokens) {
        response = await fetch('https://api.blockcypher.com/v1/btc/main/addrs/' + this.getAddress() + '?unspentOnly=true&limit=2000&token=' + token)
      } else {
        response = await fetch('https://api.blockcypher.com/v1/btc/main/addrs/' + this.getAddress() + '?unspentOnly=true&limit=2000')
      }
      let json = await response.json()
      if (typeof json.final_balance === 'undefined') {
        throw 'Could not fetch UTXO from API'
      }
      json.txrefs = json.txrefs || [] // case when source address is empty
      this.utxo = json.txrefs

      json.unconfirmed_txrefs = json.unconfirmed_txrefs || []
      this.utxo = this.utxo.concat(json.unconfirmed_txrefs)

      console.log('got utxo: ', this.utxo)
    } catch (err) {
      console.warn(err)
    }
  }

  async fetchTransactions () {
    let response
    let token = ((array) => {
      for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]
      }
      return array[0]
    })(['0326b7107b4149559d18ce80612ef812', 'a133eb7ccacd4accb80cb1225de4b155', '7c2b1628d27b4bd3bf8eaee7149c577f', 'f1e5a02b9ec84ec4bc8db2349022e5f5', 'e5926dbeb57145979153adc41305b183'])
    try {
      let url
      if (useBlockcypherTokens) {
        response = await fetch(url = 'https://api.blockcypher.com/v1/btc/main/addrs/' + this.getAddress() + '/full?token=' + token)
      } else {
        response = await fetch(url = 'https://api.blockcypher.com/v1/btc/main/addrs/' + this.getAddress() + '/full')
      }
      console.log(url)
      let json = await response.json()
      if (!json.txs) {
        throw 'Could not fetch transactions from API'
      }

      this.transactions = json.txs
      // now, calculating value per each transaction...
      for (let tx of this.transactions) {
        // how much came in...
        let value = 0
        for (let out of tx.outputs) {
          if (out.addresses.indexOf(this.getAddress()) !== -1) { // found our address in outs of this TX
            value += out.value
          }
        }
        tx.value = value
        // end

        // how much came out
        value = 0
        for (let inp of tx.inputs) {
          if (inp.addresses.indexOf(this.getAddress()) !== -1) { // found our address in outs of this TX
            value -= inp.output_value
          }
        }
        console.log('came out', value)
        tx.value += value
        // end
      }
    } catch (err) {
      console.warn(err)
    }
  }

  getShortAddress () {
    let a = this.getAddress().split('')
    return a[0] + a[1] + a[2] + a[3] + a[4] + a[5] + a[6] + a[7] + a[8] + a[9] + a[10] + a[11] + a[12] + a[13] + '...' + a[a.length - 6] + a[a.length - 5] + a[a.length - 4] + a[a.length - 3] + a[a.length - 2] + a[a.length - 1]
  }

  async broadcastTx (txhex) {
    const api = new Frisbee({
      baseURI: 'https://btczen.com',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })

    let res = await api.get('/broadcast/' + txhex)
    console.log('response', res.body)
    return res.body

    /* const api = new Frisbee({
      baseURI: 'https://api.blockcypher.com',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    ;let token = ((array) => {
      for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]
      }
      return array[0]
    })(['0326b7107b4149559d18ce80612ef812', 'a133eb7ccacd4accb80cb1225de4b155', '7c2b1628d27b4bd3bf8eaee7149c577f', 'f1e5a02b9ec84ec4bc8db2349022e5f5', 'e5926dbeb57145979153adc41305b183'])
    console.log('broadcast using token')
    let res = await api.post('/v1/btc/main/txs/push?token=' + token, {body: {'tx': txhex}})
    console.log('response', res.body)
    return res.body */
  }
}

export class SegwitBech32Wallet extends LegacyWallet {
  constructor () {
    super()
    this.type = 'segwitBech32'
  }

  getTypeReadable () {
    return 'P2 WPKH'
  }

  getAddress () {
    if (this._address) return this._address
    let address
    try {
      let keyPair = bitcoin.ECPair.fromWIF(this.secret)
      let pubKey = keyPair.getPublicKeyBuffer()
      let scriptPubKey = bitcoin.script.witnessPubKeyHash.output.encode(bitcoin.crypto.hash160(pubKey))
      address = bitcoin.address.fromOutputScript(scriptPubKey)
    } catch (err) {
      return false
    }

    return this._address = address
  }
}

export class SegwitP2SHWallet extends LegacyWallet {
  constructor () {
    super()
    this.type = 'segwitP2SH'
  }

  getTypeReadable () {
    return 'SegWit (P2SH)'
  }

  getAddress () {
    if (this._address) return this._address
    let address
    try {
      let keyPair = bitcoin.ECPair.fromWIF(this.secret)
      let pubKey = keyPair.getPublicKeyBuffer()
      let witnessScript = bitcoin.script.witnessPubKeyHash.output.encode(bitcoin.crypto.hash160(pubKey))
      let scriptPubKey = bitcoin.script.scriptHash.output.encode(bitcoin.crypto.hash160(witnessScript))
      address = bitcoin.address.fromOutputScript(scriptPubKey)
    } catch (err) {
      return false
    }

    return this._address = address
  }

  createTx (utxos, amount, fee, address, memo, sequence) {
    if (sequence === undefined) {
      sequence = 0
    }
    // transforming UTXOs fields to how module expects it
    for (let u of utxos) {
      u.confirmations = 6 // hack to make module accept 0 confirmations
      u.txid = u.tx_hash
      u.vout = u.tx_output_n
      u.amount = new BigNumber(u.value)
      u.amount = u.amount.div(100000000)
      u.amount = u.amount.toString(10)
    }
    console.log('creating tx ', amount, ' with fee ', fee, 'secret=', this.getSecret(), 'from address', this.getAddress())
    let amountPlusFee = parseFloat((new BigNumber(amount)).add(fee).toString(10))
    // to compensate that module substracts fee from amount
    return signer.createSegwitTransaction(utxos, address, amountPlusFee, fee, this.getSecret(), this.getAddress(), sequence)
  }
}

export class AppStorage {
  constructor () {
    /** {Array.<AbstractWallet>} */
    this.wallets = []
    this.tx_metadata = {}
    this.settings = {
      brandingColor: '#00aced',
      buttonBackground: '#00aced',
      buttonDangedBackground: '#F40349'
    }
  }

  async loadFromDisk () {
    try {
      let data = await AsyncStorage.getItem('data')
      if (data !== null) {
        data = JSON.parse(data)
        if (!data.wallets) return false
        let wallets = data.wallets
        for (let key of wallets) {
          // deciding which type is wallet and instatiating correct object
          let tempObj = JSON.parse(key)
          let unserializedWallet
          switch (tempObj.type) {
            case 'segwitBech32':
              unserializedWallet = SegwitBech32Wallet.fromJson(key)
              break
            case 'segwitP2SH':
              unserializedWallet = SegwitP2SHWallet.fromJson(key)
              break
            case 'legacy':
            default:
              unserializedWallet = LegacyWallet.fromJson(key)
              break
          }
          // done
          this.wallets.push(unserializedWallet)
          this.tx_metadata = data.tx_metadata
        }
      }
    } catch (error) {
      return false
    }
  }

  /**
   *
   * @param wallet {AbstractWallet}
   */
  deleteWallet (wallet) {
    let secret = wallet.getSecret()
    let tempWallets = []
    for (let value of this.wallets) {
      if (value.getSecret() === secret) { // the one we should delete
        // nop
      } else { // the one we must keep
        tempWallets.push(value)
      }
    }
    this.wallets = tempWallets
  }

  saveToDisk () {
    let walletsToSave = []
    let c = 0
    for (let key of this.wallets) {
      walletsToSave.push(JSON.stringify(key))
      c++
    }

    let data = {
      wallets: walletsToSave,
      tx_metadata: this.tx_metadata
    }

    return AsyncStorage.setItem('data', JSON.stringify(data))
  }

  async fetchWalletBalances () {
    // console.warn('app - fetchWalletBalances()')
    for (let wallet of this.wallets) {
      await wallet.fetchBalance()
    }
  }

  async fetchWalletTransactions () {
    // console.warn('app - fetchWalletTransactions()')
    for (let wallet of this.wallets) {
      await wallet.fetchTransactions()
    }
  }

  /**
   *
   * @returns {Array.<AbstractWallet>}
   */
  getWallets () {
    return this.wallets
  }

  getTransactions () {
    let txs = []
    for (let wallet of this.wallets) {
      txs = txs.concat(wallet.transactions)
    }
    return txs
  }

  saveWallets () {}

  listTXs () {}

  listUnconfirmed () {}

  getBalance () {
    let finalBalance = 0
    for (let wal of this.wallets) {
      finalBalance += wal.balance
    }
    return finalBalance
  }
}
