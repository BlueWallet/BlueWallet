scryptsy
========

[![build status](https://secure.travis-ci.org/cryptocoinjs/scryptsy.svg)](http://travis-ci.org/cryptocoinjs/scryptsy)
[![Coverage Status](https://img.shields.io/coveralls/cryptocoinjs/scryptsy.svg)](https://coveralls.io/r/cryptocoinjs/scryptsy)
[![Version](http://img.shields.io/npm/v/scryptsy.svg)](https://www.npmjs.org/package/scryptsy)

`scryptsy` is a pure Javascript implementation of the [scrypt][wiki] key derivation function that is fully compatible with Node.js and the browser (via Browserify).


Why?
----

`Scrypt` is an integral part of many crypto currencies. It's a part of the [BIP38](https://github.com/bitcoin/bips/blob/master/bip-0038.mediawiki) standard for encrypting private Bitcoin keys. It also serves as the [proof-of-work system](http://en.wikipedia.org/wiki/Proof-of-work_system) for many crypto currencies, most notably: Litecoin and Dogecoin.



Installation
------------

    npm install --save scryptsy



Example
-------

```js
var scrypt = require('scryptsy')

var key = "pleaseletmein"
var salt = "SodiumChloride"
var data = scrypt(key, salt, 16384, 8, 1, 64)
console.log(data.toString('hex'))
// => 7023bdcb3afd7348461c06cd81fd38ebfda8fbba904f8e3ea9b543f6545da1f2d5432955613f0fcf62d49705242a9af9e61e85dc0d651e40dfcf017b45575887
```


API
---

### scrypt(key, salt, N, r, p, keyLenBytes, [progressCallback])

- **key**: The key. Either `Buffer` or `string`.
- **salt**: The salt. Either `Buffer` or `string`.
- **N**: The number of iterations. `number` (integer)
- **r**: Memory factor. `number` (integer)
- **p**: Parallelization factor. `number` (integer)
- **keyLenBytes**: The number of bytes to return. `number` (integer)
- **progressCallback**: Call callback on every `1000` ops. Passes in `{current, total, percent}` as first parameter to `progressCallback()`.

Returns `Buffer`.



Resources
---------
- [Tarsnap Blurb on Scrypt][tarsnap]
- [Scrypt Whitepaper](http://www.tarsnap.com/scrypt/scrypt.pdf)
- [IETF Scrypt](https://tools.ietf.org/html/draft-josefsson-scrypt-kdf-00) (Test vector params are [incorrect](https://twitter.com/dchest/status/247734446881640448).)


License
-------

MIT


[wiki]: http://en.wikipedia.org/wiki/Scrypt
[tarsnap]: http://www.tarsnap.com/scrypt.html
