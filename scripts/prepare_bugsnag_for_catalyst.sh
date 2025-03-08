#!/bin/bash

echo "Preparing Bugsnag environment for Mac Catalyst build..."

# Set paths
PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
IOS_DIR="$PROJECT_ROOT/ios"

# Create the necessary directories for Bugsnag if they don't exist
mkdir -p "$IOS_DIR/build/Build/Products/Release-maccatalyst"

# Create a simple React Native source map placeholder if needed
# This ensures the Bugsnag script doesn't fail if source maps aren't generated yet
SOURCEMAP_DIR="$IOS_DIR/build/Build/Products/Release-maccatalyst"
SOURCEMAP_FILE="$SOURCEMAP_DIR/main.jsbundle.map"

if [ ! -f "$SOURCEMAP_FILE" ]; then
  echo "Creating placeholder source map for Bugsnag..."
  echo '{"version":3,"file":"main.jsbundle","sources":["placeholder"],"names":[],"mappings":""}' > "$SOURCEMAP_FILE"
  echo "Created placeholder source map at: $SOURCEMAP_FILE"
fi

# Create a placeholder main.jsbundle file if it doesn't exist
BUNDLE_FILE="$IOS_DIR/main.jsbundle"
if [ ! -f "$BUNDLE_FILE" ]; then
  echo "Creating placeholder bundle file for Bugsnag..."
  echo "// Placeholder bundle file for Bugsnag" > "$BUNDLE_FILE"
  echo "Created placeholder bundle at: $BUNDLE_FILE"
fi

# Ensure node_modules exist
if [ ! -d "$PROJECT_ROOT/node_modules/bugsnag-react-native" ]; then
  echo "Warning: bugsnag-react-native module not found. This might cause issues."
else
  echo "Bugsnag React Native module found."
fi

echo "Environment prepared for Bugsnag source maps upload in Catalyst build."
