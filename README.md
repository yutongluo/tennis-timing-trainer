# Split Turn Load

A browser reaction trainer for the four timing beats of a tennis rally. It plays a
continuous rally from behind your baseline and reports, in milliseconds, which beat you
are chronically late on.

Built for one specific fault — turning the shoulders late — and the diagnostic is designed
around that: a signed **bias** per beat, not a score.

**Play it:** `open index.html`. No server, no build, no network.

`index.html` is the whole app and it is **completely self-contained**: a valid HTML5
document with the cue audio, the three typefaces and every asset embedded. It makes zero
network requests. Double-click it, email it, put it on a USB stick — it runs in any modern
browser with no server, no build step and no connection.

The manifest, service worker and icons alongside it are additive: they make it installable
and offline-capable as a real app when served over HTTPS, and nothing breaks without them.

## The four beats

| Beat | Trigger | Key | Spoken |
|---|---|---|---|
| Split | **leave the ground**, 80 ms before their strings meet the ball | `Space` | "split" |
| Turn | the instant the side is readable — ~5 m of ball flight | `←` `→` (side must be correct) | "turn" |
| Load | the ball bounces — coil complete, racket at the top of its loop, legs loaded | `↓` | "load" |
| Contact | on the rise, between the bounce and the top of the bounce | `↑` | "hit" |

## On a phone

Landscape, held in two hands. **The screen is the input:** tap either half on each beat, and
on the turn tap the side the ball is going — a divider fades in while that's the beat in
question. There are no buttons to aim at, so your eyes stay on the ball.

Which beat a tap belongs to is inferred, because the beats are strictly ordered and the
tightest gap is only ~220 ms (load → contact). The rule is: the nearest un-hit beat in time,
never one earlier than a beat already taken. `test/touch.mjs` pins that down, including the
tight pair and the skip-a-beat case.

Touch adds tens of milliseconds of screen-scan and dispatch latency to every beat equally,
which would read as lateness. Reps are therefore tagged with their input method and the
lifetime aggregates never mix touch with keyboard — **don't compare your phone numbers with
your desktop numbers.**

Add it to your home screen and it runs offline (manifest + service worker, cache-first).
Screen wake lock holds during a rally; a short vibration marks each beat, and a longer double
buzz marks a miss — Android only, since iOS has no web Vibration API.

Two design rules, both learned the hard way (see `docs/design-notes.md` for the full story):

1. **A beat only earns a keypress if it is a distinct decision the player makes — and it
   must attach to the decision, not its consequence.** A separate "racket back" beat was
   added and then deleted, because the racket goes back as part of the unit turn. The split
   was re-anchored from the landing to the jump for the same reason.
2. **A beat that is a relative judgement needs its reference drawn.** The direction read was
   unusable until the player figure recovered to the centre mark between shots — "the ball
   is going right" means nothing without a fixed neutral.

## Layout

```
index.html               the entire app
manifest.webmanifest     installable metadata
sw.js                    service worker — cache-first, offline
icons/                   app icons (192, 512, maskable)
docs/design-notes.md     why every number is what it is, with sources
voice/build-voice.sh     regenerate the cue words (espeak-ng + ffmpeg)
voice/inject-voice.py    measure perceptual centres, embed into the HTML
voice/*.wav              the four cue words, 16 kHz mono PCM
tools/artifact-copy.py   strips the HTML skeleton for publishing as a Claude artifact
test/                    Playwright harness — physics, audio timing, a bot rally
.github/workflows/       CI: runs the tests on every push
```

## Hosting

The app is a single static file with no backend, so any static host serves it as-is.
`.nojekyll` is present so GitHub serves the tree untouched.

**On a private repo, GitHub Pages requires a paid plan** (GitHub Pro). Without one, pushing
here gets you version history and backup, not a URL. Three ways to get a link:

| Want | Do |
|---|---|
| Just play it | `open index.html` — it works offline, `file://` and all |
| A private link, no cost | Already have one: the Claude artifact this was published from |
| A public `github.io` URL | Make the repo public, then **Settings → Pages → Deploy from a branch → `main` / `/ (root)`** |

If you later want a shareable URL without making this repo public, copy `index.html` alone
into a small public repo — it is genuinely self-contained, so nothing else has to come with it.

## Fonts

Saira Condensed, IBM Plex Sans and IBM Plex Mono are embedded as base64 woff2, subset to the
108 characters the page actually renders — 44 KB for nine faces. They were fetched from
Google at load time before; that meant a flash of fallback text, and on a court with no
signal the condensed display face — a lot of the app's character — simply did not appear.

To change them: swap the sources, re-subset with `pyftsubset --text-file=`, and replace the
`@font-face` block at the top of the stylesheet. `document.fonts.load()` for each family and
weight is the check that they actually resolved.

## Cue audio

The words are pre-rendered rather than spoken by `speechSynthesis`, which has 50–300 ms of
unpredictable start latency — larger than the entire "on time" window, and therefore
unusable for a timing cue. Instead each word is decoded once into an `AudioBuffer` and
scheduled on the audio clock, and playback starts early by that word's **perceptual centre**
so the stressed vowel, not the start of the file, lands on the trigger.

To swap in human recordings, drop `split.wav` / `turn.wav` / `load.wav` / `hit.wav` into
`voice/` and run `npm run voice` — the injector re-measures the perceptual centres and
rewrites the `VOICE` constant in the HTML. Nothing else needs to change.

## Tests

```
npm install      # playwright
npm test
```

- `physics.mjs` — 300 shots per pace × contact mode; asserts the ball always clears the net,
  always bounces inside the singles court, and that every beat target stays in range.
- `timing-audio.mjs` — asserts every cue word and both natural sounds are scheduled within
  2 ms of their target on the audio clock.
- `play.mjs` — drives a full rally with a synthetic 160 ms late turn and asserts the summary
  reports that bias back.

## Provenance

Written with Claude across one session. The design went through eight revisions, most of
them corrections from the player it was built for; `docs/design-notes.md` records what was
wrong each time and which source settled it.
