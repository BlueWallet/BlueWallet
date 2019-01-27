#!/usr/bin/env bash
grep -rl "mangle: { toplevel: true }" ./node_modules/  | xargs sed -i '' -e "s/mangle: { toplevel: true }/mangle: false/g" || true
grep -rl "mangle: {toplevel: true}" ./node_modules/  | xargs sed -i '' -e "s/mangle: {toplevel: true}/mangle: false/g" || true
grep -rl "BASE_MAP.fill(255)" ./node_modules/  | xargs sed -i '' -e "s/BASE_MAP.fill(255)/for (let c = 0 ; c< 256; c++) BASE_MAP[c] = 255;/g" || true
echo fix_mangle.sh done
