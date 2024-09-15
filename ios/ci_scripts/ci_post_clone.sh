#!/bin/zsh

echo "===== Installing CocoaPods ====="
export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
brew install cocoapods
echo "CocoaPods installation complete."

echo "===== Installing Node.js ====="
brew install node@20
echo "Node.js installation complete."

# Configure environment to use node@20
echo "Configuring environment to use node@20..."
echo 'export PATH="/usr/local/opt/node@20/bin:$PATH"' >> ~/.zshrc
export PATH="/usr/local/opt/node@20/bin:$PATH"

echo 'export LDFLAGS="-L/usr/local/opt/node@20/lib"' >> ~/.zshrc
export LDFLAGS="-L/usr/local/opt/node@20/lib"

echo 'export CPPFLAGS="-I/usr/local/opt/node@20/include"' >> ~/.zshrc
export CPPFLAGS="-I/usr/local/opt/node@20/include"
echo "Configuration complete."

# Install dependencies using npm
echo "===== Running npm ci ====="
npm ci | tee npm-ci-log.txt
npm prune --production | tee npm-prune-log.txt
echo "npm ci complete. Full log output in npm-ci-log.txt and npm-prune-log.txt"

echo "===== Running pod install ====="
cd ios
pod install | tee pod-install-log.txt
echo "pod install complete. Full log output in pod-install-log.txt"
cd ..

echo "===== Installation and Setup Complete ====="
