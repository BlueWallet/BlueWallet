#!/usr/bin/env bash
if [[ "$APPCENTER_XCODE_PROJECT" == "BlueWallet" && "$OSTYPE" == "darwin"* ]]; then
        cd ios
        pod install
fi
