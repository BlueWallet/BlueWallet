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
const URL_BLACKLIST = [
  '.*arkade\\.computer/v1/indexer/script/subscription.*',
  // Current push host. The herokuapp name below is the previous one; either
  // request never completes fast enough for Detox idle and stalls the suite.
  '.*groundcontrol\\.bluewallet\\.io.*',
  '.*groundcontrol-bluewallet\\.herokuapp\\.com.*',
];

beforeAll(async () => {
  if (typeof device === 'undefined' || !device?.launchApp) return;

  const originalLaunchApp = device.launchApp.bind(device);
  device.launchApp = async (...args) => {
    const run = () => originalLaunchApp(...args);
    let result;
    try {
      result = await run();
    } catch (e) {
      // Android 16 + Espresso TestLooperManager crashes mqt_v_native while
      // checking idle (MessageHeap). A second launch starts a fresh process.
      const message = String(e?.message || e);
      if (!/MessageHeap|Failed to run application|TestLooperManager/.test(message)) throw e;
      console.log('[detox-setup] retrying launchApp after Android looper crash');
      await new Promise(resolve => setTimeout(resolve, 2000));
      result = await run();
    }
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
