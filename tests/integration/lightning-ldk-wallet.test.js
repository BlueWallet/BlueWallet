import { LightningLdkWallet } from '../../class';
import SyncedAsyncStorage from '../../class/synced-async-storage';
const assert = require('assert');

describe('', () => {
  it.skip('can import & dump LDK bytes from network storage  ', async () => {
    const ldk = new LightningLdkWallet();
    ldk.setSecret('exile frozen coast pave purity cherry script cliff butter north bronze sentence');
    assert.ok(ldk.valid());

    const syncedStorage = new SyncedAsyncStorage(ldk.getEntropyHex());
    console.log('namespace =', syncedStorage.namespace);
    const keys = await syncedStorage.getAllKeysRemote();
    for (const k of keys) {
      let val = await syncedStorage.getItemRemote(k);
      val = syncedStorage.decrypt(val);
      console.log(`${k}\n---------------------------------------\n${val}`);
    }
  });

  it.skip('can restore bytes to network storage', async () => {
    const ldk = new LightningLdkWallet();
    ldk.setSecret('exile frozen coast pave purity cherry script cliff butter north bronze sentence');
    assert.ok(ldk.valid());

    const syncedStorage = new SyncedAsyncStorage(ldk.getEntropyHex());

    await syncedStorage.setItemRemote('channel_monitor_742ae3a31bea2bf5c14520a29c8b9bf5769b65651e95acfd07aa12fb8aeb7a3b', '');

    await syncedStorage.setItemRemote('channel_manager', '');
  });
});
