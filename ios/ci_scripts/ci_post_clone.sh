#!/bin/zsh

echo "===== Installing CocoaPods ====="
export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
brew install cocoapods
echo "CocoaPods installation complete."

echo "===== Installing Node.js ====="
brew install node@18
echo "Node.js installation complete."

# Configure environment to use node@18
echo "Configuring environment to use node@18..."
echo 'export PATH="/usr/local/opt/node@18/bin:$PATH"' >> ~/.zshrc
export PATH="/usr/local/opt/node@18/bin:$PATH"

echo 'export LDFLAGS="-L/usr/local/opt/node@18/lib"' >> ~/.zshrc
export LDFLAGS="-L/usr/local/opt/node@18/lib"

echo 'export CPPFLAGS="-I/usr/local/opt/node@18/include"' >> ~/.zshrc
export CPPFLAGS="-I/usr/local/opt/node@18/include"
echo "Configuration complete."

# Install dependencies using yarn
echo "===== Running yarn install ====="
yarn install | tee yarn-install-log.txt
echo "yarn install complete. Full log output in yarn-install-log.txt"

echo "===== Running pod install ====="
cd ios
pod install | tee pod-install-log.txt
echo "pod install complete. Full log output in pod-install-log.txt"
cd ..

echo "===== Installation and Setup Complete ====="
