import assert from 'node:assert/strict';
import test from 'node:test';
import { createLearningHint } from '../src/domain/HintDirector';
import type { ActiveChallenge } from '../src/domain/types';

const addition: ActiveChallenge = {
  id: 'addition', kind: 'addition', prompt: 'Solve 2 + 3', answer: 5, targetCount: 1, progress: 0, mathLevel: 1,
};

test('coach does not interrupt after the first miss', () => {
  assert.equal(createLearningHint(addition, 1), null);
});

test('second miss provides a concise visual hint', () => {
  const hint = createLearningHint(addition, 2);
  assert.equal(hint?.level, 1);
  assert.match(hint?.message ?? '', /answer is 5/i);
  assert.match(hint?.visual ?? '', /●/);
});

test('third miss escalates to a stronger explanation', () => {
  const hint = createLearningHint(addition, 3);
  assert.equal(hint?.level, 2);
  assert.match(hint?.message ?? '', /count on/i);
});
