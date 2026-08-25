# Split Turn Load

A browser reaction trainer for the four timing beats of a tennis rally. It plays a
continuous rally from behind your baseline and reports, in milliseconds, which beat you
are chronically late on.

Built for one specific fault — turning the shoulders late — and the diagnostic is designed
around that: a signed **bias** per beat, not a score.

**Play it:** https://YOURNAME.github.io/tennis-timing-trainer/ — or just `open index.html`.

That is the whole app: one file, no dependencies, no build step. The cue audio is embedded
as base64 PCM, so it works offline, from `file://`, and from any static host.

## The four beats

| Beat | Trigger | Key | Spoken |
|---|---|---|---|
| Split | **leave the ground**, 80 ms before their strings meet the ball | `Space` | "split" |
| Turn | the instant the side is readable — ~5 m of ball flight | `←` `→` (side must be correct) | "turn" |
| Load | the ball bounces — coil complete, racket at the top of its loop, legs loaded | `↓` | "load" |
| Contact | on the rise, between the bounce and the top of the bounce | `↑` | "hit" |

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
docs/design-notes.md     why every number is what it is, with sources
voice/build-voice.sh     regenerate the cue words (espeak-ng + ffmpeg)
voice/inject-voice.py    measure perceptual centres, embed into the HTML
voice/*.wav              the four cue words, 16 kHz mono PCM
test/                    Playwright harness — physics, audio timing, a bot rally
.github/workflows/       CI: runs the tests on every push
```

## Hosting

It is a static single file, so any static host works. For GitHub Pages:

1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `/ (root)`.**
3. It appears at `https://<user>.github.io/<repo>/` within a minute or so.

No build step and no workflow are needed for the deploy — `index.html` is served as-is.
`.nojekyll` is present so GitHub serves the tree untouched.

Two things worth knowing before making it public:

- The page stores settings and your last 400 reps in `localStorage`, per browser. Nothing
  is sent anywhere; there is no backend and no analytics.
- There is no `LICENSE` file, which means default copyright — all rights reserved. Add one
  if you want other people to be able to reuse it.

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
