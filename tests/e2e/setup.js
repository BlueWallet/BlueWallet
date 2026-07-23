/* eslint-env jest */
/* global device */

// Detox's iOS network synchronization waits on all in-flight NSURLSession
// requests before considering the app idle. The Arkade SDK's indexer opens
// a long-lived SSE-style stream (`expo/fetch` →
// /v1/indexer/script/subscription/<id>) that never completes during the
// test's lifetime, so every action would time out waiting for idle.
//
// Tell Detox to ignore that endpoint. The blacklist is process-scoped on
// iOS, so we re-apply it after every launchApp.
const URL_BLACKLIST = ['.*arkade\\.computer/v1/indexer/script/subscription.*', '.*groundcontrol-bluewallet\\.herokuapp\\.com.*'];

beforeAll(async () => {
  if (typeof device === 'undefined' || !device?.launchApp) return;

  const originalLaunchApp = device.launchApp.bind(device);
  device.launchApp = async (...args) => {
    const result = await originalLaunchApp(...args);
    try {
      await device.setURLBlacklist(URL_BLACKLIST);
    } catch (e) {
      console.log('[detox-setup] setURLBlacklist after launchApp failed:', e?.message ?? e);
    }
    return result;
  };

  // Detox auto-launches the app before the first beforeAll; cover that launch too.
  try {
    await device.setURLBlacklist(URL_BLACKLIST);
  } catch (e) {
    console.log('[detox-setup] initial setURLBlacklist failed:', e?.message ?? e);
  }
});
