import {
  SKILLS,
  SKILL_METADATA,
  type MasteryProfile,
  type MissionPlan,
  type SkillId,
} from './LearningModel';

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const skillConfidence = (profile: MasteryProfile, skill: SkillId): number => profile[skill].confidence;

const weakestSkill = (profile: MasteryProfile): SkillId => [...SKILLS]
  .sort((left, right) => skillConfidence(profile, left) - skillConfidence(profile, right))[0] ?? 'addition';

const strongestSkill = (profile: MasteryProfile): SkillId => [...SKILLS]
  .sort((left, right) => skillConfidence(profile, right) - skillConfidence(profile, left))[0] ?? 'number-recognition';

const dueReviewSkill = (profile: MasteryProfile, now: Date): SkillId => {
  const due = SKILLS
    .filter((skill) => {
      const date = profile[skill].nextReviewAt;
      return date !== null && Date.parse(date) <= now.getTime();
    })
    .sort((left, right) => {
      const leftDate = Date.parse(profile[left].nextReviewAt ?? now.toISOString());
      const rightDate = Date.parse(profile[right].nextReviewAt ?? now.toISOString());
      return leftDate - rightDate;
    });
  return due[0] ?? weakestSkill(profile);
};

const storySkill = (completedMissions: number): SkillId =>
  SKILLS[completedMissions % SKILLS.length] ?? 'addition';

const mathLevelFor = (
  profile: MasteryProfile,
  skill: SkillId,
  highestMathLevel: number,
  offset: number,
): number => {
  const confidenceLevel = Math.floor(profile[skill].confidence * 7);
  const experiencedLevel = Math.max(0, highestMathLevel - 1);
  const blended = Math.round(confidenceLevel * 0.6 + experiencedLevel * 0.4);
  return clamp(blended + offset, 0, 7);
};

const missionId = (mode: MissionPlan['mode'], completedMissions: number, skill: SkillId): string =>
  `${mode}-${completedMissions}-${skill}`;

export const createMissionChoices = (
  profile: MasteryProfile,
  highestMathLevel: number,
  completedMissions: number,
  now = new Date(),
): readonly MissionPlan[] => {
  const story = storySkill(completedMissions);
  const review = dueReviewSkill(profile, now);
  const stretch = strongestSkill(profile);
  const weakest = weakestSkill(profile);

  return [
    {
      id: missionId('story', completedMissions, story),
      mode: 'story',
      title: `Restore ${SKILL_METADATA[story].shortName} Station`,
      subtitle: `Continue the galaxy rescue while practicing ${SKILL_METADATA[story].name.toLowerCase()}.`,
      focusSkill: story,
      reviewSkill: review,
      stretchSkill: stretch,
      mathLevel: mathLevelFor(profile, story, highestMathLevel, 0),
      challengeCount: 10,
      difficultyLabel: 'Balanced mission',
      planet: 'Nova Prime',
      accent: '#42D9FF',
      rewardPreview: 'Story star and ship reward progress',
    },
    {
      id: missionId('review', completedMissions, review),
      mode: 'review',
      title: `Rescue Run: ${SKILL_METADATA[review].shortName}`,
      subtitle: `A confidence-building flight that revisits skills ready for review.`,
      focusSkill: review,
      reviewSkill: weakest,
      stretchSkill: story,
      mathLevel: mathLevelFor(profile, review, highestMathLevel, -1),
      challengeCount: 8,
      difficultyLabel: 'Practice mission',
      planet: 'Echo Moon',
      accent: '#7BFF9A',
      rewardPreview: 'Extra repair stars',
    },
    {
      id: missionId('stretch', completedMissions, stretch),
      mode: 'stretch',
      title: `Comet Challenge: ${SKILL_METADATA[stretch].shortName}`,
      subtitle: `Faster action and one step harder math, with hints still available.`,
      focusSkill: stretch,
      reviewSkill: review,
      stretchSkill: weakest,
      mathLevel: mathLevelFor(profile, stretch, highestMathLevel, 1),
      challengeCount: 10,
      difficultyLabel: 'Challenge mission',
      planet: 'Comet Forge',
      accent: '#FF9C4A',
      rewardPreview: 'Bonus cosmetic unlock chance',
    },
  ];
};
