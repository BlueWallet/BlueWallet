// Lints loc/*.json for keys whose translated value still equals the English source.
//
// Such "leftovers" mean the translator never localized the string and the entry
// can be removed so the runtime cleanly falls back to en.json. A few categories
// legitimately match English and are skipped:
//
//   1. Pure brand / acronym / unit values (BTC, BIP47, sat/vByte, …).
//   2. Pure format strings whose only non-placeholder content is punctuation
//      or an allowed brand suffix (e.g. "+{amt1} ({amt2})", "{number} BTC").
//   3. Languages listed in LANG_EXCEPTIONS (e.g. Nigerian Pidgin `pcm`,
//      which is English-derived and reuses many English words verbatim).
//   4. Individual keys listed in KEY_EXCEPTIONS that are known to be brand /
//      format strings even when the heuristics above can't tell.
//
// Exit code is non-zero when violations are found so the script can be wired
// into `npm run lint`.

const fs = require('fs');
const path = require('path');

const LOC_DIR = path.join(__dirname, '..', 'loc');
const SOURCE = 'en.json';

// Languages where English-only values are acceptable.
// Pidgin (pcm) is English-derived; many UI labels stay verbatim.
const LANG_EXCEPTIONS = new Set([
  'pcm.json',
]);

// Keys (section.key) that are intentionally identical to English in every
// locale — brand strings, technical labels, or pure-format strings the
// heuristic below can't always recognize.
const KEY_EXCEPTIONS = new Set([
  'transactions.received_with_amount', // "+{amt1} ({amt2})" — pure format
  'multisig.fee_btc',                  // "{number} BTC" — pure format with brand suffix
  'multisig.legacy_title',             // "Legacy" — Bitcoin script type
  'lndViewInvoice.preimage',           // "Pre-image" — Lightning protocol term
  'bip47.bip47_explain_subtitle',      // "BIP47" — protocol identifier
  'units.BTC',
  'units.sats',
  'units.sat_vbyte',
  'units.MAX',
  'transactions.offchain',             // "Offchain" — kept by convention in many locales
  'transactions.onchain',
  // Bitcoin-specific terms often kept English even when surrounding UI is translated.
  // Translators sometimes use these to avoid losing crypto meaning.
  '_.seed',                              // "Seed" — BIP39 mnemonic
  'wallets.import_passphrase',           // "Passphrase" — BIP39 passphrase
  'wallets.import_passphrase_title',
  'wallets.details_master_fingerprint',  // "Master Fingerprint" — BIP32 term
  'wallets.identity_pubkey',             // "Identity Pubkey" — LN term
  'wallets.details_derivation_path',     // "derivation path" — BIP32/44 term
  'wallets.import_derivation_title',     // "Derivation path"
  'wallets.details_multisig_type',       // "multisig"
  'settings.block_explorer',             // "Block Explorer" — Bitcoin tooling
]);

// Single tokens that are legitimate English-equal values (brands, acronyms,
// units, technical loanwords). When the entire string is one of these we
// keep it.
const BRAND_TOKENS = new Set([
  'BTC', 'BIP38', 'BIP39', 'BIP47', 'PSBT', 'XPUB', 'MAX', 'sats',
  'sat/vByte', 'sat/vB', 'RBF', 'CPFP', 'LND', 'LNDhub', 'Electrum',
  'GitHub', 'BlueWallet', 'Bitcoin', 'Lightning', 'Tor', 'Orbot',
  'SilentPayment', 'GroundControl', 'AirDrop', 'iCloud', 'Telegram',
  'Specter', 'Coldcard', 'Pre-image', 'Legacy', 'OK', 'ETA', 'P2SH',
  'PIN', 'QR', 'SSL', 'URL', 'URI', 'MIT', 'JSON', 'CSV', 'HD',
]);

function isAllowedValue(val) {
  if (val == null) return true;
  const trimmed = String(val).trim();
  if (trimmed === '') return true;
  if (BRAND_TOKENS.has(trimmed)) return true;

  // Pure format string: strip placeholders, then strip allowed punctuation /
  // digits, see if only brand tokens remain.
  if (trimmed.includes('{')) {
    const withoutPlaceholders = trimmed.replace(/\{[a-zA-Z0-9_]+\}/g, '').trim();
    if (withoutPlaceholders === '') return true;
    // Split on whitespace; allow leftover punctuation around tokens.
    const tokens = withoutPlaceholders
      .split(/\s+/)
      .map(t => t.replace(/^[^A-Za-z0-9-]+|[^A-Za-z0-9/-]+$/g, ''))
      .filter(Boolean);
    if (tokens.length === 0) return true;
    if (tokens.every(t => BRAND_TOKENS.has(t))) return true;
  }
  return false;
}

function findLeftovers(en, target) {
  const out = [];
  for (const section of Object.keys(en)) {
    const enSec = en[section];
    if (typeof enSec !== 'object' || enSec === null) continue;
    const tSec = target[section];
    if (typeof tSec !== 'object' || tSec === null) continue;
    for (const key of Object.keys(enSec)) {
      if (!(key in tSec)) continue;
      if (tSec[key] !== enSec[key]) continue;
      const fullKey = `${section}.${key}`;
      if (KEY_EXCEPTIONS.has(fullKey)) continue;
      if (isAllowedValue(tSec[key])) continue;
      out.push({ section, key, value: enSec[key] });
    }
  }
  return out;
}

function main() {
  const enPath = path.join(LOC_DIR, SOURCE);
  if (!fs.existsSync(enPath)) {
    console.error(`Cannot find source file: ${enPath}`);
    process.exit(2);
  }
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

  const files = fs.readdirSync(LOC_DIR)
    .filter(f => f.endsWith('.json') && f !== SOURCE)
    .sort();

  let totalViolations = 0;
  const report = [];

  for (const f of files) {
    if (LANG_EXCEPTIONS.has(f)) continue;
    let data;
    try {
      data = JSON.parse(fs.readFileSync(path.join(LOC_DIR, f), 'utf8'));
    } catch (e) {
      console.error(`${f}: parse error — ${e.message}`);
      process.exitCode = 1;
      continue;
    }
    const leftovers = findLeftovers(en, data);
    if (leftovers.length > 0) {
      totalViolations += leftovers.length;
      report.push({ file: f, leftovers });
    }
  }

  if (totalViolations === 0) {
    console.log('OK — no English-leftover values found in localized files.');
    process.exit(0);
  }

  console.log(`Found ${totalViolations} English-leftover value(s) across ${report.length} file(s):\n`);
  for (const { file, leftovers } of report) {
    console.log(`  ${file} (${leftovers.length}):`);
    for (const l of leftovers) {
      const preview = l.value.length > 80 ? l.value.slice(0, 77) + '...' : l.value;
      console.log(`    ${l.section}.${l.key} = ${JSON.stringify(preview)}`);
    }
  }
  console.log(
    '\nRemove these keys from the locale files (so the runtime falls back ' +
    'to en.json), or translate them, or add to KEY_EXCEPTIONS / LANG_EXCEPTIONS ' +
    'in scripts/find-english-leftovers.js if the English match is intentional.'
  );
  process.exit(1);
}

main();
