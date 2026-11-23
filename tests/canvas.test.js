import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stillFrames } from '../js/canvas.js';

function counted(still, sig) {
  let painted = 0;
  const frames = stillFrames(still, () => sig.value, () => painted++);
  return { frames, painted: () => painted };
}

test('with full motion every frame paints', () => {
  const { frames, painted } = counted({ matches: false }, { value: 'a' });
  frames.draw();
  frames.draw();
  assert.equal(painted(), 2);
});

test('with reduced motion a frame paints only when what is visible changed', () => {
  const sig = { value: 'a' };
  const { frames, painted } = counted({ matches: true }, sig);
  frames.draw();
  frames.draw();
  assert.equal(painted(), 1);
  sig.value = 'b';
  frames.draw();
  assert.equal(painted(), 2);
});

test('after forget() the next frame paints even if nothing changed', () => {
  const { frames, painted } = counted({ matches: true }, { value: 'a' });
  frames.draw();
  frames.forget();
  frames.draw();
  assert.equal(painted(), 2);
});
