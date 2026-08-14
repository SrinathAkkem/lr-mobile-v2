#!/usr/bin/env bash
# Resize screenshots for App Store Connect (iPhone 6.5" Display: 1284×2778)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET_W=1284
TARGET_H=2778
OUT_DIR="${OUT_DIR:-$HOME/Downloads/rono-app-store-screenshots}"

# Input folder: arg, or first match
if [[ -n "${1:-}" ]]; then
  IN_DIR="$1"
elif [[ -d "$ROOT/screenshots" ]]; then
  IN_DIR="$ROOT/screenshots"
elif [[ -d "$HOME/Downloads/screenshots" ]]; then
  IN_DIR="$HOME/Downloads/screenshots"
elif [[ -d "$HOME/Downloads/rono" ]]; then
  IN_DIR="$HOME/Downloads/rono"
else
  echo "Usage: $0 [screenshots-folder]"
  echo "  Or place images in lr-mobile-v2/screenshots/"
  exit 1
fi

mkdir -p "$OUT_DIR"
rm -f "$OUT_DIR"/*.png "$OUT_DIR"/*.jpg 2>/dev/null || true

shopt -s nullglob
files=("$IN_DIR"/*.{png,jpg,jpeg,PNG,JPG,JPEG})
shopt -u nullglob

if [[ ${#files[@]} -eq 0 ]]; then
  echo "No images found in: $IN_DIR"
  exit 1
fi

echo "Source: $IN_DIR"
echo "Output: $OUT_DIR"
echo "Target: ${TARGET_W}×${TARGET_H}"
echo ""

i=1
for src in "${files[@]}"; do
  [[ -f "$src" ]] || continue
  num=$(printf "%02d" "$i")
  base=$(basename "$src")
  name="${num}-${base%.*}.png"
  dest="$OUT_DIR/$name"
  tmp="$OUT_DIR/.tmp-$name"

  w=$(sips -g pixelWidth "$src" 2>/dev/null | awk '/pixelWidth/ {print $2}')
  h=$(sips -g pixelHeight "$src" 2>/dev/null | awk '/pixelHeight/ {print $2}')

  # Portrait: scale to fit inside target, pad if needed
  if [[ "$h" -ge "$w" ]]; then
  python3 - "$src" "$tmp" "$TARGET_W" "$TARGET_H" <<'PY'
import sys
from PIL import Image

src, dst, tw, th = sys.argv[1:5]
tw, th = int(tw), int(th)
img = Image.open(src).convert("RGB")
w, h = img.size
scale = min(tw / w, th / h)
nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
resized = img.resize((nw, nh), Image.LANCZOS)
canvas = Image.new("RGB", (tw, th), (255, 255, 255))
canvas.paste(resized, ((tw - nw) // 2, (th - nh) // 2))
canvas.save(dst, format="PNG", optimize=True)
PY
  else
  # Landscape source → rotate to portrait for store listing
  python3 - "$src" "$tmp" "$TARGET_W" "$TARGET_H" <<'PY'
import sys
from PIL import Image

src, dst, tw, th = sys.argv[1:5]
tw, th = int(tw), int(th)
img = Image.open(src).convert("RGB").rotate(90, expand=True)
w, h = img.size
scale = min(tw / w, th / h)
nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
resized = img.resize((nw, nh), Image.LANCZOS)
canvas = Image.new("RGB", (tw, th), (255, 255, 255))
canvas.paste(resized, ((tw - nw) // 2, (th - nh) // 2))
canvas.save(dst, format="PNG", optimize=True)
PY
  fi

  mv "$tmp" "$dest"
  ow=$(sips -g pixelWidth "$dest" | awk '/pixelWidth/ {print $2}')
  oh=$(sips -g pixelHeight "$dest" | awk '/pixelHeight/ {print $2}')
  echo "[$i] $base (${w}×${h}) → $name (${ow}×${oh})"
  i=$((i + 1))
done

echo ""
echo "Done. Upload PNGs from:"
echo "  $OUT_DIR"
