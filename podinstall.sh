#!/usr/bin/env bash
if [[ "$OSTYPE" == "darwin"* ]]; then
	cd ios
	pod install
fi
