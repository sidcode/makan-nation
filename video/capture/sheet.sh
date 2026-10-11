#!/usr/bin/env bash
# A contact sheet of a clip with each frame's time under it, for picking in and out points.
# bash capture/sheet.sh public/clips/<name>.mp4 <every seconds> <out.jpg> [start] [end]
set -euo pipefail
clip=$1; every=$2; out=$3; start=${4:-0}; end=${5:-9999}
tmp=$(mktemp -d)
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$clip")
end=$(python3 -c "print(min($end, $dur - 0.05))")
args=()
t=$start
while python3 -c "import sys; sys.exit(0 if $t <= $end else 1)"; do
  f="$tmp/$(printf '%07.2f' "$t").jpg"
  ffmpeg -hide_banner -loglevel error -y -ss "$t" -i "$clip" -frames:v 1 -vf scale=384:-1 "$f"
  args+=(-label "${t}s" "$f")
  t=$(python3 -c "print(round($t + $every, 2))")
done
montage "${args[@]}" -tile 6x -geometry +4+4 -pointsize 18 -background '#222' -fill white "$out"
rm -rf "$tmp"
echo "$out"
