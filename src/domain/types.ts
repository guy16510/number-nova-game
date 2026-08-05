export type ChallengeKind =
  | 'number'
  | 'addition'
  | 'subtraction'
  | 'comparison'
  | 'collect'
  | 'rescue'
  | 'gate'
  | 'memory'
  | 'defense'
  | 'rapid';

export type EntityKind =
  | 'enemy'
  | 'hazard'
  | 'star'
  | 'powerUp'
  | 'projectile'
  | 'enemyProjectile'
  | 'explosion'
  | 'debris'
  | 'gate'
  | 'ally';

export type EnemyArchetype =
  | 'number-drone'
  | 'zigzag-alien'
  | 'bomber-alien'
  | 'shield-ship'
  | 'boss';

export type PowerUpKind = 'triple-shot' | 'comet-missile' | 'rainbow-beam' | 'shield' | 'magnet';
export type WeaponKind = 'nova-blaster' | 'triple-shot' | 'comet-missile' | 'rainbow-beam';
export type WavePattern =
  | 'asteroid-tunnel'
  | 'answer-formation'
  | 'alien-ambush'
  | 'minefield'
  | 'star-trail'
  | 'rescue-run'
  | 'defense-line'
  | 'number-gates'
  | 'boss-shield'
  | 'boss-dodge'
  | 'boss-weak-point';

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
  readonly weapon: WeaponKind;
  readonly weaponSeconds: number;
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
  readonly archetype?: EnemyArchetype;
  readonly powerUp?: PowerUpKind;
  readonly health?: number;
  readonly maxHealth?: number;
  readonly ttl?: number;
  readonly targetId?: string;
  readonly vx?: number;
  readonly vy?: number;
  readonly vz?: number;
  readonly shootable?: boolean;
  readonly warning?: boolean;
}

export interface ActiveChallenge {
  readonly id: string;
  readonly kind: ChallengeKind;
  readonly prompt: string;
  readonly answer?: number;
  readonly targetCount: number;
  readonly progress: number;
  readonly mathLevel: number;
}

export interface LaserState {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly seconds: number;
  readonly beams: number;
}

export interface RewardState {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly type: 'laser-color' | 'engine-trail' | 'ship-paint' | 'companion' | 'badge';
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
  readonly shotsHit: number;
  readonly accuracy: number;
  readonly collisions: number;
  readonly challengeNumber: number;
  readonly totalChallenges: number;
  readonly lockTargetId: string | null;
  readonly lockProgress: number;
  readonly lockIsCorrect: boolean;
  readonly bossHealth: number;
  readonly bossMaxHealth: number;
  readonly bossStage: number;
  readonly feedback: string | null;
  readonly laser: LaserState | null;
  readonly shieldCharges: number;
  readonly magnetCharges: number;
  readonly waveName: string;
  readonly wavePattern: WavePattern;
  readonly screenShake: number;
  readonly reward: RewardState | null;
}

export interface ChallengeDefinition {
  readonly id: string;
  readonly kind: ChallengeKind;
  readonly prompt: string;
  readonly answer?: number;
  readonly targetCount: number;
  readonly options: readonly number[];
  readonly mathLevel: number;
}

export interface RandomSource {
  next(): number;
  integer(minInclusive: number, maxInclusive: number): number;
  pick<T>(values: readonly T[]): T;
  shuffle<T>(values: readonly T[]): T[];
}

export interface DifficultyProfile {
  readonly mathLevel: number;
  readonly worldSpeedMultiplier: number;
  readonly hazardCount: number;
  readonly targetMovement: number;
  readonly lockRadius: number;
  readonly enemyFireRate: number;
}

export interface EntityBlueprint {
  readonly kind: EntityKind;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly radius: number;
  readonly color: string;
  readonly label?: string;
  readonly correct?: boolean;
  readonly archetype?: EnemyArchetype;
  readonly powerUp?: PowerUpKind;
  readonly health?: number;
  readonly maxHealth?: number;
  readonly ttl?: number;
  readonly vx?: number;
  readonly vy?: number;
  readonly vz?: number;
  readonly shootable?: boolean;
  readonly warning?: boolean;
}

export interface WavePlan {
  readonly name: string;
  readonly pattern: WavePattern;
  readonly entities: readonly EntityBlueprint[];
}
