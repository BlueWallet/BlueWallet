#!/bin/bash

# This script modifies the Bugsnag script phase in the Xcode project file
# to make it compatible with Mac Catalyst builds in CI environments

echo "Fixing Bugsnag for Mac Catalyst builds..."

# Path to the project file
PROJECT_FILE="./ios/BlueWallet.xcodeproj/project.pbxproj"

if [ ! -f "$PROJECT_FILE" ]; then
  echo "Error: Project file not found at $PROJECT_FILE"
  exit 1
fi

# Create a backup of the project file
cp "$PROJECT_FILE" "${PROJECT_FILE}.bak"
echo "Created backup at ${PROJECT_FILE}.bak"

# Search for Bugsnag upload script sections
BUGSNAG_LINES=$(grep -n "Upload.*Bugsnag\|bugsnag-react-native\|BugsnagReactNative" "$PROJECT_FILE" || echo "")

if [ -z "$BUGSNAG_LINES" ]; then
  echo "No Bugsnag references found in the project file."
else
  echo "Found Bugsnag references in the project file:"
  echo "$BUGSNAG_LINES"
  
  # Extract line numbers where Bugsnag script phases likely begin
  SCRIPT_LINES=$(echo "$BUGSNAG_LINES" | cut -d':' -f1)
  
  # For each potential Bugsnag script phase
  for LINE in $SCRIPT_LINES; do
    # Look backward for shellScript = " pattern to find start of script
    SCRIPT_START=$(awk "NR<$LINE && /shellScript = \"/ {print NR; exit}" "$PROJECT_FILE")
    
    if [ -n "$SCRIPT_START" ]; then
      echo "Found shell script start at line $SCRIPT_START"
      
      # Use sed to insert a conditional check at the beginning of the script
      sed -i.tmp "${SCRIPT_START}s/shellScript = \"/shellScript = \"if [ \"\$SKIP_BUGSNAG_CATALYST\" = \"YES\" ]; then\\
        echo \"Skipping Bugsnag for Catalyst build\"\\
        exit 0\\
      fi\\
      /" "$PROJECT_FILE"
      
      echo "Modified script at line $SCRIPT_START to skip for Catalyst builds"
    fi
  done
  
  echo "All Bugsnag script phases have been modified"
fi

# Clean up the temporary file
rm -f "${PROJECT_FILE}.tmp"

echo "Bugsnag fixes for Catalyst completed"
