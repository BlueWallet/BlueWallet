export class MultisigCosigner {
  constructor(data) {
    this._data = data;
    this._fp = false;
    this._xpub = false;
    this._path = false;
    this._valid = false;
    this._cosigners = [];

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
}
