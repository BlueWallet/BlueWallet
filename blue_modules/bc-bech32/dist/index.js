"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeBc32Data = exports.encodeBc32Data = exports.encodeSegwitAddress = exports.decodeSegwitAddress = exports.Bech32Version = void 0;
var bech32_1 = __importDefault(require("./bech32"));
var Bech32Version;
(function (Bech32Version) {
    Bech32Version[Bech32Version["Origin"] = 1] = "Origin";
    Bech32Version[Bech32Version["bis"] = 2] = "bis";
})(Bech32Version = exports.Bech32Version || (exports.Bech32Version = {}));
var convertBits = function (data, fromBits, toBits, pad) {
    var acc = 0;
    var bits = 0;
    var ret = [];
    var maxv = (1 << toBits) - 1;
    for (var p = 0; p < data.length; ++p) {
        var value = data[p];
        if (value < 0 || value >> fromBits !== 0) {
            return null;
        }
        acc = (acc << fromBits) | value;
        bits += fromBits;
        while (bits >= toBits) {
            bits -= toBits;
            ret.push((acc >> bits) & maxv);
        }
    }
    if (pad) {
        if (bits > 0) {
            ret.push((acc << (toBits - bits)) & maxv);
        }
    }
    else if (bits >= fromBits || (acc << (toBits - bits)) & maxv) {
        return null;
    }
    return ret;
};
exports.decodeSegwitAddress = function (hrp, addr) {
    var dec = bech32_1.default.decode(addr);
    if (dec === null || dec.hrp !== hrp || dec.data.length < 1 || dec.data[0] > 16) {
        return null;
    }
    var res = convertBits(Uint8Array.from(dec.data.slice(1)), 5, 8, false);
    if (res === null || res.length < 2 || res.length > 40) {
        return null;
    }
    if (dec.data[0] === 0 && res.length !== 20 && res.length !== 32) {
        return null;
    }
    return { version: dec.data[0], program: res };
};
exports.encodeSegwitAddress = function (hrp, version, program) {
    var ret = bech32_1.default.encode(hrp, [version].concat(convertBits(program, 8, 5, true)), Bech32Version.Origin);
    if (exports.decodeSegwitAddress(hrp, ret) === null) {
        return null;
    }
    return ret;
};
exports.encodeBc32Data = function (hex) {
    var data = Buffer.from(hex, 'hex');
    return bech32_1.default.encode(null, convertBits(data, 8, 5, true), Bech32Version.bis);
};
exports.decodeBc32Data = function (data) {
    var result = bech32_1.default.decode(data);
    if (result) {
        var res = convertBits(Buffer.from(result.data), 5, 8, false);
        return Buffer.from(res).toString('hex');
    }
    else {
        return null;
    }
};
//# sourceMappingURL=index.js.map