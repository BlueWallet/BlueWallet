#!/bin/bash

# Enable debugging
set -x

# Fetch all tags
git fetch --tags

# List all tags for debugging
git tag


# Get the current branch name
HEAD=$(git rev-parse --abbrev-ref --symbolic-full-name HEAD)
echo "Current branch: $HEAD"

# Determine the tag based on the branch
if [ "$HEAD" = "master" ]; then
    TAG=$(git tag | sort | tail -n 1)
else
    CURRENTTAG=$(git describe --tags)
    TAG=$(git describe --abbrev=0 --tags "$CURRENTTAG"^)
fi

echo "Tag to compare with: $TAG"

# Check if TAG is empty and handle it
if [ -z "$TAG" ]; then
    echo "No tags found. Exiting script."
    exit 1
fi

# Get the hash of the tag
HASH=$(git show-ref -s $TAG)

# Check if HASH is empty
if [ -z "$HASH" ]; then
    echo "No hash found for tag $TAG. Exiting script."
    exit 1
fi

echo "Hash of the tag: $HASH"

# Generate the changelog
git log --pretty=format:'* %s %b' $HASH..HEAD | \
grep -v "Merge branch 'master'" | \
grep -v "Merge remote-tracking branch 'origin/master'" | \
grep -v "Merge pull request" | \
awk -F 'review completed for the source file' '{print $1;}' | \
grep -E -v 'on the(.*)language.' | \
awk -F 'Snyk has created this PR' '{print $1;}' | \
grep -E -v 'See this package in npm|https://www.npmjs.com/|See this project in Snyk|https://app.snyk.io' | \
awk '!/^$/'

# Disable debugging
set +x
