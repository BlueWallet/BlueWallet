#!/bin/sh -

echo "===== Installing Node.js ====="
brew install node

echo "===== Installling CocoaPods ====="
brew install cocoapods

# Move to the root directory of the project
cd ../..

# Install dependencies
echo "===== Running npm install ====="
npm install

echo "===== Running pod install ====="
cd ios
pod install
