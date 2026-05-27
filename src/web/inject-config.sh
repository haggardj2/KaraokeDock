#!/bin/sh
# Inject runtime configuration into index.html

# Default to localhost if not set
API_BASE="${VITE_API_BASE:-http://localhost:5174}"

# Validate API_BASE format (basic URL validation)
if ! echo "$API_BASE" | grep -qE '^https?://[a-zA-Z0-9.-]+(:[0-9]+)?$'; then
  echo "Warning: API_BASE format may be invalid: $API_BASE"
  echo "Expected format: http://host:port or https://host:port"
fi

# Escape for safe JavaScript injection
# Escape backslashes first, then quotes, then angle brackets for HTML safety
API_BASE_ESCAPED=$(echo "$API_BASE" | \
  sed 's/\\/\\\\/g' | \
  sed 's/"/\\"/g' | \
  sed 's/</\\x3c/g' | \
  sed 's/>/\\x3e/g')

# Find all index.html files in dist and inject the config
find /app/dist -name "index.html" -type f | while read file; do
  # Create a temporary file with cleanup trap
  tmpfile=$(mktemp)
  trap "rm -f $tmpfile" EXIT INT TERM
  
  # Check if already has the script tag
  if ! grep -q "window.__ENV__" "$file"; then
    # Inject the config script before </head>
    sed "s|</head>|<script>window.__ENV__={API_BASE:\"$API_BASE_ESCAPED\"}</script></head>|" "$file" > "$tmpfile"
    mv "$tmpfile" "$file"
    echo "✓ Injected API_BASE=$API_BASE into $file"
  else
    # Update existing config by removing old script and adding new one
    sed '/<script>window.__ENV__=/d' "$file" | \
    sed "s|</head>|<script>window.__ENV__={API_BASE:\"$API_BASE_ESCAPED\"}</script></head>|" > "$tmpfile"
    mv "$tmpfile" "$file"
    echo "✓ Updated API_BASE=$API_BASE in $file"
  fi
done

# Start the server
exec node /app/server.js
