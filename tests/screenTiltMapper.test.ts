import assert from 'node:assert/strict';
import test from 'node:test';
import { mapGravityToScreenTilt } from '../src/domain/ScreenTiltMapper';

const gravityZ = Math.sqrt(1 - 0.16);

test('portrait inverts raw device x into screen steering direction', () => {
  const tilt = mapGravityToScreenTilt({ x: 0.4, y: 0, z: gravityZ }, 0);
  assert.ok(tilt.gamma < 0);
  assert.ok(Math.abs(tilt.beta) < 0.0001);
});

test('landscape left maps positive portrait y to negative horizontal steering', () => {
  const tilt = mapGravityToScreenTilt({ x: 0, y: 0.4, z: gravityZ }, -90);
  assert.ok(tilt.gamma < 0);
  assert.ok(Math.abs(tilt.beta) < 0.0001);
});

test('landscape right maps negative portrait y to negative horizontal steering', () => {
  const tilt = mapGravityToScreenTilt({ x: 0, y: -0.4, z: gravityZ }, 90);
  assert.ok(tilt.gamma < 0);
  assert.ok(Math.abs(tilt.beta) < 0.0001);
});

test('upside down reverses both screen axes', () => {
  const normal = mapGravityToScreenTilt({ x: 0.3, y: 0.2, z: 0.93 }, 0);
  const upsideDown = mapGravityToScreenTilt({ x: 0.3, y: 0.2, z: 0.93 }, 180);
  assert.ok(normal.gamma < 0);
  assert.ok(normal.beta > 0);
  assert.ok(upsideDown.gamma > 0);
  assert.ok(upsideDown.beta < 0);
});
