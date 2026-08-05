import assert from 'node:assert/strict';
import test from 'node:test';
import { applySessionToMastery, createEmptyMasteryProfile, type MissionPlan } from '../src/domain/LearningModel';

const mission: MissionPlan = {
  id: 'story-0-addition', mode: 'story', title: 'Addition', subtitle: 'Test', focusSkill: 'addition', reviewSkill: 'number-recognition', stretchSkill: 'fluency', mathLevel: 1, challengeCount: 10, difficultyLabel: 'Balanced', planet: 'Nova', accent: '#fff', rewardPreview: 'Reward',
};

test('completed accurate missions increase focused mastery and schedule review', () => {
  const now = new Date('2026-08-05T12:00:00.000Z');
  const next = applySessionToMastery(createEmptyMasteryProfile(), mission, {
    phase: 'complete', accuracy: 0.92, collisions: 1, hintsUsed: 0,
  }, now);
  assert.equal(next.addition.attempts, 1);
  assert.equal(next.addition.successfulSessions, 1);
  assert.ok(next.addition.confidence > next['number-recognition'].confidence);
  assert.ok(Date.parse(next.addition.nextReviewAt ?? '') > now.getTime());
});

test('review and stretch skills receive less weight than the mission focus', () => {
  const next = applySessionToMastery(createEmptyMasteryProfile(), mission, {
    phase: 'complete', accuracy: 0.8, collisions: 0, hintsUsed: 1,
  });
  assert.ok(next.addition.confidence > next['number-recognition'].confidence);
  assert.ok(next['number-recognition'].confidence > next.fluency.confidence);
});
