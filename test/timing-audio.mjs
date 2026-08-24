/* Every cue must be heard on its trigger. speechSynthesis cannot do this (50–300 ms of
   unpredictable start latency), so the words are scheduled on the audio clock, started
   early by each word's perceptual centre. This asserts that arithmetic end to end. */
import { open, check, done } from './_harness.mjs';

const TOL = 0.002;   // 2 ms
const { browser, page, errors } = await open();

const r = await page.evaluate(async () => {
  const M = window.__stl;
  document.querySelector('#seg-guide button[data-v="voice"]').click();

  const words = [], osc = [];
  const OS = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (w) { words.push({ dur: this.buffer.duration, when: w }); return OS.call(this, w); };
  const OO = OscillatorNode.prototype.start;
  OscillatorNode.prototype.start = function (w) { osc.push(w); return OO.call(this, w); };

  document.querySelector('#b-start').click();
  await new Promise(r => setTimeout(r, 300));
  const sh = M.S.shot;
  M.stop();
  // osc[0] is the opponent's contact, i.e. the audio-clock image of the shot's t = 0
  return { t0: osc[0], bounce: osc[1], words, targets: sh.targets, tb: sh.tb };
});

// durations identify the words without depending on decode order
const PC = { 0.431: ['split', 0.160], 0.368: ['turn', 0.040], 0.403: ['load', 0.040], 0.320: ['hit', 0.065] };

check('all four cue words were scheduled', r.words.length === 4, `${r.words.length} scheduled`);
for (const w of r.words) {
  const [name, pc] = PC[+w.dur.toFixed(3)] || ['?', 0];
  const want = r.t0 + r.targets[name] - pc;
  const err = (w.when - want) * 1000;
  check(`"${name}" lands on its trigger`, Math.abs(w.when - want) < TOL, `${err >= 0 ? '+' : ''}${err.toFixed(2)} ms`);
}
const bErr = (r.bounce - (r.t0 + r.tb)) * 1000;
check('bounce sound lands on the bounce', Math.abs(r.bounce - (r.t0 + r.tb)) < TOL, `${bErr >= 0 ? '+' : ''}${bErr.toFixed(2)} ms`);
check('no page errors', errors.length === 0, errors.join(' | '));

await browser.close();
done();
