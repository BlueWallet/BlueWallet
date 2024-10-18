fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## Android

### android prepare_keystore

```sh
[bundle exec] fastlane android prepare_keystore
```

Prepare the keystore file

### android update_version_build_and_sign_apk

```sh
[bundle exec] fastlane android update_version_build_and_sign_apk
```

Update version, build number, and sign APK

### android upload_to_browserstack_and_comment

```sh
[bundle exec] fastlane android upload_to_browserstack_and_comment
```

Upload APK to BrowserStack and post result as PR comment

----


## iOS

### ios register_devices_from_txt

```sh
[bundle exec] fastlane ios register_devices_from_txt
```

Register new devices from a file

### ios create_temp_keychain

```sh
[bundle exec] fastlane ios create_temp_keychain
```

Create a temporary keychain

### ios setup_provisioning_profiles

```sh
[bundle exec] fastlane ios setup_provisioning_profiles
```

Synchronize certificates and provisioning profiles

### ios fetch_dev_profiles_catalyst

```sh
[bundle exec] fastlane ios fetch_dev_profiles_catalyst
```

Fetch development certificates and provisioning profiles for Mac Catalyst

### ios fetch_appstore_profiles_catalyst

```sh
[bundle exec] fastlane ios fetch_appstore_profiles_catalyst
```

Fetch App Store certificates and provisioning profiles for Mac Catalyst

### ios setup_catalyst_provisioning_profiles

```sh
[bundle exec] fastlane ios setup_catalyst_provisioning_profiles
```

Setup provisioning profiles for Mac Catalyst

### ios clear_derived_data_lane

```sh
[bundle exec] fastlane ios clear_derived_data_lane
```

Clear derived data

### ios increment_build_number_lane

```sh
[bundle exec] fastlane ios increment_build_number_lane
```

Increment build number

### ios install_pods

```sh
[bundle exec] fastlane ios install_pods
```

Install CocoaPods dependencies

### ios upload_to_testflight_lane

```sh
[bundle exec] fastlane ios upload_to_testflight_lane
```

Upload IPA to TestFlight

### ios build_app_lane

```sh
[bundle exec] fastlane ios build_app_lane
```

Build the iOS app

### ios deploy

```sh
[bundle exec] fastlane ios deploy
```

Deploy to TestFlight

### ios update_release_notes

```sh
[bundle exec] fastlane ios update_release_notes
```

Update 'What's New' section in App Store Connect for the 'Prepare for Submission' version

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
