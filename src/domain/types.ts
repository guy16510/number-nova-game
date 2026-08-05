export type ChallengeKind = 'number' | 'addition' | 'collect';
export type EntityKind = 'answer' | 'hazard' | 'star';
export type GamePhase = 'ready' | 'playing' | 'paused' | 'boss' | 'complete' | 'failed';

export interface SteeringInput {
  readonly x: number;
  readonly y: number;
}

export interface ShipState {
  readonly x: number;
  readonly y: number;
  readonly hearts: number;
  readonly shieldSeconds: number;
  readonly magnetSeconds: number;
}

export interface WorldEntity {
  readonly id: string;
  readonly kind: EntityKind;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly radius: number;
  readonly color: string;
  readonly label?: string;
  readonly correct?: boolean;
}

export interface ActiveChallenge {
  readonly id: string;
  readonly kind: ChallengeKind;
  readonly prompt: string;
  readonly answer?: number;
  readonly targetCount: number;
  readonly progress: number;
}

export interface LaserState {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly seconds: number;
}

export interface GameSnapshot {
  readonly phase: GamePhase;
  readonly elapsedSeconds: number;
  readonly ship: ShipState;
  readonly entities: readonly WorldEntity[];
  readonly challenge: ActiveChallenge;
  readonly score: number;
  readonly stars: number;
  readonly combo: number;
  readonly bestCombo: number;
  readonly shotsFired: number;
  readonly challengeNumber: number;
  readonly totalChallenges: number;
  readonly lockTargetId: string | null;
  readonly lockProgress: number;
  readonly lockIsCorrect: boolean;
  readonly bossHealth: number;
  readonly bossMaxHealth: number;
  readonly feedback: string | null;
  readonly laser: LaserState | null;
  readonly shieldCharges: number;
  readonly magnetCharges: number;
}

export interface ChallengeDefinition {
  readonly id: string;
  readonly kind: ChallengeKind;
  readonly prompt: string;
  readonly answer?: number;
  readonly targetCount: number;
  readonly options: readonly number[];
}

export interface RandomSource {
  next(): number;
  integer(minInclusive: number, maxInclusive: number): number;
  pick<T>(values: readonly T[]): T;
  shuffle<T>(values: readonly T[]): T[];
}
