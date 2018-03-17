/* global describe, it, jest */

import React from 'react'
import { AppStorage, LegacyWallet, SegwitBech32Wallet, SegwitP2SHWallet } from './class'
let assert = require('assert')

describe('unit - LegacyWallet', function () {
  it('serialize and unserialize work correctly', () => {
    let a = new LegacyWallet()
    a.setLabel('my1')
    let key = JSON.stringify(a)

    let b = LegacyWallet.fromJson(key)
    assert(key === JSON.stringify(b))

    assert.equal(key, JSON.stringify(b))
  })
})
