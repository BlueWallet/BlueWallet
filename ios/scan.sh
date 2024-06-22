#!/bin/bash

# Define directories
directories=("BlueWalletWatch" "BlueWalletWatch Extension")

# Define output file
output_file="results.txt"

# Clear the output file if it already exists
> "$output_file"

# Function to scan files
scan_files() {
  local dir=$1
  find "$dir" -type f \( -name "*.swift" -o -name "*.storyboard" \) | while read -r file; do
    if file "$file" | grep -qv 'binary'; then
      echo "File: $file" >> "$output_file"
      echo "Content:" >> "$output_file"
      cat "$file" >> "$output_file"
      echo -e "\n\n" >> "$output_file"
    fi
  done
}

# Loop through each directory and scan files
for dir in "${directories[@]}"; do
  if [ -d "$dir" ]; then
    scan_files "$dir"
  else
    echo "Directory $dir does not exist." >> "$output_file"
  fi
done

echo "Scan completed. Results saved to $output_file."
