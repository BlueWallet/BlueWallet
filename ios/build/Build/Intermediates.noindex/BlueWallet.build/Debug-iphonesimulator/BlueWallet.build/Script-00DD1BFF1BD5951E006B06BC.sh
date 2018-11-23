#!/bin/sh
export SENTRY_PROPERTIES=sentry.properties
export NODE_BINARY=node
../node_modules/@sentry/cli/bin/sentry-cli react-native xcode ../node_modules/react-native/scripts/react-native-xcode.sh
