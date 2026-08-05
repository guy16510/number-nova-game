import assert from 'node:assert/strict';
import test from 'node:test';
import { GameEngine } from '../src/domain/GameEngine';

const resolveCurrentAnswer = (engine: GameEngine): void => {
  const correct = engine.snapshot().entities.find((entity) => entity.kind === 'answer' && entity.correct);
  if (!correct) {
    throw new Error('expected a correct answer target');
  }
  assert.equal(engine.resolveTarget(correct.id), true);
};

const advance = (engine: GameEngine, seconds: number): void => {
  const steps = Math.ceil(seconds * 60);
  for (let index = 0; index < steps; index += 1) {
    engine.update(1 / 60, { x: 0, y: 0 });
  }
};

test('engine starts with answer targets and rejects a wrong target', () => {
  const engine = new GameEngine({ seed: 1, totalChallenges: 1 });
  engine.start();
  const snapshot = engine.snapshot();
  const wrong = snapshot.entities.find((entity) => entity.kind === 'answer' && !entity.correct);
  if (!wrong) {
    throw new Error('expected a wrong answer target');
  }
  assert.equal(engine.resolveTarget(wrong.id), false);
  const result = engine.snapshot();
  assert.equal(result.score, 0);
  assert.equal(result.combo, 0);
  assert.equal(result.shotsFired, 1);
  assert.notEqual(result.laser, null);
});

test('fire always produces a visible shot and observes laser cooldown', () => {
  const engine = new GameEngine({ seed: 11, totalChallenges: 1 });
  engine.start();

  assert.equal(engine.fire(), true);
  const fired = engine.snapshot();
  assert.equal(fired.shotsFired, 1);
  assert.notEqual(fired.laser, null);
  assert.equal(engine.fire(), false);

  advance(engine, 0.35);
  assert.equal(engine.fire(), true);
  assert.equal(engine.snapshot().shotsFired, 2);
});

test('correct hits build a combat combo', () => {
  const engine = new GameEngine({ seed: 21, totalChallenges: 2 });
  engine.start();
  resolveCurrentAnswer(engine);
  advance(engine, 1);
  resolveCurrentAnswer(engine);

  const result = engine.snapshot();
  assert.equal(result.combo, 2);
  assert.equal(result.bestCombo, 2);
  assert.equal(result.shotsFired, 2);
  assert.ok(result.score >= 225);
});

test('correct answers advance into a boss and three boss hits complete the game', () => {
  const engine = new GameEngine({ seed: 5, totalChallenges: 1 });
  engine.start();
  resolveCurrentAnswer(engine);
  advance(engine, 1);
  assert.equal(engine.snapshot().phase, 'boss');

  for (let hit = 0; hit < 3; hit += 1) {
    resolveCurrentAnswer(engine);
    if (hit < 2) {
      advance(engine, 1);
    }
  }

  const result = engine.snapshot();
  assert.equal(result.phase, 'complete');
  assert.equal(result.bossHealth, 0);
  assert.ok(result.score >= 1750);
});

test('magnet completes the collection mission and advances to the boss', () => {
  const engine = new GameEngine({ seed: 123, totalChallenges: 3, worldSpeed: 0.18 });
  engine.start();
  resolveCurrentAnswer(engine);
  advance(engine, 1);
  resolveCurrentAnswer(engine);
  advance(engine, 1);
  assert.equal(engine.snapshot().challenge.kind, 'collect');

  assert.equal(engine.useShield(), true);
  assert.equal(engine.useMagnet(), true);
  advance(engine, 12);

  const result = engine.snapshot();
  assert.equal(result.phase, 'boss');
  assert.ok(result.stars >= 4);
  assert.ok(result.ship.hearts > 0);
});

test('power ups have limited charges', () => {
  const engine = new GameEngine({ seed: 2 });
  engine.start();
  assert.equal(engine.useShield(), true);
  assert.equal(engine.useShield(), false);
  advance(engine, 6);
  assert.equal(engine.useShield(), true);
  advance(engine, 6);
  assert.equal(engine.useShield(), false);
});

test('respawns an answer wave when the correct target leaves the world', () => {
  const seed = 3;
  const engine = new GameEngine({ seed });
  engine.start();

  for (let frame = 1; frame <= 400; frame += 1) {
    engine.update(1 / 60, {
      x: Math.sin((frame + seed * 17) * 0.041),
      y: Math.cos((frame + seed * 11) * 0.029) * 0.8,
    });
    const answers = engine.snapshot().entities.filter((entity) => entity.kind === 'answer');
    if (answers.length > 0) {
      assert.equal(
        answers.filter((entity) => entity.correct === true).length,
        1,
        `frame ${frame} has no reachable correct answer`,
      );
    }
  }
});
