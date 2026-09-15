#!/usr/bin/env bash
# Validate a version string is valid semver
VERSION="$1"
if [ -z "$VERSION" ]; then
  echo "::error::No version provided"
  exit 1
fi
if ! echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$'; then
  echo "::error::Version must be in semver format (e.g. 0.2.0 or 0.2.0-rc.1)"
  exit 1
fi
