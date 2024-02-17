#!/bin/sh -e

echo "===== Preparing Environment ====="
brew update
brew install node@16
brew install cocoapods

echo "===== Installing Project Dependencies ====="
npm config set maxsockets 3
npm ci
npm install -y

echo "===== Cleaning and Installing iOS Dependencies ====="
cd ios
pod install