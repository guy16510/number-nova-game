import assert from 'node:assert/strict';
import test from 'node:test';
import { mapGravityToScreenTilt } from '../src/domain/ScreenTiltMapper';

test('horizontal screen tilt maps in the same direction as ship movement', () => {
  const tiltRight = mapGravityToScreenTilt({ x: -4, y: 0, z: 8 }, 0);
  const tiltLeft = mapGravityToScreenTilt({ x: 4, y: 0, z: 8 }, 0);

  assert.ok(tiltRight.gamma > 0, 'tilting right should produce positive horizontal steering');
  assert.ok(tiltLeft.gamma < 0, 'tilting left should produce negative horizontal steering');
});

test('landscape orientation remaps portrait sensor axes before steering', () => {
  const landscapeLeft = mapGravityToScreenTilt({ x: 0, y: 4, z: 8 }, 90);
  const landscapeRight = mapGravityToScreenTilt({ x: 0, y: -4, z: 8 }, 90);

  assert.ok(landscapeLeft.gamma > 0);
  assert.ok(landscapeRight.gamma < 0);
});
