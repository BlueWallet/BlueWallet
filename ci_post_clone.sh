#!/bin/sh -e

echo "===== Preparing Environment ====="
brew update
brew install node
brew install cocoapods

echo "===== Installing Project Dependencies ====="
npm install

echo "===== Cleaning and Installing iOS Dependencies ====="
cd ios
pod cache clean --all
rm -rf Pods Podfile.lock
pod install
cd ..
