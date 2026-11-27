# Security

## Reporting a vulnerability

Do not open a public issue for a vulnerability. The project's private reporting channel has not
been published here yet. Until it is, contact the NeuraiWallet maintainers privately and do not
include seeds, private keys or other wallet data in the report.

## What protects the wallets

| Asset | Where it lives | Protection |
| --- | --- | --- |
| Recovery words and passphrase (software wallets) | The `data` entry of the platform secure store, plus an encrypted Realm copy in the app's cache directory | Android Keystore or iOS Keychain (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`). Optionally the app password (argon2id and XChaCha20-Poly1305; stores from older versions keep CryptoJS AES until upgraded, see below). The Realm copy uses a random 64-byte key kept in the Keychain or Keystore. |
| Hardware wallet seed | The ESP32 signer | Passes through the phone's memory only while a device is set up (see below). Never stored by the app. |
| Neurai Connect session keys | Secure store (`NEURAI_CONNECT_*`) | Same as the wallet store. |
| C7 private journal | App documents directory | Encrypted by `@neuraiproject/neurai-privacy` with a key derived from the wallet words. |
| Push token, node settings, UI preferences | AsyncStorage or DefaultPreference | Not secret. Never logged together with wallet data. |

The JavaScript layer handles the recovery words of software wallets in memory to derive keys and
sign. Anything that can run code in the app process can read them. The words never go to a
server, a log or a notification.

Hardware wallets (ESP32) involve the phone in three different ways:

- **Setting up a device** (new or restored, `screen/wallets/AddHardwareWallet.tsx`). The phone
  either generates the words with the platform RNG and shows them for the backup, or receives
  them typed by the user. It holds them in screen state only, on a screen protected against
  capture, and sends them over USB (`setupSeed`). The user approves on the device, and the app
  then drops its copy. The words are never written to storage. While setup runs, the phone is
  as trusted as for a software wallet.
- **Pairing a device that is already set up.** Only public data crosses: the address, the public
  key, the master fingerprint and, for legacy wallets, the account xpub.
- **Storing and signing.** The app stores the public data above. Transactions are signed on the
  device after the user approves them there.

## Trust boundaries

- **Backends** (wallet WSS service, JSON-RPC, DePIN) are not trusted for amounts or ownership
  beyond what the app can check. Monetary values are parsed as exact integers. The WSS service is
  pinned to the expected genesis per network. A user-set node is honoured from the first
  connection.
- **Cleartext**: `ws://` is accepted only for 192.168.0.x and 192.168.1.x, the same hosts
  `network_security_config.xml` lets through on Android (debug builds add the development
  machine for Metro). Everything else needs TLS. A DePIN server saved by an older version on a
  host now refused is not swapped for another node: DePIN stays paused until the user changes it.
- **Hardware device**: the app checks the signed transaction against the reviewed draft before
  broadcasting it. Only signatures may differ.
- **Connect relay**: sees encrypted blobs and topics only. Sites never get the app to broadcast.
- **Home screen widgets (Android)**: "Neurai Price" and "Neurai Market" fetch the public XNA
  market data from CoinGecko (`ids=neurai`, the source the app uses for its rate) over TLS with
  platform trust, at most every 15 minutes and only while a widget is placed. The request carries
  the currency code only; they read and hold no wallet data.

## Storage rules

These rules are what keeps a failure from turning into a loss. The tests in
`tests/unit/storage-safety.test.ts` exercise each one.

1. A store that cannot be read stays locked ("Try again" or "Start fresh"). It is never treated as
   an empty install, which a later save would turn into a real loss.
2. Nothing is written before a complete load.
3. A save that did not reach the secure store is reported, and the screen does not claim success.
4. A session writes only the encrypted bucket it opened, after checking that it still opens with
   the session password. A bucket keeps its format on every save; only the user's upgrade moves
   it to the new one, and a new password that already opens another bucket is refused.
5. Removing the password is refused while another encrypted bucket exists.
6. Records this version cannot read are kept as they are.
7. "Start fresh" also deletes the Realm copy and every older backup it owns, so old wallets
   cannot come back. Its commit is the empty secure store: a reset reported as failed leaves
   everything as it was, and one cut short is finished or undone on the next start, according to
   whether the store or the backup carries its token. While that token cannot be read (a read
   error, or an encrypted copy not opened yet), its copies stay tied to it and are not offered. If
   both were lost for certain, its copies are kept and only offered for an explicit choice; the
   same when the user opens the store with its password and the store is damaged. It touches only
   files it recognizes by full name.
   Known limit: going back to a version older than this one drops the token on its first save,
   so a reset whose cleanup was still pending is then undone instead of finished, and its copies
   come back as copies set aside.
8. A backup is restored only on the user's request, from the copy the user picked (copies are
   compared and identified by content, not by file date or position), and only after what an
   ordinary unlock would ask: biometrics when they are on or the setting cannot be read, or the
   backup's password. If the chosen content changed meanwhile, nothing is restored.
9. A restore never writes over a copy the user did not choose: that file is renamed aside first,
   or the restore stops. A copy that could not be read keeps the other from opening on its own.
   A restore never replaces a secure store that reads and opens again by the time it is written,
   nor one that changed since the restore was offered. When a password opens a damaged part of a
   store, the restore replaces only that part, under that password; other password-protected
   parts stay, and the store as it was is kept aside first. A backup copy only partly imported is
   kept whole too. Outside "Start fresh", no backup file is ever deleted.
10. A failure of the biometric sensor never turns the biometrics setting off.

## Known limits

- **App-password encryption.** A password set with this version, and an older store the user
  upgrades (offered after each unlock and in Settings › Security), uses the `nw2:` format
  (`blue_modules/encryption.ts`): argon2id (64 MiB, 3 passes) and XChaCha20-Poly1305 from
  libsodium (`android/walletcrypto`), with the parameters authenticated in each bucket. It makes
  each guess cost a phone about 0.2 s and 64 MiB, but cannot save a short password. A store not
  upgraded yet keeps CryptoJS AES-CBC with the OpenSSL key derivation (MD5, one iteration) and no
  authentication, which adds little against an offline guess of a weak password. The platform
  secure store stays the main protection.
  The upgrade does not rewrite copies set aside by earlier restores or resets (`.kept-*` and the
  Documents copy): they keep the old format and the old password until "Start fresh", and the
  upgrade window says so when the phone has any. The session keeps the password (old-format
  buckets and turning the password off need it) and the key of the bucket it opened; a wrong
  attempt leaves no key behind, and removing the password or "Start fresh" drops the key. iOS has no
  native module yet and reads and writes the old format only. No version older than the first
  one that writes `nw2:` can open an upgraded store: never publish below it.
- **Silent payments** send in two transactions. Both are saved in the wallet before the first is
  sent; if the app dies between them, the coins wait at the wallet's own bridge address and the
  home offers to finish the payment with the same transactions (H17).
- **Apple targets** are not shipped. Before they are, the Watch bridge must stop sending the
  recovery words (it uses `getXpub() || getSecret()`), and the Bugsnag key inherited from
  BlueWallet must be removed from the three plists.

## Logging

Logs never include recovery words, keys, push tokens, request bodies, addresses or full wallet
objects. `describeNotification` and `describeRequest` are the only way pushes and HTTP requests
reach a log.
