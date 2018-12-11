//  import Amplitude from 'react-native-amplitude-analytics';
import { GoogleAnalyticsTracker } from 'react-native-google-analytics-bridge';

// Amplitude.initialize('8b7cf19e8eea3cdcf16340f5fbf16330');
const analytics = new GoogleAnalyticsTracker('UA-121673546-1');

let A = function(event) {
  // Amplitude.logEvent(event);
  analytics.trackEvent(event, event);
};

A.ENUM = {
  INIT: 'INIT',
  GOT_NONZERO_BALANCE: 'GOT_NONZERO_BALANCE',
  CREATED_WALLET: 'CREATED_WALLET',
  CREATED_LIGHTNING_WALLET: 'CREATED_LIGHTNING_WALLET',
};

module.exports = A;
