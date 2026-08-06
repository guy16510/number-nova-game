import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizePlaytests, type PlaytestSession } from '../src/domain/PlaytestTelemetry';

const session = (overrides: Partial<PlaytestSession>): PlaytestSession => ({
  id: 'session',
  missionMode: 'battle',
  controlMode: 'motion',
  outcome: 'complete',
  durationSeconds: 60,
  accuracy: 0.8,
  collisions: 2,
  shotsFired: 10,
  shotsHit: 8,
  hintsUsed: 1,
  frameStalls: 0,
  recordedAt: '2026-08-06T00:00:00.000Z',
  ...overrides,
});

test('playtest summary reports completion, abandonment, controls, and performance', () => {
  const summary = summarizePlaytests([
    session({ id: 'a' }),
    session({ id: 'b', outcome: 'abandoned', controlMode: 'touch', accuracy: 0.4, durationSeconds: 20, frameStalls: 3 }),
  ]);
  assert.equal(summary.sessions, 2);
  assert.equal(summary.completed, 1);
  assert.equal(summary.abandoned, 1);
  assert.equal(summary.completionRate, 0.5);
  assert.equal(summary.averageAccuracy, 0.6);
  assert.equal(summary.averageDurationSeconds, 40);
  assert.equal(summary.totalFrameStalls, 3);
  assert.equal(summary.motionSessions, 1);
  assert.equal(summary.touchSessions, 1);
});

test('empty playtest history returns a stable zero summary', () => {
  const summary = summarizePlaytests([]);
  assert.equal(summary.sessions, 0);
  assert.equal(summary.completionRate, 0);
  assert.equal(summary.averageAccuracy, 0);
});
