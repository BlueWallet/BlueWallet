import AsyncStorage from '@react-native-async-storage/async-storage';

const SHA256 = require('crypto-js/sha256');
const ENCHEX = require('crypto-js/enc-hex');
const ENCUTF8 = require('crypto-js/enc-utf8');
const AES = require('crypto-js/aes');

export default class SyncedAsyncStorage {
  defaultBaseUrl = 'https://bytes-store.herokuapp.com';
  encryptionMarker = 'encrypted://';

  namespace: string = '';
  encryptionKey: string = '';

  constructor(entropy: string) {
    if (!entropy) throw new Error('entropy not provided');

    this.namespace = this.hashIt(this.hashIt('namespace' + entropy));
    this.encryptionKey = this.hashIt(this.hashIt('encryption' + entropy));
  }

  hashIt(arg: string) {
    return ENCHEX.stringify(SHA256(arg));
  }

  encrypt(clearData: string): string {
    return this.encryptionMarker + AES.encrypt(clearData, this.encryptionKey).toString();
  }

  decrypt(encryptedData: string | null, encryptionKey: string | null = null): string {
    if (encryptedData === null) return '';
    if (!encryptedData.startsWith(this.encryptionMarker)) return encryptedData;
    const bytes = AES.decrypt(encryptedData.replace(this.encryptionMarker, ''), encryptionKey || this.encryptionKey);
    return bytes.toString(ENCUTF8);
  }

  static assertEquals(a: any, b: any) {
    if (a !== b) throw new Error('Assertion failed that ' + a + ' equals ' + b);
  }

  static assertNotEquals(a: any, b: any) {
    if (a === b) throw new Error('Assertion failed that ' + a + ' NOT equals ' + b);
  }

  async selftest(): Promise<boolean> {
    const clear = 'text line to be encrypted';
    const encrypted = this.encrypt(clear);

    SyncedAsyncStorage.assertEquals(encrypted.startsWith(this.encryptionMarker), true);
    SyncedAsyncStorage.assertNotEquals(clear, encrypted);
    const decrypted = this.decrypt(encrypted);
    SyncedAsyncStorage.assertEquals(clear, decrypted);

    SyncedAsyncStorage.assertEquals(this.decrypt(clear), clear);

    SyncedAsyncStorage.assertEquals(
      this.decrypt(
        'encrypted://U2FsdGVkX19XQWgwS8q5XjQSQ19OmBsNax4k6NZOAsKFhCgw9sJFwb+qVYfqy6X5',
        '3a013f391e59daf2f5074fa66652784d17511ea072d7a8329ff9bddf371932ab',
      ),
      'text line to be encrypted',
    );

    return true;
  }

  /**
   * @param key {string}
   * @param value {string}
   *
   * @return {string} New sequence number from remote
   */
  async setItemRemote(key: string, value: string): Promise<string> {
    const that = this;
    return new Promise(function (resolve, reject) {
      fetch(that.defaultBaseUrl + '/namespace/' + that.namespace + '/' + key, {
        method: 'POST',
        headers: {
          Accept: 'text/plain',
          'Content-Type': 'text/plain',
        },
        body: value,
      })
        .then(async response => {
          const text = await response.text();
          console.log('saved, seq num:', text);
          resolve(text);
        })
        .catch(reason => reject(reason));
    });
  }

  async setItem(key: string, value: string) {
    value = this.encrypt(value);
    await AsyncStorage.setItem(this.namespace + '_' + key, value);
    const newSeqNum = await this.setItemRemote(key, value);
    const localSeqNum = await this.getLocalSeqNum();
    if (+localSeqNum > +newSeqNum) {
      // some race condition during save happened..?
      return;
    }
    await AsyncStorage.setItem(this.namespace + '_' + 'seqnum', newSeqNum);
  }

  async getItemRemote(key: string) {
    const response = await fetch(this.defaultBaseUrl + '/namespace/' + this.namespace + '/' + key);
    return await response.text();
  }

  async getItem(key: string) {
    return this.decrypt(await AsyncStorage.getItem(this.namespace + '_' + key));
  }

  async getAllKeysRemote(): Promise<string[]> {
    const response = await fetch(this.defaultBaseUrl + '/namespacekeys/' + this.namespace);
    const text = await response.text();
    return text.split(',');
  }

  async getAllKeys(): Promise<string[]> {
    return (await AsyncStorage.getAllKeys())
      .filter(key => key.startsWith(this.namespace + '_'))
      .map(key => key.replace(this.namespace + '_', ''));
  }

  async getLocalSeqNum() {
    return (await AsyncStorage.getItem(this.namespace + '_' + 'seqnum')) || '0';
  }

  async purgeLocalStorage() {
    if (!this.namespace) throw new Error('No namespace');
    const keys = (await AsyncStorage.getAllKeys()).filter(key => key.startsWith(this.namespace));
    for (const key of keys) {
      await AsyncStorage.removeItem(key);
    }
  }

  /**
   * Should be called at init.
   * Checks remote sequence number, and if remote is ahead - we sync all keys with local storage.
   */
  async synchronize() {
    const response = await fetch(this.defaultBaseUrl + '/namespaceseq/' + this.namespace);
    const remoteSeqNum = (await response.text()) || '0';
    const localSeqNum = await this.getLocalSeqNum();
    if (+remoteSeqNum > +localSeqNum) {
      console.log('remote storage is ahead, need to sync;', +remoteSeqNum, '>', +localSeqNum);

      // sort to ensure channel_manager comes first
      for (const key of (await this.getAllKeysRemote()).sort()) {
        const value = await this.getItemRemote(key);
        await AsyncStorage.setItem(this.namespace + '_' + key, value);
        console.log('synced', key, 'to', value);
      }

      await AsyncStorage.setItem(this.namespace + '_' + 'seqnum', remoteSeqNum);
    } else {
      console.log('storage is up-to-date, no need for sync');
    }
  }
}
