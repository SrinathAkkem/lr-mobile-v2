#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/assets/icon.png"
IOS_ASSETS="$ROOT/ios/RonoLR/Images.xcassets"

if [[ ! -f "$SRC" ]]; then
  echo "Missing source icon: $SRC" >&2
  exit 1
fi

if [[ ! -d "$IOS_ASSETS" ]]; then
  echo "iOS project not found. Run: npx expo prebuild --platform ios --no-install" >&2
  exit 1
fi

python3 - "$SRC" "$IOS_ASSETS" <<'PY'
import os, sys
from PIL import Image

SRC, IOS_ASSETS = sys.argv[1:3]
src = Image.open(SRC).convert('RGBA')

app_icon = os.path.join(IOS_ASSETS, 'AppIcon.appiconset', 'App-Icon-1024x1024@1x.png')
src.resize((1024, 1024), Image.LANCZOS).save(app_icon, format='PNG')

splash_dir = os.path.join(IOS_ASSETS, 'SplashScreenLogo.imageset')
for scale, size in [('image.png', 100), ('image@2x.png', 200), ('image@3x.png', 300)]:
    src.resize((size, size), Image.LANCZOS).save(
        os.path.join(splash_dir, scale), format='PNG'
    )
PY

echo "iOS icons synced from assets/icon.png"
