#!/bin/sh
echo a
git log -n 1 --pretty=%d HEAD | awk '{print $2}' | sed 's/origin\///' | sed 's/)//'
echo b
git rev-parse --abbrev-ref HEAD
echo c
git branch --show-current
echo d
git branch | grep \*
echo e
git symbolic-ref --short HEAD
echo d
git rev-parse --abbrev-ref HEAD
echo e
echo $GITHUB_REF_NAME
