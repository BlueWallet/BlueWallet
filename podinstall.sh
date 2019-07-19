#!/usr/bin/env bash
echo "AppCenter XCode Project: "
echo $APPCENTER_XCODE_PROJECT
echo
if [[ "$APPCENTER_XCODE_PROJECT" == "BlueWallet" && "$OSTYPE" == "darwin"* ]]; then
        cd ios
        pod install
fi
