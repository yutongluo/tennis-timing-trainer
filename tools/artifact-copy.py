#!/usr/bin/env python3
"""Strip index.html down to a Claude-artifact-shaped fragment.

index.html is a proper HTML5 document — doctype, <html lang>, <head>, <body> — because
that is what a browser needs to render it in standards mode. The Claude Artifact tool
wants the opposite: page content with no skeleton, which it supplies at publish time.

    python3 tools/artifact-copy.py [out.html]
"""
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "index.html")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "artifact.html")

s = io.open(SRC, encoding="utf-8").read()
s = re.sub(r"^\s*<!DOCTYPE html>\s*", "", s, flags=re.I)
s = re.sub(r"</?html[^>]*>\s*", "", s, flags=re.I)
s = re.sub(r"</?head[^>]*>\s*", "", s, flags=re.I)
s = re.sub(r"</?body[^>]*>\s*", "", s, flags=re.I)

for tag in ("<!doctype", "<html", "<head", "<body"):
    assert tag not in s.lower(), f"{tag} survived the strip"

io.open(OUT, "w", encoding="utf-8").write(s.strip() + "\n")
print(f"{os.path.relpath(OUT)}  ({os.path.getsize(OUT)/1024:.1f} KB)")
