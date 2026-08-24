# Split Turn Load — design notes

Live: https://claude.ai/code/artifact/471cdbcf-501a-4178-80be-63866d63075d

## The four beats

| Beat | Trigger | Key | Spoken |
|---|---|---|---|
| Split | **leave the ground**, 80 ms before their strings meet the ball | Space | "split" |
| Turn | the instant the side is readable — ~5 m of ball flight | ← / → (side must be correct) | "turn" |
| Load | ball bounces — coil complete, racket at the top of the loop, legs loaded | ↓ | "load" |
| Contact | on the rise, between the bounce and the top of the bounce | ↑ | "hit" |

**The split is graded on the jump, not the landing.** The jump is the decision; the landing
is its consequence. A landing target is partly reactable — you can see the contact and still
score — whereas a target 80 ms *before* their contact can only be anticipated off their
takeback. To stop it becoming a counting exercise, the feed duration varies ±15 % per shot
and the opponent's takeback rhythm jitters ±70 ms.

**Contact is a window, not a point,** because how early you take the ball is a tactical
choice rather than a technical fact. So it is a setting — Early / On the rise / Top of bounce
— mapping to 0.30 / 0.55 / 1.00 of the way from the bounce to the top of the bounce. This is
the one place a setting is right; contrast the takeback below, where a setting was wrong.

## Movement: recover, set, move

1. **Recover** — from wherever you last hit, back to the centre mark, finished by 300 ms
   before their contact.
2. **Set** — planted on the centre mark through the split and the read.
3. **Move** — out to the contact point between the read and the bounce.

v7 shipped without the recovery: you stayed parked at your last contact point until the read.
The direction read is a **relative** judgement — without a fixed neutral to read against,
"the ball is going right" is meaningless, and the Turn beat degrades into a guess no matter
how clearly the ball is drawn. Recovery is not cosmetic realism; it is what makes the second
beat measurable at all.

At court level the camera tracks 0.6× of the lateral movement (softened from 0.9× at the same
time — a wide ball was swinging the whole frame).

## How the model got here (five corrections)

1. **v1/v2 put the unit turn at the net crossing.** The net crossing is where the backswing is
   already underway; the turn should be finished by then. Moved ~400 ms earlier, to the read.
2. **v3/v4 added a beat at the net crossing** ("Drop", then "Racket back"). The name was wrong
   first — "racquet drop" means the *lag*, which is passive and belongs to the forward swing.
3. **v5/v6 deleted that beat entirely.** *"If I'm turned, aren't I already taking my racket
   back?"* — yes. [FTP Tennis on the unit turn][ftp-turn]: *"It is called a unit turn because
   the body and racquet turn as one. To get the racquet back we turn the whole body,"* with a
   warning against "swinging the racquet back." A cue for it would train the arm-only
   backswing the unit turn exists to prevent.
4. **v7 fixed the split and added contact.** The app was grading the outcome of the decision
   rather than the decision.
5. **v8 added the recovery.** See above.

**Rules this produced:**

- A beat only earns a keypress if it corresponds to a distinct decision the player makes, and
  it should be attached to the moment of the decision, not its consequence. The takeback
  failed the first half; the split landing failed the second.
- A beat that is a **relative** judgement needs its reference drawn. Anything measuring "which
  side / how far / how early relative to X" is only as good as the visibility of X.

## Mental model

- **Split** — feet leave the ground. Anticipation only.
- **Turn** — the whole preparation starts: shoulders rotate, racket, arm and legs travel with
  them as one unit.
- **Load** — the finish line. Everything arrives together.
- **Contact** — somewhere on the rise. The racket-head lag happens between Load and Contact,
  passively, with no cue.

## What the sources say

- **Split.** [Feel Tennis][ft-split] — hops initiated ~0.08 s before the opponent's contact
  (the app's target), "land exactly when you realize where your opponent's ball is going."
  [Fault Tolerant Tennis][ftt-split] — hop between the bounce on their side and their contact.
  [Mattspoint][mp-split] — peak of the jump at their contact. With HOP = 220 ms, a jump at
  −80 ms peaks at ~+30 ms and lands at ~+140 ms, consistent with all three.
- **Turn.** [Feel Tennis][ft-late] — catch the moment after the split step when direction
  becomes readable; once the ball has flown "about 5-6 metres" it is too late to initiate.
  [Scott Murphy][murphy] — "begin your coil when the ball leaves the opponent's racket."
- **Load and contact.** Murphy — "the coil is completed just before the ball bounces… the
  uncoiling starts at the moment the ball bounces," with contact "between the bounce and the
  apex of that bounce." [Filippov][filippov] — backswing ready and feet set at the bounce.
- **The lag is passive.** [Feel Tennis][ft-lag] — "the wrist must fall into the laid-back
  position by itself. We must allow it."

Caveat: only the split step has peer-reviewed work behind it ([Filipcic et al. 2017][pubmed]).
The rest is coaching convention that several independent sources agree on.

## Timing model

Projectile flight, no drag. Flight-time-to-bounce and bounce depth sampled per pace tier;
velocities and the net-crossing time follow. Post-bounce: 0.72× horizontal, **0.68× vertical**
(raised from 0.50 in v7 — it puts a rally ball's bounce apex at 0.81–1.05 m, hip height,
which is what makes a contact target meaningful).

- Turn target: `5.0 m / horizontal velocity`, clamped to [0.30, 0.42] s. Distance-based so a
  faster ball earns the turn sooner. The 300 ms floor exists because the app gives no
  pre-contact directional tell, so nothing below ~300 ms is reachable by reaction.
- Contact target: `bounce + f × (time to the top of the bounce)`, f from the Contact setting.
- The strike happens where the ball actually is — 1.6–5.0 m inside the baseline at "on the
  rise", at or behind the baseline at "top of bounce".

Measured (rally / on the rise): split −0.08 · turn 0.30–0.38 · load 1.00–1.20 · contact
1.22–1.45 · rise window 406–463 ms · contact height 0.64–0.84 m.

Grading: ≤60 ms on time · ≤130 ms close (counts as clean) · ≤260 ms early/late · beyond that
or no input, a miss. Wrong-way turns are misses. The summary also reports how many contacts
landed inside the rise window at all — imprecise and unplayable are different failures.

**Grace window.** Contact is also the moment the shot ends and the next feed begins, so a late
contact would have nowhere to land. The previous shot stays open for grading for 300 ms after
the ball leaves (`S.grading`), and a `hit` press during the next shot's feed phase is routed
to it. The rally ends when the *last* shot finishes grading, not when the counter reaches the
end — getting that wrong silently dropped the final rep.

## Colour

Categorical: split `#00A7B0`, turn `#966CD7`, load `#C78200`, contact `#D14A5F` — validated
all-pairs against the `#101A1F` surface (worst normal-vision ΔE 16.4, worst CVD 10.0). Accent
`#DCE84F`, status `#E3574A`.

The status red sits close to the load gold — unavoidable with an orange-ish gold. It never
carries meaning alone: the verdict always ships with a word, summary dots are always
cue-coloured, and an off-target rail pip is a **hollow ring** rather than a filled dot.

## Voice cues

`speechSynthesis` has 50–300 ms of unpredictable start latency, larger than the whole "on
time" window, so it cannot be used. The four words are pre-rendered, embedded as base64 PCM,
decoded once and scheduled on the audio clock.

1. **Per-word perceptual centre**: "split" 160 ms, "turn"/"load" 40 ms, "hit" 65 ms. Playback
   starts that much early so the stressed vowel lands on the trigger. Measured from the audio
   by `voice/inject-voice.py`, not hard-coded, so different recordings drop straight in.
2. **Clock mapping** via `getOutputTimestamp()` (fallback `currentTime` minus `outputLatency`),
   with a shot's whole soundtrack scheduled up front rather than fired from
   `requestAnimationFrame`. Verified by `test/timing-audio.mjs` to within 2 ms.

## Options

Pace · contact · shots per rally · cue rail · coach's voice · view. Persist per browser under
`stl.v4` with the last 400 reps.

## Known trade-offs / next moves

- **No pre-contact directional tell.** The turn is still pure reaction, held up by the 300 ms
  floor. A learnable tell in the opponent's stance would let the turn target follow the physics
  down and train anticipation — the highest-value remaining feature, and it would enrich the
  split beat too.
- Keyboard input measures decision timing, not body timing. Accelerometer for the split landing
  or webcam pose for the turn is the real upgrade.
- At "Early" contact the Load→Contact gap is only ~120 ms, close to a keyboard roll. Honest
  physics, but if it plays badly move the fraction from 0.30 to ~0.40.
- At Warm-up + "Top of bounce" contact reaches 1.3 m — a high loopy ball taken late. Real, but
  awkward; it is the one combination where the app is arguably teaching a bad choice.
- Recovery is always to the centre mark. Real recovery is to the bisector of the opponent's
  angles; since direction here is uniformly random, the centre *is* the bisector. Revisit only
  if the distribution stops being uniform.
- No serve-return mode. An audio-only "court mode" would let this run out loud during real
  hitting — the voice work is already done.
- The cue words are espeak-ng, i.e. robotic. Human recordings drop straight in via `npm run voice`.

[ftp-turn]: http://ftptennis.net/ftp-tennis-college/ftp-tennis-college-courses/technical-tennis/the-forehand/section-04-the-forehand-unit-turn/section-01-the-forehand-unit-turn-explained/
[ft-split]: https://www.feeltennis.net/split-step/
[ftt-split]: https://faulttoleranttennis.com/the-split-step-why-when-and-how/
[mp-split]: https://www.mattspoint.com/blog/practical-research-split-step-tennis
[ft-late]: https://www.feeltennis.net/stop-hitting-ball-late/
[murphy]: https://www.scottmurphytennis.net/scott-shots/two-secrets-to-great-timing/
[filippov]: https://www.theatlanticclub.com/club/scripts/clubpers/Files/Library/TIMING.PDF
[ft-lag]: https://www.feeltennis.net/forehand-wrist-lag/
[pubmed]: https://pubmed.ncbi.nlm.nih.gov/28210342/
