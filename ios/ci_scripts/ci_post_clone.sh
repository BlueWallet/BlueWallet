#!/bin/zsh

echo "===== Installling CocoaPods ====="
export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
brew install cocoapods
echo "===== Installing Node.js ====="
brew install node@21
echo "===== Installing yarn ====="
brew install yarn

# Install dependencies
echo "===== Running yarn install ====="
yarn install
echo "===== Running pod install ====="
cd ios
pod install

# Update CURRENT_PROJECT_VERSION to current timestamp
echo "===== Updating CURRENT_PROJECT_VERSION to current timestamp in BlueWallet.xcodeproj ====="
CURRENT_TIMESTAMP=$(date +%s) # Unix timestamp, number of seconds since 1970-01-01 00:00:00 UTC
xcrun agvtool new-version -all $CURRENT_TIMESTAMP
cd ..