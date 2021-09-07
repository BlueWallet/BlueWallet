#!/bin/sh
HEAD=`git rev-parse --abbrev-ref --symbolic-full-name HEAD`
if [ $HEAD == "master" ]
then
    TAG=`git tag | sort | tail -n 1`
else
    CURRENTTAG=`git describe --tags`
    TAG=`git describe --abbrev=0 --tags $CURRENTTAG^`
fi
HASH=`git show-ref -s $TAG`
git  log --pretty=format:'* %s %b' $HASH..HEAD | grep -v "Merge branch 'master'" | grep -v "Merge remote-tracking branch 'origin/master'" | grep -v  "Merge pull request" | awk -F 'review completed for the source file' '{print $1;}' |  grep -E -v 'on the(.*)language.' | awk -F 'Snyk has created this PR' '{print $1;}' | grep -E -v 'See this package in npm|https://www.npmjs.com/|See this project in Snyk|https://app.snyk.io' | awk '!/^$/'
