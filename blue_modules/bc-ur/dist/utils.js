"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compose3 = exports.sha256Hash = void 0;
var bitcoinjs_lib_1 = require("bitcoinjs-lib");
exports.sha256Hash = function (data) {
    return bitcoinjs_lib_1.crypto.sha256(data);
};
exports.compose3 = function (f, g, h) { return function (x) {
    return f(g(h(x)));
}; };
//# sourceMappingURL=utils.js.map