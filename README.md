# GoldWallet - A Bitcoin Vault mobile wallet

The first ever Bitcoin Vault wallet.

[![Playstore](https://bluewallet.io/img/play-store-badge.svg)](https://play.google.com/store/apps/details?id=io.goldwallet.wallet)

## Prerequisites

* Node.js v.12.14.1 or greater is required
* For Android: 
    * version 8 of the Java SE Development Kit (JDK)
    * Android SDK
    * Android SDK Platform
    * Android Virtual Device
* For iOS: 
    * Xcode
    * [CocoaPods](https://cocoapods.org/)

There are a few more steps you need to follow, to learn more check [Setting up the development environment · React Native](https://reactnative.dev/docs/environment-setup)

## Installation

```sh
$ git clone https://github.com/bitcoinvault/GoldWallet.git
$ cd GoldWallet
$ yarn install
```

To run iOS app you also need to install Swift project's dependencies:

```sh
$ cd ios
$ pod install
```

To build a release version of the app, you must execute `create-sentry-properties.sh` script with valid Sentry Auth token. But for local development, this step isn't required.

## Running the app

You can launch the Android app in two variants - `prod` and `beta`:

```sh
$ yarn run android:prod
$ yarn run android:beta
```

as well as iOS:

```sh
$ yarn run ios:prod
$ yarn run ios:beta
```

by default, the app runs in `Debug` type which means you must run React packager/server first

```sh
$ yarn start
```

## Testing

To run unit and integration tests:

```bash
$ yarn run test
```

To run [Detox](https://github.com/wix/Detox) (end-to-end) tests, please follow the [Install platform-specific dependencies, tools and dev-kits](https://github.com/wix/Detox/blob/master/docs/Introduction.GettingStarted.md#install-platform-specific-dependencies-tools-and-dev-kits) guideline to make sure you have everything configured correctly. Especially the part about [Android (AOSP) Emulators](https://github.com/wix/Detox/blob/master/docs/Introduction.AndroidDevEnv.md) is important.

Build the app for Detox:

```sh
$ yarn build:detox -- -c ${CONFIGURATION}
```

Start react-native packager:

```sh
$ yarn start:detox
```

And then run the tests:
```sh
$ yarn test:detox -- -c ${CONFIGRURATION} 
```

Check `.detoxrc.json` file to see all available configurations

To control what tests should be executed use the Jest's `-t` flag:

```sh
$ yarn test:detox -- -c ${CONFIGRURATION} -t ${REGEX}
```

## LICENSE

MIT
