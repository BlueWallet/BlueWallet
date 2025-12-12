/* global __DEV__, localStorage */
import 'text-encoding';
if (typeof Buffer === 'undefined') global.Buffer = require('buffer').Buffer;
if (typeof __dirname === 'undefined') global.__dirname = '/';
if (typeof __filename === 'undefined') global.__filename = '';
if (typeof process === 'undefined') {
  global.process = {};
}

process.browser = false;
process.version = '0.0.0';

// Minimalistic process.nextTick implementation
process.nextTick = function (callback, ...args) {
  if (typeof callback !== 'function') {
    throw new TypeError('callback must be a function');
  }

  // Use setImmediate if available (better than setTimeout), otherwise fallback to setTimeout
  if (typeof setImmediate !== 'undefined') {
    setImmediate(() => callback(...args));
  } else {
    setTimeout(() => callback(...args), 0);
  }
};

// global.location = global.location || { port: 80 }
const isDev = typeof __DEV__ === 'boolean' && __DEV__;
process.env.NODE_ENV = isDev ? 'development' : 'production';
if (typeof localStorage !== 'undefined') {
  localStorage.debug = isDev ? '*' : '';
}

// If using the crypto shim, uncomment the following line to ensure
// crypto is loaded first, so it can populate global.crypto
require('crypto');
