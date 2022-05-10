"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = {};
var Bech32Version;
(function (Bech32Version) {
    Bech32Version[Bech32Version["Origin"] = 1] = "Origin";
    Bech32Version[Bech32Version["bis"] = 2] = "bis";
})(Bech32Version = Bech32Version || (Bech32Version = {}));
index_1.Bech32Version=Bech32Version;
var CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
var GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
function polymod(values) {
    var chk = 1;
    for (var p = 0; p < values.length; ++p) {
        var top_1 = chk >> 25;
        chk = ((chk & 0x1ffffff) << 5) ^ values[p];
        for (var i = 0; i < 6; ++i) {
            if ((top_1 >> i) & 1) {
                chk ^= GENERATOR[i];
            }
        }
    }
    return chk;
}
function hrpExpand(hrp) {
    var ret = [];
    var p;
    for (p = 0; p < hrp.length; ++p) {
        ret.push(hrp.charCodeAt(p) >> 5);
    }
    ret.push(0);
    for (p = 0; p < hrp.length; ++p) {
        ret.push(hrp.charCodeAt(p) & 31);
    }
    return ret;
}
function verifyChecksum(hrp, data, version) {
    var header;
    if (hrp) {
        header = hrpExpand(hrp);
    }
    else {
        header = [0];
    }
    var check = version === index_1.Bech32Version.Origin ? 1 : 0x3fffffff;
    return polymod(header.concat(data)) === check;
}
function createChecksum(hrp, data, bech32Version) {
    var values;
    if (hrp) {
        values = hrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
    }
    else {
        values = [0].concat(data).concat([0, 0, 0, 0, 0, 0]);
    }
    var chk = bech32Version === index_1.Bech32Version.Origin ? 1 : 0x3fffffff;
    var mod = polymod(values) ^ chk;
    var ret = [];
    for (var p = 0; p < 6; ++p) {
        ret.push((mod >> (5 * (5 - p))) & 31);
    }
    return ret;
}
var encode = function (hrp, data, version) {
    var combined = data.concat(createChecksum(hrp, data, version));
    var ret;
    if (hrp) {
        ret = hrp + '1';
    }
    else {
        ret = '';
    }
    for (var p = 0; p < combined.length; ++p) {
        ret += CHARSET.charAt(combined[p]);
    }
    return ret;
};
var decodeBc32 = function (bechString) {
    var data = [];
    for (var p = 0; p < bechString.length; ++p) {
        var d = CHARSET.indexOf(bechString.charAt(p));
        if (d === -1) {
            return null;
        }
        data.push(d);
    }
    if (!verifyChecksum(null, data, index_1.Bech32Version.bis)) {
        return null;
    }
    return { hrp: null, data: data.slice(0, data.length - 6) };
};
var decode = function (bechString) {
    var p;
    var hasLower = false;
    var hasUpper = false;
    for (p = 0; p < bechString.length; ++p) {
        if (bechString.charCodeAt(p) < 33 || bechString.charCodeAt(p) > 126) {
            return null;
        }
        if (bechString.charCodeAt(p) >= 97 && bechString.charCodeAt(p) <= 122) {
            hasLower = true;
        }
        if (bechString.charCodeAt(p) >= 65 && bechString.charCodeAt(p) <= 90) {
            hasUpper = true;
        }
    }
    if (hasLower && hasUpper) {
        return null;
    }
    bechString = bechString.toLowerCase();
    var pos = bechString.lastIndexOf('1');
    if (pos === -1) {
        return decodeBc32(bechString);
    }
    if (pos < 1 || pos + 7 > bechString.length || bechString.length > 90) {
        return null;
    }
    var hrp = bechString.substring(0, pos);
    var data = [];
    for (p = pos + 1; p < bechString.length; ++p) {
        var d = CHARSET.indexOf(bechString.charAt(p));
        if (d === -1) {
            return null;
        }
        data.push(d);
    }
    if (!verifyChecksum(hrp, data, index_1.Bech32Version.Origin)) {
        return null;
    }
    return { hrp: hrp, data: data.slice(0, data.length - 6) };
};
exports.default = {
    encode: encode,
    decode: decode,
};
//# sourceMappingURL=bech32.js.map