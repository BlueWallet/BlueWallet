# payjoin-client (vendored)

BIP78 Payjoin sender, vendored from https://github.com/bitcoinjs/payjoin-client
(v1.0.1, MIT — see LICENSE). Upstream is unmaintained since 2021 and pinned to
bitcoinjs-lib v5; this copy is ported to bitcoinjs-lib v7 (Uint8Array, bigint amounts).

Changes vs upstream:
- `Buffer` → `Uint8Array` (`areUint8ArraysEqual`), `paymentScript: Uint8Array`
- `Psbt.getFee()` is `bigint` in v7: fee comparisons use bigint
- bip174 types derived from `Psbt` instead of `bip174/src/lib/interfaces`
- `PayjoinEndpointError` exported
- `PayjoinRequester` aborts the endpoint request after `PAYJOIN_REQUEST_TIMEOUT_MS` (30 s); upstream could hang forever

Tests: `tests/unit/payjoin-client/` (upstream `test/` vectors). Upstream docker/BTCPay integration test not ported.
