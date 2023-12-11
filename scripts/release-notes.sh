#!/bin/sh

# Accept a parameter to determine the filter type
FILTER_TYPE=$1

HEAD=`git rev-parse --abbrev-ref --symbolic-full-name HEAD`
if [ "$HEAD" = "master" ]
then
    TAG=`git tag | sort | tail -n 1`
else
    CURRENTTAG=`git describe --tags`
    TAG=`git describe --abbrev=0 --tags $CURRENTTAG^`
fi
HASH=`git show-ref -s $TAG`

# Define a function to apply the filter based on the parameter
apply_filter() {
    case $FILTER_TYPE in
        "apple")
            sed '/android/I d; /google/I d'
            ;;
        *)
            cat
            ;;
    esac
}

# Main log extraction command with filter applied
git log --pretty=format:'* %s %b' $HASH..HEAD | \
sed '/Merge branch '\''master'\''/I d' | \
sed '/Merge remote-tracking branch '\''origin\/master'\''/I d' | \
sed '/Merge pull request/I d' | \
awk -F 'review completed for the source file' '{print $1;}' | \
sed '/on the(.*)language./I d' | \
awk -F 'Snyk has created this PR' '{print $1;}' | \
sed '/See this package in npm/I d; /https:\/\/www.npmjs.com\//I d; /See this project in Snyk/I d; /https:\/\/app.snyk.io/I d' | \
awk '!/^$/' | \
apply_filter
