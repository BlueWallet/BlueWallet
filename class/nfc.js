/* global alert */
import NfcManager, { Ndef, NfcTech, NfcEvents } from 'react-native-nfc-manager';
import { Platform } from 'react-native';
const encryption = require('../encryption');
const prompt = require('../prompt');
const loc = require('../loc');

export default class NFC {
  static shared = new NFC();
  onParsedText = () => {};

  // General
  static cleanUp = async () => {
    await NfcManager.cancelTechnologyRequest().catch(() => 0);
    await NfcManager.unregisterTagEvent();
    await NFC.cancelAndroidBeam();
    NFC.shared.onParsedText = () => {};
  }

  static async start() {
    await NfcManager.start();
    NfcManager.setEventListener(NfcEvents.DiscoverTag, tag => {
      NFC.shared.onParsedText(NFC.parseText(tag));
      NFC.cleanUp();
    });
  }

  static async isSupported() {
    if (Platform.OS === 'android') {
      // const isEnabled = await NfcManager.isEnabled();
      // const isSupported = await NfcManager.isSupported();
      //      return isEnabled && isSupported;
      return false;
    } else {
      return NfcManager.isSupported();
    }
  }

  static isEnabled() {
    return NfcManager.isEnabled();
  }

  // Encrypt and Decrypt

  static decryptData(data, password) {
    const decrypted = encryption.decrypt(data, password);
    if (decrypted) {
      return decrypted;
    }
    return false;
  }

  static encryptData(data, password) {
    if (password.trim().length === 0) {
      return false;
    }
    const encrypted = encryption.encrypt(data, password);
    return encrypted;
  }

  static async loadEncryptedData(data, retry = false) {
    let password = false;
    do {
      password = await prompt((retry && loc._.bad_password) || loc._.enter_password, loc._.storage_is_encrypted);
    } while (!password);
    const success = NFC.decryptData(data, password);
    if (success) {
      return success;
    } else {
      return NFC.loadEncryptedData(data, true);
    }
  }

  // Read NFC

  static decodeStringPayload(value) {
    return Ndef.decodeMessage(value);
  }

  static parseText(tag) {
    try {
      if (Ndef.isType(tag.ndefMessage[0], Ndef.TNF_WELL_KNOWN, Ndef.RTD_TEXT)) {
        return Ndef.text.decodePayload(tag.ndefMessage[0].payload);
      }
    } catch (e) {
      console.log(e);
    }
    return null;
  }

  static async readNFCData() {
    try {
      await NFC.start();
      NfcManager.getLaunchTagEvent()
        .then(tag => NfcManager.registerTagEvent())
        .catch(error => {
          alert(error);
          console.log('Error Reading Data', error);
        });
    } catch (error) {
      alert(error);
      console.log('Error Reading Data', error);
    }
    NFC.cleanUp();
  }

  // Write NFC
  static buildStringPayload(valueToWrite) {
    return Ndef.encodeMessage([Ndef.textRecord(valueToWrite)]);
  }

  static async writeNFCData(data = '') {
    try {
      await NFC.start();
      await NfcManager.registerTagEvent();
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: '',
      });
      await NfcManager.getNdefMessage();
      let bytes = NFC.buildStringPayload(data);
      await NfcManager.writeNdefMessage(bytes);
    } catch (error) {
      alert(error);
      console.log('Error Reading NFC: ', error);
      alert('There was a problem when attempting to save. Please, try again.');
    }
    NFC.cleanUp();
  }

  // Beam NFC (Android)

  static async beamNFCData(data = '') {
    const bytes = NFC.buildStringPayload(data);

    NfcManager.setNdefPushMessage(bytes)
      .then(() => {
        console.log('Beam request completed');
        NFC.cleanUp();
      })
      .catch(err => {
        console.log(err);
        NFC.cleanUp();
      });
  }

  static async cancelAndroidBeam() {
    NfcManager.setNdefPushMessage(null)
      .then(() => {
        console.log('Beam cancelled');
        NFC.cleanUp();
      })
      .catch(err => {
        console.log(err);
        NFC.cleanUp();
      });
  }
}
