function EV(eventName, arg, isExclusive) {
  if (Object.values(EV.enum).indexOf(eventName) === -1) {
    return console.warn('Unregistered event', eventName, 'registered events:', EV.enum);
  }
  EV.callbacks = EV.callbacks || {}; // static variable
  EV.callbacks[eventName] = EV.callbacks[eventName] || [];

  if (typeof arg !== 'function') {
    // then its an argument
    console.log('got event', eventName, '...');
    for (let cc of EV.callbacks[eventName]) {
      console.log('dispatching event', eventName);
      cc(arg);
    }
  } else {
    // its a callback. subscribe it to event
    console.log('someone subscribed to', eventName);
    if (isExclusive) {
      // if it'a an excluside subscribe - other subscribers should be terminated
      console.log('exclusive subscribe');
      EV.callbacks[eventName] = [];
    }
    EV.callbacks[eventName].push(arg);
  }
}

EV.enum = {
  // emitted when local wallet created or deleted, so one must redraw wallets carousel
  WALLETS_COUNT_CHANGED: 'WALLETS_COUNT_CHANGED',

  // emitted when local wallet (usually current wallet) has changed number of transactions
  // so one must redraw main screen transactions list and WalletTransactions screen tx list
  TRANSACTIONS_COUNT_CHANGED: 'TRANSACTIONS_COUNT_CHANGED',

  // emitted when we know for sure that on remote server tx list
  // changed (usually for current wallet)
  REMOTE_TRANSACTIONS_COUNT_CHANGED: 'REMOTE_TRANSACTIONS_COUNT_CHANGED',

  // RECEIVE_ADDRESS_CHANGED: 'RECEIVE_ADDRESS_CHANGED',
};

module.exports = EV;
