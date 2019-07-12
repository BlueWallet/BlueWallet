//  import Amplitude from 'react-native-amplitude-analytics';

// Amplitude.initialize('8b7cf19e8eea3cdcf16340f5fbf16330');

let A = function(event) {
  // Amplitude.logEvent(event);
};

A.ENUM = {
  INIT: 'INIT',
  GOT_NONZERO_BALANCE: 'GOT_NONZERO_BALANCE',
  CREATED_WALLET: 'CREATED_WALLET',
  CREATED_LIGHTNING_WALLET: 'CREATED_LIGHTNING_WALLET',
};

module.exports = A;
