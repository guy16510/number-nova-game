import assert from 'node:assert/strict';
import test from 'node:test';
import { ChallengeFactory } from '../src/domain/ChallengeFactory';
import { GameEngine } from '../src/domain/GameEngine';
import { SeededRandom } from '../src/domain/SeededRandom';

const advance = (engine: GameEngine, seconds: number, x = 0, y = 0): void => {
  for (let frame = 0; frame < Math.ceil(seconds * 60); frame += 1) engine.update(1 / 60, { x, y });
};

const correctTarget = (engine: GameEngine) => engine.snapshot().entities.find((entity) => entity.shootable && entity.correct === true);

const hitCorrect = (engine: GameEngine): void => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const target = correctTarget(engine);
    if (target) {
      engine.resolveTarget(target.id);
      advance(engine, 0.18);
      return;
    }
    advance(engine, 0.2);
  }
  throw new Error('expected a correct target');
};

test('progressive math begins at exactly 1 + 1', () => {
  const factory = new ChallengeFactory(new SeededRandom(1));
  const challenge = factory.create(0, { mathLevel: 0 });
  assert.equal(challenge.kind, 'addition');
  assert.equal(challenge.prompt, 'Solve 1 + 1');
  assert.equal(challenge.answer, 2);
  assert.deepEqual([...challenge.options].sort((a, b) => a - b).includes(2), true);
});

test('math progression introduces subtraction, comparison, memory, rescue, gates, defense, and rapid recall', () => {
  const factory = new ChallengeFactory(new SeededRandom(19));
  const kinds = new Set<string>(Array.from({ length: 11 }, (_, index) => factory.create(index, { mathLevel: Math.min(7, Math.floor(index / 2)) }).kind));
  for (const expected of ['addition', 'number', 'collect', 'rescue', 'comparison', 'gate', 'subtraction', 'defense', 'rapid', 'memory']) {
    assert.equal(kinds.has(expected), true, `missing ${expected}`);
  }
});

test('aiming does not auto-fire and pressing fire always creates a shot', () => {
  const engine = new GameEngine({ seed: 4, totalChallenges: 1 });
  engine.start();
  const challengeId = engine.snapshot().challenge.id;
  advance(engine, 2);
  assert.equal(engine.snapshot().challenge.id, challengeId);
  assert.equal(engine.snapshot().score, 0);
  assert.equal(engine.fire(), true);
  const fired = engine.snapshot();
  assert.equal(fired.shotsFired, 1);
  assert.notEqual(fired.laser, null);
  assert.ok(fired.entities.some((entity) => entity.kind === 'projectile'));
  assert.equal(engine.fire(), false);
});

test('wrong enemies explode without advancing the challenge', () => {
  const engine = new GameEngine({ seed: 5, totalChallenges: 1 });
  engine.start();
  const before = engine.snapshot();
  const wrong = before.entities.find((entity) => entity.shootable && entity.correct === false);
  assert.ok(wrong);
  assert.equal(engine.resolveTarget(wrong.id), false);
  const after = engine.snapshot();
  assert.equal(after.challenge.id, before.challenge.id);
  assert.equal(after.challenge.progress, 0);
  assert.equal(after.combo, 0);
  assert.ok(after.entities.some((entity) => entity.kind === 'explosion'));
});

test('correct answers build combos and advance to harder math', () => {
  const engine = new GameEngine({ seed: 6, totalChallenges: 3 });
  engine.start();
  hitCorrect(engine);
  advance(engine, 0.8);
  assert.equal(engine.snapshot().challengeNumber, 2);
  hitCorrect(engine);
  advance(engine, 0.8);
  const snapshot = engine.snapshot();
  assert.equal(snapshot.challengeNumber, 3);
  assert.equal(snapshot.combo, 2);
  assert.equal(snapshot.bestCombo, 2);
  assert.ok(snapshot.score >= 275);
});

test('shield ships require multiple successful hits', () => {
  const engine = new GameEngine({ seed: 8, totalChallenges: 8 });
  engine.start();
  while (engine.snapshot().challengeNumber < 5 && engine.snapshot().phase === 'playing') {
    const snapshot = engine.snapshot();
    if (snapshot.challenge.kind === 'collect') {
      engine.useShield();
      engine.useMagnet();
      for (let frame = 0; frame < 1500 && engine.snapshot().challenge.id === snapshot.challenge.id; frame += 1) {
        const star = engine.snapshot().entities.filter((entity) => entity.kind === 'star').sort((a, b) => a.z - b.z)[0];
        engine.update(1 / 60, star ? {
          x: Math.max(-1, Math.min(1, star.x / 0.88)),
          y: Math.max(-1, Math.min(1, (star.y - 0.3) / 0.45)),
        } : { x: 0, y: 0 });
      }
    } else {
      hitCorrect(engine);
      advance(engine, 0.65);
    }
  }
  const shielded = correctTarget(engine);
  assert.ok(shielded);
  assert.equal(shielded.health, 2);
  assert.equal(engine.resolveTarget(shielded.id), true);
  const cracked = engine.snapshot().entities.find((entity) => entity.id === shielded.id);
  assert.equal(cracked?.health, 1);
  assert.equal(engine.snapshot().challenge.progress, 0);
});

test('collection missions can be completed with steering and the magnet', () => {
  const engine = new GameEngine({ seed: 123, totalChallenges: 3, worldSpeed: 0.16 });
  engine.start();
  hitCorrect(engine);
  advance(engine, 0.8);
  hitCorrect(engine);
  advance(engine, 0.8);
  assert.equal(engine.snapshot().challenge.kind, 'collect');
  engine.useShield();
  engine.useMagnet();

  for (let frame = 0; frame < 1800 && engine.snapshot().phase === 'playing'; frame += 1) {
    const star = engine.snapshot().entities.filter((entity) => entity.kind === 'star').sort((left, right) => left.z - right.z)[0];
    engine.update(1 / 60, star ? {
      x: Math.max(-1, Math.min(1, star.x / 0.88)),
      y: Math.max(-1, Math.min(1, (star.y - 0.3) / 0.45)),
    } : { x: 0, y: 0 });
  }

  const result = engine.snapshot();
  assert.equal(result.phase, 'boss');
  assert.ok(result.stars >= 3);
});

test('boss battle has three stages and grants a reward', () => {
  const engine = new GameEngine({ seed: 13, totalChallenges: 1 });
  engine.start();
  hitCorrect(engine);
  advance(engine, 0.9);
  assert.equal(engine.snapshot().phase, 'boss');
  assert.equal(engine.snapshot().bossStage, 1);

  for (let stage = 1; stage <= 3; stage += 1) {
    for (let guard = 0; guard < 12 && engine.snapshot().bossStage === stage && engine.snapshot().phase === 'boss'; guard += 1) {
      hitCorrect(engine);
      advance(engine, 0.5);
    }
  }

  const result = engine.snapshot();
  assert.equal(result.phase, 'complete');
  assert.equal(result.bossHealth, 0);
  assert.ok(result.reward);
  assert.ok(result.score >= 1800);
});

test('adaptive difficulty keeps values bounded', () => {
  const engine = new GameEngine({ seed: 21 });
  engine.start();
  for (let frame = 0; frame < 1500; frame += 1) {
    if (frame % 80 === 0) engine.fire();
    engine.update(1 / 60, { x: Math.sin(frame * 0.041), y: Math.cos(frame * 0.029) * 0.8 });
    const snapshot = engine.snapshot();
    assert.ok(snapshot.entities.length <= 42);
    assert.ok(snapshot.ship.x >= -0.951 && snapshot.ship.x <= 0.951);
    assert.ok(snapshot.ship.y >= -0.151 && snapshot.ship.y <= 0.801);
    assert.ok(snapshot.challenge.mathLevel >= 0 && snapshot.challenge.mathLevel <= 7);
    assert.ok(snapshot.accuracy >= 0 && snapshot.accuracy <= 1);
    if (snapshot.phase === 'failed' || snapshot.phase === 'complete') break;
  }
});
