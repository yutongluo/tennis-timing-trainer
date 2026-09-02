/* The touch scheme infers which beat a tap belongs to, because the screen is one target.
   That inference is the risky part: load and contact are only ~220 ms apart at rally pace.
   These cases pin the behaviour down. */
import { open, check, done } from './_harness.mjs';

const { browser, page, errors } = await open({
  viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true
});

check('coarse pointer puts the app in touch mode',
      await page.evaluate(() => document.body.classList.contains('touch') && window.__stl.TOUCH));
check('the pad row is gone', await page.evaluate(() => !document.querySelector('#pads')));

/* Attribution, driven at exact synthetic times against a frozen shot. */
const r = await page.evaluate(() => {
  const M = window.__stl;
  const sh = M.makeShot(false);
  sh.targets = { split: -0.08, turn: 0.32, load: 1.10, hit: 1.33 };  // rally-pace spacing
  const at = t => { const c = M.nextBeat(sh, t); return c ? c.id : null; };
  const seq = [];
  const tap = t => { const c = M.nextBeat(sh, t); if (c) sh.hits[c.id] = { err: 0 }; seq.push(c ? c.id : null); };

  const single = { '-0.08': at(-0.08), '0.10': at(0.10), '0.32': at(0.32), '1.10': at(1.10), '1.33': at(1.33) };
  // four taps roughly on the beat, including the tight load -> contact pair
  [-0.07, 0.34, 1.09, 1.35].forEach(tap);
  const ordered = seq.slice();

  // skipping the load: a single tap near contact must read as contact, not a very late load
  const sh2 = M.makeShot(false);
  sh2.targets = { split: -0.08, turn: 0.32, load: 1.10, hit: 1.33 };
  sh2.hits = {}; const s2 = [];
  [-0.07, 0.33, 1.32].forEach(t => { const c = M.nextBeat(sh2, t); if (c) sh2.hits[c.id] = {err:0}; s2.push(c && c.id); });

  // never backwards: after taking the contact, a stray tap cannot fill the load
  const sh3 = M.makeShot(false);
  sh3.targets = { split: -0.08, turn: 0.32, load: 1.10, hit: 1.33 };
  sh3.hits = { hit: { err: 0 } };
  const after = M.nextBeat(sh3, 1.10);

  return { single, ordered, skipped: s2, afterContact: after && after.id };
});

check('a tap on each target picks that beat',
      JSON.stringify(r.single) === JSON.stringify({ '-0.08': 'split', '0.10': 'split', '0.32': 'turn', '1.10': 'load', '1.33': 'hit' }),
      JSON.stringify(r.single));
check('four taps land on the four beats in order — including the 220 ms load/contact pair',
      JSON.stringify(r.ordered) === '["split","turn","load","hit"]', JSON.stringify(r.ordered));
check('skipping the load does not cascade — the late tap is the contact',
      JSON.stringify(r.skipped) === '["split","turn","hit"]', JSON.stringify(r.skipped));
check('attribution never runs backwards past a beat already taken',
      r.afterContact === null, String(r.afterContact));

/* Wiring: a real tap on each half must reach the app with the right side. */
const wired = await page.evaluate(async () => {
  const M = window.__stl;
  document.querySelector('#seg-len button[data-v="6"]').click();
  document.querySelector('#b-start').click();
  await new Promise(r => setTimeout(r, 50));
  const out = {};
  const fire = (x) => {
    const el = document.querySelector('#taps');
    el.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: 200, bubbles: true, cancelable: true }));
  };
  // force the turn to be the beat in question, then tap each half
  const seen = [];
  for (const [x, label] of [[100, 'left'], [700, 'right']]) {
    const sh = M.S.shot; sh.hits = { split: { err: 0 } };
    sh.t0 = performance.now() - sh.targets.turn * 1000;      // pretend we are at the turn
    fire(x);
    seen.push({ half: label, side: sh.hits.turn ? (sh.hits.turn.wrongWay ? -sh.side : sh.side) : null });
  }
  out.seen = seen;
  out.zones = document.querySelectorAll('#taps .tz').length;
  M.stop();
  return out;
});
check('two tap zones exist', wired.zones === 2, String(wired.zones));
check('left half registers a left turn', wired.seen[0].side === -1, JSON.stringify(wired.seen[0]));
check('right half registers a right turn', wired.seen[1].side === 1, JSON.stringify(wired.seen[1]));

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
done();
