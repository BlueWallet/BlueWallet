# GoldWallet - A Bitcoin Vault mobile wallet

The first ever Bitcoin Vault wallet.

[![Playstore](https://bluewallet.io/img/play-store-badge.svg)](https://play.google.com/store/apps/details?id=io.goldwallet.wallet)


## BUILD & RUN IT

* In your console:

```
git clone https://github.com/bitcoinvault/GoldWallet.git
cd GoldWallet
npm install
```

* Add files for firebase:

For iOS:
GoogleService-Info.plist into directory /ios/

For android:
google-services.json into directory /android/app/

* Create .env file:

Create .env file in root directory. Check the .env.example file for a template

* To run on Android:

```
npm start android
```

* To run on iOS:

```
cd ios
pod install
cd ..
npm start ios
```

## Testing

To run unit and integration tests:

```bash
npm run test
```

To run [Detox](https://github.com/wix/Detox) (end-to-end) tests, please follow the [Install platform-specific dependencies, tools and dev-kits](https://github.com/wix/Detox/blob/master/docs/Introduction.GettingStarted.md#install-platform-specific-dependencies-tools-and-dev-kits) guideline to make sure you have everything configured correctly. Especially the part about [Android (AOSP) Emulators](https://github.com/wix/Detox/blob/master/docs/Introduction.AndroidDevEnv.md) is important.

At first, you need to install `detox-cli` globally:

```sh
npm install -g detox-cli
```

Once it's done, build the app:

```sh
detox build -c ${CONFIGURATION}
```

Start react-native packager:

```sh
npm run start
```

And then run the tests:
```sh
detox test -c ${CONFIGRURATION} 
```

Whether you want to test Beta version (testnet) or Prod version (mainnet) of the app, use one of the following configurations:

- Prod: `android.emu.prod`, `ios.sim.prod`

- Beta: `android.emu.beta`, `ios.sim.beta`

To control what tests should be executed use the Jest's `-t` flag:

```sh
detox test -c ${CONFIGRURATION} -t ${REGEX}
```


## LICENSE

MIT






**Make sure that firewall doesn't block local TCP/UDP communication. If tests execution stuck on launching, it might be the case.**

https://stackoverflow.com/questions/62094629/emulator-emulator-error-adbhostserver-cpp102-unable-to-connect-to-adb-daemo