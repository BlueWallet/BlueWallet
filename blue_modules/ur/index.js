import {
  Bytes,
  CryptoAccount,
  CryptoHDKey,
  CryptoKeypath,
  CryptoOutput,
  CryptoPSBT,
  PathComponent,
  ScriptExpressions,
} from '@keystonehq/bc-ur-registry/dist';
import { URDecoder } from '@ngraveio/bc-ur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Psbt } from 'bitcoinjs-lib';
import b58 from 'bs58check';

import { MultisigCosigner, MultisigHDWallet } from '../../class';
import { joinQRs } from '../bbqr/join';
import {
  concatUint8Arrays,
  hexToUint8Array,
  stringToUint8Array,
  uint8ArrayToHex,
  uint8ArrayToBase64,
  uint8ArrayToString,
} from '../uint8array-extras';
import { splitQRs } from '../bbqr/split';
import { decodeUR as origDecodeUr, encodeUR as origEncodeUR, extractSingleWorkload as origExtractSingleWorkload } from '../bc-ur/dist';

const USE_UR_V1 = 'USE_UR_V1';
const USE_BBQR_WALLET_IDS = 'USE_BBQR_WALLET_IDS';

let useURv1 = false;
let useBBQRWalletIDs = [];

(async () => {
  try {
    useURv1 = !!(await AsyncStorage.getItem(USE_UR_V1));
  } catch (_) {}
})();

(async () => {
  try {
    // initial load of wallets that must use BBQR for animated QR codes
    const json = await AsyncStorage.getItem(USE_BBQR_WALLET_IDS);
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      useBBQRWalletIDs = parsed;
    }
  } catch (_) {}
})();

async function isURv1Enabled() {
  try {
    return !!(await AsyncStorage.getItem(USE_UR_V1));
  } catch (_) {}

  return false;
}

async function setUseURv1() {
  useURv1 = true;
  return AsyncStorage.setItem(USE_UR_V1, '1');
}

async function setWalletIdMustUseBBQR(walletID) {
  console.log('setting walletID to useBBQR:', walletID);
  useBBQRWalletIDs.push(walletID);
  await AsyncStorage.setItem(USE_BBQR_WALLET_IDS, JSON.stringify(useBBQRWalletIDs));
}

async function clearUseURv1() {
  useURv1 = false;
  return AsyncStorage.removeItem(USE_UR_V1);
}

/**
 *
 * @param value {string} payload to render in QR
 * @param capacity {number?} Bytes per QR fragment
 * @param walletID {string?} Optional, if we previously saved preferences for that wallet (which protocol to use)
 * @param forceProtocol {'auto' | 'BBQR' | 'URv2' = 'auto'}
 * @returns {string[]}
 */
function encodeUR(value, capacity = 175, walletID, forceProtocol = 'auto') {
  if (forceProtocol === 'URv2') {
    return useURv1 ? encodeURv1(value, capacity) : encodeURv2(value, capacity);
  }

  if (forceProtocol === 'BBQR' || (walletID && useBBQRWalletIDs.includes(walletID))) {
    // payload should be hex
    if (!isHexString(value)) {
      value = uint8ArrayToHex(stringToUint8Array(value));
    }

    const minSplit = Math.max(1, Math.ceil(value.length / 2 / capacity));

    if (uint8ArrayToString(hexToUint8Array(value)).startsWith('psbt')) {
      // its a PSBT!
      const ret = splitQRs(hexToUint8Array(value), 'P', { minSplit });
      return ret.parts;
    }

    // its a random utf8 text!
    const ret = splitQRs(hexToUint8Array(value), 'U', { minSplit });
    return ret.parts;
  } // end BBQR

  // auto (aka default):
  return useURv1 ? encodeURv1(value, capacity) : encodeURv2(value, capacity);
}

function encodeURv1(arg1, arg2) {
  // first, lets check that its not a cosigner's json, which we do NOT encode at all:
  try {
    const json = JSON.parse(arg1);
    if (json && json.xpub && json.path && json.xfp) return [arg1];
  } catch (_) {}

  return origEncodeUR(arg1, arg2);
}

function isHexString(s) {
  return /^[0-9a-fA-F]*$/.test(s) && s.length % 2 === 0;
}

/**
 *
 * @param str {string} For PSBT, or coordination setup (translates to `bytes`) it expects hex string. For ms cosigner it expects plain json string
 * @param len {number} length of each fragment
 * @return {string[]} txt fragments ready to be displayed in dynamic QR
 */
function encodeURv2(str, len) {
  // now, lets do some intelligent guessing what we've got here, psbt hex, or json with a multisig cosigner..?

  try {
    const cosigner = new MultisigCosigner(str);

    if (cosigner.isValid()) {
      let scriptExpressions = false;

      if (cosigner.isNativeSegwit()) {
        scriptExpressions = [ScriptExpressions.WITNESS_SCRIPT_HASH];
      } else if (cosigner.isWrappedSegwit()) {
        scriptExpressions = [ScriptExpressions.SCRIPT_HASH, ScriptExpressions.WITNESS_SCRIPT_HASH];
      } else if (cosigner.isLegacy()) {
        scriptExpressions = [ScriptExpressions.SCRIPT_HASH];
      } else {
        return ['unsupported multisig type'];
      }

      const cryptoKeyPathComponents = [];
      for (const component of cosigner.getPath().split('/')) {
        if (component === 'm') continue;
        const index = parseInt(component);
        const hardened = component.endsWith('h') || component.endsWith("'");
        cryptoKeyPathComponents.push(new PathComponent({ index, hardened }));
      }

      const cryptoAccount = new CryptoAccount(Buffer.from(cosigner.getFp(), 'hex'), [
        new CryptoOutput(
          scriptExpressions,
          new CryptoHDKey({
            isMaster: false,
            key: Buffer.from(cosigner.getKeyHex(), 'hex'),
            chainCode: Buffer.from(cosigner.getChainCodeHex(), 'hex'),
            origin: new CryptoKeypath(cryptoKeyPathComponents, Buffer.from(cosigner.getFp(), 'hex'), cosigner.getDepthNumber()),
            parentFingerprint: Buffer.from(cosigner.getParentFingerprintHex(), 'hex'),
          }),
        ),
      ]);
      const ur = cryptoAccount.toUREncoder(2000).nextPart();
      return [ur];
    }
  } catch (_) {}

  // not account. lets try psbt

  try {
    Psbt.fromHex(str); // will throw if not PSBT hex
    const data = Buffer.from(str, 'hex');
    const cryptoPSBT = new CryptoPSBT(data);
    const encoder = cryptoPSBT.toUREncoder(len);

    const ret = [];
    for (let c = 1; c <= encoder.fragmentsLength; c++) {
      const ur = encoder.nextPart();
      ret.push(ur);
    }

    return ret;
  } catch (_) {}

  // fail. fallback to bytes
  const bytes = new Bytes(Buffer.from(str, 'hex'));
  const encoder = bytes.toUREncoder(len);

  const ret = [];
  for (let c = 1; c <= encoder.fragmentsLength; c++) {
    const ur = encoder.nextPart();
    ret.push(ur);
  }

  return ret;
}

function extractSingleWorkload(arg) {
  return origExtractSingleWorkload(arg);
}

function decodeUR(arg) {
  try {
    return origDecodeUr(arg);
  } catch (_) {}

  const decoder = new URDecoder();

  for (const part of arg) {
    decoder.receivePart(part);
  }

  if (!decoder.isComplete()) {
    throw new Error("decodeUR func can't work with multimart BC-UR data. Prease use BlueURDecoder instead.");
  }

  if (!decoder.isSuccess()) {
    throw new Error(decoder.resultError());
  }

  const decoded = decoder.resultUR();

  if (decoded.type === 'crypto-psbt') {
    const cryptoPsbt = CryptoPSBT.fromCBOR(decoded.cbor);
    return cryptoPsbt.getPSBT().toString('hex');
  }

  if (decoded.type === 'bytes') {
    const b = Bytes.fromCBOR(decoded.cbor);
    return b.getData();
  }

  const cryptoAccount = CryptoAccount.fromCBOR(decoded.cbor);

  // now, crafting zpub out of data we have
  const hdKey = cryptoAccount.outputDescriptors[0].getCryptoKey();
  const derivationPath = 'm/' + hdKey.getOrigin().getPath();
  const script = cryptoAccount.outputDescriptors[0].getScriptExpressions()[0].getExpression();
  const isMultisig =
    script === ScriptExpressions.WITNESS_SCRIPT_HASH.getExpression() ||
    // fallback to paths (unreliable).
    // dont know how to add ms p2sh (legacy) or p2sh-p2wsh (wrapped segwit) atm
    derivationPath === MultisigHDWallet.PATH_LEGACY ||
    derivationPath === MultisigHDWallet.PATH_WRAPPED_SEGWIT ||
    derivationPath === MultisigHDWallet.PATH_NATIVE_SEGWIT;
  const version = hexToUint8Array(isMultisig ? '02aa7ed3' : '04b24746');
  const parentFingerprint = hdKey.getParentFingerprint();
  const depth = hdKey.getOrigin().getDepth();
  const depthBuf = new Uint8Array(1);
  depthBuf[0] = depth;
  const components = hdKey.getOrigin().getComponents();
  const lastComponents = components[components.length - 1];
  const index = lastComponents.isHardened() ? lastComponents.getIndex() + 0x80000000 : lastComponents.getIndex();
  const indexBuf = new Uint8Array(4);
  new DataView(indexBuf.buffer).setUint32(0, index, false); // big-endian
  const chainCode = hdKey.getChainCode();
  const key = hdKey.getKey();
  const data = concatUint8Arrays([version, depthBuf, parentFingerprint, indexBuf, chainCode, key]);

  const zpub = b58.encode(data);

  const result = {};
  result.ExtPubKey = zpub;
  result.MasterFingerprint = uint8ArrayToHex(cryptoAccount.getMasterFingerprint()).toUpperCase();
  result.AccountKeyPath = derivationPath;

  const str = JSON.stringify(result);
  return uint8ArrayToHex(stringToUint8Array(str)); // we are expected to return hex-encoded string
}

class BlueURDecoder extends URDecoder {
  bbqrParts = {}; // key-value, payload->1

  toString() {
    if (Object.keys(this.bbqrParts).length > 0) {
      // its BBQR, handle differently
      const decodedBbqr = joinQRs(Object.keys(this.bbqrParts));
      if (decodedBbqr.fileType === 'P') {
        // if its psbt we return base64:
        return uint8ArrayToBase64(decodedBbqr.raw);
      }

      // for everything else we covnert bytes to string directly
      return uint8ArrayToString(decodedBbqr.raw);
    }

    const decoded = this.resultUR();

    if (decoded.type === 'crypto-psbt') {
      const cryptoPsbt = CryptoPSBT.fromCBOR(decoded.cbor);
      return cryptoPsbt.getPSBT().toString('base64');
    }

    if (decoded.type === 'bytes') {
      const bytes = Bytes.fromCBOR(decoded.cbor);
      const data = bytes.getData();
      return uint8ArrayToString(data);
    }

    if (decoded.type === 'crypto-account') {
      const cryptoAccount = CryptoAccount.fromCBOR(decoded.cbor);

      const results = [];
      for (const outputDescriptor of cryptoAccount.outputDescriptors) {
        // now, crafting zpub out of data we have
        const hdKey = outputDescriptor.getCryptoKey();
        const derivationPath = 'm/' + hdKey.getOrigin().getPath();
        const script = cryptoAccount.outputDescriptors[0].getScriptExpressions()[0].getExpression();
        const isMultisig =
          script === ScriptExpressions.WITNESS_SCRIPT_HASH.getExpression() ||
          // fallback to paths (unreliable).
          // dont know how to add ms p2sh (legacy) or p2sh-p2wsh (wrapped segwit) atm
          derivationPath === MultisigHDWallet.PATH_LEGACY ||
          derivationPath === MultisigHDWallet.PATH_WRAPPED_SEGWIT ||
          derivationPath === MultisigHDWallet.PATH_NATIVE_SEGWIT;
        const version = hexToUint8Array(isMultisig ? '02aa7ed3' : '04b24746');
        const parentFingerprint = hdKey.getParentFingerprint();
        const depth = hdKey.getOrigin().getDepth();
        const depthBuf = new Uint8Array(1);
        depthBuf[0] = depth;
        const components = hdKey.getOrigin().getComponents();
        const lastComponents = components[components.length - 1];
        const index = lastComponents.isHardened() ? lastComponents.getIndex() + 0x80000000 : lastComponents.getIndex();
        const indexBuf = new Uint8Array(4);
        new DataView(indexBuf.buffer).setUint32(0, index, false); // big-endian
        const chainCode = hdKey.getChainCode();
        const key = hdKey.getKey();
        const data = concatUint8Arrays([version, depthBuf, parentFingerprint, indexBuf, chainCode, key]);

        const zpub = b58.encode(data);

        const result = {};
        result.ExtPubKey = zpub;
        result.MasterFingerprint = uint8ArrayToHex(cryptoAccount.getMasterFingerprint()).toUpperCase();
        result.AccountKeyPath = derivationPath;

        if (derivationPath.startsWith("m/49'/0'/")) {
          // converting to ypub
          let data = b58.decode(result.ExtPubKey);
          data = data.slice(4);
          result.ExtPubKey = b58.encode(concatUint8Arrays([hexToUint8Array('049d7cb2'), data]));
        }

        if (derivationPath.startsWith("m/44'/0'/")) {
          // converting to xpub
          let data = b58.decode(result.ExtPubKey);
          data = data.slice(4);
          result.ExtPubKey = b58.encode(concatUint8Arrays([hexToUint8Array('0488b21e'), data]));
        }

        results.push(result);
      }

      return JSON.stringify(results);
    }

    if (decoded.type === 'crypto-output') {
      const output = CryptoOutput.fromCBOR(decoded.cbor);
      return output.toString();
    }

    throw new Error('unsupported data format');
  }

  isComplete() {
    if (Object.keys(this.bbqrParts).length > 0) {
      // its BBQR, handle differently
      const bbqrPayload = Object.keys(this.bbqrParts)[0];
      if (bbqrPayload.slice(0, 2) !== 'B$') {
        throw new Error('fixed header not found, expected B$');
      }

      const numParts = parseInt(bbqrPayload.slice(4, 6), 36);
      return Object.keys(this.bbqrParts).length >= numParts;
    }

    // fallback to old BC-UR mechanism
    return super.isComplete();
  }

  estimatedPercentComplete() {
    if (Object.keys(this.bbqrParts).length > 0) {
      // its BBQR, handle differently
      const bbqrPayload = Object.keys(this.bbqrParts)[0];
      if (bbqrPayload.slice(0, 2) !== 'B$') {
        throw new Error('fixed header not found, expected B$');
      }

      const numParts = parseInt(bbqrPayload.slice(4, 6), 36);
      return Object.keys(this.bbqrParts).length / numParts;
    }

    // fallback to old BC-UR mechanism
    return super.estimatedPercentComplete();
  }

  receivePart(s) {
    if (s.startsWith('B$')) {
      // its BBQR, handle differently
      this.bbqrParts[s] = true;
      return true;
    }

    // fallback to old BC-UR mechanism
    return super.receivePart(s);
  }
}

export {
  decodeUR,
  encodeUR,
  extractSingleWorkload,
  BlueURDecoder,
  isURv1Enabled,
  setUseURv1,
  clearUseURv1,
  setWalletIdMustUseBBQR,
  isHexString,
};
