echo "Removing existing release notes"
rm release-notes.txt release-notes.json
echo "Applying patch for package.json"
sed -i '' '/react-native-tor/d' ./package.json
rm -fr node_modules
echo "Re-installing node_modules"
npm i
echo "Applying patch for LDK Podfile"
sed -i '' 's/LDKFramework.xcframework/LDKFramework-maccatalyst.xcframework/g' ./node_modules/rn-ldk/rn-ldk.podspec
echo "Deleting torrific.js content"
echo > blue_modules/torrific.js
echo "Updating Podfile"
cd ios && pod update && cd ..
echo ""
echo "NOTE: react-native-tor and rn-dlk are not currently compatible with Mac Catalyst.