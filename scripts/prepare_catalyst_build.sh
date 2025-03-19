#!/bin/bash

echo "Creating a temporary Xcode project for Mac Catalyst build..."

# Make a copy of the project file
cp -R ./ios/BlueWallet.xcodeproj ./ios/BlueWallet.xcodeproj.catalyst

# Create a script to modify the project file
cat > ./ios/modify_project.rb << 'EOL'
require 'xcodeproj'

project_path = './ios/BlueWallet.xcodeproj.catalyst'
project = Xcodeproj::Project.open(project_path)

# Find the BlueWallet target
target = project.targets.find { |t| t.name == 'BlueWallet' }

if target
  puts "Found BlueWallet target"
  
  # Find and remove any Bugsnag build phases
  target.build_phases.each do |phase|
    if phase.is_a?(Xcodeproj::Project::Object::PBXShellScriptBuildPhase) && 
       (phase.name&.include?('Bugsnag') || phase.shell_script&.include?('bugsnag'))
      puts "Removing Bugsnag build phase: #{phase.name || 'Unnamed'}"
      target.build_phases.delete(phase)
    end
  end
  
  project.save
  puts "Project saved without Bugsnag build phases"
else
  puts "Could not find BlueWallet target"
  exit 1
end
EOL

# Run the script to modify the project
ruby ./ios/modify_project.rb

echo "Temporary Xcode project is ready for Mac Catalyst build"
