/**
 * @exports {AppStorage}
 */

import {AppStorage} from './class'
let EV = require('./events')

let BlueApp = new AppStorage()

;(async () => {
  await BlueApp.loadFromDisk()
  console.log('loaded from disk')
  EV(EV.enum.WALLETS_COUNT_CHANGED)
  EV(EV.enum.TRANSACTIONS_COUNT_CHANGED)
})()

module.exports = BlueApp
