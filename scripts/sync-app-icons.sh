#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
"$ROOT/scripts/sync-android-icons.sh"
"$ROOT/scripts/sync-ios-icons.sh"
echo "All app icons synced from assets/icon.png"
