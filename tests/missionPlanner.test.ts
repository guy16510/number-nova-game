import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmptyMasteryProfile, type MissionPlan } from '../src/domain/LearningModel';
import { MissionChallengeFactory, MissionDifficultyDirector } from '../src/domain/MissionChallengeFactory';
import { createMissionChoices } from '../src/domain/MissionPlanner';

const plan: MissionPlan = {
  id: 'test', mode: 'story', title: 'Test', subtitle: 'Test', focusSkill: 'addition', reviewSkill: 'subtraction', stretchSkill: 'comparison', mathLevel: 2, challengeCount: 10, difficultyLabel: 'Balanced', planet: 'Nova', accent: '#fff', rewardPreview: 'Reward',
};

test('mission planner always offers story, review, and stretch routes', () => {
  const missions = createMissionChoices(createEmptyMasteryProfile(), 1, 0, new Date('2026-08-05T12:00:00.000Z'));
  assert.deepEqual(missions.map((mission) => mission.mode), ['story', 'review', 'stretch']);
  assert.equal(missions[0]?.focusSkill, 'number-recognition');
  assert.ok(missions.every((mission) => mission.challengeCount >= 8));
});

test('mission challenge factory uses a 60/30/10 focus review stretch mix', () => {
  const factory = new MissionChallengeFactory(42, plan);
  assert.equal(factory.create(0, { mathLevel: 2 }).kind, 'addition');
  assert.equal(factory.create(5, { mathLevel: 2 }).kind, 'addition');
  assert.equal(factory.create(6, { mathLevel: 2 }).kind, 'subtraction');
  assert.equal(factory.create(8, { mathLevel: 2 }).kind, 'subtraction');
  assert.equal(factory.create(9, { mathLevel: 2 }).kind, 'comparison');
});

test('mission difficulty stays bounded and preserves review support', () => {
  const reviewPlan = { ...plan, mode: 'review' as const, mathLevel: 3 };
  const difficulty = new MissionDifficultyDirector(reviewPlan);
  const profile = difficulty.profile(0);
  assert.ok(profile.mathLevel >= 0 && profile.mathLevel <= 7);
  assert.ok(profile.lockRadius >= 0.18 && profile.lockRadius <= 0.33);
  assert.ok(profile.hazardCount >= 2 && profile.hazardCount <= 9);
});
