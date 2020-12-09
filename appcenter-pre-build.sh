#!/usr/bin/env bash

# Create "sentry.properties" file
echo "defaults.org=goldwallet
defaults.project=goldwallet
auth.token=${SENTRY_AUTH_TOKEN}
cli.executable=node_modules/@sentry/cli/bin/sentry-cli
" > sentry.properties
