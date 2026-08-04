import assert from 'node:assert/strict';
import test from 'node:test';
import { ChallengeFactory } from '../src/domain/ChallengeFactory';
import { SeededRandom } from '../src/domain/SeededRandom';

test('addition challenges contain one correct answer and unique options', () => {
  const factory = new ChallengeFactory(new SeededRandom(42));
  const challenge = factory.create(1);

  assert.equal(challenge.kind, 'addition');
  assert.equal(challenge.options.length, 3);
  assert.equal(new Set(challenge.options).size, 3);
  assert.notEqual(challenge.answer, undefined);
  assert.equal(challenge.options.filter((option) => option === challenge.answer).length, 1);
});

test('challenge sequence includes number, addition, and collection modes', () => {
  const factory = new ChallengeFactory(new SeededRandom(7));
  assert.equal(factory.create(0).kind, 'number');
  assert.equal(factory.create(1).kind, 'addition');
  assert.equal(factory.create(2).kind, 'collect');
});

test('all generated arithmetic answers stay within zero through ten', () => {
  const factory = new ChallengeFactory(new SeededRandom(99));
  for (let index = 0; index < 100; index += 1) {
    const challenge = factory.create(index % 2 === 0 ? 0 : 1);
    if (challenge.answer !== undefined) {
      assert.ok(challenge.answer >= 0);
      assert.ok(challenge.answer <= 10);
      assert.ok(challenge.options.every((option) => option >= 0 && option <= 10));
    }
  }
});
