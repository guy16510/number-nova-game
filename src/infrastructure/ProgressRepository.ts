import Storage from 'expo-sqlite/kv-store';
import {
  applySessionToMastery,
  createEmptyMasteryProfile,
  normalizeMasteryProfile,
  type MasteryProfile,
  type MissionPlan,
} from '../domain/LearningModel';
import type { GameSnapshot, RewardState } from '../domain/types';

export interface RewardLoadout {
  readonly laserColor: string | null;
  readonly engineTrail: string | null;
  readonly shipPaint: string | null;
  readonly companion: string | null;
}

export interface EngagementSummary {
  readonly completedSessions: number;
  readonly failedSessions: number;
  readonly averageAccuracy: number;
  readonly totalHintsUsed: number;
  readonly naturalStops: number;
  readonly lastPlayedAt: string | null;
}

export interface PlayerProgress {
  readonly highScore: number;
  readonly bestStars: number;
  readonly missionsCompleted: number;
  readonly gamesPlayed: number;
  readonly highestMathLevel: number;
  readonly unlockedRewards: readonly string[];
  readonly mastery: MasteryProfile;
  readonly equippedRewards: RewardLoadout;
  readonly engagement: EngagementSummary;
}

export interface ProgressRepository {
  load(): Promise<PlayerProgress>;
  recordGame(snapshot: GameSnapshot, mission?: MissionPlan, hintsUsed?: number): Promise<PlayerProgress>;
  equipReward(rewardId: string, rewardType: RewardState['type']): Promise<PlayerProgress>;
  recordNaturalStop(): Promise<PlayerProgress>;
  reset(): Promise<void>;
}

const STORAGE_KEY = 'number-nova-progress-v3';
const LEGACY_STORAGE_KEYS = ['number-nova-progress-v2', 'number-nova-progress-v1'] as const;

const EMPTY_LOADOUT: RewardLoadout = {
  laserColor: null,
  engineTrail: null,
  shipPaint: null,
  companion: null,
};

const EMPTY_ENGAGEMENT: EngagementSummary = {
  completedSessions: 0,
  failedSessions: 0,
  averageAccuracy: 0,
  totalHintsUsed: 0,
  naturalStops: 0,
  lastPlayedAt: null,
};

export const EMPTY_PROGRESS: PlayerProgress = {
  highScore: 0,
  bestStars: 0,
  missionsCompleted: 0,
  gamesPlayed: 0,
  highestMathLevel: 0,
  unlockedRewards: [],
  mastery: createEmptyMasteryProfile(),
  equippedRewards: EMPTY_LOADOUT,
  engagement: EMPTY_ENGAGEMENT,
};

const validString = (value: unknown): string | null => typeof value === 'string' ? value : null;
const finiteNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const normalizeLoadout = (value: unknown): RewardLoadout => {
  const source = typeof value === 'object' && value !== null ? value as Partial<RewardLoadout> : {};
  return {
    laserColor: validString(source.laserColor),
    engineTrail: validString(source.engineTrail),
    shipPaint: validString(source.shipPaint),
    companion: validString(source.companion),
  };
};

const normalizeEngagement = (value: unknown): EngagementSummary => {
  const source = typeof value === 'object' && value !== null ? value as Partial<EngagementSummary> : {};
  return {
    completedSessions: Math.max(0, Math.floor(finiteNumber(source.completedSessions))),
    failedSessions: Math.max(0, Math.floor(finiteNumber(source.failedSessions))),
    averageAccuracy: Math.max(0, Math.min(1, finiteNumber(source.averageAccuracy))),
    totalHintsUsed: Math.max(0, Math.floor(finiteNumber(source.totalHintsUsed))),
    naturalStops: Math.max(0, Math.floor(finiteNumber(source.naturalStops))),
    lastPlayedAt: validString(source.lastPlayedAt),
  };
};

const rewardSlot = (type: RewardState['type']): keyof RewardLoadout | null => {
  if (type === 'laser-color') return 'laserColor';
  if (type === 'engine-trail') return 'engineTrail';
  if (type === 'ship-paint') return 'shipPaint';
  if (type === 'companion') return 'companion';
  return null;
};

export class ExpoProgressRepository implements ProgressRepository {
  public async load(): Promise<PlayerProgress> {
    let value = await Storage.getItem(STORAGE_KEY);
    if (!value) {
      for (const key of LEGACY_STORAGE_KEYS) {
        value = await Storage.getItem(key);
        if (value) break;
      }
    }
    if (!value) return EMPTY_PROGRESS;

    try {
      const parsed = JSON.parse(value) as Partial<PlayerProgress>;
      return {
        highScore: Math.max(0, finiteNumber(parsed.highScore)),
        bestStars: Math.max(0, finiteNumber(parsed.bestStars)),
        missionsCompleted: Math.max(0, Math.floor(finiteNumber(parsed.missionsCompleted))),
        gamesPlayed: Math.max(0, Math.floor(finiteNumber(parsed.gamesPlayed))),
        highestMathLevel: Math.max(0, Math.floor(finiteNumber(parsed.highestMathLevel))),
        unlockedRewards: Array.isArray(parsed.unlockedRewards)
          ? parsed.unlockedRewards.filter((entry): entry is string => typeof entry === 'string')
          : [],
        mastery: normalizeMasteryProfile(parsed.mastery),
        equippedRewards: normalizeLoadout(parsed.equippedRewards),
        engagement: normalizeEngagement(parsed.engagement),
      };
    } catch {
      return EMPTY_PROGRESS;
    }
  }

  public async recordGame(snapshot: GameSnapshot, mission?: MissionPlan, hintsUsed = 0): Promise<PlayerProgress> {
    const current = await this.load();
    const rewardIds = new Set(current.unlockedRewards);
    const loadout = { ...current.equippedRewards };
    if (snapshot.reward) {
      rewardIds.add(snapshot.reward.id);
      const slot = rewardSlot(snapshot.reward.type);
      if (slot && loadout[slot] === null) loadout[slot] = snapshot.reward.id;
    }

    const gamesPlayed = current.gamesPlayed + 1;
    const previousAccuracyTotal = current.engagement.averageAccuracy * current.gamesPlayed;
    const engagement: EngagementSummary = {
      completedSessions: current.engagement.completedSessions + (snapshot.phase === 'complete' ? 1 : 0),
      failedSessions: current.engagement.failedSessions + (snapshot.phase === 'failed' ? 1 : 0),
      averageAccuracy: (previousAccuracyTotal + snapshot.accuracy) / gamesPlayed,
      totalHintsUsed: current.engagement.totalHintsUsed + Math.max(0, hintsUsed),
      naturalStops: current.engagement.naturalStops,
      lastPlayedAt: new Date().toISOString(),
    };

    const mastery = mission
      ? applySessionToMastery(current.mastery, mission, {
        phase: snapshot.phase,
        accuracy: snapshot.accuracy,
        collisions: snapshot.collisions,
        hintsUsed,
      })
      : current.mastery;

    const next: PlayerProgress = {
      highScore: Math.max(current.highScore, snapshot.score),
      bestStars: Math.max(current.bestStars, snapshot.stars),
      missionsCompleted: current.missionsCompleted + (snapshot.phase === 'complete' ? 1 : 0),
      gamesPlayed,
      highestMathLevel: Math.max(current.highestMathLevel, snapshot.challenge.mathLevel + 1),
      unlockedRewards: [...rewardIds],
      mastery,
      equippedRewards: loadout,
      engagement,
    };
    await this.write(next);
    return next;
  }

  public async equipReward(rewardId: string, rewardType: RewardState['type']): Promise<PlayerProgress> {
    const current = await this.load();
    const slot = rewardSlot(rewardType);
    if (!slot || !current.unlockedRewards.includes(rewardId)) return current;
    const next: PlayerProgress = {
      ...current,
      equippedRewards: { ...current.equippedRewards, [slot]: rewardId },
    };
    await this.write(next);
    return next;
  }

  public async recordNaturalStop(): Promise<PlayerProgress> {
    const current = await this.load();
    const next: PlayerProgress = {
      ...current,
      engagement: {
        ...current.engagement,
        naturalStops: current.engagement.naturalStops + 1,
      },
    };
    await this.write(next);
    return next;
  }

  public async reset(): Promise<void> {
    await Promise.all([
      Storage.removeItem(STORAGE_KEY),
      ...LEGACY_STORAGE_KEYS.map((key) => Storage.removeItem(key)),
    ]);
  }

  private async write(progress: PlayerProgress): Promise<void> {
    await Storage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }
}
