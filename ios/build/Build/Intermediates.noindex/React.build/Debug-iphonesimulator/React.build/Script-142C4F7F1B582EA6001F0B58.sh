#!/bin/sh
if [[ "$CONFIGURATION" == "Debug" ]] && [[ -d "/tmp/RCTJSCProfiler" ]]; then
   find "${CONFIGURATION_BUILD_DIR}" -name '*.app' | xargs -I{} sh -c 'cp -r /tmp/RCTJSCProfiler "$1"' -- {}
fi
