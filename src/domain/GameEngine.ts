import { ChallengeFactory } from './ChallengeFactory';
import { SeededRandom } from './SeededRandom';
import type {
  ActiveChallenge,
  ChallengeDefinition,
  GamePhase,
  GameSnapshot,
  SteeringInput,
  WorldEntity,
} from './types';

interface MutableEntity {
  id: string;
  kind: WorldEntity['kind'];
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
  label?: string;
  correct?: boolean;
}

interface MutableLaser {
  x: number;
  y: number;
  z: number;
  seconds: number;
}

export interface GameEngineOptions {
  readonly seed?: number;
  readonly totalChallenges?: number;
  readonly lockSeconds?: number;
  readonly worldSpeed?: number;
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.max(minimum, Math.min(maximum, value));

const distanceSquared = (ax: number, ay: number, bx: number, by: number): number => {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
};

const ANSWER_COLORS = ['#36A8FF', '#73E632', '#FF8B20', '#B85CFF'];

export class GameEngine {
  private readonly random: SeededRandom;
  private readonly challengeFactory: ChallengeFactory;
  private readonly totalChallenges: number;
  private readonly lockSeconds: number;
  private readonly worldSpeed: number;

  private phase: GamePhase = 'ready';
  private elapsedSeconds = 0;
  private shipX = 0;
  private shipY = 0.3;
  private hearts = 3;
  private shieldSeconds = 0;
  private magnetSeconds = 0;
  private shieldCharges = 2;
  private magnetCharges = 2;
  private score = 0;
  private stars = 0;
  private challengeIndex = 0;
  private currentDefinition: ChallengeDefinition;
  private currentProgress = 0;
  private entities: MutableEntity[] = [];
  private lockTargetId: string | null = null;
  private lockProgress = 0;
  private lockIsCorrect = false;
  private feedback: string | null = null;
  private feedbackSeconds = 0;
  private challengeDelaySeconds = 0;
  private bossHealth = 3;
  private readonly bossMaxHealth = 3;
  private laser: MutableLaser | null = null;
  private nextEntityId = 1;

  public constructor(options: GameEngineOptions = {}) {
    this.random = new SeededRandom(options.seed ?? Date.now());
    this.challengeFactory = new ChallengeFactory(this.random);
    this.totalChallenges = options.totalChallenges ?? 6;
    this.lockSeconds = options.lockSeconds ?? 0.42;
    this.worldSpeed = options.worldSpeed ?? 0.24;
    this.currentDefinition = this.challengeFactory.create(0);
  }

  public start(): void {
    if (this.phase !== 'ready') {
      return;
    }
    this.phase = 'playing';
    this.spawnCurrentChallenge();
  }

  public pause(): void {
    if (this.phase === 'playing' || this.phase === 'boss') {
      this.phase = 'paused';
    }
  }

  public resume(): void {
    if (this.phase === 'paused') {
      this.phase = this.challengeIndex >= this.totalChallenges ? 'boss' : 'playing';
    }
  }

  public useShield(): boolean {
    if (this.shieldCharges <= 0 || this.shieldSeconds > 0) {
      return false;
    }
    this.shieldCharges -= 1;
    this.shieldSeconds = 5;
    this.feedback = 'Bubble shield!';
    this.feedbackSeconds = 1.2;
    return true;
  }

  public useMagnet(): boolean {
    if (this.magnetCharges <= 0 || this.magnetSeconds > 0) {
      return false;
    }
    this.magnetCharges -= 1;
    this.magnetSeconds = 5;
    this.feedback = 'Star magnet!';
    this.feedbackSeconds = 1.2;
    return true;
  }

  public update(deltaSeconds: number, input: SteeringInput): void {
    if (this.phase !== 'playing' && this.phase !== 'boss') {
      return;
    }

    const dt = clamp(deltaSeconds, 0, 0.05);
    this.elapsedSeconds += dt;
    this.shieldSeconds = Math.max(0, this.shieldSeconds - dt);
    this.magnetSeconds = Math.max(0, this.magnetSeconds - dt);
    this.updateFeedback(dt);
    this.updateLaser(dt);
    this.updateShip(dt, input);

    if (this.challengeDelaySeconds > 0) {
      this.challengeDelaySeconds -= dt;
      if (this.challengeDelaySeconds <= 0) {
        this.spawnCurrentChallenge();
      }
      return;
    }

    this.updateEntities(dt);
    this.updateMagnet(dt);
    this.updateLockOn(dt);
    this.resolveNearPlayerEntities();
    this.recycleMissedCollectibles();
    this.ensureActiveTargets();
  }

  public resolveTarget(entityId: string): boolean {
    const entity = this.entities.find((candidate) => candidate.id === entityId);
    if (!entity || entity.kind !== 'answer') {
      return false;
    }

    if (!entity.correct) {
      this.feedback = 'Look for another number';
      this.feedbackSeconds = 0.9;
      this.lockProgress = 0;
      return false;
    }

    this.laser = { x: entity.x, y: entity.y, z: entity.z, seconds: 0.16 };
    this.entities = this.entities.filter((candidate) => candidate.id !== entity.id);
    this.score += this.phase === 'boss' ? 250 : 100;
    this.stars += 1;
    this.feedback = this.phase === 'boss' ? 'Shield hit!' : 'Great shot!';
    this.feedbackSeconds = 0.75;
    this.lockTargetId = null;
    this.lockProgress = 0;

    if (this.phase === 'boss') {
      this.bossHealth -= 1;
      if (this.bossHealth <= 0) {
        this.completeGame();
      } else {
        this.completeChallenge(true);
      }
    } else {
      this.currentProgress = 1;
      this.completeChallenge(false);
    }
    return true;
  }

  public snapshot(): GameSnapshot {
    return {
      phase: this.phase,
      elapsedSeconds: this.elapsedSeconds,
      ship: {
        x: this.shipX,
        y: this.shipY,
        hearts: this.hearts,
        shieldSeconds: this.shieldSeconds,
        magnetSeconds: this.magnetSeconds,
      },
      entities: this.entities.map((entity) => ({ ...entity })),
      challenge: this.activeChallenge(),
      score: this.score,
      stars: this.stars,
      challengeNumber: Math.min(this.challengeIndex + 1, this.totalChallenges),
      totalChallenges: this.totalChallenges,
      lockTargetId: this.lockTargetId,
      lockProgress: this.lockProgress,
      lockIsCorrect: this.lockIsCorrect,
      bossHealth: this.bossHealth,
      bossMaxHealth: this.bossMaxHealth,
      feedback: this.feedback,
      laser: this.laser ? { ...this.laser } : null,
      shieldCharges: this.shieldCharges,
      magnetCharges: this.magnetCharges,
    };
  }

  private updateShip(dt: number, input: SteeringInput): void {
    const desiredX = clamp(input.x, -1, 1) * 0.88;
    const desiredY = 0.3 + clamp(input.y, -1, 1) * 0.45;
    const responsiveness = 5.2;
    this.shipX += (desiredX - this.shipX) * responsiveness * dt;
    this.shipY += (desiredY - this.shipY) * responsiveness * dt;
    this.shipX = clamp(this.shipX, -0.95, 0.95);
    this.shipY = clamp(this.shipY, -0.15, 0.8);
  }

  private updateEntities(dt: number): void {
    const speedMultiplier = this.phase === 'boss' ? 0.88 : 1;
    for (const entity of this.entities) {
      entity.z -= this.worldSpeed * speedMultiplier * dt;
      if (entity.kind === 'hazard') {
        entity.x += Math.sin(this.elapsedSeconds * 1.5 + Number(entity.id.split('-').at(-1))) * dt * 0.025;
      }
    }
    this.entities = this.entities.filter((entity) => entity.z > -0.18);
  }

  private updateMagnet(dt: number): void {
    if (this.magnetSeconds <= 0) {
      return;
    }
    for (const entity of this.entities) {
      if (entity.kind !== 'star' || entity.z > 0.62) {
        continue;
      }
      entity.x += (this.shipX - entity.x) * dt * 4;
      entity.y += (this.shipY - entity.y) * dt * 4;
    }
  }

  private updateLockOn(dt: number): void {
    const candidates = this.entities
      .filter((entity) => entity.kind === 'answer' && entity.z > 0.08 && entity.z < 0.78)
      .map((entity) => ({
        entity,
        distance: distanceSquared(entity.x, entity.y, this.shipX, this.shipY),
      }))
      .filter(({ distance }) => distance < 0.22)
      .sort((left, right) => left.distance - right.distance);

    const target = candidates[0]?.entity;
    if (!target) {
      this.lockTargetId = null;
      this.lockProgress = Math.max(0, this.lockProgress - dt * 2.5);
      this.lockIsCorrect = false;
      return;
    }

    if (this.lockTargetId !== target.id) {
      this.lockTargetId = target.id;
      this.lockProgress = 0;
    }
    this.lockIsCorrect = target.correct === true;
    this.lockProgress += dt / this.lockSeconds;

    if (this.lockProgress >= 1) {
      this.resolveTarget(target.id);
    }
  }

  private resolveNearPlayerEntities(): void {
    const near = this.entities.filter((entity) => entity.z <= 0.1 && entity.z >= -0.08);
    for (const entity of near) {
      const collisionDistance = entity.kind === 'star' ? 0.15 : 0.13;
      if (distanceSquared(entity.x, entity.y, this.shipX, this.shipY) > collisionDistance) {
        continue;
      }

      if (entity.kind === 'star') {
        this.collectStar(entity.id);
      } else if (entity.kind === 'hazard') {
        this.hitHazard(entity.id);
      }

      if (this.challengeDelaySeconds > 0 || this.phase === 'failed' || this.phase === 'complete') {
        return;
      }
    }
  }

  private collectStar(entityId: string): void {
    this.entities = this.entities.filter((entity) => entity.id !== entityId);
    this.currentProgress += 1;
    this.score += 50;
    this.stars += 1;
    this.feedback = `${this.currentProgress} of ${this.currentDefinition.targetCount}`;
    this.feedbackSeconds = 0.55;

    if (this.currentProgress >= this.currentDefinition.targetCount) {
      this.completeChallenge(false);
    }
  }

  private hitHazard(entityId: string): void {
    this.entities = this.entities.filter((entity) => entity.id !== entityId);
    if (this.shieldSeconds > 0) {
      this.score += 10;
      this.feedback = 'Shield blocked it!';
      this.feedbackSeconds = 0.7;
      return;
    }

    this.hearts -= 1;
    this.feedback = 'Watch out!';
    this.feedbackSeconds = 0.9;
    if (this.hearts <= 0) {
      this.phase = 'failed';
      this.entities = [];
    }
  }

  private ensureActiveTargets(): void {
    if (this.challengeDelaySeconds > 0 || this.currentDefinition.kind === 'collect') {
      return;
    }
    const hasAnswers = this.entities.some((entity) => entity.kind === 'answer');
    if (!hasAnswers) {
      this.spawnCurrentChallenge();
    }
  }

  private recycleMissedCollectibles(): void {
    if (this.currentDefinition.kind !== 'collect') {
      return;
    }
    const remaining = this.currentDefinition.targetCount - this.currentProgress;
    const activeStars = this.entities.filter((entity) => entity.kind === 'star').length;
    for (let index = activeStars; index < remaining; index += 1) {
      this.entities.push(this.createStar(0.9 + index * 0.14));
    }
  }

  private completeChallenge(bossMode: boolean): void {
    this.entities = [];
    this.lockTargetId = null;
    this.lockProgress = 0;
    this.currentProgress = 0;
    this.challengeDelaySeconds = bossMode ? 0.65 : 0.75;

    if (bossMode) {
      this.currentDefinition = this.challengeFactory.create(this.bossMaxHealth - this.bossHealth, true);
      return;
    }

    this.challengeIndex += 1;
    if (this.challengeIndex >= this.totalChallenges) {
      this.phase = 'boss';
      this.feedback = 'Boss incoming!';
      this.feedbackSeconds = 1.4;
      this.currentDefinition = this.challengeFactory.create(0, true);
    } else {
      this.currentDefinition = this.challengeFactory.create(this.challengeIndex);
    }
  }

  private spawnCurrentChallenge(): void {
    this.entities = [];
    this.currentProgress = 0;
    this.lockTargetId = null;
    this.lockProgress = 0;

    if (this.currentDefinition.kind === 'collect') {
      for (let index = 0; index < this.currentDefinition.targetCount; index += 1) {
        this.entities.push(this.createStar(0.58 + index * 0.13));
      }
      this.spawnHazards(4);
      return;
    }

    const positions = this.random.shuffle([-0.58, 0, 0.58]);
    this.currentDefinition.options.forEach((value, index) => {
      const entity: MutableEntity = {
        id: this.id('answer'),
        kind: 'answer',
        x: positions[index] ?? 0,
        y: this.random.integer(-15, 20) / 100,
        z: 0.72 + index * 0.045,
        radius: 0.2,
        color: ANSWER_COLORS[index % ANSWER_COLORS.length] ?? '#36A8FF',
        label: String(value),
        correct: value === this.currentDefinition.answer,
      };
      this.entities.push(entity);
    });
    this.spawnHazards(this.phase === 'boss' ? 3 : 5);
  }

  private spawnHazards(count: number): void {
    for (let index = 0; index < count; index += 1) {
      this.entities.push({
        id: this.id('hazard'),
        kind: 'hazard',
        x: this.random.integer(-90, 90) / 100,
        y: this.random.integer(-25, 70) / 100,
        z: 0.35 + this.random.next() * 0.75 + index * 0.05,
        radius: 0.13,
        color: index % 2 === 0 ? '#FF472E' : '#8D2CFF',
      });
    }
  }

  private createStar(z: number): MutableEntity {
    return {
      id: this.id('star'),
      kind: 'star',
      x: this.random.integer(-80, 80) / 100,
      y: this.random.integer(-10, 65) / 100,
      z,
      radius: 0.12,
      color: '#FFD43B',
    };
  }

  private completeGame(): void {
    this.phase = 'complete';
    this.entities = [];
    this.lockTargetId = null;
    this.lockProgress = 0;
    this.score += 1000;
    this.feedback = 'Galaxy saved!';
    this.feedbackSeconds = 99;
  }

  private updateFeedback(dt: number): void {
    if (this.feedbackSeconds <= 0) {
      this.feedback = null;
      return;
    }
    this.feedbackSeconds -= dt;
  }

  private updateLaser(dt: number): void {
    if (!this.laser) {
      return;
    }
    this.laser.seconds -= dt;
    if (this.laser.seconds <= 0) {
      this.laser = null;
    }
  }

  private activeChallenge(): ActiveChallenge {
    const base = {
      id: this.currentDefinition.id,
      kind: this.currentDefinition.kind,
      prompt: this.currentDefinition.prompt,
      targetCount: this.currentDefinition.targetCount,
      progress: this.currentProgress,
    } as const;
    return this.currentDefinition.answer === undefined
      ? base
      : { ...base, answer: this.currentDefinition.answer };
  }

  private id(prefix: string): string {
    const id = `${prefix}-${this.nextEntityId}`;
    this.nextEntityId += 1;
    return id;
  }
}
