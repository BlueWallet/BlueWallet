import bitcoin from 'bitcoinjs-lib';
import Frisbee from 'frisbee';
import { AbstractHDWallet } from './abstract-hd-wallet';
import { zpubToXpub, nodeToP2wpkhSegwitAddress } from './segwit-bech-wallet';
import { ypubToXpub, nodeToP2shSegwitAddress } from './hd-segwit-p2sh-wallet';

function getHDType(xpub) {
  if (xpub.startsWith('xpub')) return 'BIP44';
  if (xpub.startsWith('ypub')) return 'BIP49';
  // if (xpub.startsWith('zpub')) return 'BIP84'; We won't support ZPUBs right now

  throw new Error('Invalid XPUB');
}

export class WatchOnlyHDWallet extends AbstractHDWallet {
  static type = 'watchOnlyHD';
  static typeReadable = 'Watch-only HD';

  setSecret(xpub) {
    this._type = getHDType(xpub);
    this._xpub = xpub;
    this.secret = xpub;
  }

  getXpub(normalize = false) {
    if (normalize && this._type === 'BIP49') {
      return ypubToXpub(this._xpub);
    }

    if (normalize && this._type === 'BIP84') {
      return zpubToXpub(this._xpub);
    }

    return this._xpub;
  }

  getSecret() {
    return this.secret;
  }

  createTx() {
    throw new Error('Not supported');
  }

  _getWifForAddress() {
    throw new Error('Not supported');
  }

  _getExternalAddressByIndex(index) {
    index = index * 1; // cast to int
    if (this.external_addresses_cache[index]) return this.external_addresses_cache[index]; // cache hit

    let xpub = this.getXpub();

    if (this._type === 'BIP49') {
      xpub = ypubToXpub(xpub);
    }

    if (this._type === 'BIP84') {
      xpub = zpubToXpub(xpub);
    }

    const node = bitcoin.HDNode.fromBase58(xpub);
    const hdNode = node.derive(0).derive(index);

    let address;

    switch (this._type) {
      case 'BIP44':
        address = hdNode.getAddress();
        break;
      case 'BIP49':
        address = nodeToP2shSegwitAddress(hdNode);
        break;
      case 'BIP84':
        address = nodeToP2wpkhSegwitAddress(hdNode);
        break;
    }

    return (this.external_addresses_cache[index] = address);
  }

  _getInternalAddressByIndex(index) {
    index = index * 1; // cast to int
    if (this.internal_addresses_cache[index]) return this.internal_addresses_cache[index]; // cache hit

    let xpub = this.getXpub();

    if (this._type === 'BIP49') {
      xpub = ypubToXpub(xpub);
    }

    if (this._type === 'BIP84') {
      xpub = zpubToXpub(xpub);
    }

    const node = bitcoin.HDNode.fromBase58(xpub);
    const hdNode = node.derive(1).derive(index);

    let address;

    switch (this._type) {
      case 'BIP44':
        address = hdNode.getAddress();
        break;
      case 'BIP49':
        address = nodeToP2shSegwitAddress(hdNode);
        break;
      case 'BIP84':
        address = nodeToP2wpkhSegwitAddress(hdNode);
        break;
    }

    return (this.internal_addresses_cache[index] = address);
  }

  /**
   * @inheritDoc
   */
  async fetchTransactions() {
    try {
      if (this.usedAddresses.length === 0) {
        // just for any case, refresh balance (it refreshes internal `this.usedAddresses`)
        await this.fetchBalance();
      }

      let addresses = this.usedAddresses.join('|');
      addresses += '|' + this._getExternalAddressByIndex(this.next_free_address_index);
      addresses += '|' + this._getInternalAddressByIndex(this.next_free_change_address_index);

      const api = new Frisbee({ baseURI: 'https://blockchain.info' });
      this.transactions = [];
      let offset = 0;

      while (1) {
        let response = await api.get('/multiaddr?active=' + addresses + '&n=100&offset=' + offset);

        if (response && response.body) {
          if (response.body.txs && response.body.txs.length === 0) {
            break;
          }

          this._lastTxFetch = +new Date();

          // processing TXs and adding to internal memory
          if (response.body.txs) {
            for (let tx of response.body.txs) {
              let value = 0;

              for (let input of tx.inputs) {
                // ----- INPUTS

                if (input.prev_out && input.prev_out.addr && this.weOwnAddress(input.prev_out.addr)) {
                  // this is outgoing from us
                  value -= input.prev_out.value;
                }
              }

              for (let output of tx.out) {
                // ----- OUTPUTS

                if (output.addr && this.weOwnAddress(output.addr)) {
                  // this is incoming to us
                  value += output.value;
                }
              }

              tx.value = value; // new BigNumber(value).div(100000000).toString() * 1;
              if (response.body.hasOwnProperty('info')) {
                if (response.body.info.latest_block.height && tx.block_height) {
                  tx.confirmations = response.body.info.latest_block.height - tx.block_height + 1;
                } else {
                  tx.confirmations = 0;
                }
              } else {
                tx.confirmations = 0;
              }
              this.transactions.push(tx);
            }

            if (response.body.txs.length < 100) {
              // this fetch yilded less than page size, thus requesting next batch makes no sense
              break;
            }
          } else {
            break; // error ?
          }
        } else {
          throw new Error('Could not fetch transactions from API: ' + response.err); // breaks here
        }

        offset += 100;
      }
    } catch (err) {
      console.warn(err);
    }
  }
}
