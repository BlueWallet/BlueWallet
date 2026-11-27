/**
 * Runs the host build of a libsodium copy (vectors.c) on the `nw2:` vectors
 * the app's tests pin, and fails if any key or sealed bucket differs.
 *
 *   node check-vectors.mjs <vectors binary> <fixture json>
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const [binary, fixturePath] = process.argv.slice(2);
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const hex = base64url => Buffer.from(base64url, 'base64url').toString('hex');
let failures = 0;
for (const vector of fixture.vectors) {
  const dot = vector.bucket.indexOf('.');
  const aad = vector.bucket.slice(0, dot);
  const body = vector.bucket.slice(dot + 1);
  const out = execFileSync(binary, [vector.password, hex(fixture.salt), hex(fixture.nonce), String(vector.t), String(vector.m), aad, vector.plaintext]).toString();
  const key = /key=([0-9a-f]+)/.exec(out)?.[1];
  const ct = /ct=([0-9a-f]+)/.exec(out)?.[1];
  const ok = key === hex(vector.key) && ct === hex(body);
  if (!ok) failures++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} argon2id t=${vector.t} m=${vector.m} KiB, XChaCha20-Poly1305 bucket`);
}
if (failures) {
  console.error(`${failures} vector(s) differ: this libsodium does not compute what the app's stores were written with`);
  process.exit(1);
}
