import amplitude from 'amplitude-js';
import Analytics from 'appcenter-analytics';

amplitude.getInstance().init('8b7cf19e8eea3cdcf16340f5fbf16330', null, {
  useNativeDeviceInfo: true,
});

let A = event => {
  amplitude.getInstance().logEvent(event);
  Analytics.trackEvent(event);
};

A.ENUM = {
  INIT: 'INIT',
  GOT_NONZERO_BALANCE: 'GOT_NONZERO_BALANCE',
  CREATED_WALLET: 'CREATED_WALLET',
  CREATED_LIGHTNING_WALLET: 'CREATED_LIGHTNING_WALLET',
};

module.exports = A;
