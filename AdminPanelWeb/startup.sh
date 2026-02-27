#!/bin/bash
echo "=== Singularity Startup Script ==="
echo "Working directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo ""
echo "Listing files:"
ls -la
echo ""
echo "Checking .next directory:"
ls -la .next 2>/dev/null || echo ".next directory not found"
echo ""
echo "PORT: $PORT"
echo "NODE_ENV: $NODE_ENV"
echo ""
echo "Starting Next.js application..."

# Oryx may have replaced bundled node_modules with a stale tar.gz extraction.
# Restore our bundles modules if they were moved aside.
if [ -d _del_node_modules ] && [ -L node_modules ]; then
    echo "Restoring bundled node_modules (overriding stale Oryx extraction)..."
    rm -f node_modules
    mv _del_node_modules node_modules
fi

# Remove stale Oryx artifacts so next restart won't re-extract them
rm -f node_modules.tar.gz oryx-manifest.toml

exec node server.js
