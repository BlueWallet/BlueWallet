import { LightningLdkWallet } from '../../class';
import SyncedAsyncStorage from '../../class/synced-async-storage';
const assert = require('assert');

describe('', () => {
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('can import & dump LDK bytes from network storage  ', async () => {
    const ldk = new LightningLdkWallet();
    ldk.setSecret('');
    assert.ok(ldk.valid());

    const syncedStorage = new SyncedAsyncStorage(ldk.getEntropyHex());
    const keys = await syncedStorage.getAllKeysRemote();
    for (const k of keys) {
      let val = await syncedStorage.getItemRemote(k);
      val = syncedStorage.decrypt(val);
      console.log(`${k}\n---------------------------------------\n${val}`);
    }
  });
});
