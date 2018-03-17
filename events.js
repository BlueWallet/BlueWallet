function EV(eventName, arg) {
  if (Object.values(EV.enum).indexOf(eventName) === -1) {
    return console.warn(
      'Unregistered event',
      eventName,
      'registered events:',
      EV.enum,
    );
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
    EV.callbacks[eventName].push(arg);
  }
}

EV.enum = {
  WALLETS_COUNT_CHANGED: 'WALLETS_COUNT_CHANGED',
  TRANSACTIONS_COUNT_CHANGED: 'TRANSACTIONS_COUNT_CHANGED',
  CREATE_TRANSACTION_NEW_DESTINATION_ADDRESS:
    'CREATE_TRANSACTION_NEW_DESTINATION_ADDRESS',
};

module.exports = EV;
