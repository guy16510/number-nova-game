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
  assert.equal(engine.snapshot().score, 0);
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
