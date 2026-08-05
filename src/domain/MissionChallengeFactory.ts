import { ChallengeFactory, type ChallengeContext, type ChallengeFactoryPort } from './ChallengeFactory';
import { AdaptiveDifficultyDirector, type DifficultyPort } from './DifficultyDirector';
import type { MissionPlan, SkillId } from './LearningModel';
import { SeededRandom } from './SeededRandom';
import type { ChallengeDefinition, DifficultyProfile } from './types';

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const INDEXES_BY_SKILL: Readonly<Record<SkillId, readonly number[]>> = {
  'number-recognition': [1],
  counting: [2],
  addition: [0, 3],
  subtraction: [7],
  comparison: [5],
  memory: [10],
  fluency: [9, 8],
};

export class MissionChallengeFactory implements ChallengeFactoryPort {
  private readonly base: ChallengeFactory;
  private readonly random: SeededRandom;

  public constructor(seed: number, private readonly mission: MissionPlan) {
    this.random = new SeededRandom(seed ^ 0x4e4f5641);
    this.base = new ChallengeFactory(this.random);
  }

  public create(index: number, context: ChallengeContext = {}): ChallengeDefinition {
    if (context.bossMode) return this.base.create(index, context);

    const slot = index % 10;
    const skill = slot < 6
      ? this.mission.focusSkill
      : slot < 9
        ? this.mission.reviewSkill
        : this.mission.stretchSkill;
    const candidates = INDEXES_BY_SKILL[skill];
    const mappedIndex = candidates[index % candidates.length] ?? 0;
    const stretch = slot === 9 ? 1 : 0;
    const requestedLevel = context.mathLevel ?? this.mission.mathLevel;
    const mathLevel = clamp(Math.max(requestedLevel, this.mission.mathLevel + stretch), 0, 7);
    return this.base.create(mappedIndex, { ...context, mathLevel });
  }
}

export class MissionDifficultyDirector implements DifficultyPort {
  private readonly adaptive = new AdaptiveDifficultyDirector();

  public constructor(private readonly mission: MissionPlan) {}

  public recordShot(hit: boolean): void { this.adaptive.recordShot(hit); }
  public recordCollision(): void { this.adaptive.recordCollision(); }
  public recordAnswer(seconds: number): void { this.adaptive.recordAnswer(seconds); }
  public accuracy(): number { return this.adaptive.accuracy(); }

  public profile(challengeIndex: number): DifficultyProfile {
    const adaptive = this.adaptive.profile(challengeIndex);
    const defaultLevel = Math.min(7, Math.floor(challengeIndex / 2));
    const performanceAdjustment = clamp(adaptive.mathLevel - defaultLevel, -1, 1);
    const modeAdjustment = this.mission.mode === 'stretch' ? 1 : this.mission.mode === 'review' ? -1 : 0;
    const mathLevel = clamp(this.mission.mathLevel + performanceAdjustment + modeAdjustment, 0, 7);
    const actionMultiplier = this.mission.mode === 'stretch' ? 1.08 : this.mission.mode === 'review' ? 0.92 : 1;

    return {
      ...adaptive,
      mathLevel,
      worldSpeedMultiplier: clamp(adaptive.worldSpeedMultiplier * actionMultiplier, 0.82, 1.62),
      hazardCount: clamp(adaptive.hazardCount + (this.mission.mode === 'stretch' ? 1 : this.mission.mode === 'review' ? -1 : 0), 2, 9),
      targetMovement: clamp(adaptive.targetMovement * actionMultiplier, 0.025, 0.17),
      lockRadius: clamp(adaptive.lockRadius + (this.mission.mode === 'review' ? 0.025 : 0), 0.18, 0.33),
      enemyFireRate: clamp(adaptive.enemyFireRate / actionMultiplier, 1.35, 4.2),
    };
  }
}
