#!/bin/bash

# Initialize an empty array to hold the wallet types
wallet_types=()

# Function to extract wallet types from a file
extract_wallet_types() {
  local file=$1
  # Use grep to find lines containing "static type" and extract the wallet type name
  local types=$(grep -Eo 'static type\s*=\s*["'"'"'][^"'"'"']+["'"'"']' "$file" | sed -E 's/static type\s*=\s*["'"'"']([^"'"'"']+)["'"'"']/\1/g')

  # Append the extracted types to the wallet_types array
  for type in $types; do
    wallet_types+=("$type")
  done
}

# Scan through all files in the current directory and its subdirectories
find . -type f -name '*.ts' -print0 | while IFS= read -r -d '' file; do
  extract_wallet_types "$file"
done

# Remove duplicates and sort the wallet types
wallet_types=($(printf "%s\n" "${wallet_types[@]}" | sort -u))

# Generate the WalletType type definition
if [ ${#wallet_types[@]} -gt 0 ]; then
  echo "export type WalletType ="
  for type in "${wallet_types[@]}"; do
    echo "  | '$type'"
  done
  echo ";"
else
  echo "No wallet types found."
fi
