#!/bin/sh -e

echo "===== Preparing Environment ====="
brew update
brew install node@16
brew install cocoapods

echo "===== Installing Project Dependencies ====="
npm install -y

echo "===== Cleaning and Installing iOS Dependencies ====="
cd ios
pod install