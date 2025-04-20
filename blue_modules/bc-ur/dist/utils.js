"use strict";
import { sha256 as _sha256 } from '@noble/hashes/sha256';
Object.defineProperty(exports, "__esModule", { value: true });
exports.compose3 = exports.sha256Hash = void 0;
var bitcoinjs_lib_1 = require("bitcoinjs-lib");
const {uint8ArrayToHex} = require("../../uint8array-extras");
exports.sha256Hash = function (data) {
    return bitcoinjs_crypto_sha256(data);
};

function bitcoinjs_crypto_sha256(buffer/*: Buffer*/)/*: Buffer*/ {
    return Buffer.from(_sha256(Uint8Array.from(buffer)));
}


exports.compose3 = function (f, g, h) { return function (x) {
    return f(g(h(x)));
}; };
//# sourceMappingURL=utils.js.map