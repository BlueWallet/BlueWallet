#!/bin/sh
TAG=`git tag | sort | tail -n 1`
HASH=`git show-ref -s $TAG`
git  log --pretty=format:'* %s %b'  $HASH..HEAD | grep -v "Merge branch 'master'" | grep -v "Merge remote-tracking branch 'origin/master'" | grep -v  "Merge pull request" | awk -F 'review completed for the source file' '{print $1;}' |  grep -E -v 'on the(.*)language.' | awk -F 'Snyk has created this PR' '{print $1;}' | grep -E -v 'See this package in npm|https://www.npmjs.com/|See this project in Snyk|https://app.snyk.io' | awk '!/^$/'
