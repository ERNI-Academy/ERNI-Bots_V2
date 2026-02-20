#!/bin/bash
echo "=== ERNI Bots V2 Startup Script ==="
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
npm start
