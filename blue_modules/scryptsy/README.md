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



Browserify Note
------------

When using a browserified bundle, be sure to add `setImmediate` as a shim.



Example
-------

```js
const scrypt = require('scryptsy')

async function main () {
  var key = "pleaseletmein"
  var salt = "SodiumChloride"
  var data1 = scrypt(key, salt, 16384, 8, 1, 64)
  console.log(data1.toString('hex'))
  // => 7023bdcb3afd7348461c06cd81fd38ebfda8fbba904f8e3ea9b543f6545da1f2d5432955613f0fcf62d49705242a9af9e61e85dc0d651e40dfcf017b45575887

  // async is actually slower, but it will free up the event loop occasionally
  // which will allow for front end GUI elements to update and cause it to not
  // freeze up.
  // See benchmarks below
  // Passing 300 below means every 300 iterations internally will call setImmediate once
  var data2 = await scrypt.async(key, salt, 16384, 8, 1, 64, undefined, 300)
  console.log(data2.toString('hex'))
  // => 7023bdcb3afd7348461c06cd81fd38ebfda8fbba904f8e3ea9b543f6545da1f2d5432955613f0fcf62d49705242a9af9e61e85dc0d651e40dfcf017b45575887
}
main().catch(console.error)
```


Benchmarks
-------

Internal iterations are N * p, so changing r doesn't affect the number of calls to setImmediate.
Decreasing pI decreases performance in exchange for more frequently freeing the event loop.
(pI Default is 5000 loops per setImmediate call)

Note: these benchmarks were done on node v10 on a CPU with good single thread performance.
browsers show a much larger difference. Please tinker with the pI setting to balance between
performance and GUI responsiveness.

If `pI >= N`, setImmediate will only be called `p * 2` times total (on the i = 0 of each for loop).

```
---------------------------
time    : type : (N,r,p,pI) (pI = promiseInterval)
---------------------------
2266 ms :  sync (2^16,16,1)
2548 ms : async (2^16,16,1,5000)
12.44% increase
---------------------------
2616 ms :  sync (2^16,1,16)
2995 ms : async (2^16,1,16,5000)
14.49% increase
---------------------------
2685 ms :  sync (2^20,1,1)
3090 ms : async (2^20,1,1,5000)
15.08% increase
---------------------------
2235 ms :  sync (2^16,16,1)
2627 ms : async (2^16,16,1,10)
17.54% increase
---------------------------
2592 ms :  sync (2^16,1,16)
3305 ms : async (2^16,1,16,10)
27.51% increase
---------------------------
2705 ms :  sync (2^20,1,1)
3363 ms : async (2^20,1,1,10)
24.33% increase
---------------------------
2278 ms :  sync (2^16,16,1)
2773 ms : async (2^16,16,1,1)
21.73% increase
---------------------------
2617 ms :  sync (2^16,1,16)
5632 ms : async (2^16,1,16,1)
115.21% increase
---------------------------
2727 ms :  sync (2^20,1,1)
5723 ms : async (2^20,1,1,1)
109.86% increase
---------------------------
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

### scrypt.async(key, salt, N, r, p, keyLenBytes, [progressCallback, promiseInterval])

- **key**: The key. Either `Buffer` or `string`.
- **salt**: The salt. Either `Buffer` or `string`.
- **N**: The number of iterations. `number` (integer)
- **r**: Memory factor. `number` (integer)
- **p**: Parallelization factor. `number` (integer)
- **keyLenBytes**: The number of bytes to return. `number` (integer)
- **progressCallback**: Call callback on every `1000` ops. Passes in `{current, total, percent}` as first parameter to `progressCallback()`.
- **promiseInterval**: The number of internal iterations before calling setImmediate once to free the event loop.

Returns `Promise<Buffer>`.



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
