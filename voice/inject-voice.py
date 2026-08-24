#!/usr/bin/env python3
"""Measure each cue word's perceptual centre and embed the words into the app.

The perceptual centre is the point a listener hears as "the beat" — the onset of the
stressed vowel, not the start of the file. "split" carries 160 ms of /spl/ in front of
its vowel; "hit" about 65 ms. Playback is started that much early so the beat lands on
the trigger rather than after it.

It is measured here rather than hard-coded so that swapping in different recordings
(human, another voice, another language) needs no other change.

Usage:  python3 voice/inject-voice.py [path/to/split-turn-load.html]
"""
import base64, io, json, os, sys, wave
import numpy as np

WORDS = ["split", "turn", "load", "hit"]
HERE = os.path.dirname(os.path.abspath(__file__))
APP = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "split-turn-load.html")

def p_centre(path, hop_s=0.005, win_s=0.015, frac=0.30, hold=4):
    """First sustained rise above `frac` of peak short-time RMS."""
    with wave.open(path) as f:
        n, sr = f.getnframes(), f.getframerate()
        a = np.frombuffer(f.readframes(n), dtype="<i2").astype(float) / 32768
    hop, win = int(sr * hop_s), int(sr * win_s)
    rms = np.array([np.sqrt((a[i:i + win] ** 2).mean())
                    for i in range(0, len(a) - win, hop)])
    thr = frac * rms.max()
    idx = next(i for i in range(len(rms))
               if rms[i] > thr and (rms[i:i + hold] > thr * 0.7).all())
    return round(idx * hop / sr, 3), n / sr

entries, report = [], []
for w in WORDS:
    path = os.path.join(HERE, f"{w}.wav")
    pc, dur = p_centre(path)
    b64 = base64.b64encode(open(path, "rb").read()).decode()
    entries.append(f'  {w}:{{pc:{pc:.3f}, b64:"{b64}"}}')
    report.append(f"{w:6s} dur={dur:.3f}s  p-centre={pc:.3f}s  base64={len(b64)/1024:.1f} KB")

block = "const VOICE = {\n" + ",\n".join(entries) + "\n};"

src = io.open(APP, encoding="utf-8").read()
a = src.index("const VOICE = {")
b = src.index("\n};", a) + 3
io.open(APP, "w", encoding="utf-8").write(src[:a] + block + src[b:])

print("\n".join(report))
print(f"\ninjected into {os.path.relpath(APP)}")
