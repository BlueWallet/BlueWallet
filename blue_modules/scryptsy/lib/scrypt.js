let pbkdf2 = require('pbkdf2')
const {
  checkAndInit,
  smix
} = require('./utils')

// N = Cpu cost, r = Memory cost, p = parallelization cost
async function scrypt (key, salt, N, r, p, dkLen, progressCallback, promiseInterval) {
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
    await smix(B, i * 128 * r, r, N, V, XY, _X, B32, x, tickCallback, promiseInterval)
  }

  return pbkdf2.pbkdf2Sync(key, B, 1, dkLen, 'sha256')
}

module.exports = scrypt
