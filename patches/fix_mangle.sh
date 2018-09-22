#!/usr/bin/env bash
grep -rl "mangle: { toplevel: true }" ./node_modules/  | xargs sed -i '' -e "s/mangle: { toplevel: true }/mangle: false/g"
