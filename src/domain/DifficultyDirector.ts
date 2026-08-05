import type { DifficultyProfile } from './types';

export interface DifficultyPort {
  recordShot(hit: boolean): void;
  recordCollision(): void;
  recordAnswer(seconds: number): void;
  profile(challengeIndex: number): DifficultyProfile;
  accuracy(): number;
}

/**
 * Adapts educational complexity and action intensity independently so a child
 * can receive easier math without making the flight and combat loop feel dull.
 * Every output remains bounded to preserve readable, age-appropriate gameplay.
 */
export class AdaptiveDifficultyDirector implements DifficultyPort {
  private shots = 0;
  private hits = 0;
  private collisions = 0;
  private answerSecondsTotal = 0;
  private answers = 0;

  public recordShot(hit: boolean): void {
    this.shots += 1;
    if (hit) this.hits += 1;
  }

  public recordCollision(): void {
    this.collisions += 1;
  }

  public recordAnswer(seconds: number): void {
    this.answerSecondsTotal += Math.max(0, seconds);
    this.answers += 1;
  }

  public accuracy(): number {
    return this.shots === 0 ? 1 : this.hits / this.shots;
  }

  public profile(challengeIndex: number): DifficultyProfile {
    const attemptsEnough = this.shots >= 4;
    const accuracy = this.accuracy();
    const averageAnswerSeconds = this.answers === 0 ? 4 : this.answerSecondsTotal / this.answers;
    const baseMathLevel = Math.min(7, Math.floor(challengeIndex / 2));
    const supportAdjustment = attemptsEnough && (accuracy < 0.58 || averageAnswerSeconds > 8) ? -1 : 0;
    const masteryAdjustment = attemptsEnough && accuracy > 0.9 && this.collisions <= 1 && averageAnswerSeconds < 4 ? 1 : 0;
    const mathLevel = Math.max(0, Math.min(7, baseMathLevel + supportAdjustment + masteryAdjustment));
    const actionLevel = Math.max(0, challengeIndex + (accuracy > 0.82 ? 1 : 0) - Math.min(2, this.collisions));

    return {
      mathLevel,
      worldSpeedMultiplier: Math.min(1.58, 0.92 + actionLevel * 0.055),
      hazardCount: Math.min(9, 3 + Math.floor(actionLevel / 2)),
      targetMovement: Math.min(0.16, 0.035 + actionLevel * 0.012),
      lockRadius: Math.max(0.18, 0.29 - actionLevel * 0.009),
      enemyFireRate: Math.max(1.4, 3.8 - actionLevel * 0.2),
    };
  }
}
