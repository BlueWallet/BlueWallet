# BlueWallet - A Bitcoin & Lightning Wallet

[![GitHub tag](https://img.shields.io/badge/dynamic/json.svg?url=https://raw.githubusercontent.com/BlueWallet/BlueWallet/master/package.json&query=$.version&label=Version)](https://github.com/BlueWallet/BlueWallet)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
![](https://img.shields.io/github/license/BlueWallet/BlueWallet.svg)

Thin Bitcoin Wallet.
Built with React Native and Electrum.

[![Appstore](https://bluewallet.io/uploads/app-store-badge-blue.svg)](https://itunes.apple.com/us/app/bluewallet-bitcoin-wallet/id1376878040?l=ru&ls=1&mt=8)
[![Playstore](https://bluewallet.io/uploads/play-store-badge-blue.svg)](https://play.google.com/store/apps/details?id=io.bluewallet.bluewallet)

Website: [bluewallet.io](https://bluewallet.io)

Community: [telegram group](https://t.me/bluewallet)

* Private keys never leave your device
* Lightning Network supported
* SegWit-first. Replace-By-Fee support
* Encryption. Plausible deniability
* And many more [features...](https://bluewallet.io/features)


<img src="https://i.imgur.com/hHYJnMj.png" width="100%">


## BUILD & RUN IT

Please refer to the engines field in package.json file for the minimum required versions of Node and npm. It is preferred that you use an even-numbered version of Node as these are LTS versions.

To view the version of Node and npm in your environment, run the following in your console:

```
node --version && npm --version
```

* In your console:

```
git clone https://github.com/BlueWallet/BlueWallet.git
cd BlueWallet
npm install
```

Please make sure that your console is running the most stable versions of npm and node (even-numbered versions).

* To build and run in Android Studio:

1. Install Java 17 or select Android Studio's bundled JDK in **Settings → Build, Execution, Deployment → Build Tools → Gradle**. Use the project's Gradle wrapper.
2. In SDK Manager, install Android SDK Platform 36, Build Tools 36.0.0, NDK 28.2.13676358, and CMake 3.22.1. Gradle may offer to install missing SDK components.
3. Run `npm ci` in the repository root. Quit Android Studio if it is already running, then run `npm run android:studio`. This opens the `android/` project with Node on its PATH, including when Node is installed through nvm. If Studio is installed elsewhere, set `ANDROID_STUDIO_BIN` to its executable path.
4. Let Gradle sync finish. In **Build Variants**, select **standalone** for the `app` module. This variant bundles JavaScript, uses local debug signing, and runs without Metro.
5. Select the **app** run configuration and a phone or tablet in Device Manager, then click **Run**. To generate an APK, use **Build → Generate App Bundles or APKs → Generate APKs**. The standalone APK is written to `android/app/build/outputs/apk/standalone/app-standalone.apk`.

The standalone variant is for local development; production release signing is configured separately. To use Fast Refresh, select **debug**, run `npm start` in a terminal, and run `adb reverse tcp:8081 tcp:8081` for a USB-connected device.

The command-line workflow remains available:

```
npx react-native run-android
```

* To run on iOS:

```
npx pod-install
npm start
```

In another terminal window within the BlueWallet folder:
```
npx react-native run-ios
```
**To debug BlueWallet on the iOS Simulator, you must choose a Rosetta-compatible iOS Simulator. This can be done by navigating to the Product menu in Xcode, selecting Destination Architectures, and then opting for "Show Both." This action will reveal the simulators that support Rosetta.
**

* To run on macOS using Mac Catalyst:

```
npx pod-install
npm start
```

Open ios/BlueWallet.xcworkspace. Once the project loads, select the scheme/target BlueWallet. Click Run.

## TESTS

```bash
npm run test
```


## LICENSE

MIT

## WANT TO CONTRIBUTE?

Grab an issue from [the backlog](https://github.com/BlueWallet/BlueWallet/issues), try to start or submit a PR, any doubts we will try to guide you. Contributors have a private telegram group, request access by email bluewallet@bluewallet.io

## Translations

We accept translations via [Transifex](https://explore.transifex.com/bluewallet/bluewallet/)

To participate you need to:
1. Sign up to Transifex
2. Find BlueWallet project
3. Send join request
4. After we accept your request you will be able to start translating! That's it!

Please note the values in curly braces should not be translated. These are the names of the variables that will be inserted into the translated string. For example, the original string `"{number} of {total}"` in Russian will be `"{number} из {total}"`.

Transifex automatically creates Pull Request when language reaches 100% translation. We also trigger this by hand before each release, so don't worry if you can't translate everything, every word counts.

### Vocabulary glossaries

[`loc/vocabulary.md`](loc/vocabulary.md) + the per-language files under [`loc/vocabulary/`](loc/vocabulary/) are the canonical glossary of Bitcoin/Lightning terms (Wallet, Vault, Seed, Mnemonic, Passphrase, Multisig, Payment Code, Coin Control, …) and their chosen rendering in each locale, with the reasoning behind each choice and ⚠️ anti-meaning callouts (e.g. Passcode ≠ Password, Change-output ≠ verb "to change"). Use them as ground truth when translating by hand or when feeding `loc/<lang>.json` to an LLM — terminology consistency across screens is the difference between "looks translated" and "is correct for a Bitcoin wallet". When you change a shipped string, update the matching row in the same PR.

## Q&A

Builds automated and tested with BrowserStack

<a href="https://www.browserstack.com/"><img src="https://i.imgur.com/syscHCN.png" width="160px"></a>

Bugs reported via BugSnag

<a href="https://www.bugsnag.com"><img src="https://images.typeform.com/images/QKuaAssrFCq7/image/default" width="160px"></a>


## RESPONSIBLE DISCLOSURE

Found critical bugs/vulnerabilities? Please email them bluewallet@bluewallet.io
Thanks!
