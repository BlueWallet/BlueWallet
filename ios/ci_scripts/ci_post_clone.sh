#!/bin/zsh

echo "===== Installling CocoaPods ====="
export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
brew install cocoapods
echo "===== Installing Node.js ====="
brew install node@18
echo "===== Installing yarn (Xcode Cloud doenst like NPM ) ====="
brew install yarn

# Install dependencies
echo "===== Running yarn install ====="
npm install -y
echo "===== Running pod install ====="
cd ios
pod install