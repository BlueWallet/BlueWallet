#!/bin/sh

if [ -n "$GITHUB_HEAD_REF" ]; then
  echo \"$GITHUB_HEAD_REF\"
  exit
fi


BRANCH1=`git log -n 1 --pretty=%d HEAD | awk '{print $2}' | sed 's/origin\///' | sed 's/)//'`
if [ "$BRANCH1" = '->' ]
then
  BRANCH1=`git rev-parse --abbrev-ref HEAD`
fi

echo \"$BRANCH1\"
