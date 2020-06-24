"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractSingleWorkload = exports.decodeUR = void 0;
var utils_1 = require("./utils");
var miniCbor_1 = require("./miniCbor");
var bc_bech32_1 = require("bc-bech32");
var checkAndGetSequence = function (sequence) {
    var pieces = sequence.toUpperCase().split('OF');
    if (pieces.length !== 2)
        throw new Error("invalid sequence: " + sequence);
    var index = pieces[0], total = pieces[1];
    return [+index, +total];
};
var checkDigest = function (digest, payload) {
    if (bc_bech32_1.decodeBc32Data(digest) !== utils_1.sha256Hash(Buffer.from(bc_bech32_1.decodeBc32Data(payload), 'hex')).toString('hex')) {
        throw new Error("invalid digest: \n digest:" + digest + " \n payload:" + payload);
    }
};
var checkURHeader = function (UR, type) {
    if (type === void 0) { type = 'bytes'; }
    if (UR.toUpperCase() !== ("ur:" + type).toUpperCase())
        throw new Error("invalid UR header: " + UR);
};
var dealWithSingleWorkload = function (workload, type) {
    if (type === void 0) { type = 'bytes'; }
    var pieces = workload.split('/');
    switch (pieces.length) {
        case 2: {
            //UR:Type/[Fragment]
            checkURHeader(pieces[0], type);
            return pieces[1];
        }
        case 3: {
            //UR:Type/[Digest]/[Fragment] when Sequencing is omitted, Digest MAY be omitted;
            //should check digest
            checkURHeader(pieces[0], type);
            var digest = pieces[1];
            var fragment = pieces[2];
            checkDigest(digest, fragment);
            return fragment;
        }
        case 4: {
            //UR:Type/[Sequencing]/[Digest]/[Fragment]
            //should check sequencing and digest
            checkURHeader(pieces[0], type);
            checkAndGetSequence(pieces[1]);
            var digest = pieces[2];
            var fragment = pieces[3];
            checkDigest(digest, fragment);
            return fragment;
        }
        default:
            throw new Error("invalid workload pieces length: expect 2 / 3 / 4 bug got " + pieces.length);
    }
};
var dealWithMultipleWorkloads = function (workloads, type) {
    if (type === void 0) { type = 'bytes'; }
    var length = workloads.length;
    var fragments = new Array(length).fill('');
    var digest = '';
    workloads.forEach(function (workload) {
        var pieces = workload.split('/');
        checkURHeader(pieces[0], type);
        var _a = checkAndGetSequence(pieces[1]), index = _a[0], total = _a[1];
        if (total !== length)
            throw new Error("invalid workload: " + workload + ", total " + total + " not equal workloads length " + length);
        if (digest && digest !== pieces[2])
            throw new Error("invalid workload: " + workload + ", checksum changed " + digest + ", " + pieces[2]);
        digest = pieces[2];
        if (fragments[index - 1])
            throw new Error("invalid workload: " + workload + ", index " + index + " has already been set");
        fragments[index - 1] = pieces[3];
    });
    var payload = fragments.join('');
    checkDigest(digest, payload);
    return payload;
};
var getBC32Payload = function (workloads, type) {
    if (type === void 0) { type = 'bytes'; }
    try {
        var length_1 = workloads.length;
        if (length_1 === 1) {
            return dealWithSingleWorkload(workloads[0], type);
        }
        else {
            return dealWithMultipleWorkloads(workloads, type);
        }
    }
    catch (e) {
        throw new Error("invalid workloads: " + workloads + "\n " + e);
    }
};
exports.decodeUR = function (workloads, type) {
    if (type === void 0) { type = 'bytes'; }
    var bc32Payload = getBC32Payload(workloads, type);
    var cborPayload = bc_bech32_1.decodeBc32Data(bc32Payload);
    return miniCbor_1.decodeSimpleCBOR(cborPayload);
};
exports.extractSingleWorkload = function (workload) {
    var pieces = workload.toUpperCase().split('/');
    switch (pieces.length) {
        case 2: //UR:Type/[Fragment]
        case 3: {
            //UR:Type/[Digest]/[Fragment] when Sequencing is omitted, Digest MAY be omitted;
            return [1, 1];
        }
        case 4: {
            //UR:Type/[Sequencing]/[Digest]/[Fragment]
            return checkAndGetSequence(pieces[1]);
        }
        default:
            throw new Error("invalid workload pieces length: expect 2 / 3 / 4 bug got " + pieces.length);
    }
};
//# sourceMappingURL=decodeUR.js.map