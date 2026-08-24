#!/usr/bin/env bash
# Regenerate the four cue words from espeak-ng.
#
# Replace this entirely if you have human recordings — just drop split.wav /
# turn.wav / load.wav / hit.wav into this directory as 16 kHz mono PCM and run
# inject-voice.py. The perceptual centres are re-measured from the audio, so
# nothing downstream needs to know where the files came from.
#
# Needs: espeak-ng, ffmpeg
set -euo pipefail
cd "$(dirname "$0")"

for w in split turn load hit; do
  espeak-ng -v en-us+m3 -s 160 -p 35 -a 200 -w "$w.raw.wav" "$w"
  ffmpeg -y -loglevel error -i "$w.raw.wav" -af "\
silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.005,\
areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,\
loudnorm=I=-15:TP=-1.5:LRA=11" \
    -ar 16000 -ac 1 -acodec pcm_s16le "$w.wav"
  rm -f "$w.raw.wav"
  printf '%-6s %s\n' "$w" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$w.wav")s"
done
echo "now run: python3 voice/inject-voice.py"
