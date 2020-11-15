echo "Please run npm i at the project root before running this script. Otherise, it will fail."
patch ios/BlueWallet/AppDelegate.m  ./scripts/maccatalystpatches/appdelegate.patch
patch package.json ./scripts/maccatalystpatches/packagejson.patch
echo "Removing node_modules"
rm -fr node_modules
echo "Removing ios/Pods"
rm -fr ios/Pods
echo "Removing ios/Podfile.lock"
rm -fr ios/Podfile.lock
echo "Re-installing node_modules"
npm i
patch ios/Podfile ./scripts/maccatalystpatches/podfile.patch
patch node_modules/realm/RealmJS.podspec ./scripts/maccatalystpatches/realm.patch
cd ios
pod update
echo "You should now be able to compile BlueWallet using My Mac on XCode. If you are running macOS Catalina, you will need to remove the iOS 14 Widgets from the project targets."