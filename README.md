# Split Turn Load

A browser reaction trainer for the four timing beats of a tennis rally. It plays a
continuous rally from behind your baseline and reports, in milliseconds, which beat you
are chronically late on.

Built for one specific fault — turning the shoulders late — and the diagnostic is designed
around that: a signed **bias** per beat, not a score.

**Play it:** `open index.html`. No server, no build, no network.

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
