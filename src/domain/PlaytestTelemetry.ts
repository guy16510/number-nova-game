export type PlaytestOutcome = 'complete' | 'failed' | 'abandoned';

export interface PlaytestSession {
  readonly id: string;
  readonly missionMode: string;
  readonly controlMode: 'motion' | 'touch' | 'unknown';
  readonly outcome: PlaytestOutcome;
  readonly durationSeconds: number;
  readonly accuracy: number;
  readonly collisions: number;
  readonly shotsFired: number;
  readonly shotsHit: number;
  readonly hintsUsed: number;
  readonly frameStalls: number;
  readonly recordedAt: string;
}

export interface PlaytestSummary {
  readonly sessions: number;
  readonly completed: number;
  readonly failed: number;
  readonly abandoned: number;
  readonly completionRate: number;
  readonly averageAccuracy: number;
  readonly averageDurationSeconds: number;
  readonly averageCollisions: number;
  readonly totalFrameStalls: number;
  readonly motionSessions: number;
  readonly touchSessions: number;
}

export const EMPTY_PLAYTEST_SUMMARY: PlaytestSummary = {
  sessions: 0,
  completed: 0,
  failed: 0,
  abandoned: 0,
  completionRate: 0,
  averageAccuracy: 0,
  averageDurationSeconds: 0,
  averageCollisions: 0,
  totalFrameStalls: 0,
  motionSessions: 0,
  touchSessions: 0,
};

const finite = (value: number): number => Number.isFinite(value) ? value : 0;

export const summarizePlaytests = (sessions: readonly PlaytestSession[]): PlaytestSummary => {
  if (sessions.length === 0) return EMPTY_PLAYTEST_SUMMARY;
  const completed = sessions.filter((session) => session.outcome === 'complete').length;
  const failed = sessions.filter((session) => session.outcome === 'failed').length;
  const abandoned = sessions.filter((session) => session.outcome === 'abandoned').length;
  const sum = (selector: (session: PlaytestSession) => number): number =>
    sessions.reduce((total, session) => total + finite(selector(session)), 0);
  return {
    sessions: sessions.length,
    completed,
    failed,
    abandoned,
    completionRate: completed / sessions.length,
    averageAccuracy: sum((session) => session.accuracy) / sessions.length,
    averageDurationSeconds: sum((session) => session.durationSeconds) / sessions.length,
    averageCollisions: sum((session) => session.collisions) / sessions.length,
    totalFrameStalls: Math.max(0, Math.floor(sum((session) => session.frameStalls))),
    motionSessions: sessions.filter((session) => session.controlMode === 'motion').length,
    touchSessions: sessions.filter((session) => session.controlMode === 'touch').length,
  };
};
