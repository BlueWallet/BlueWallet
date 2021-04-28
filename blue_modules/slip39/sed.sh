#!/bin/sh
sed -i '' 's/import JSBI from \"jsbi\"/const JSBI = require(\"jsbi\/dist\/jsbi-cjs.js\")/' dist/*.js
