import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_ANGLE, MAX_WIND, MIN_ANGLE, STREETS, WINS, aimComputer, carry, createMatch, fly, guide, learn, loseRun, matchPoints, newMemory, newRun,
  rivalFor, rollWind, seeded, shown, solvePower, stageFor, takeTurn, winMatch,
} from '../games/lob/rules.js';

const street = STREETS[0];
const wide = stageFor(street, false);
const tall = stageFor(street, true);
const low = (portrait) => stageFor(street, portrait, 0);   // a chimney no higher than the roofs, out of the way

test('the same throw always flies the same way', () => {
  assert.deepEqual(fly(wide, 'left', 45, 70, 3), fly(wide, 'left', 45, 70, 3));
});

test('a throw from the right goes left, and mirrors a throw from the left', () => {
  const left = fly(wide, 'left', 45, 70, 0).path;
  const right = fly(wide, 'right', 45, 70, 0).path;
  assert.ok(left[5][0] > left[0][0]);
  assert.ok(right[5][0] < right[0][0]);
});

test('more power goes further, and wind pushes the bulb along its own direction', () => {
  assert.ok(carry(wide, 'left', 45, 80, 0) > carry(wide, 'left', 45, 60, 0));
  assert.ok(carry(wide, 'left', 45, 70, 5) > carry(wide, 'left', 45, 70, 0), 'a tail wind carries further');
  assert.ok(carry(wide, 'left', 45, 70, -5) < carry(wide, 'left', 45, 70, 0), 'a head wind carries less');
  assert.ok(carry(wide, 'right', 45, 70, -5) > carry(wide, 'right', 45, 70, 0), 'the wind blows the other way for the right side');
});

test('a bulb that lands short falls on a roof or the street, one that is far too strong flies away', () => {
  assert.ok(['roof', 'street'].includes(fly(wide, 'left', 45, 30, 0).where));
  assert.ok(['away', 'street'].includes(fly(wide, 'left', 60, 100, 0).where));
  assert.equal(fly(wide, 'left', 45, 30, 0).hit, false);
});

test('the solved power hits the middle of the other billboard on every street, both ways, upright or not', () => {
  for (const s of STREETS) {
    for (const portrait of [false, true]) {
      const stage = stageFor(s, portrait, 0);
      for (const side of ['left', 'right']) {
        const angle = portrait ? 64 : 45;
        const power = solvePower(stage, side, angle, 0);
        assert.ok(fly(stage, side, angle, power, 0).hit, `${s.name} ${portrait ? 'upright' : 'wide'} ${side}`);
      }
    }
  }
});

/** Every street and shape, with the chimney each rival of a run would face. */
const stages = () => STREETS.flatMap((st) => [false, true].flatMap((portrait) =>
  [0, 4, 8, 12].map((level) => ({ level, stage: stageFor(st, portrait, rivalFor(level).stack), portrait }))));

test('a flat throw at full power hits the chimney, so it no longer wins', () => {
  for (const { stage, level } of stages()) {
    for (const side of ['left', 'right']) {
      assert.equal(fly(stage, side, stage.portrait ? 25 : 12, 100, 0).where, 'chimney', `${stage.street.name} level ${level} ${side}`);
    }
  }
});

test('no flat throw at full power (up to 25 degrees) hits the billboard, wind or not', () => {
  for (const { stage } of stages()) {
    for (const side of ['left', 'right']) {
      for (let angle = 5; angle <= 25; angle++) {
        for (const wind of [-MAX_WIND, 0, MAX_WIND]) assert.equal(fly(stage, side, angle, 100, wind).hit, false);
      }
    }
  }
});

test('a lob always gets over the chimney and onto the billboard, from every roof of every rival', () => {
  for (const { stage, level } of stages()) {
    for (const side of ['left', 'right']) {
      const found = [...Array(MAX_ANGLE - MIN_ANGLE + 1)].some((_, i) => {
        const angle = MIN_ANGLE + i;
        return fly(stage, side, angle, solvePower(stage, side, angle, 0), 0).hit;
      });
      assert.ok(found, `${stage.street.name} ${stage.portrait ? 'upright' : 'wide'} level ${level} ${side}`);
    }
  }
});

test('a hit exists in the strongest wind, both ways, on every street and shape', () => {
  for (const { stage, level } of stages()) {
    for (const side of ['left', 'right']) {
      for (const wind of [-MAX_WIND, MAX_WIND]) {
        const found = [...Array(MAX_ANGLE - MIN_ANGLE + 1)].some((_, i) => {
          const angle = MIN_ANGLE + i;
          return fly(stage, side, angle, solvePower(stage, side, angle, wind), wind).hit;
        });
        assert.ok(found, `${stage.street.name} ${stage.portrait ? 'upright' : 'wide'} level ${level} ${side} wind ${wind}`);
      }
    }
  }
});

test('the chimney stands between the roofs and grows with the rivals up to a limit', () => {
  for (const { stage } of stages()) {
    assert.ok(stage.chimney.x0 > stage.sides.left.x1 && stage.chimney.x1 < stage.sides.right.x0);
    assert.ok(stage.chimney.top > Math.max(stage.sides.left.roof, stage.sides.right.roof));
  }
  const stacks = Array.from({ length: 14 }, (_, i) => rivalFor(i).stack);
  assert.ok(stacks.every((v, i) => i === 0 || v >= stacks[i - 1]));
  assert.ok(stacks[0] < stacks[13] && stacks[13] <= 26);
});

test('an upright stage has its rooftops closer than a wide one', () => {
  const gap = (st) => st.sides.right.x0 - st.sides.left.x1;
  assert.ok(gap(tall) < gap(wide));
  assert.ok(tall.h > tall.w && wide.w > wide.h);
});

test('the guide is only the start of the arc', () => {
  const full = fly(low(false), 'left', 45, 70, 0).path;
  const start = guide(low(false), 'left', 45, 70, 0);
  assert.ok(start.length > 10 && start.length < full.length / 2);
  assert.deepEqual(start, full.slice(0, start.length));
});

test('the wind is a whole number within the rival\'s limit', () => {
  const rand = seeded(5);
  for (let i = 0; i < 200; i++) {
    const w = rollWind(rand, 4);
    assert.ok(Number.isInteger(w) && Math.abs(w) <= 4);
  }
});

test('three hits put a billboard out and end the match at once', () => {
  const stage = wide;
  const match = createMatch({ stage, windMax: 0, rand: seeded(1) });
  const power = solvePower(stage, 'left', 45, 0);
  const miss = () => takeTurn(match, 45, 10);
  for (let k = 1; k <= WINS; k++) {
    assert.equal(match.turn, 'left');
    const f = takeTurn(match, 45, power);
    assert.ok(f.hit);
    assert.equal(match.hits.right, k);
    if (k < WINS) { assert.equal(match.turn, 'right'); miss(); }
  }
  assert.equal(match.winner, 'left');
  assert.equal(match.throws.left, WINS);
  assert.throws(() => takeTurn(match, 45, power));
});

test('the wind changes after every throw', () => {
  const match = createMatch({ stage: wide, windMax: 9, rand: seeded(8) });
  const seen = new Set([match.wind]);
  for (let i = 0; i < 20; i++) { takeTurn(match, 45, 10); seen.add(match.wind); }
  assert.ok(seen.size > 3);
});

test('rivals get better one after another, with more wind, up to a limit', () => {
  const rivals = Array.from({ length: 14 }, (_, i) => rivalFor(i));
  for (let i = 1; i < rivals.length; i++) {
    assert.ok(rivals[i].skill >= rivals[i - 1].skill);
    assert.ok(rivals[i].windMax >= rivals[i - 1].windMax);
  }
  assert.ok(rivals[0].skill < rivals[5].skill);
  assert.ok(rivals[13].skill <= 0.9 && rivals[13].windMax <= MAX_WIND);
  assert.ok(rivals[0].windMax >= 4 && rivals[13].windMax === MAX_WIND);
  assert.notEqual(rivals[0].sign, rivals[1].sign);
  assert.notEqual(rivals[0].street, rivals[1].street);
});

/** Throws the computer needs to hit once, over many seeds. */
function throwsToHit(level, seed, { portrait = false } = {}) {
  const rival = rivalFor(level);
  const rand = seeded(seed);
  const stage = stageFor(rival.street, portrait, rival.stack);
  const match = createMatch({ stage, windMax: rival.windMax, rand });
  match.turn = 'right';
  const memory = newMemory();
  for (let n = 1; n <= 12; n++) {
    const shot = aimComputer({ stage, side: 'right', wind: match.wind, skill: rival.skill, memory, rand });
    const flight = takeTurn(match, shot.angle, shot.power);
    if (flight.hit) return n;
    learn(memory, stage, 'right', { ...shot, wind: flight.wind }, flight);
    match.turn = 'right'; // only the computer throws here
  }
  return 13;
}

/** Throws the computer needs to put three bulbs on the billboard, the match's end. */
function throwsToWin(level, seed, { portrait = false } = {}) {
  const rival = rivalFor(level);
  const rand = seeded(seed);
  const stage = stageFor(rival.street, portrait, rival.stack);
  const match = createMatch({ stage, windMax: rival.windMax, rand });
  match.turn = 'right';
  const memory = newMemory();
  let n = 0;
  while (!match.winner && n < 40) {
    const shot = aimComputer({ stage, side: 'right', wind: match.wind, skill: rival.skill, memory, rand });
    const flight = takeTurn(match, shot.angle, shot.power);
    learn(memory, stage, 'right', { ...shot, wind: flight.wind }, flight);
    match.turn = 'right';
    n++;
  }
  return n;
}

const average = (level, opts) => {
  let sum = 0;
  for (let seed = 1; seed <= 60; seed++) sum += throwsToHit(level, seed, opts);
  return sum / 60;
};

test('the computer usually misses with its first throw, then closes in', () => {
  let firstHits = 0;
  for (let seed = 1; seed <= 60; seed++) if (throwsToHit(0, seed) === 1) firstHits++;
  assert.ok(firstHits < 30, `${firstHits} of 60 first throws hit`);
  assert.ok(average(0) < 6, `average ${average(0)}`);
});

test('the computer wins a match in under 7 throws on average, and a late rival in fewer', () => {
  const matchThrows = (level, opts) => {
    let sum = 0;
    for (let seed = 1; seed <= 60; seed++) sum += throwsToWin(level, seed, opts);
    return sum / 60;
  };
  for (const opts of [{}, { portrait: true }]) {
    assert.ok(matchThrows(0, opts) < 8, `first rival ${matchThrows(0, opts)} ${JSON.stringify(opts)}`);
    assert.ok(matchThrows(12, opts) <= matchThrows(0, opts), JSON.stringify(opts));
  }
});

test('the computer steadies its hand and reads the wind better with each throw', () => {
  const rand = seeded(5);
  const spread = (throws) => {
    const powers = [];
    for (let i = 0; i < 80; i++) {
      const memory = { last: null, throws };
      powers.push(aimComputer({ stage: wide, side: 'right', wind: 0, skill: 0.3, memory, rand }).power);
    }
    const mean = powers.reduce((a, b) => a + b, 0) / powers.length;
    return Math.sqrt(powers.reduce((a, b) => a + (b - mean) ** 2, 0) / powers.length);
  };
  assert.ok(spread(4) < spread(0) / 2, `${spread(4)} against ${spread(0)}`);
});

test('a later rival hits sooner than the first, on a wide and on an upright stage', () => {
  for (const opts of [{}, { portrait: true }]) {
    assert.ok(average(8, opts) < average(0, opts), JSON.stringify(opts));
  }
});

test('the computer lifts its angle after a bulb hits the chimney', () => {
  const memory = newMemory();
  learn(memory, wide, 'right', { angle: 20, power: 90, wind: 0 }, { where: 'chimney' });
  const shot = aimComputer({ stage: wide, side: 'right', wind: 0, skill: 0.9, memory, rand: seeded(3) });
  assert.ok(shot.angle > 20);
});

test('after hitting the chimney, the computer aims a throw that clears it, on every street and shape', () => {
  for (const { stage, level } of stages()) {
    const rand = seeded(level + 1);
    const memory = newMemory();
    learn(memory, stage, 'right', { angle: 8, power: 90, wind: 0 }, { where: 'chimney' });
    const shot = aimComputer({ stage, side: 'right', wind: 0, skill: 0.9, memory, rand });
    const worked = fly(stage, 'right', shot.angle, solvePower(stage, 'right', shot.angle, 0), 0);
    assert.notEqual(worked.where, 'chimney', `${stage.street.name} ${stage.portrait ? 'upright' : 'wide'} level ${level}`);
  }
});

test('the computer scales its power by how far off it landed', () => {
  const stage = wide;
  const memory = newMemory();
  learn(memory, stage, 'right', { angle: 45, power: 40, wind: 0 }, null);
  const rand = seeded(3);
  const shot = aimComputer({ stage, side: 'right', wind: 0, skill: 0.9, memory, rand });
  assert.ok(shot.power > 40, 'it was short, so it throws harder');
  learn(memory, stage, 'right', { angle: 45, power: 100, wind: 0 }, null);
  assert.ok(aimComputer({ stage, side: 'right', wind: 0, skill: 0.9, memory, rand }).power < 100, 'it was long, so it throws softer');
});

test('a won match is worth 100 and ten more for every throw under ten', () => {
  assert.equal(matchPoints(3), 170);
  assert.equal(matchPoints(10), 100);
  assert.equal(matchPoints(25), 100);
});

test('a run ends on a loss and keeps its score', () => {
  const run = newRun();
  winMatch(run, 5);
  winMatch(run, 12);
  assert.deepEqual({ level: run.level, beaten: run.beaten, score: run.score }, { level: 2, beaten: 2, score: 250 });
  loseRun(run);
  assert.equal(run.over, true);
  assert.equal(run.score, 250);
});

test('while a throw is in the air, its hit and its new wind are not shown yet', () => {
  const match = createMatch({ stage: wide, windMax: 9, rand: seeded(12) });
  const thrownIn = match.wind;
  const flight = takeTurn(match, 45, solvePower(wide, 'left', 45, thrownIn));
  assert.ok(flight.hit);
  assert.deepEqual(shown(match, flight, false), { hits: { left: 0, right: 0 }, wind: thrownIn });
  assert.deepEqual(shown(match, flight, true).hits, { left: 0, right: 1 });
  assert.deepEqual(shown(match, null, false), { hits: match.hits, wind: match.wind });
});
