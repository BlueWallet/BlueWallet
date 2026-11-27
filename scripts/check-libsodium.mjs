/**
 * The libsodium copy in android/walletcrypto must be exactly the files of a
 * signed release that SHA256SUMS lists, and nothing else (besides LICENSE,
 * README.md and SHA256SUMS). Run by `npm run lint`.
 *
 *   node scripts/check-libsodium.mjs            check
 *   node scripts/check-libsodium.mjs --write    regenerate SHA256SUMS (scripts/update-libsodium.sh)
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const write = args.includes('--write');
const dir = args.find(arg => !arg.startsWith('--')) ?? join(root, 'android/walletcrypto/src/main/cpp/libsodium');
const OWN = new Set(['LICENSE', 'README.md', 'SHA256SUMS']);

function filesUnder(base, at = base) {
  return readdirSync(at).flatMap(name => {
    const path = join(at, name);
    return statSync(path).isDirectory() ? filesUnder(base, path) : [relative(base, path).split(sep).join('/')];
  });
}
const sha256 = path => createHash('sha256').update(readFileSync(path)).digest('hex');

const present = filesUnder(dir)
  .filter(file => !OWN.has(file))
  .sort();

if (write) {
  writeFileSync(join(dir, 'SHA256SUMS'), present.map(file => `${sha256(join(dir, file))}  ${file}\n`).join(''));
  console.log(`SHA256SUMS written: ${present.length} files`);
  process.exit(0);
}

const problems = [];
const listed = new Map(
  readFileSync(join(dir, 'SHA256SUMS'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [hash, file] = line.split(/\s+/, 2);
      return [file, hash];
    }),
);
for (const [file, hash] of listed) {
  if (!existsSync(join(dir, file))) problems.push(`missing: ${file}`);
  else if (sha256(join(dir, file)) !== hash) problems.push(`changed: ${file}`);
}
for (const file of present) if (!listed.has(file)) problems.push(`not in SHA256SUMS: ${file}`);
if (!existsSync(join(dir, 'LICENSE'))) problems.push('missing: LICENSE');

if (problems.length) {
  console.error('The libsodium copy differs from its signed release (android/walletcrypto/src/main/cpp/libsodium):');
  for (const problem of problems) console.error(`  ${problem}`);
  console.error('Do not edit these files; update them with scripts/update-libsodium.sh <version>.');
  process.exit(1);
}
console.log(`libsodium copy intact: ${listed.size} files match SHA256SUMS`);
