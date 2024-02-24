#!/bin/zsh

echo "===== Installling CocoaPods ====="
export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
brew install cocoapods
echo "===== Installing Node.js ====="
brew install node@21
echo "===== Installing yarn (Xcode Cloud doenst like NPM ) ====="
brew install yarn

# LDK is not currently available for Catalyst, so we need to patch the wallet
echo "===== Running LDK is not currently available for Catalyst, so we need to patch the wallet ====="
cp scripts/maccatalystpatches/lightning-ldk-wallet.ts class/wallets/lightning-ldk-wallet.ts

# Install dependencies
echo "===== Running yarn install ====="
yarn install
echo "===== Running pod install ====="
cd ios
pod install