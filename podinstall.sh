#!/usr/bin/env bash
echo "AppCenter XCode Project: "
echo $APPCENTER_XCODE_PROJECT
echo
if [[ "$APPCENTER_XCODE_PROJECT" == "ios/BlueWallet.xcworkspace" && "$OSTYPE" == "darwin"* ]]; then
        echo "Running pod update..."
        cd ios
        pod install
fi
