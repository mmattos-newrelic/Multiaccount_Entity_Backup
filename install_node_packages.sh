#!/bin/bash
# =====================================================
# Node.js Package Installation Script for Amazon Linux
# =====================================================
# Installs specific versions of Node packages locally,
# then ensures "type": "module" is present in package.json.
# Run as: bash install_node_packages.sh

echo "🔍 Checking Node.js and npm installation..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install it first (e.g., sudo yum install -y nodejs)."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install it first (e.g., sudo yum install -y npm)."
    exit 1
fi

echo "✅ Node.js and npm are installed."
echo "📦 Installing required packages locally..."

# List of packages with versions
PACKAGES=(
  "corepack@0.34.0"
  "crypto@1.0.1"
  "csv-parse@6.1.0"
  "csv-stringify@6.6.0"
  "esm@3.2.25"
  "fs@0.0.1-security"
  "got@14.4.8"
  "graphql-request@7.2.0"
  "json2csv@6.0.0-alpha.2"
  "npm@11.6.0"
  "node-fetch@3.3.2"
)

# Install each package locally
for PACKAGE in "${PACKAGES[@]}"; do
  echo "---------------------------------------------"
  echo "📦 Installing $PACKAGE ..."
  npm install "$PACKAGE"
  if [ $? -eq 0 ]; then
    echo "✅ Successfully installed $PACKAGE"
  else
    echo "⚠️  Failed to install $PACKAGE"
  fi
done

echo "---------------------------------------------"
echo "🔎 Checking for package.json file..."

# Ensure package.json exists (npm will create it if not)
if [ ! -f package.json ]; then
    echo "⚠️  package.json not found. Creating one..."
    npm init -y >/dev/null 2>&1
fi

# Verify again if it was created
if [ -f package.json ]; then
    echo "✅ package.json found or created."
    # Insert "type": "module" at the top if not present
    if ! grep -q '"type": "module"' package.json; then
        echo "🧩 Adding \"type\": \"module\" to package.json..."
        tmpfile=$(mktemp)
        jq '.type = "module"' package.json > "$tmpfile" && mv "$tmpfile" package.json
        echo "✅ Updated package.json with type: module"
    else
        echo "ℹ️  \"type\": \"module\" already exists in package.json."
    fi
else
    echo "❌ Failed to create or locate package.json."
fi

echo "---------------------------------------------"
echo "🎉 All installations and updates completed!"
echo "✅ Your package.json should now look like:"
echo
cat package.json
