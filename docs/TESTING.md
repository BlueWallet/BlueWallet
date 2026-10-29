# Testing BlueWallet

Run commands from the repository root unless a section says otherwise. Use the Node and Ruby versions declared by the repository, install Java 17 for Android, and select the current stable Xcode for Apple builds.

## Shared JavaScript and TypeScript

Install dependencies once:

```sh
npm ci
```

Run the same layers used by continuous integration:

```sh
npm run lint
npm run unit
npm run integration
```

Run the complete local suite with:

```sh
npm test
```

For the native image-share registration regression tests only:

```sh
npx jest tests/unit/app-shortcuts-native-config.test.ts --runInBand --no-watchman
```

## Android

Compile the app's Kotlin sources:

```sh
cd android
./gradlew :app:compileDebugKotlin
```

With an emulator or device connected, run the image-share instrumentation tests:

```sh
cd android
./gradlew :app:connectedDebugAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.class=io.bluewallet.bluewallet.ImageShareIntentUiTest
```

The instrumentation suite covers cold-start image sharing, sharing into an already-running app, and rejection of non-image `ACTION_SEND` intents. Run the full Detox workflow with:

```sh
npm run e2e:debug-build
npm run e2e:debug-test
```

CI builds release app and test APKs, runs `ImageShareIntentUiTest` with AndroidX Test, and then runs Detox on an API 36 emulator.

## iOS and iPadOS

Install pods and build against an iOS Simulator:

```sh
bundle exec fastlane ios install_pods
xcodebuild \
  -workspace ios/BlueWallet.xcworkspace \
  -scheme BlueWallet \
  -configuration Debug \
  -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO \
  build
```

Run the existing Detox suite with:

```sh
npm run e2e:build:ios-release
npm run e2e:test:ios-release
```

Run the native iOS UI tests from Xcode with the `BlueWallet` scheme, or seed a booted simulator and run them from the command line:

```sh
xcrun simctl addmedia booted img/qr-code.png
xcodebuild \
  -workspace ios/BlueWallet.xcworkspace \
  -scheme BlueWallet \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro' \
  -only-testing:BlueWalletUITests \
  test
```

The image-share UI test opens an image in Photos and verifies that BlueWallet is offered as a share service. The target supports local iOS and Mac Catalyst runs. CI intentionally runs this test only against an iPhone simulator.

Validate the Share Extension in isolation with:

```sh
xcodebuild \
  -project ios/BlueWallet.xcodeproj \
  -scheme ShareExtension \
  -configuration Debug \
  -sdk iphonesimulator \
  -derivedDataPath /tmp/bluewallet-share-extension-derived-data \
  CODE_SIGNING_ALLOWED=NO \
  build
```

## Mac Catalyst

Build the app and embedded extensions for Mac Catalyst through Fastlane:

```sh
bundle exec fastlane ios build_catalyst_app_lane
```

For a signing-free compile check of the Share Extension:

```sh
xcodebuild \
  -project ios/BlueWallet.xcodeproj \
  -scheme ShareExtension \
  -configuration Debug \
  -destination 'platform=macOS,variant=Mac Catalyst' \
  -derivedDataPath /tmp/bluewallet-share-extension-catalyst-derived-data \
  CODE_SIGNING_ALLOWED=NO \
  build
```

## Apple signing and provisioning

The Share Extension bundle identifier is `io.bluewallet.bluewallet.ShareExtension`. It needs the `group.io.bluewallet.bluewallet` App Group on both iOS and Mac Catalyst profiles.

Use the repository lanes rather than editing Xcode signing settings manually:

```sh
bundle exec fastlane ios update_apple_signing_assets
bundle exec fastlane ios setup_provisioning_profiles
bundle exec fastlane ios setup_catalyst_provisioning_profiles
```

These lanes require the Apple Developer and Match environment variables documented in the Fastfile and CI secrets.

## Before opening a pull request

At minimum, run the checks affected by the change. For cross-platform native changes, run JavaScript lint and unit tests, the Android Kotlin and instrumentation tests, and signing-free iOS and Catalyst builds. Do not treat a simulator-only pass as a substitute for a signed archive before release.
