# Tests

```
npm install
npm test
```

Playwright drives the real page; there is no separate model to keep in sync. The app
exposes `window.__stl` (`S`, `makeShot`, `ballAt`, `press`, `start`, `stop`, `setView`)
purely so these can reach in.

| File | What it protects |
|---|---|
| `physics.mjs` | The ball stays playable — over the net, inside the singles court — and every beat target stays where the coaching model puts it. 300 shots × 3 paces × 3 contact modes. |
| `timing-audio.mjs` | Every cue word and both natural sounds are scheduled within 2 ms of their trigger, including the per-word perceptual-centre offset. This is the one thing that cannot be checked by eye. |
| `play.mjs` | A bot plays a full rally with a known bias per beat; the summary must report it back. Covers the grading grace window (a late contact belongs to the shot before it) and the last-rep-dropped bug. |

Both real bugs found so far came from here: the final rep being silently dropped when the
counter, not the last shot, ended the rally; and a contact pressed after the ball had left
being graded against the wrong shot.
