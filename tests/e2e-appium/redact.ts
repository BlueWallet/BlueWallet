import * as bip39 from 'bip39';
import fs from 'fs';
import path from 'path';
import { canonicalSeed } from './config';

const SECRET_NAMES = ['HD_MNEMONIC', 'HD_MNEMONIC_BIP84'] as const;

export const secretValues = (): string[] =>
  SECRET_NAMES.flatMap(name => {
    const value = process.env[name]?.trim();
    return value ? [canonicalSeed(name, value)] : [];
  });

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const REPLACER = '[redacted]';

const BIP39_WORD = `(?:${bip39.wordlists.english.join('|')})`;
// Phrases the app generates during a run (createWallet, the backup screens) are unknown in
// advance: redact any 12 or 24 BIP39 words in a row and any numbered word ("1. abandon"), the
// form in which the backup and export screens expose a phrase one static text at a time.
const GENERATED_PATTERNS = [
  `\\b${BIP39_WORD}(?: ${BIP39_WORD}){11}(?:(?: ${BIP39_WORD}){12})?\\b`,
  `\\b\\d{1,2}\\. ${BIP39_WORD}\\b`,
  // Funded cases sign real transactions and stop at the hex: a raw transaction (version 1 or 2,
  // optional segwit marker) or a PSBT is broadcastable and must not leave in a log or XML either.
  '\\b0[12]000000(?:0001)?[0-9a-f]{180,}\\b',
  'cHNidP8[A-Za-z0-9+/]{100,}={0,2}',
  // Animated-QR parts pasted into the scanner backdoor: plain (page source) and as the base64
  // `macos: setClipboard` payload in the server log ("UR:CRYPTO-PSBT/" and "ur:crypto-psbt/").
  '(?:UR:CRYPTO-PSBT|ur:crypto-psbt)/[A-Za-z0-9/-]+',
  '(?:VVI6Q1JZUFRPLVBTQlQv|dXI6Y3J5cHRvLXBzYnQv)[A-Za-z0-9+/]*={0,2}',
];

// The fixtures additionally reach the artifacts as the base64 payload Appium logs for
// `macos: setClipboard` (every pasted mnemonic). The values are canonical seeds (config.ts),
// the form in which the wallet keeps and shows them.
const secretPatterns = (secrets: string[]): string[] => [
  ...secrets.flatMap(value => [escape(value), escape(Buffer.from(value).toString('base64'))]),
  ...GENERATED_PATTERNS,
];

export const redactSecrets = (text: string, secrets: string[]): string =>
  secretPatterns(secrets).reduce((result, pattern) => result.replace(new RegExp(pattern, 'g'), REPLACER), text);

// Appium applies these rules to every server log line as it is written (`--log-filters`), so the
// log never holds a secret, not even when the run is killed before the teardown below.
export const appiumLogFilters = (secrets: string[]): { pattern: string; replacer: string }[] =>
  secretPatterns(secrets).map(pattern => ({ pattern, replacer: REPLACER }));

// Appium's debug log records request bodies; rewrite every server log of this run in place.
export const redactAppiumLogs = (artifactsDir: string, secrets: string[]) => {
  if (!fs.existsSync(artifactsDir)) return;
  for (const name of fs.readdirSync(artifactsDir)) {
    if (!/^appium-\d+\.log$/.test(name)) continue;
    const file = path.join(artifactsDir, name);
    fs.writeFileSync(file, redactSecrets(fs.readFileSync(file, 'utf8'), secrets));
  }
};
