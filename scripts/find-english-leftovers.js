// Lints loc/*.json for keys whose translated value still equals the English source.
//
// Such "leftovers" usually mean the translator never localized the string and the
// entry can be removed so the runtime cleanly falls back to en.json. A few
// categories legitimately match English and are skipped:
//
//   1. Pure brand / acronym / unit values (BTC, BIP47, sat/vByte, …).
//   2. Pure format strings whose only non-placeholder content is punctuation
//      or an allowed brand suffix (e.g. "+{amt1} ({amt2})", "{number} BTC").
//   3. Languages listed in LANG_EXCEPTIONS:
//      - `pcm` (Nigerian Pidgin) is English-derived; many UI labels stay verbatim.
//      - `da_dk` / `nl_nl` — master human translations + per-locale glossary
//        mandate English crypto loanwords throughout (Wallet, Multisig Vault,
//        Coin Control, Payment Code, mempool, watch-only, hardware wallet, …).
//        Flagging these would produce noise, not signal — they are intentional.
//   4. Individual keys listed in KEY_EXCEPTIONS that are intentionally identical
//      to English in many (≥5) locales: brand-style compounds, technical units,
//      universal short labels (ID/Port/Status/time abbreviations).
//
// Exit code is non-zero when violations are found so the script can be wired
// into `npm run lint`.

const fs = require('fs');
const path = require('path');

const LOC_DIR = path.join(__dirname, '..', 'loc');
const SOURCE = 'en.json';

const LANG_EXCEPTIONS = new Set([
  'pcm.json',     // Pidgin English — reuses English words verbatim
  'da_dk.json',   // Danish — master prefers English crypto loanwords
  'nl_nl.json',   // Dutch — master 55% English, glossary explicitly loanword
]);

// Keys (section.key) intentionally identical to English in many locales.
// Grouped by reason: brand/protocol, pure-format, universal short labels,
// Bitcoin-specific technical terms.
const KEY_EXCEPTIONS = new Set([
  // --- Pure format strings (placeholders + punctuation only) ---
  'transactions.received_with_amount',   // "+{amt1} ({amt2})"
  'transactions.list_conf',              // "Conf: {number}"
  'transactions.details_inputs_count',   // "Inputs ({count})"
  'transactions.details_outputs_count',  // "Outputs ({count})"
  'transactions.confirmations_lowercase',// "{confirmations} confirmations"
  'multisig.fee',                        // "Fee: {number}"
  'multisig.fee_btc',                    // "{number} BTC"
  'multisig.what_is_vault_numberOfWallets', // " {m}-of-{n} multisig "

  // --- Brand / protocol / acronym strings ---
  'lndViewInvoice.preimage',             // "Pre-image" — Lightning protocol term
  'lndViewInvoice.sats',                 // "sats." — unit suffix
  'bip47.bip47_explain_subtitle',        // "BIP47"
  'multisig.legacy_title',               // "Legacy" — Bitcoin script type
  'settings.general_continuity',         // "Continuity" — Apple feature brand
  'units.BTC',
  'units.sats',
  'units.sat_vbyte',
  'units.MAX',

  // --- Bitcoin/Lightning technical terms often kept English ---
  '_.seed',                              // "Seed" — BIP39 mnemonic
  'wallets.import_passphrase',           // "Passphrase" — BIP39
  'wallets.import_passphrase_title',
  'wallets.details_master_fingerprint',  // "Master Fingerprint" — BIP32
  'wallets.identity_pubkey',             // "Identity Pubkey" — LN
  'wallets.details_derivation_path',     // "derivation path" — BIP32/44
  'wallets.import_derivation_title',     // "Derivation path"
  'wallets.details_multisig_type',       // "multisig"
  'wallets.xpub_title',                  // "Wallet XPUB"
  'settings.block_explorer',             // "Block Explorer"
  'transactions.offchain',               // "Offchain"
  'transactions.onchain',                // "Onchain"
  'transactions.details_tx_hex',         // "Tx Hex"
  'multisig.multisig_vault',             // "Multisig Vault" — brand-style compound
  'multisig.default_label',              // "Multisig Vault"
  'multisig.quorum_header',              // "Quorum"
  'cc.header',                           // "Coin Control"
  'bip47.payment_code',                  // "Payment Code"
  'bip47.notif_tx',                      // "Notification transaction"

  // --- Universal short UI labels / technical units (≥5 locales) ---
  'transactions.details_id',             // "ID" — 42+ locales
  '_.port',                              // "Port"
  '_.ssl_port',                          // "SSL Port"
  '_.clipboard',                         // "Clipboard"
  '_.no',                                // "No" — Romance cognate
  'settings.electrum_status',            // "Status"
  'cc.sort_status',                      // "Status"
  'settings.widgets',                    // "Widgets"
  'send.fee_10m',                        // "10m" — time abbrev
  'send.fee_3h',                         // "3h"
  'send.fee_1d',                         // "1d"
  'send.fee_satvbyte',                   // "in sat/vByte"
  'send.create_satoshi_per_vbyte',       // "Satoshi per vByte"
  'send.create_details',                 // "Details"
  'send.input_total',                    // "Total:"
  'send.create_memo',                    // "Memo" — loanword in many locales
  'send.dynamic_start',                  // "Start"
  'send.dynamic_stop',                   // "Stop"
  'send.broadcastError',                 // "Error"
  'errors.error',                        // "Error"
  'multisig.header',                     // "Send"
  'transactions.details_section',        // "Details"
  'transactions.details_explorer',       // "explorer"
  'transactions.date',                   // "Date"
  'transactions.details_note',           // "Note"
  'transactions.transaction',            // "Transaction"
  'transactions.details_title',          // "Transaction"
  'receive.details_label',               // "Description"
  'settings.general',                    // "General"
  'settings.notifications',              // "Notifications"
  'settings.password',                   // "Password"
  'settings.privacy',                    // "Privacy"
  'settings.plausible_deniability',      // "Plausible Deniability"
  'plausibledeniability.title',          // "Plausible Deniability"
  'wallets.details_title',               // "Wallet" — de_de loanword
  'wallets.list_title',                  // "Wallets"
  'wallets.wallets',                     // "Wallets"
  'wallets.add_wallet_type',             // "Type"
  'wallets.details_type',                // "Type"
  'wallets.add_entropy',                 // "Entropy"
  'entropy.title',                       // "Entropy"
  'cc.sort_label',                       // "Label"
  'addresses.sign_placeholder_message',  // "Message"
  'addresses.sign_placeholder_signature',// "Signature"
  'addresses.transactions',              // "Transactions"
  'bip47.contacts',                      // "Contacts"
]);

// Single tokens that are legitimate English-equal values (brands, acronyms,
// units, technical loanwords). When the entire string is one of these we keep it.
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
