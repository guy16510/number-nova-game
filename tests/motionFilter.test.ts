import assert from 'node:assert/strict';
import test from 'node:test';
import { MotionFilter } from '../src/domain/MotionFilter';

test('calibration makes the current device angle neutral', () => {
  const filter = new MotionFilter({
    horizontalRangeRadians: 0.4,
    verticalRangeRadians: 0.3,
    deadZone: 0.05,
    smoothing: 1,
    sensitivity: 1,
  });
  filter.calibrate(0.2, -0.3);
  assert.deepEqual(filter.update(0.2, -0.3), { x: 0, y: 0 });
});

test('motion values are normalized and clamped', () => {
  const filter = new MotionFilter({
    horizontalRangeRadians: 0.4,
    verticalRangeRadians: 0.3,
    deadZone: 0,
    smoothing: 1,
    sensitivity: 1,
  });
  filter.calibrate(0, 0);
  assert.deepEqual(filter.update(-2, 2), { x: 1, y: 1 });
  assert.deepEqual(filter.update(2, -2), { x: -1, y: -1 });
});
