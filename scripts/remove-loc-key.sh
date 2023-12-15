#!/bin/bash

# Check if a nested key path is provided
if [ -z "$1" ]; then
    echo "Usage: $0 nested_key"
    echo "Example: $0 autofill_word.error"
    exit 1
fi

NESTED_KEY=$1
IFS='.' read -r -a KEYS <<< "$NESTED_KEY"

# Define the potential directories containing JSON files
JSON_DIR1="../loc/"
JSON_DIR2="loc/"

# Check which directory exists and use it
if [ -d "$JSON_DIR1" ]; then
    JSON_DIR="$JSON_DIR1"
elif [ -d "$JSON_DIR2" ]; then
    JSON_DIR="$JSON_DIR2"
else
    echo "Neither $JSON_DIR1 nor $JSON_DIR2 exists. Exiting."
    exit 1
fi

# Function to remove the nested key from a JSON file
remove_nested_key_with_awk() {
    local file=$1

    awk -v keys="${KEYS[*]}" '
    BEGIN { 
        split(keys, k, " "); 
        key_count = length(k);
        skip = 0; 
        match_count = 0; 
        brace_count = 0; 
        delete_line = 0
    }
    {
        if (match_count < key_count && $0 ~ "\""k[match_count+1]"\" *:") {
            match_count++;
            if (match_count == key_count) {
                skip = 1;
                delete_line = NR;
                if ($0 ~ /{/) {
                    brace_count = 1;
                } else {
                    brace_count = 0;
                }
            }
        } else if (match_count < key_count && $0 ~ /{/) {
            brace_count++;
        } else if (match_count < key_count && $0 ~ /}/) {
            brace_count--;
            if (brace_count == 0) {
                match_count = 0;
            }
        }

        if (skip && $0 ~ /{/) {
            brace_count++;
        }
        if (skip && $0 ~ /}/) {
            brace_count--;
        }
        if (skip && brace_count == 0) {
            skip = 0;
            if (delete_line > 0) {
                next;
            }
        }
        if (skip == 0) {
            print $0;
        }
    }' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
}

# Iterate over all JSON files in the chosen directory
for file in "$JSON_DIR"*.json; do
    if [ -f "$file" ]; then
        echo "Processing $file..."
        remove_nested_key_with_awk "$file"
    fi
done

echo "Done."
