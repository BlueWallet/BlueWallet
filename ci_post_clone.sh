#!/bin/zsh

echo "===== Installling CocoaPods ====="
export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
brew install cocoapods
echo "===== Installing Node.js ====="
brew install node@21

# Install dependencies
echo "===== Running npm install ====="
npm install
echo "===== Running pod install ====="
cd ios
pod install
