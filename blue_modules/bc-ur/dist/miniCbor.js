"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeSimpleCBOR = exports.encodeSimpleCBOR = exports.composeHeader = void 0;
/*
    this an simple cbor implementation which is just using
    on BCR-05
*/
exports.composeHeader = function (length) {
    var header;
    if (length > 0 && length <= 23) {
        header = Buffer.from([0x40 + length]);
    }
    if (length >= 24 && length <= 255) {
        var headerLength = Buffer.alloc(1);
        headerLength.writeUInt8(length);
        header = Buffer.concat([Buffer.from([0x58]), headerLength]);
    }
    if (length >= 256 && length <= 65535) {
        var headerLength = Buffer.alloc(2);
        headerLength.writeUInt16BE(length);
        header = Buffer.concat([Buffer.from([0x59]), headerLength]);
    }
    if (length >= 65536 && length <= Math.pow(2, 32) - 1) {
        var headerLength = Buffer.alloc(4);
        headerLength.writeUInt32BE(length);
        header = Buffer.concat([Buffer.from([0x60]), headerLength]);
    }
    return header;
};
exports.encodeSimpleCBOR = function (data) {
    var bufferData = Buffer.from(data, 'hex');
    if (bufferData.length <= 0 || bufferData.length >= Math.pow(2, 32)) {
        throw new Error('data is too large');
    }
    var header = exports.composeHeader(bufferData.length);
    var endcoded = Buffer.concat([header, bufferData]);
    return endcoded.toString('hex');
};
exports.decodeSimpleCBOR = function (data) {
    var dataBuffer = Buffer.from(data, 'hex');
    if (dataBuffer.length <= 0) {
        throw new Error('input data is not valid');
    }
    var header = dataBuffer[0];
    if (header < 0x58) {
        var dataLength = header - 0x40;
        return dataBuffer.slice(1, 1 + dataLength).toString('hex');
    }
    if (header == 0x58) {
        var dataLength = dataBuffer.slice(1, 2).readUInt8();
        return dataBuffer.slice(2, 2 + dataLength).toString('hex');
    }
    if (header == 0x59) {
        var dataLength = dataBuffer.slice(1, 3).readUInt16BE();
        return dataBuffer.slice(3, 3 + dataLength).toString('hex');
    }
    if (header == 0x60) {
        var dataLength = dataBuffer.slice(1, 5).readUInt32BE();
        return dataBuffer.slice(5, 5 + dataLength).toString('hex');
    }
};
//# sourceMappingURL=miniCbor.js.map