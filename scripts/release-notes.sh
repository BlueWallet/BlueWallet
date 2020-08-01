#!/usr/bin/env bash
TAG=`git tag | sort | tail -n 1`
HASH=`git show-ref -s $TAG`
git  log --pretty=format:'* %s %b'  $HASH..HEAD | grep -v "Merge branch 'master'" | grep -v "Merge remote-tracking branch 'origin/master'"
