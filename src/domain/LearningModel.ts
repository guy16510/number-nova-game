import type { GamePhase } from './types';

export type SkillId =
  | 'number-recognition'
  | 'counting'
  | 'addition'
  | 'subtraction'
  | 'comparison'
  | 'memory'
  | 'fluency';

export type MissionMode = 'story' | 'review' | 'stretch';

export interface SkillMetadata {
  readonly name: string;
  readonly shortName: string;
  readonly description: string;
}

export interface SkillMastery {
  readonly confidence: number;
  readonly attempts: number;
  readonly successfulSessions: number;
  readonly streak: number;
  readonly nextReviewAt: string | null;
  readonly lastPracticedAt: string | null;
}

export type MasteryProfile = Readonly<Record<SkillId, SkillMastery>>;

export interface MissionPlan {
  readonly id: string;
  readonly mode: MissionMode;
  readonly title: string;
  readonly subtitle: string;
  readonly focusSkill: SkillId;
  readonly reviewSkill: SkillId;
  readonly stretchSkill: SkillId;
  readonly mathLevel: number;
  readonly challengeCount: number;
  readonly difficultyLabel: string;
  readonly planet: string;
  readonly accent: string;
  readonly rewardPreview: string;
}

export interface LearningSessionSummary {
  readonly phase: GamePhase;
  readonly accuracy: number;
  readonly collisions: number;
  readonly hintsUsed: number;
}

export const SKILLS: readonly SkillId[] = [
  'number-recognition',
  'counting',
  'addition',
  'subtraction',
  'comparison',
  'memory',
  'fluency',
];

export const SKILL_METADATA: Readonly<Record<SkillId, SkillMetadata>> = {
  'number-recognition': {
    name: 'Number recognition',
    shortName: 'Numbers',
    description: 'Quickly identify written numbers.',
  },
  counting: {
    name: 'Counting',
    shortName: 'Counting',
    description: 'Count objects and match quantities to numbers.',
  },
  addition: {
    name: 'Addition',
    shortName: 'Addition',
    description: 'Build fluent addition facts from 1 + 1 through 20.',
  },
  subtraction: {
    name: 'Subtraction',
    shortName: 'Subtract',
    description: 'Understand taking away and solve subtraction facts.',
  },
  comparison: {
    name: 'Number comparison',
    shortName: 'Compare',
    description: 'Choose the greater number and compare quantities.',
  },
  memory: {
    name: 'Working memory',
    shortName: 'Memory',
    description: 'Hold a number in mind while flying and searching.',
  },
  fluency: {
    name: 'Math fluency',
    shortName: 'Fast facts',
    description: 'Recall familiar facts accurately at a comfortable pace.',
  },
};

const emptySkill = (): SkillMastery => ({
  confidence: 0,
  attempts: 0,
  successfulSessions: 0,
  streak: 0,
  nextReviewAt: null,
  lastPracticedAt: null,
});

export const createEmptyMasteryProfile = (): MasteryProfile => ({
  'number-recognition': emptySkill(),
  counting: emptySkill(),
  addition: emptySkill(),
  subtraction: emptySkill(),
  comparison: emptySkill(),
  memory: emptySkill(),
  fluency: emptySkill(),
});

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const validIsoDate = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
};

export const normalizeMasteryProfile = (value: unknown): MasteryProfile => {
  const source = typeof value === 'object' && value !== null
    ? value as Partial<Record<SkillId, Partial<SkillMastery>>>
    : {};
  const profile = createEmptyMasteryProfile();
  return Object.fromEntries(SKILLS.map((skill) => {
    const stored = source[skill];
    const current = profile[skill];
    return [skill, {
      confidence: clamp(typeof stored?.confidence === 'number' ? stored.confidence : current.confidence, 0, 1),
      attempts: Math.max(0, Math.floor(typeof stored?.attempts === 'number' ? stored.attempts : current.attempts)),
      successfulSessions: Math.max(0, Math.floor(typeof stored?.successfulSessions === 'number' ? stored.successfulSessions : current.successfulSessions)),
      streak: Math.max(0, Math.floor(typeof stored?.streak === 'number' ? stored.streak : current.streak)),
      nextReviewAt: validIsoDate(stored?.nextReviewAt),
      lastPracticedAt: validIsoDate(stored?.lastPracticedAt),
    } satisfies SkillMastery];
  })) as unknown as MasteryProfile;
};

const reviewDelayDays = (confidence: number, streak: number): number => {
  if (confidence < 0.2) return 1;
  if (confidence < 0.4) return 2;
  if (confidence < 0.6) return Math.min(4, 2 + streak);
  if (confidence < 0.8) return Math.min(8, 4 + streak);
  return Math.min(21, 7 + streak * 2);
};

const updateSkill = (
  current: SkillMastery,
  summary: LearningSessionSummary,
  weight: number,
  now: Date,
): SkillMastery => {
  const accuracy = clamp(summary.accuracy, 0, 1);
  const completed = summary.phase === 'complete';
  const collisionPenalty = Math.min(0.18, summary.collisions * 0.025);
  const hintPenalty = Math.min(0.16, summary.hintsUsed * 0.018);
  const quality = clamp(accuracy * 0.72 + (completed ? 0.25 : 0.05) - collisionPenalty - hintPenalty, 0, 1);
  const successful = completed && accuracy >= 0.68;
  const confidenceDelta = successful
    ? (0.045 + quality * 0.095) * weight
    : (-0.025 + quality * 0.035) * weight;
  const confidence = clamp(current.confidence + confidenceDelta, 0, 1);
  const streak = successful ? current.streak + 1 : 0;
  const nextReview = new Date(now);
  nextReview.setUTCDate(nextReview.getUTCDate() + reviewDelayDays(confidence, streak));

  return {
    confidence,
    attempts: current.attempts + 1,
    successfulSessions: current.successfulSessions + (successful ? 1 : 0),
    streak,
    nextReviewAt: nextReview.toISOString(),
    lastPracticedAt: now.toISOString(),
  };
};

export const applySessionToMastery = (
  current: MasteryProfile,
  mission: MissionPlan,
  summary: LearningSessionSummary,
  now = new Date(),
): MasteryProfile => {
  const next = { ...current } as Record<SkillId, SkillMastery>;
  next[mission.focusSkill] = updateSkill(current[mission.focusSkill], summary, 1, now);
  if (mission.reviewSkill !== mission.focusSkill) {
    next[mission.reviewSkill] = updateSkill(current[mission.reviewSkill], summary, 0.45, now);
  }
  if (mission.stretchSkill !== mission.focusSkill && mission.stretchSkill !== mission.reviewSkill) {
    next[mission.stretchSkill] = updateSkill(current[mission.stretchSkill], summary, 0.2, now);
  }
  return next;
};

export const confidenceLabel = (confidence: number): string => {
  if (confidence >= 0.82) return 'Mastering';
  if (confidence >= 0.58) return 'Growing';
  if (confidence >= 0.3) return 'Learning';
  if (confidence > 0) return 'Starting';
  return 'Not played yet';
};
