import Storage from 'expo-sqlite/kv-store';
import {
  EMPTY_PLAYTEST_SUMMARY,
  summarizePlaytests,
  type PlaytestSession,
  type PlaytestSummary,
} from '../domain/PlaytestTelemetry';

const STORAGE_KEY = 'number-nova-playtest-v1';
const MAX_SESSIONS = 100;

export interface PlaytestTelemetryRepository {
  record(session: PlaytestSession): Promise<PlaytestSummary>;
  loadSessions(): Promise<readonly PlaytestSession[]>;
  loadSummary(): Promise<PlaytestSummary>;
  reset(): Promise<void>;
}

const normalizeSession = (value: unknown): PlaytestSession | null => {
  if (!value || typeof value !== 'object') return null;
  const source = value as Partial<PlaytestSession>;
  if (typeof source.id !== 'string' || typeof source.recordedAt !== 'string') return null;
  const outcome = source.outcome === 'complete' || source.outcome === 'failed' || source.outcome === 'abandoned'
    ? source.outcome
    : 'abandoned';
  const controlMode = source.controlMode === 'motion' || source.controlMode === 'touch' ? source.controlMode : 'unknown';
  const number = (candidate: unknown): number => typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : 0;
  return {
    id: source.id,
    missionMode: typeof source.missionMode === 'string' ? source.missionMode : 'unknown',
    controlMode,
    outcome,
    durationSeconds: Math.max(0, number(source.durationSeconds)),
    accuracy: Math.max(0, Math.min(1, number(source.accuracy))),
    collisions: Math.max(0, Math.floor(number(source.collisions))),
    shotsFired: Math.max(0, Math.floor(number(source.shotsFired))),
    shotsHit: Math.max(0, Math.floor(number(source.shotsHit))),
    hintsUsed: Math.max(0, Math.floor(number(source.hintsUsed))),
    frameStalls: Math.max(0, Math.floor(number(source.frameStalls))),
    recordedAt: source.recordedAt,
  };
};

export class ExpoPlaytestTelemetryRepository implements PlaytestTelemetryRepository {
  public async record(session: PlaytestSession): Promise<PlaytestSummary> {
    const sessions = await this.loadSessions();
    const next = [...sessions, session].slice(-MAX_SESSIONS);
    await Storage.setItem(STORAGE_KEY, JSON.stringify(next));
    return summarizePlaytests(next);
  }

  public async loadSessions(): Promise<readonly PlaytestSession[]> {
    const stored = await Storage.getItem(STORAGE_KEY);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.map(normalizeSession).filter((session): session is PlaytestSession => session !== null);
    } catch {
      return [];
    }
  }

  public async loadSummary(): Promise<PlaytestSummary> {
    const sessions = await this.loadSessions();
    return sessions.length === 0 ? EMPTY_PLAYTEST_SUMMARY : summarizePlaytests(sessions);
  }

  public async reset(): Promise<void> {
    await Storage.removeItem(STORAGE_KEY);
  }
}
