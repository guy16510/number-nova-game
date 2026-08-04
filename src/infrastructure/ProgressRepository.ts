import Storage from 'expo-sqlite/kv-store';

export interface PlayerProgress {
  readonly highScore: number;
  readonly bestStars: number;
  readonly missionsCompleted: number;
  readonly gamesPlayed: number;
}

export interface ProgressRepository {
  load(): Promise<PlayerProgress>;
  recordGame(score: number, stars: number, completed: boolean): Promise<PlayerProgress>;
  reset(): Promise<void>;
}

const STORAGE_KEY = 'number-nova-progress-v1';
const EMPTY_PROGRESS: PlayerProgress = {
  highScore: 0,
  bestStars: 0,
  missionsCompleted: 0,
  gamesPlayed: 0,
};

export class ExpoProgressRepository implements ProgressRepository {
  public async load(): Promise<PlayerProgress> {
    const value = await Storage.getItem(STORAGE_KEY);
    if (!value) {
      return EMPTY_PROGRESS;
    }
    try {
      const parsed = JSON.parse(value) as Partial<PlayerProgress>;
      return {
        highScore: parsed.highScore ?? 0,
        bestStars: parsed.bestStars ?? 0,
        missionsCompleted: parsed.missionsCompleted ?? 0,
        gamesPlayed: parsed.gamesPlayed ?? 0,
      };
    } catch {
      return EMPTY_PROGRESS;
    }
  }

  public async recordGame(score: number, stars: number, completed: boolean): Promise<PlayerProgress> {
    const current = await this.load();
    const next: PlayerProgress = {
      highScore: Math.max(current.highScore, score),
      bestStars: Math.max(current.bestStars, stars),
      missionsCompleted: current.missionsCompleted + (completed ? 1 : 0),
      gamesPlayed: current.gamesPlayed + 1,
    };
    await Storage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  public async reset(): Promise<void> {
    await Storage.removeItem(STORAGE_KEY);
  }
}
