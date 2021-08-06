import b58 from 'bs58check';
const HDNode = require('bip32');

export class MultisigCosigner {
  constructor(data) {
    this._data = data;
    this._fp = false;
    this._xpub = false;
    this._path = false;
    this._valid = false;
    this._cosigners = [];

    // is it plain simple Zpub/Ypub/xpub?
    if (data.startsWith('Zpub') && MultisigCosigner.isXpubValid(data)) {
      this._fp = '00000000';
      this._xpub = data;
      this._path = "m/48'/0'/0'/2'";
      this._valid = true;
      this._cosigners = [true];
      return;
    } else if (data.startsWith('Ypub') && MultisigCosigner.isXpubValid(data)) {
      this._fp = '00000000';
      this._xpub = data;
      this._path = "m/48'/0'/0'/1'";
      this._valid = true;
      this._cosigners = [true];
      return;
    } else if (data.startsWith('xpub') && MultisigCosigner.isXpubValid(data)) {
      this._fp = '00000000';
      this._xpub = data;
      this._path = "m/45'";
      this._valid = true;
      this._cosigners = [true];
      return;
    }

    // is it wallet descriptor?
    if (data.startsWith('[')) {
      const end = data.indexOf(']');
      const part = data.substr(1, end - 1).replace(/[h]/g, "'");
      this._fp = part.split('/')[0];
      const xpub = data.substr(end + 1);

      if (MultisigCosigner.isXpubValid(xpub)) {
        this._xpub = xpub;
        this._path = 'm';
        for (let c = 0; c < part.split('/').length; c++) {
          if (c === 0) continue;
          this._path += '/' + part.split('/')[c];
        }
        this._cosigners = [true];
        this._valid = true;
        return;
      }
    }

    // is it cobo json?
    try {
      const json = JSON.parse(data);
      if (json.xfp && json.xpub && json.path) {
        this._fp = json.xfp;
        this._xpub = json.xpub;
        this._path = json.path;
        this._cosigners = [true];
        this._valid = true;
        return;
      }
    } catch (_) {
      this._valid = false;
    }

    // is it cobo crypto-account URv2 ?
    try {
      const json = JSON.parse(data);
      if (json && json.ExtPubKey && json.MasterFingerprint && json.AccountKeyPath) {
        this._fp = json.MasterFingerprint;
        this._xpub = json.ExtPubKey;
        this._path = json.AccountKeyPath;
        this._cosigners = [true];
        this._valid = true;
        return;
      }
    } catch (_) {
      this._valid = false;
    }

    // is it coldcard json?
    try {
      const json = JSON.parse(data);
      if (json.p2sh && json.p2sh_deriv && json.xfp) {
        const cc = new MultisigCosigner(MultisigCosigner.exportToJson(json.xfp, json.p2sh, json.p2sh_deriv));
        this._valid = true;
        this._cosigners.push(cc);
      }

      if (json.p2wsh_p2sh && json.p2wsh_p2sh_deriv && json.xfp) {
        const cc = new MultisigCosigner(MultisigCosigner.exportToJson(json.xfp, json.p2wsh_p2sh, json.p2wsh_p2sh_deriv));
        this._valid = true;
        this._cosigners.push(cc);
      }

      if (json.p2wsh && json.p2wsh_deriv && json.xfp) {
        const cc = new MultisigCosigner(MultisigCosigner.exportToJson(json.xfp, json.p2wsh, json.p2wsh_deriv));
        this._valid = true;
        this._cosigners.push(cc);
      }
    } catch (_) {
      this._valid = false;
    }
  }

  static _zpubToXpub(zpub) {
    let data = b58.decode(zpub);
    data = data.slice(4);
    data = Buffer.concat([Buffer.from('0488b21e', 'hex'), data]);

    return b58.encode(data);
  }

  static isXpubValid(key) {
    let xpub;

    try {
      xpub = MultisigCosigner._zpubToXpub(key);
      HDNode.fromBase58(xpub);
      return true;
    } catch (_) {}

    return false;
  }

  static exportToJson(xfp, xpub, path) {
    return JSON.stringify({
      xfp: xfp,
      xpub: xpub,
      path: path,
    });
  }

  isValid() {
    return this._valid;
  }

  getFp() {
    return this._fp;
  }

  getXpub() {
    return this._xpub;
  }

  getPath() {
    return this._path;
  }

  howManyCosignersWeHave() {
    return this._cosigners.length;
  }

  /**
   *
   * @returns {Array.<MultisigCosigner>}
   */
  getAllCosigners() {
    return this._cosigners;
  }

  isNativeSegwit() {
    return this.getXpub().startsWith('Zpub');
  }

  isWrappedSegwit() {
    return this.getXpub().startsWith('Ypub');
  }

  isLegacy() {
    return this.getXpub().startsWith('xpub');
  }

  getChainCodeHex() {
    let data = b58.decode(this.getXpub());
    data = data.slice(4);
    data = data.slice(1);
    data = data.slice(4);
    data = data.slice(4, 36);
    return data.toString('hex');
  }

  getKeyHex() {
    let data = b58.decode(this.getXpub());
    data = data.slice(4);
    data = data.slice(1);
    data = data.slice(4);
    data = data.slice(36);
    return data.toString('hex');
  }

  getParentFingerprintHex() {
    let data = b58.decode(this.getXpub());
    data = data.slice(4);
    data = data.slice(1);
    data = data.slice(0, 4);
    return data.toString('hex');
  }

  getDepthNumber() {
    let data = b58.decode(this.getXpub());
    data = data.slice(4, 5);
    return data.readInt8();
  }
}
