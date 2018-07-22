import { Amplitude } from 'expo';
import { Analytics, PageHit } from 'expo-analytics';

Amplitude.initialize('8b7cf19e8eea3cdcf16340f5fbf16330');
const analytics = new Analytics('UA-121673546-1');

let A = function(event) {
  Amplitude.logEvent(event);
  analytics.hit(new PageHit(event));
  // .then(() => console.log('success'))
  // .catch(e => console.log(e.message));
};

A.ENUM = {
  INIT: 'INIT',
  GOT_NONZERO_BALANCE: 'GOT_NONZERO_BALANCE',
  CREATED_WALLET: 'CREATED_WALLET',
};

module.exports = A;
