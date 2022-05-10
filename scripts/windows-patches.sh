sed -i '' 's/if (error.code === "ENOENT") {/if (error.code === "ENOENT" || error.code === 'EISDIR') {/g' ./node_modules/metro/src/node-haste/DependencyGraph/ModuleResolution.js
