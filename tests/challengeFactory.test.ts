import assert from 'node:assert/strict';
import test from 'node:test';
import { ChallengeFactory } from '../src/domain/ChallengeFactory';
import { SeededRandom } from '../src/domain/SeededRandom';

test('the curriculum begins at exactly 1 + 1 with one correct unique option', () => {
  const factory = new ChallengeFactory(new SeededRandom(42));
  const challenge = factory.create(0);

  assert.equal(challenge.kind, 'addition');
  assert.equal(challenge.prompt, 'Solve 1 + 1');
  assert.equal(challenge.answer, 2);
  assert.equal(challenge.options.length, 3);
  assert.equal(new Set(challenge.options).size, 3);
  assert.equal(challenge.options.filter((option) => option === challenge.answer).length, 1);
});

test('the mission sequence introduces the complete progressive curriculum', () => {
  const factory = new ChallengeFactory(new SeededRandom(7));
  const expected = [
    'addition',
    'number',
    'collect',
    'addition',
    'rescue',
    'comparison',
    'gate',
    'subtraction',
    'defense',
    'rapid',
    'memory',
  ] as const;

  expected.forEach((kind, index) => {
    assert.equal(factory.create(index, { mathLevel: Math.min(7, Math.floor(index / 2)) }).kind, kind);
  });
});

test('all generated answers and distractors remain within zero through twenty', () => {
  const factory = new ChallengeFactory(new SeededRandom(99));
  for (let mathLevel = 0; mathLevel <= 7; mathLevel += 1) {
    for (let index = 0; index < 80; index += 1) {
      const challenge = factory.create(index, { mathLevel });
      if (challenge.answer !== undefined) {
        assert.ok(challenge.answer >= 0);
        assert.ok(challenge.answer <= 20);
        assert.ok(challenge.options.every((option) => option >= 0 && option <= 20));
        assert.equal(new Set(challenge.options).size, challenge.options.length);
        assert.equal(challenge.options.filter((option) => option === challenge.answer).length, 1);
      }
    }
  }
});
