#!/bin/bash -e

# Ensures the script exits immediately if a command exits with a non-zero status.

echo "===== Starting post-clone script for Xcode Cloud ====="

# Update Homebrew to ensure the latest versions of Node.js and CocoaPods are available
echo "===== Updating Homebrew ====="
brew update

# Install Node.js
echo "===== Installing Node.js ====="
brew install node

# Install CocoaPods
echo "===== Installing CocoaPods ====="
brew install cocoapods

# Navigate to the root directory of the React Native project
# This assumes the script is executed from the root directory, adjust if necessary
echo "Navigating to the project root directory"
cd "$(dirname "$0")"

# Install JavaScript dependencies using npm
echo "===== Installing JavaScript dependencies ====="
npm install

# Navigate to the iOS directory and install CocoaPod dependencies
echo "===== Installing CocoaPod dependencies ====="
cd ios
pod install
# Return to the project root directory after installation
cd ..

echo "===== Post-clone script completed successfully ====="
