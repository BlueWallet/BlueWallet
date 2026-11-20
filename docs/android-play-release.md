# Android APK signing

Android releases use BlueWallet's self-managed **app-signing key**. The
keystore is owned by BlueWallet and stored only as an encrypted file in the
existing private Apple Match repository. The application repository never
contains the unencrypted keystore or any signing password.

Release APKs are signed by BlueWallet. The signing key is never uploaded to a
third party.

## One-time Match repository setup

Use the same private repository configured by the existing `GIT_URL` secret.
Add this Android-specific directory beside the Match certificates and profiles:

```text
android/
  bluewallet-upload.jks.enc
  bluewallet-upload-cert.pem
  signing-manifest.json
  README.md
```

Keep the original `bluewallet-upload.jks` in offline encrypted backups under
the maintainer's control. Do not add it to either Git repository.

Create `android/signing-manifest.json` with the known certificate fingerprint:

```json
{
  "applicationId": "io.bluewallet.bluewallet",
  "keyAlias": "REPLACE_WITH_THE_LEGACY_KEY_ALIAS",
  "sha256": "REPLACE_WITH_64_CHARACTER_UPPERCASE_SHA256",
  "purpose": "Google Play app signing"
}
```

Get the fingerprint before encrypting the keystore. The value in the manifest
must omit colons:

```sh
keytool -list -v -keystore bluewallet-upload.jks -storepass:env KEYSTORE_PASSWORD
```

Export the public certificate for audit and Play Console comparison:

```sh
keytool -exportcert -rfc -keystore bluewallet-upload.jks \
  -storepass:env KEYSTORE_PASSWORD \
  -alias "<key alias from signing-manifest.json>" \
  -file android/bluewallet-upload-cert.pem
```

Encrypt the keystore with `ANDROID_SIGNING_DECRYPTION_PASSWORD`. The iteration
count must remain `600000`, because Fastlane uses the same parameters to
decrypt it:

```sh
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 600000 \
  -in bluewallet-upload.jks \
  -out android/bluewallet-upload.jks.enc \
  -pass env:ANDROID_SIGNING_DECRYPTION_PASSWORD
```

Commit only the encrypted keystore, certificate, manifest, and non-secret
README to the private Match repository.

## GitHub Actions secrets

The caller explicitly passes these existing repository secrets to the reusable
APK workflow. No new GitHub secrets, environments, or configuration variables
are required:

| Name | Value |
| --- | --- |
| `GIT_URL` | Existing private Apple Match repository URL |
| `GIT_ACCESS_TOKEN` | Existing token with read access to that repository |
| `MATCH_PASSWORD` | Existing Apple Match password; decrypts the encrypted Android keystore file |
| `KEYSTORE_PASSWORD` | Separate existing password that unlocks the keystore and its private-key entry |

The application repository pins the public signing certificate SHA-256 in
`ANDROID_SIGNING_SHA256`. An intentional key change requires reviewing this pin
alongside the Match manifest. Gradle does not inherit the Match access token or
keystore decryption password.

The workflow maps `MATCH_PASSWORD` to Fastlane's
`ANDROID_SIGNING_DECRYPTION_PASSWORD` environment variable. `KEYSTORE_PASSWORD`
remains separate and unlocks the decrypted keystore for signing. Both are
existing repository secrets. No single-password conversion is required.

Both the caller and the reusable signing job restrict production signing to
master pushes and manual runs on master. Protect master and review workflow
changes: repository secrets are accessible to other workflows authorized to
use them. Untrusted PR code must never receive the production signing key or
Match access token.

Master pushes and manual Apple Release runs on master produce the
production-signed artifact. PR builds do not receive production signing secrets.

## Building a signed APK

`BuildReleaseApk` decrypts and verifies the app-signing key in a temporary
directory, then publishes the verified signed APK as the `signed-apk` GitHub
Actions artifact. It never uploads the APK to Google Play or any other store.

For a local signed build, supply the same signing credentials in your shell and
run:

```sh
bundle exec fastlane android build_release_apk build_number:123456
```

## Key checks, recovery, and rotation

Fastlane compares the decrypted keystore's SHA-256 certificate fingerprint to
`android/signing-manifest.json` before building. A mismatch stops the release.

If the app-signing key is lost or compromised, publishing updates to the
existing app can become impossible. Keep secured offline backups and do not
replace this key without a dedicated app migration plan.
