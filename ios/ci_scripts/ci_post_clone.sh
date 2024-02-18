#!/bin/sh -e

echo "===== Preparing Environment ====="
brew update
brew install yarn
brew install cocoapods

echo "===== Installing Project Dependencies ====="
yarn

echo "===== Cleaning and Installing iOS Dependencies ====="
cd ios
pod install
cd ..
