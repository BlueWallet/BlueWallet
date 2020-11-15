patch package.json ./scripts/maccatalystpatches/packagejson.patch
rm -fr node_modules
rm -fr ios/Pods
rm -fr ios/Podfile.lock
npm i
patch ios/BlueWallet/AppDelegate.m  ./scripts/maccatalystpatches/appdelegate.patch
patch ios/Podfile ./scripts/maccatalystpatches/podfile.patch
patch node_modules/realm/RealmJS.podspec ./scripts/maccatalystpatches/realm.patch
cd ios
pod update
