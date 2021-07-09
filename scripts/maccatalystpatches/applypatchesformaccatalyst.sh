echo "Applying patch for package.json"
sed -i '' '/react-native-tor/d' ./package.json
echo "Re-installing node_modules"
npm i
echo ""
echo "react-native-tor is not currently compatible with Mac Catalyst. You will need to remove all references from torrific.js. After this, you should now be able to compile BlueWallet using Mac Catalyst on XCode. If you are running macOS Catalina, you will need to remove the iOS 14 Widgets from the project targets."
