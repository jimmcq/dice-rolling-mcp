#!/bin/bash

# Ensure we're using the correct Node.js version
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Change to the project directory
cd /home/jim/src/dice-rolling-mcp

# Start the server
node dist/index.js