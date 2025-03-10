#!/bin/bash

# This script handles all Bugsnag-related fixes for Mac Catalyst builds
# It combines multiple approaches to ensure build success

set -e  # Exit on error

# Print colored output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}   Fixing Bugsnag for Mac Catalyst    ${NC}"
echo -e "${BLUE}=======================================${NC}"

# Set paths
PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
PROJECT_FILE="$PROJECT_ROOT/ios/BlueWallet.xcodeproj/project.pbxproj"
BACKUP_FILE="${PROJECT_FILE}.bak"

if [ ! -f "$PROJECT_FILE" ]; then
  echo -e "${RED}Error: Project file not found at $PROJECT_FILE${NC}"
  exit 1
fi

# Create backup of the project file
echo -e "${YELLOW}Creating backup of project file...${NC}"
cp "$PROJECT_FILE" "$BACKUP_FILE"
echo -e "${GREEN}Created backup at $BACKUP_FILE${NC}"

# Approach 1: Direct modification of build script phases
echo -e "${BLUE}Approach 1: Directly modifying Bugsnag build phases...${NC}"

# Search for Bugsnag-related script phases
BUGSNAG_LINES=$(grep -n "Upload.*Bugsnag\|bugsnag-react-native\|BugsnagReactNative\|Bugsnag source map" "$PROJECT_FILE" || echo "")

if [ -z "$BUGSNAG_LINES" ]; then
  echo -e "${YELLOW}No Bugsnag references found in project file. Trying alternative search...${NC}"
  BUGSNAG_LINES=$(grep -n "shellScript" "$PROJECT_FILE" | grep -i "bugsnag" || echo "")
fi

if [ -z "$BUGSNAG_LINES" ]; then
  echo -e "${YELLOW}No Bugsnag references found using any search method.${NC}"
  echo -e "${YELLOW}Searching for any Upload-related script phases...${NC}"
  BUGSNAG_LINES=$(grep -n "shellScript.*Upload" "$PROJECT_FILE" || echo "")
fi

if [ -n "$BUGSNAG_LINES" ]; then
  echo -e "${GREEN}Found potential Bugsnag references in project file:${NC}"
  echo "$BUGSNAG_LINES"
  
  # Extract line numbers where Bugsnag script phases likely begin
  SCRIPT_LINES=$(echo "$BUGSNAG_LINES" | cut -d':' -f1)
  
  # For each potential Bugsnag script phase
  for LINE in $SCRIPT_LINES; do
    # Look backward for shellScript = " pattern to find start of script
    SCRIPT_START=$(awk "NR<$LINE && /shellScript = \"/ {print NR; exit}" "$PROJECT_FILE")
    
    if [ -n "$SCRIPT_START" ]; then
      echo -e "${GREEN}Found shell script start at line $SCRIPT_START${NC}"
      
      # Use sed to insert a conditional check at the beginning of the script
      sed -i.tmp "${SCRIPT_START}s/shellScript = \"/shellScript = \"if [ \"\$SKIP_BUGSNAG_CATALYST\" = \"YES\" ]; then\\
  echo \"Skipping Bugsnag for Catalyst build\"\\
  exit 0\\
fi\\
/" "$PROJECT_FILE"
      
      echo -e "${GREEN}Modified script at line $SCRIPT_START to skip for Catalyst builds${NC}"
    fi
  done
  
  echo -e "${GREEN}All identified Bugsnag script phases have been modified${NC}"
else
  echo -e "${YELLOW}No Bugsnag-like script phases found in the project file.${NC}"
  echo -e "${YELLOW}Will try alternative approach...${NC}"
fi

# Approach 2: Use xcodeproj Ruby library to modify the project
echo -e "${BLUE}Approach 2: Using xcodeproj Ruby library to modify the project...${NC}"

# Create a Ruby script to modify the project file
cat > "$PROJECT_ROOT/ios/modify_bugsnag.rb" << 'EOL'
require 'xcodeproj'

begin
  # Open the Xcode project
  project_path = './ios/BlueWallet.xcodeproj'
  project = Xcodeproj::Project.open(project_path)
  
  puts "Successfully opened project"
  modified = false
  
  # Process all targets
  project.targets.each do |target|
    puts "Checking target: #{target.name}"
    
    # Find all build phases
    target.build_phases.each do |phase|
      if phase.is_a?(Xcodeproj::Project::Object::PBXShellScriptBuildPhase)
        # Check if this is a Bugsnag-related script
        is_bugsnag = false
        
        if !phase.name.nil? && (phase.name.include?('Bugsnag') || phase.name.include?('bugsnag'))
          is_bugsnag = true
          puts "Found Bugsnag build phase by name: #{phase.name}"
        elsif !phase.shell_script.nil? && (phase.shell_script.include?('bugsnag') || phase.shell_script.include?('Bugsnag') || phase.shell_script.include?('source map'))
          is_bugsnag = true
          puts "Found Bugsnag build phase by script content"
        end
        
        if is_bugsnag
          # Modify the script to exit early for Catalyst builds
          original_script = phase.shell_script
          modified_script = "if [ \"$SKIP_BUGSNAG_CATALYST\" = \"YES\" ]; then\n  echo \"Skipping Bugsnag for Catalyst build\"\n  exit 0\nfi\n\n#{original_script}"
          phase.shell_script = modified_script
          modified = true
          puts "Modified Bugsnag build phase to exit early for Catalyst builds"
        end
      end
    end
  end
  
  if modified
    project.save
    puts "Project saved with modifications"
  else
    puts "No modifications were needed"
  end
rescue => e
  puts "Error: #{e.message}"
  puts e.backtrace
  exit 1
end
EOL

# Execute the Ruby script
echo -e "${YELLOW}Executing Ruby script to modify project file...${NC}"
ruby "$PROJECT_ROOT/ios/modify_bugsnag.rb"
echo -e "${GREEN}Ruby script execution completed${NC}"

# Clean up the temporary files
rm -f "${PROJECT_FILE}.tmp" "$PROJECT_ROOT/ios/modify_bugsnag.rb"

# Approach 3: Add environment variables to disable Bugsnag
echo -e "${BLUE}Approach 3: Creating environment variables file...${NC}"

# Create a file with environment variables that will be used during build
cat > "$PROJECT_ROOT/ios/BugsnagDisable.xcconfig" << 'EOL'
// XCConfig to disable Bugsnag for Catalyst builds
SKIP_BUGSNAG_CATALYST = YES
BUGSNAG_DISABLE_CATALYST = YES
GCC_PREPROCESSOR_DEFINITIONS = $(inherited) SKIP_BUGSNAG_CATALYST=1 BUGSNAG_DISABLE_CATALYST=1
OTHER_SWIFT_FLAGS = $(inherited) -DSKIP_BUGSNAG_CATALYST
EOL

echo -e "${GREEN}Created BugsnagDisable.xcconfig file${NC}"

echo -e "${BLUE}=======================================${NC}"
echo -e "${GREEN}All Bugsnag fixes for Catalyst completed${NC}"
echo -e "${YELLOW}Note: If you still encounter issues, try:${NC}"
echo -e "${YELLOW}1. Run 'export SKIP_BUGSNAG_CATALYST=YES' before building${NC}"
echo -e "${YELLOW}2. Temporarily disable Bugsnag in the React Native code${NC}"
echo -e "${BLUE}=======================================${NC}"

exit 0
