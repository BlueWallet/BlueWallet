/**
 * Verifies a minisign signature (Ed25519, prehashed "ED" or legacy "Ed") with
 * Node's own crypto, so updating libsodium needs no extra tool.
 *
 *   node minisign-verify.mjs <public key> <file> <file.minisig> [expected file name]
 *
 * With an expected name, the signed (trusted) comment must say `file:<name>`:
 * an older signed tarball served under a newer name is refused.
 */
import { createHash, createPublicKey, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';

const [publicKey, file, signatureFile, expectedName] = process.argv.slice(2);
if (!publicKey || !file || !signatureFile) {
  console.error('usage: minisign-verify.mjs <public key> <file> <file.minisig> [expected file name]');
  process.exit(2);
}

const fail = message => {
  console.error(`signature check failed: ${message}`);
  process.exit(1);
};

const pub = Buffer.from(publicKey, 'base64');
const lines = readFileSync(signatureFile, 'utf8').split(/\r?\n/);
if (pub.length !== 42 || pub.subarray(0, 2).toString() !== 'Ed') fail('not a minisign public key');
if (lines.length < 4 || !lines[2].startsWith('trusted comment: ')) fail('not a minisign signature file');
const signature = Buffer.from(lines[1], 'base64');
const trusted = lines[2].slice('trusted comment: '.length);
const global = Buffer.from(lines[3], 'base64');
if (signature.length !== 74) fail('malformed signature');
if (!pub.subarray(2, 10).equals(signature.subarray(2, 10))) fail('signed with another key');

const key = createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: pub.subarray(10).toString('base64url') }, format: 'jwk' });
const algorithm = signature.subarray(0, 2).toString();
if (algorithm !== 'ED' && algorithm !== 'Ed') fail(`unknown algorithm ${algorithm}`);
const data = readFileSync(file);
const message = algorithm === 'ED' ? createHash('blake2b512').update(data).digest() : data;
if (!verify(null, message, key, signature.subarray(10))) fail('the file does not match its signature');
if (!verify(null, Buffer.concat([signature.subarray(10), Buffer.from(trusted)]), key, global)) fail('the trusted comment was altered');
if (expectedName && !trusted.split('\t').includes(`file:${expectedName}`)) fail(`the signature is for another file (${trusted})`);
console.log(`signature OK (${trusted.replace(/\t/g, ', ')})`);
