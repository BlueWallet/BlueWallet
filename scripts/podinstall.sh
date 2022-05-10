#!/bin/sh
if [ "$OSTYPE" = "darwin"* ]; then
        echo "Running pod update..."
        cd ios
        pod install
        cd ..
fi
