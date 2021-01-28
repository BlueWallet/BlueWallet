let pbkdf2 = require('pbkdf2')
const {
  checkAndInit,
  smixSync
} = require('./utils')

// N = Cpu cost, r = Memory cost, p = parallelization cost
function scrypt (key, salt, N, r, p, dkLen, progressCallback) {
  const {
    XY,
    V,
    B32,
    x,
    _X,
    B,
    tickCallback
  } = checkAndInit(key, salt, N, r, p, dkLen, progressCallback)

  for (var i = 0; i < p; i++) {
    smixSync(B, i * 128 * r, r, N, V, XY, _X, B32, x, tickCallback)
  }

  return pbkdf2.pbkdf2Sync(key, B, 1, dkLen, 'sha256')
}

module.exports = scrypt
