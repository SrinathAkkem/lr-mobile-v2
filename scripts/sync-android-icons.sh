#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/assets/icon.png"
RES="$ROOT/android/app/src/main/res"

if [[ ! -f "$SRC" ]]; then
  echo "Missing source icon: $SRC" >&2
  exit 1
fi

python3 - "$ROOT" "$SRC" "$RES" <<'PY'
import os, sys
from PIL import Image

ROOT, SRC, RES = sys.argv[1:4]
src = Image.open(SRC).convert('RGBA')

for rel in [
    'assets/adaptive-icon.png',
    'assets/favicon.png',
    'assets/splash.png',
    'assets/images/icon.png',
    'assets/images/app-icon.png',
    'assets/images/android-icon-foreground.png',
    'assets/images/favicon.png',
    'assets/images/splash-icon.png',
]:
    dst = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    src.save(dst, format='PNG')

launcher_sizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}
for folder, size in launcher_sizes.items():
    out_dir = os.path.join(RES, folder)
    os.makedirs(out_dir, exist_ok=True)
    icon = src.resize((size, size), Image.LANCZOS)
    icon.save(os.path.join(out_dir, 'ic_launcher.png'), format='PNG')
    icon.save(os.path.join(out_dir, 'ic_launcher_round.png'), format='PNG')

splash_sizes = {
    'drawable-mdpi': 288,
    'drawable-hdpi': 432,
    'drawable-xhdpi': 576,
    'drawable-xxhdpi': 864,
    'drawable-xxxhdpi': 1152,
}
for folder, size in splash_sizes.items():
    out_dir = os.path.join(RES, folder)
    os.makedirs(out_dir, exist_ok=True)
    src.resize((size, size), Image.LANCZOS).save(
        os.path.join(out_dir, 'splashscreen_logo.png'), format='PNG'
    )
PY

rm -rf "$ROOT/android/app/src/main/res/mipmap-anydpi-v26"
rm -rf "$ROOT/.expo/web/cache/production/images"
find "$RES" -name '*.webp' -delete

echo "Android icons synced from assets/icon.png"
