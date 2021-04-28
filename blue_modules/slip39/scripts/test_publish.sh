#!/bin/sh

PROJ_DIR=`dirname $0`/..

cd "${PROJ_DIR}"

sudo npm install . -g
sudo npm link

mkdir ../pubtest
cd ../pubtest
cat > package.json << EOF
{
  "name": "test-slip39",
  "version": "0.1.0",
  "private": true
}
EOF

npm install ../slip39-js

cd -
sudo npm uninstall . -g
sudo npm unlink
rm -rf ../pubtest
