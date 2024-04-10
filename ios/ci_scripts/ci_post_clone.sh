#!/bin/zsh

echo "===== Installing CocoaPods ====="
export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
brew install cocoapods
echo "CocoaPods installation complete."

echo "===== Installing Node.js ====="
brew install node@18
echo "Node.js installation complete."

# Note: Removed yarn installation as per request to use npm instead.

# Install dependencies using npm
echo "===== Running npm install ====="
npm install -y | tee npm-install-log.txt
echo "npm install complete. Full log output in npm-install-log.txt"

echo "===== Running pod install ====="
cd ios
pod install | tee pod-install-log.txt
echo "pod install complete. Full log output in pod-install-log.txt"


echo "===== Installation and Setup Complete ====="
