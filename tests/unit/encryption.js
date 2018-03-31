/* global describe, it */
let assert = require('assert')
let c = require('../../encryption')

describe('unit - encryption', function () {

  it('encrypts and decrypts', function () {
    let crypted = c.encrypt('data', 'password');
    let decrypted = c.decrypt(crypted, 'password');

    assert.ok(crypted);
    assert.ok(decrypted);
    assert.equal(decrypted, 'data');
    assert.ok(crypted !== 'data');

    let decryptedWithBadPassword
    try {
      decryptedWithBadPassword = c.decrypt(crypted, 'passwordBad');
    } catch (e) {}
    assert.ok(!decryptedWithBadPassword)
  })

})