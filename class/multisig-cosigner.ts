import BIP32Factory from 'bip32';
import b58 from 'bs58check';

import ecc from '../blue_modules/noble_ecc';
import { concatUint8Arrays, hexToUint8Array } from '../blue_modules/uint8array-extras';
import { MultisigHDWallet } from './wallets/multisig-hd-wallet';
import assert from 'assert';
const bip32 = BIP32Factory(ecc);

export class MultisigCosigner {
  private _data: string;
  private _fp: string = '';
  private _xpub: string = '';
  private _path: string = '';
  private _valid: boolean = false;
  /** `true` stands for the single plain-xpub cosigner this object was built from */
  private _cosigners: (MultisigCosigner | true)[];

  constructor(data: string) {
    this._data = data;
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
        this._setXpubPrefixByPath();
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

        assert(this._xpub);
        this._setXpubPrefixByPath();

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
        this._setXpubPrefixByPath();
        return;
      }
    } catch (_) {
      this._valid = false;
    }

    // is it coldcard / unchained json?
    try {
      const json = JSON.parse(data);

      // p2wsh_p2sh (Coldcard), p2sh_p2wsh (Unchained)
      // same script type with reversed naming
      const xpub = json.p2wsh_p2sh || json.p2sh_p2wsh;
      const path = (json.p2wsh_p2sh_deriv || json.p2sh_p2wsh_deriv)?.replace(/h/g, "'");
      const p2sh_deriv = json.p2sh_deriv?.replace(/h/g, "'");
      const p2wsh_deriv = json.p2wsh_deriv?.replace(/h/g, "'");

      if (json.p2sh && p2sh_deriv && json.xfp) {
        const cc = new MultisigCosigner(MultisigCosigner.exportToJson(json.xfp, json.p2sh, p2sh_deriv));
        this._valid = true;
        this._cosigners.push(cc);
      }

      if (xpub && path && json.xfp) {
        const cc = new MultisigCosigner(MultisigCosigner.exportToJson(json.xfp, xpub, path));
        this._valid = true;
        this._cosigners.push(cc);
      }

      if (json.p2wsh && p2wsh_deriv && json.xfp) {
        const cc = new MultisigCosigner(MultisigCosigner.exportToJson(json.xfp, json.p2wsh, p2wsh_deriv));
        this._valid = true;
        this._cosigners.push(cc);
      }
    } catch (_) {
      this._valid = false;
    }

    // is it coldcardQ json?
    try {
      const json = JSON.parse(data);
      if (json && json.chain === 'BTC' && json.xfp && (json.bip48_1 || json.bip48_2 || json.bip45)) {
        if (json.bip48_1) {
          const path = json.bip48_1.deriv.replace(/h/g, "'");
          const xpub = json.bip48_1._pub || json.bip48_1.xpub; // ColdcardQ provides SLIP-0132 encoded _pub (Ypub/Zpub). Prefer it when present, fallback to xpub for legacy.
          const xfp = json.xfp;

          const cc = new MultisigCosigner(MultisigCosigner.exportToJson(xfp, xpub, path));
          this._valid = true;
          this._cosigners.push(cc);
        }
        if (json.bip48_2) {
          const path = json.bip48_2.deriv.replace(/h/g, "'");
          const xpub = json.bip48_2._pub || json.bip48_2.xpub; // ColdcardQ provides SLIP-0132 encoded _pub (Ypub/Zpub). Prefer it when present, fallback to xpub for legacy.
          const xfp = json.xfp;

          const cc = new MultisigCosigner(MultisigCosigner.exportToJson(xfp, xpub, path));
          this._valid = true;
          this._cosigners.push(cc);
        }
        if (json.bip45) {
          const path = json.bip45.deriv.replace(/h/g, "'");
          const xpub = json.bip45._pub || json.bip45.xpub; // ColdcardQ provides SLIP-0132 encoded _pub (Ypub/Zpub). Prefer it when present, fallback to xpub for legacy.
          const xfp = json.xfp;

          const cc = new MultisigCosigner(MultisigCosigner.exportToJson(xfp, xpub, path));
          this._valid = true;
          this._cosigners.push(cc);
        }
      }
    } catch (_) {
      this._valid = false;
    }
  }

  /**
   * BIP48 keeps the script type in the path, the SLIP-132 prefix of the key is optional: signers send a plain xpub, and
   * our own UR decoder labels multisig keys Zpub or zpub. isNativeSegwit() and friends go by the prefix, so it has to
   * follow the path. m/45' says nothing about the script, such keys are left alone
   */
  private _setXpubPrefixByPath() {
    const scriptType = /^m\/48'\/0'\/\d+'\/([12])'$/.exec(this._path)?.[1];
    if (!scriptType || !MultisigHDWallet.isXpubString(this._xpub)) return;
    const version = scriptType === '2' ? '02aa7ed3' : '0295b43f';
    this._xpub = b58.encode(concatUint8Arrays([hexToUint8Array(version), b58.decode(this._xpub).slice(4)]));
  }

  static isXpubValid(key: string) {
    let xpub;

    try {
      const tempWallet = new MultisigHDWallet();
      xpub = tempWallet._zpubToXpub(key);
      bip32.fromBase58(xpub);
      return true;
    } catch (_) {}

    return false;
  }

  static exportToJson(xfp: string, xpub: string, path: string) {
    return JSON.stringify({
      xfp,
      xpub,
      path,
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
