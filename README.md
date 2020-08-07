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


## TESTS

```bash
npm run test
```


## LICENSE

MIT
