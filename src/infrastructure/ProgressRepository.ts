import Storage from 'expo-sqlite/kv-store';
import type { GameSnapshot } from '../domain/types';

export interface PlayerProgress {
  readonly highScore: number;
  readonly bestStars: number;
  readonly missionsCompleted: number;
  readonly gamesPlayed: number;
  readonly highestMathLevel: number;
  readonly unlockedRewards: readonly string[];
}

export interface ProgressRepository {
  load(): Promise<PlayerProgress>;
  recordGame(snapshot: GameSnapshot): Promise<PlayerProgress>;
  reset(): Promise<void>;
}

const STORAGE_KEY = 'number-nova-progress-v2';
const LEGACY_STORAGE_KEY = 'number-nova-progress-v1';
export const EMPTY_PROGRESS: PlayerProgress = {
  highScore: 0,
  bestStars: 0,
  missionsCompleted: 0,
  gamesPlayed: 0,
  highestMathLevel: 0,
  unlockedRewards: [],
};

export class ExpoProgressRepository implements ProgressRepository {
  public async load(): Promise<PlayerProgress> {
    const value = await Storage.getItem(STORAGE_KEY) ?? await Storage.getItem(LEGACY_STORAGE_KEY);
    if (!value) return EMPTY_PROGRESS;
    try {
      const parsed = JSON.parse(value) as Partial<PlayerProgress>;
      return {
        highScore: parsed.highScore ?? 0,
        bestStars: parsed.bestStars ?? 0,
        missionsCompleted: parsed.missionsCompleted ?? 0,
        gamesPlayed: parsed.gamesPlayed ?? 0,
        highestMathLevel: parsed.highestMathLevel ?? 0,
        unlockedRewards: Array.isArray(parsed.unlockedRewards) ? parsed.unlockedRewards.filter((value): value is string => typeof value === 'string') : [],
      };
    } catch {
      return EMPTY_PROGRESS;
    }
  }

  public async recordGame(snapshot: GameSnapshot): Promise<PlayerProgress> {
    const current = await this.load();
    const rewardIds = new Set(current.unlockedRewards);
    if (snapshot.reward) rewardIds.add(snapshot.reward.id);
    const next: PlayerProgress = {
      highScore: Math.max(current.highScore, snapshot.score),
      bestStars: Math.max(current.bestStars, snapshot.stars),
      missionsCompleted: current.missionsCompleted + (snapshot.phase === 'complete' ? 1 : 0),
      gamesPlayed: current.gamesPlayed + 1,
      highestMathLevel: Math.max(current.highestMathLevel, snapshot.challenge.mathLevel + 1),
      unlockedRewards: [...rewardIds],
    };
    await Storage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  public async reset(): Promise<void> {
    await Promise.all([Storage.removeItem(STORAGE_KEY), Storage.removeItem(LEGACY_STORAGE_KEY)]);
  }
}
