#!/usr/bin/env bash
# Evens out the sound of clips filmed before rec.mjs did it (picture copied as it is).
# bash capture/level.sh public/clips/<name>.mp4 ...
set -euo pipefail
for f in "$@"; do
  ffmpeg -hide_banner -loglevel error -y -i "$f" -c:v copy -af "loudnorm=I=-20:TP=-2:LRA=11" -c:a aac -b:a 256k -ar 48000 "${f%.mp4}.level.mp4"
  mv "${f%.mp4}.level.mp4" "$f"
  echo "levelled $f"
done
