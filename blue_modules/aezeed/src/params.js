"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ONE_DAY = exports.CIPHER_SEED_VERSION = exports.DEFAULT_PASSWORD = exports.PARAMS = void 0;
exports.PARAMS = [
    {
        // version 0
        n: 32768,
        r: 8,
        p: 1,
    },
];
exports.DEFAULT_PASSWORD = 'aezeed';
exports.CIPHER_SEED_VERSION = 0;
exports.ONE_DAY = 24 * 60 * 60 * 1000;
