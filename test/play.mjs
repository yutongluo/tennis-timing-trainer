/* End to end: drive a full rally with a synthetic 160 ms late turn and assert the app
   reports that bias back. Also covers the two bugs this harness has actually caught —
   the final rep being dropped by the grading grace window, and a late contact failing
   to reach the shot it belonged to. */
import { open, check, done, BOT } from './_harness.mjs';

const SHOTS = 6;
const BIAS = { split: 30, turn: 160, load: 40, hit: 110 };
const { browser, page, errors } = await open();

await page.evaluate(([bot, shots, bias]) => {
  document.querySelector(`#seg-len button[data-v="${shots}"]`).click();
  document.querySelector('#seg-guide button[data-v="voice"]').click();
  window.__bot = eval(bot);
  window.__bot(bias);
  document.querySelector('#b-start').click();
}, [BOT, SHOTS, BIAS]);

await page.waitForFunction(() => !document.querySelector('#sheet-sum').hidden, null, { timeout: 90000 });
await page.waitForTimeout(300);

const r = await page.evaluate(() => {
  const reps = window.__stl.S.sess;
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const col = id => reps.map(x => x[id]).filter(v => v !== null && v !== undefined);
  return {
    reps: reps.length,
    means: Object.fromEntries(['split', 'turn', 'load', 'hit'].map(k => [k, col(k).length ? mean(col(k)) : null])),
    counts: Object.fromEntries(['split', 'turn', 'load', 'hit'].map(k => [k, col(k).length])),
    headline: document.querySelector('#sum-headline').textContent,
    strips: document.querySelectorAll('#sum-strips .strip').length,
    lanes: document.querySelectorAll('#rail .lane').length,
    stored: JSON.parse(localStorage.getItem('stl.v4') || '{}').hist?.length ?? 0
  };
});

check('every shot was graded (grace window closes the last one)', r.reps === SHOTS, `${r.reps}/${SHOTS}`);
for (const k of ['split', 'turn', 'load', 'hit'])
  check(`${k}: every rep recorded`, r.counts[k] === SHOTS, `${r.counts[k]}/${SHOTS}`);
for (const k of ['split', 'turn', 'load', 'hit']) {
  const err = r.means[k] - BIAS[k];
  check(`${k}: reported bias matches the injected one`, Math.abs(err) < 45,
        `reported ${r.means[k].toFixed(0)} ms vs injected ${BIAS[k]} ms`);
}
check('headline names the worst beat', /turn/i.test(r.headline), r.headline.slice(0, 60) + '…');
check('one summary strip per beat', r.strips === 4, `${r.strips}`);
check('one rail lane per beat', r.lanes === 4, `${r.lanes}`);
check('reps persisted to localStorage', r.stored === SHOTS, `${r.stored} rows`);
check('no page errors', errors.length === 0, errors.join(' | '));

await browser.close();
done();
