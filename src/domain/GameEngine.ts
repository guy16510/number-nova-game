import { ChallengeFactory, type ChallengeFactoryPort } from './ChallengeFactory';
import { CombatSystem, type CombatPort } from './CombatSystem';
import { CollisionSystem, type CollisionPort } from './CollisionSystem';
import { AdaptiveDifficultyDirector, type DifficultyPort } from './DifficultyDirector';
import { SeededRandom } from './SeededRandom';
import { WaveDirector, type WaveDirectorPort } from './WaveDirector';
import type {
  ActiveChallenge,
  ChallengeDefinition,
  DifficultyProfile,
  EntityBlueprint,
  GamePhase,
  GameSnapshot,
  LaserState,
  PowerUpKind,
  RewardState,
  SteeringInput,
  WavePattern,
  WeaponKind,
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
  label?: string | undefined;
  correct?: boolean | undefined;
  archetype?: WorldEntity['archetype'] | undefined;
  powerUp?: PowerUpKind | undefined;
  health?: number | undefined;
  maxHealth?: number | undefined;
  ttl?: number | undefined;
  targetId?: string | undefined;
  vx?: number | undefined;
  vy?: number | undefined;
  vz?: number | undefined;
  shootable?: boolean | undefined;
  warning?: boolean | undefined;
  cooldown?: number | undefined;
}

export interface GameEngineOptions {
  readonly seed?: number;
  readonly totalChallenges?: number;
  readonly lockSeconds?: number;
  readonly worldSpeed?: number;
  readonly challengeFactory?: ChallengeFactoryPort;
  readonly waveDirector?: WaveDirectorPort;
  readonly difficultyDirector?: DifficultyPort;
  readonly combatSystem?: CombatPort;
  readonly collisionSystem?: CollisionPort;
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.max(minimum, Math.min(maximum, value));

const distanceSquared = (ax: number, ay: number, bx: number, by: number): number => {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
};

const LASER_SECONDS = 0.26;
const FIRE_LOCK_THRESHOLD = 0.18;
const REWARDS: readonly RewardState[] = [
  { id: 'cyan-laser', name: 'Cyan Nova Laser', description: 'A bright new laser color for your ship.', type: 'laser-color' },
  { id: 'comet-trail', name: 'Comet Engine Trail', description: 'Leave a sparkling comet trail across space.', type: 'engine-trail' },
  { id: 'solar-paint', name: 'Solar Flare Paint', description: 'A fiery orange paint job for the Nova ship.', type: 'ship-paint' },
  { id: 'pip-companion', name: 'Pip the Space Buddy', description: 'A friendly alien copilot joins future missions.', type: 'companion' },
  { id: 'asteroid-ace', name: 'Asteroid Ace Badge', description: 'Proof that you survived the asteroid ambush.', type: 'badge' },
];

export class GameEngine {
  private readonly random: SeededRandom;
  private readonly challengeFactory: ChallengeFactoryPort;
  private readonly waveDirector: WaveDirectorPort;
  private readonly difficultyDirector: DifficultyPort;
  private readonly combatSystem: CombatPort;
  private readonly collisionSystem: CollisionPort;
  private readonly totalChallenges: number;
  private readonly lockSeconds: number;
  private readonly worldSpeed: number;

  private phase: GamePhase = 'ready';
  private pausedFrom: GamePhase = 'playing';
  private elapsedSeconds = 0;
  private challengeStartedAt = 0;
  private shipX = 0;
  private shipY = 0.3;
  private hearts = 3;
  private shieldSeconds = 0;
  private magnetSeconds = 0;
  private weapon: WeaponKind = 'nova-blaster';
  private weaponSeconds = 0;
  private shieldCharges = 2;
  private magnetCharges = 2;
  private score = 0;
  private stars = 0;
  private combo = 0;
  private bestCombo = 0;
  private shotsFired = 0;
  private shotsHit = 0;
  private collisions = 0;
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
  private fireCooldownSeconds = 0;
  private bossHealth = 3;
  private readonly bossMaxHealth = 3;
  private bossStage = 1;
  private laser: LaserState | null = null;
  private waveName = 'Launch corridor';
  private wavePattern: WavePattern = 'asteroid-tunnel';
  private screenShake = 0;
  private reward: RewardState | null = null;
  private nextEntityId = 1;

  public constructor(options: GameEngineOptions = {}) {
    this.random = new SeededRandom(options.seed ?? Date.now());
    this.difficultyDirector = options.difficultyDirector ?? new AdaptiveDifficultyDirector();
    this.challengeFactory = options.challengeFactory ?? new ChallengeFactory(this.random);
    this.waveDirector = options.waveDirector ?? new WaveDirector(this.random);
    this.combatSystem = options.combatSystem ?? new CombatSystem();
    this.collisionSystem = options.collisionSystem ?? new CollisionSystem();
    this.totalChallenges = options.totalChallenges ?? 10;
    this.lockSeconds = options.lockSeconds ?? 0.48;
    this.worldSpeed = options.worldSpeed ?? 0.27;
    const profile = this.difficultyDirector.profile(0);
    this.currentDefinition = this.challengeFactory.create(0, { mathLevel: profile.mathLevel });
  }

  public start(): void {
    if (this.phase !== 'ready') return;
    this.phase = 'playing';
    this.challengeStartedAt = this.elapsedSeconds;
    this.spawnCurrentChallenge();
  }

  public pause(): void {
    if (this.phase !== 'playing' && this.phase !== 'boss') return;
    this.pausedFrom = this.phase;
    this.phase = 'paused';
  }

  public resume(): void {
    if (this.phase !== 'paused') return;
    this.phase = this.pausedFrom;
  }

  public useShield(): boolean {
    if (this.shieldCharges <= 0 || this.shieldSeconds > 0) return false;
    this.shieldCharges -= 1;
    this.shieldSeconds = 5;
    this.feedback = 'Bubble shield activated!';
    this.feedbackSeconds = 1.2;
    return true;
  }

  public useMagnet(): boolean {
    if (this.magnetCharges <= 0 || this.magnetSeconds > 0) return false;
    this.magnetCharges -= 1;
    this.magnetSeconds = 5;
    this.feedback = 'Star magnet activated!';
    this.feedbackSeconds = 1.2;
    return true;
  }

  public fire(): boolean {
    if ((this.phase !== 'playing' && this.phase !== 'boss') || this.fireCooldownSeconds > 0) return false;

    const locked = this.lockTargetId === null
      ? undefined
      : this.entities.find((entity) => entity.id === this.lockTargetId && entity.shootable);
    const correctTarget = this.entities.find((entity) => entity.shootable && entity.correct === true);
    const primaryTarget = this.weapon === 'comet-missile' ? correctTarget : locked;
    const hasLock = primaryTarget !== undefined && (this.weapon === 'comet-missile' || this.lockProgress >= FIRE_LOCK_THRESHOLD);
    const beams = this.weapon === 'triple-shot' ? 3 : this.weapon === 'rainbow-beam' ? 5 : 1;

    this.shotsFired += 1;
    this.fireCooldownSeconds = this.weapon === 'rainbow-beam' ? 0.34 : 0.22;
    this.laser = {
      x: hasLock ? primaryTarget.x : this.shipX,
      y: hasLock ? primaryTarget.y : this.shipY - 0.42,
      z: hasLock ? primaryTarget.z : 0.46,
      seconds: LASER_SECONDS,
      beams,
    };

    if (!hasLock) {
      this.difficultyDirector.recordShot(false);
      this.spawnProjectile(undefined, 0);
      if (beams >= 3) {
        this.spawnProjectile(undefined, -0.08);
        this.spawnProjectile(undefined, 0.08);
      }
      this.feedback = 'Line up a glowing target!';
      this.feedbackSeconds = 0.55;
      return true;
    }

    this.spawnProjectile(primaryTarget, 0);
    if (beams >= 3) {
      this.spawnProjectile(primaryTarget, -0.06);
      this.spawnProjectile(primaryTarget, 0.06);
    }
    if (beams >= 5) {
      const hazards = this.entities.filter((entity) => entity.kind === 'hazard' && entity.shootable).slice(0, 2);
      for (const hazard of hazards) this.spawnProjectile(hazard, 0);
    }
    return true;
  }

  public update(deltaSeconds: number, input: SteeringInput): void {
    if (this.phase !== 'playing' && this.phase !== 'boss') return;
    const dt = clamp(deltaSeconds, 0, 0.05);
    this.elapsedSeconds += dt;
    this.updateTimers(dt);
    this.updateShip(dt, input);

    if (this.challengeDelaySeconds > 0) {
      this.challengeDelaySeconds -= dt;
      this.updateTransientEntities(dt);
      if (this.challengeDelaySeconds <= 0) this.spawnCurrentChallenge();
      return;
    }

    this.updateEntities(dt);
    this.updateMagnet(dt);
    this.updateCombat(dt);
    this.updateLockOn(dt);
    this.resolveNearPlayerEntities();
    this.recycleMissedCollectibles();
    this.ensureActiveTargets();
  }

  public resolveTarget(entityId: string): boolean {
    const target = this.entities.find((entity) => entity.id === entityId && entity.shootable);
    if (!target) return false;
    this.shotsFired += 1;
    this.beginLaser(target, 1);
    return this.applyTargetHit(target.id, false);
  }

  public snapshot(): GameSnapshot {
    const accuracy = this.shotsFired === 0 ? 1 : this.shotsHit / this.shotsFired;
    return {
      phase: this.phase,
      elapsedSeconds: this.elapsedSeconds,
      ship: {
        x: this.shipX,
        y: this.shipY,
        hearts: this.hearts,
        shieldSeconds: this.shieldSeconds,
        magnetSeconds: this.magnetSeconds,
        weapon: this.weapon,
        weaponSeconds: this.weaponSeconds,
      },
      entities: this.entities.map((entity) => ({ ...entity })),
      challenge: this.activeChallenge(),
      score: this.score,
      stars: this.stars,
      combo: this.combo,
      bestCombo: this.bestCombo,
      shotsFired: this.shotsFired,
      shotsHit: this.shotsHit,
      accuracy,
      collisions: this.collisions,
      challengeNumber: Math.min(this.challengeIndex + 1, this.totalChallenges),
      totalChallenges: this.totalChallenges,
      lockTargetId: this.lockTargetId,
      lockProgress: this.lockProgress,
      lockIsCorrect: this.lockIsCorrect,
      bossHealth: this.bossHealth,
      bossMaxHealth: this.bossMaxHealth,
      bossStage: this.bossStage,
      feedback: this.feedback,
      laser: this.laser ? { ...this.laser } : null,
      shieldCharges: this.shieldCharges,
      magnetCharges: this.magnetCharges,
      waveName: this.waveName,
      wavePattern: this.wavePattern,
      screenShake: this.screenShake,
      reward: this.reward,
    };
  }

  private spawnProjectile(target: MutableEntity | undefined, lateralOffset: number): void {
    const startZ = target ? Math.max(0.02, target.z - 0.2) : 0.05;
    this.entities.push({
      id: this.id('projectile'),
      kind: 'projectile',
      x: target ? target.x + lateralOffset : this.shipX + lateralOffset,
      y: target ? target.y : this.shipY,
      z: startZ,
      radius: 0.045,
      color: this.weapon === 'rainbow-beam' ? '#FF70F6' : this.weapon === 'comet-missile' ? '#FF9A3C' : '#72EEFF',
      ttl: 0.42,
      targetId: target?.id,
      vx: 0,
      vy: 0,
      vz: target ? 3.4 : 2.8,
    });
  }

  private updateTimers(dt: number): void {
    this.shieldSeconds = Math.max(0, this.shieldSeconds - dt);
    this.magnetSeconds = Math.max(0, this.magnetSeconds - dt);
    this.weaponSeconds = Math.max(0, this.weaponSeconds - dt);
    this.fireCooldownSeconds = Math.max(0, this.fireCooldownSeconds - dt);
    this.feedbackSeconds = Math.max(0, this.feedbackSeconds - dt);
    this.screenShake = Math.max(0, this.screenShake - dt * 3.8);
    if (this.weaponSeconds <= 0) this.weapon = 'nova-blaster';
    if (this.feedbackSeconds <= 0) this.feedback = null;
    if (this.laser) {
      this.laser = { ...this.laser, seconds: Math.max(0, this.laser.seconds - dt) };
      if (this.laser.seconds <= 0) this.laser = null;
    }
  }

  private updateShip(dt: number, input: SteeringInput): void {
    const desiredX = clamp(input.x, -1, 1) * 0.88;
    const desiredY = 0.3 + clamp(input.y, -1, 1) * 0.45;
    const responsiveness = 5.8;
    this.shipX += (desiredX - this.shipX) * responsiveness * dt;
    this.shipY += (desiredY - this.shipY) * responsiveness * dt;
    this.shipX = clamp(this.shipX, -0.95, 0.95);
    this.shipY = clamp(this.shipY, -0.15, 0.8);
  }

  private updateEntities(dt: number): void {
    const difficulty = this.currentDifficulty();
    const spawned: MutableEntity[] = [];

    for (const entity of this.entities) {
      const entityNumber = Number(entity.id.split('-').at(-1)) || 0;
      if (entity.kind === 'projectile') continue;
      if (entity.kind === 'explosion' || entity.kind === 'debris') {
        entity.ttl = Math.max(0, (entity.ttl ?? 0) - dt);
        entity.x += (entity.vx ?? 0) * dt;
        entity.y += (entity.vy ?? 0) * dt;
        entity.z += (entity.vz ?? 0) * dt;
        continue;
      }
      if (entity.archetype === 'boss') {
        entity.x = Math.sin(this.elapsedSeconds * 0.7) * 0.13;
        entity.y = -0.18 + Math.cos(this.elapsedSeconds * 0.9) * 0.035;
        entity.z = 0.9;
        continue;
      }

      const speed = this.worldSpeed * difficulty.worldSpeedMultiplier;
      entity.z += entity.vz !== undefined ? entity.vz * dt : -speed * dt;
      entity.x += (entity.vx ?? 0) * dt;
      entity.y += (entity.vy ?? 0) * dt;

      if (entity.archetype === 'zigzag-alien') {
        entity.x += Math.sin(this.elapsedSeconds * 3.1 + entityNumber) * dt * difficulty.targetMovement;
      } else if (entity.archetype === 'bomber-alien') {
        entity.x += Math.sin(this.elapsedSeconds * 1.8 + entityNumber) * dt * difficulty.targetMovement * 0.7;
        entity.cooldown = (entity.cooldown ?? difficulty.enemyFireRate) - dt;
        if (entity.cooldown <= 0 && entity.z > 0.28 && entity.z < 0.86) {
          spawned.push({
            id: this.id('enemyProjectile'),
            kind: 'enemyProjectile',
            x: entity.x,
            y: entity.y,
            z: entity.z - 0.05,
            radius: 0.09,
            color: '#FF3E75',
            vz: -0.46,
            warning: true,
          });
          entity.cooldown = difficulty.enemyFireRate;
        }
      } else if (entity.kind === 'hazard') {
        entity.x += Math.sin(this.elapsedSeconds * 2.2 + entityNumber) * dt * 0.065;
        entity.y += Math.cos(this.elapsedSeconds * 1.6 + entityNumber * 0.4) * dt * 0.025;
      }

      entity.x = clamp(entity.x, -0.99, 0.99);
      entity.y = clamp(entity.y, -0.3, 0.78);
    }

    this.entities.push(...spawned);
    this.entities = this.entities.filter((entity) => {
      if ((entity.kind === 'explosion' || entity.kind === 'debris') && (entity.ttl ?? 0) <= 0) return false;
      if (entity.kind === 'projectile') return true;
      return entity.z > -0.2 && entity.z < 1.35;
    }).slice(-42);
  }

  private updateTransientEntities(dt: number): void {
    for (const entity of this.entities) {
      if (entity.kind !== 'explosion' && entity.kind !== 'debris') continue;
      entity.ttl = Math.max(0, (entity.ttl ?? 0) - dt);
      entity.x += (entity.vx ?? 0) * dt;
      entity.y += (entity.vy ?? 0) * dt;
    }
    this.entities = this.entities.filter((entity) => (entity.ttl ?? 1) > 0);
  }

  private updateCombat(dt: number): void {
    const update = this.combatSystem.update(this.entities, dt);
    this.entities = update.entities.map((entity) => ({ ...entity }));
    for (const hit of update.hits) this.applyTargetHit(hit.targetId, true);
  }

  private applyTargetHit(entityId: string, fromProjectile: boolean): boolean {
    const entity = this.entities.find((candidate) => candidate.id === entityId && candidate.shootable);
    if (!entity) return false;

    if (fromProjectile) this.beginLaser(entity, this.weapon === 'triple-shot' ? 3 : this.weapon === 'rainbow-beam' ? 5 : 1);
    this.shotsHit += 1;
    if (entity.kind === 'hazard' && entity.correct === undefined) {
      this.difficultyDirector.recordShot(true);
      this.score += 55;
      this.spawnExplosion(entity, true);
      this.removeEntity(entity.id);
      this.feedback = 'Asteroid blasted, crew protected!';
      this.feedbackSeconds = 0.65;
      this.screenShake = Math.max(this.screenShake, 0.35);
      return true;
    }

    const correct = entity.correct === true;
    this.difficultyDirector.recordShot(correct);

    if (!correct) {
      this.combo = 0;
      this.feedback = 'That alien was a decoy, try another!';
      this.feedbackSeconds = 0.85;
      this.spawnExplosion(entity, false);
      this.removeEntity(entity.id);
      this.lockTargetId = null;
      this.lockProgress = 0;
      return false;
    }

    if ((entity.health ?? 1) > 1) {
      entity.health = (entity.health ?? 1) - 1;
      this.score += 35;
      this.feedback = 'Shield cracked, hit it again!';
      this.feedbackSeconds = 0.75;
      this.screenShake = Math.max(this.screenShake, 0.22);
      return true;
    }

    this.spawnExplosion(entity, true);
    this.removeEntity(entity.id);
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const comboBonus = Math.max(0, this.combo - 1) * 25;
    this.score += (this.phase === 'boss' ? 300 : 125) + comboBonus;
    this.stars += 1;
    this.currentProgress += 1;
    this.screenShake = Math.max(this.screenShake, this.phase === 'boss' ? 0.75 : 0.42);
    this.feedback = this.combo > 1 ? `${this.combo} hit combo, awesome!` : 'Direct hit!';
    this.feedbackSeconds = 0.8;
    this.lockTargetId = null;
    this.lockProgress = 0;

    if (this.currentProgress >= this.currentDefinition.targetCount) {
      this.difficultyDirector.recordAnswer(this.elapsedSeconds - this.challengeStartedAt);
      this.completeChallenge(this.phase === 'boss');
    } else {
      this.challengeDelaySeconds = 0.38;
      this.entities = this.entities.filter((candidate) => candidate.kind === 'explosion' || candidate.kind === 'debris' || candidate.archetype === 'boss');
      this.feedback = `${this.currentProgress} of ${this.currentDefinition.targetCount}, keep blasting!`;
      this.feedbackSeconds = 0.75;
    }
    return true;
  }

  private beginLaser(entity: MutableEntity, beams: number): void {
    this.laser = { x: entity.x, y: entity.y, z: entity.z, seconds: LASER_SECONDS, beams };
  }

  private spawnExplosion(entity: MutableEntity, big: boolean): void {
    this.entities.push({
      id: this.id('explosion'),
      kind: 'explosion',
      x: entity.x,
      y: entity.y,
      z: entity.z,
      radius: big ? 0.25 : 0.16,
      color: big ? '#FFD84A' : '#FF5C67',
      ttl: big ? 0.62 : 0.4,
    });
    const debrisCount = big ? 8 : 4;
    for (let index = 0; index < debrisCount; index += 1) {
      const angle = (index / debrisCount) * Math.PI * 2;
      this.entities.push({
        id: this.id('debris'),
        kind: 'debris',
        x: entity.x,
        y: entity.y,
        z: entity.z,
        radius: 0.025 + (index % 3) * 0.008,
        color: index % 2 === 0 ? '#FF9C3B' : '#72ECFF',
        ttl: 0.45 + (index % 3) * 0.08,
        vx: Math.cos(angle) * 0.42,
        vy: Math.sin(angle) * 0.42,
        vz: -0.08,
      });
    }
  }

  private updateMagnet(dt: number): void {
    if (this.magnetSeconds <= 0) return;
    for (const entity of this.entities) {
      if ((entity.kind !== 'star' && entity.kind !== 'powerUp') || entity.z > 0.65) continue;
      entity.x += (this.shipX - entity.x) * dt * 4.4;
      entity.y += (this.shipY - entity.y) * dt * 4.4;
    }
  }

  private updateLockOn(dt: number): void {
    const difficulty = this.currentDifficulty();
    const candidates = this.entities
      .filter((entity) => entity.shootable && entity.z > 0.05 && entity.z < 0.9)
      .map((entity) => ({ entity, distance: distanceSquared(entity.x, entity.y, this.shipX, this.shipY) }))
      .filter(({ distance }) => distance < difficulty.lockRadius)
      .sort((left, right) => left.distance - right.distance);
    const target = candidates[0]?.entity;

    if (!target) {
      this.lockTargetId = null;
      this.lockProgress = Math.max(0, this.lockProgress - dt * 3);
      this.lockIsCorrect = false;
      return;
    }
    if (this.lockTargetId !== target.id) {
      this.lockTargetId = target.id;
      this.lockProgress = 0;
    }
    this.lockIsCorrect = target.correct === true;
    this.lockProgress = Math.min(1, this.lockProgress + dt / this.lockSeconds);
  }

  private resolveNearPlayerEntities(): void {
    const ship = { x: this.shipX, y: this.shipY };
    const candidates = [...this.entities];
    for (const entity of candidates) {
      if (!this.collisionSystem.collidesWithShip(entity, ship)) continue;
      if (entity.kind === 'star') {
        this.collectStar(entity.id);
      } else if (entity.kind === 'powerUp') {
        this.collectPowerUp(entity);
      } else if (entity.kind === 'gate') {
        if (entity.correct) this.completeGate(entity);
        else this.hitHazard(entity.id, 'Wrong gate!');
      } else if (entity.kind === 'hazard' || entity.kind === 'enemyProjectile' || entity.kind === 'enemy') {
        this.hitHazard(entity.id, entity.kind === 'enemyProjectile' ? 'Plasma hit!' : 'Asteroid hit!');
      }
      if (this.phase === 'failed' || this.phase === 'complete' || this.challengeDelaySeconds > 0) return;
    }
  }

  private collectStar(entityId: string): void {
    this.removeEntity(entityId);
    this.currentProgress += 1;
    this.score += 60;
    this.stars += 1;
    this.feedback = `${this.currentProgress} of ${this.currentDefinition.targetCount} stars`;
    this.feedbackSeconds = 0.55;
    if (this.currentProgress >= this.currentDefinition.targetCount) {
      this.difficultyDirector.recordAnswer(this.elapsedSeconds - this.challengeStartedAt);
      this.completeChallenge(false);
    }
  }

  private collectPowerUp(entity: MutableEntity): void {
    this.removeEntity(entity.id);
    const power = entity.powerUp ?? 'triple-shot';
    if (power === 'shield') {
      this.shieldSeconds = Math.max(this.shieldSeconds, 6);
    } else if (power === 'magnet') {
      this.magnetSeconds = Math.max(this.magnetSeconds, 6);
    } else {
      this.weapon = power;
      this.weaponSeconds = power === 'rainbow-beam' ? 5 : 8;
    }
    this.score += 75;
    this.feedback = power === 'triple-shot'
      ? 'Triple shot unlocked!'
      : power === 'comet-missile'
        ? 'Comet missiles ready!'
        : power === 'rainbow-beam'
          ? 'Rainbow beam ready!'
          : power === 'shield'
            ? 'Shield power collected!'
            : 'Star magnet collected!';
    this.feedbackSeconds = 1.2;
    this.screenShake = Math.max(this.screenShake, 0.18);
  }

  private completeGate(entity: MutableEntity): void {
    this.removeEntity(entity.id);
    this.score += 150;
    this.stars += 1;
    this.currentProgress = this.currentDefinition.targetCount;
    this.feedback = 'Perfect gate!';
    this.feedbackSeconds = 0.75;
    this.difficultyDirector.recordAnswer(this.elapsedSeconds - this.challengeStartedAt);
    this.completeChallenge(false);
  }

  private hitHazard(entityId: string, message: string): void {
    this.removeEntity(entityId);
    if (this.shieldSeconds > 0) {
      this.score += 15;
      this.feedback = 'Shield blocked it!';
      this.feedbackSeconds = 0.7;
      return;
    }
    this.combo = 0;
    this.hearts -= 1;
    this.collisions += 1;
    this.difficultyDirector.recordCollision();
    this.screenShake = Math.max(this.screenShake, 0.9);
    this.feedback = message;
    this.feedbackSeconds = 0.9;
    if (this.hearts <= 0) {
      this.hearts = 0;
      this.phase = 'failed';
      this.entities = [];
      this.lockTargetId = null;
      this.lockProgress = 0;
      this.lockIsCorrect = false;
    }
  }

  private recycleMissedCollectibles(): void {
    if (this.currentDefinition.kind !== 'collect' || this.challengeDelaySeconds > 0) return;
    const remaining = this.currentDefinition.targetCount - this.currentProgress;
    const active = this.entities.filter((entity) => entity.kind === 'star').length;
    for (let index = active; index < remaining; index += 1) {
      this.entities.push(this.fromBlueprint({
        kind: 'star',
        x: Math.sin((index + this.elapsedSeconds) * 1.4) * 0.6,
        y: -0.05 + (index % 3) * 0.2,
        z: 0.92 + index * 0.14,
        radius: 0.12,
        color: '#FFD43B',
      }));
    }
  }

  private ensureActiveTargets(): void {
    if (this.challengeDelaySeconds > 0 || this.currentDefinition.kind === 'collect') return;
    const hasCorrect = this.entities.some((entity) => entity.shootable && entity.correct === true);
    if (!hasCorrect) {
      this.entities = this.entities.filter((entity) => entity.kind === 'explosion' || entity.kind === 'debris' || entity.archetype === 'boss');
      this.spawnCurrentChallenge();
    }
  }

  private completeChallenge(bossMode: boolean): void {
    this.entities = this.entities.filter((entity) => entity.kind === 'explosion' || entity.kind === 'debris');
    this.lockTargetId = null;
    this.lockProgress = 0;
    this.currentProgress = 0;
    this.challengeDelaySeconds = bossMode ? 0.72 : 0.58;

    if (bossMode) {
      this.bossHealth -= 1;
      if (this.bossHealth <= 0) {
        this.completeGame();
        return;
      }
      this.bossStage = this.bossMaxHealth - this.bossHealth + 1;
      const profile = this.currentDifficulty();
      this.currentDefinition = this.challengeFactory.create(this.bossStage - 1, {
        bossMode: true,
        mathLevel: profile.mathLevel,
      });
      this.feedback = this.bossStage === 2 ? 'Shield down, dodge the plasma!' : 'Weak point exposed!';
      this.feedbackSeconds = 1.35;
      return;
    }

    this.challengeIndex += 1;
    if (this.challengeIndex >= this.totalChallenges) {
      this.phase = 'boss';
      this.pausedFrom = 'boss';
      this.bossStage = 1;
      const profile = this.currentDifficulty();
      this.currentDefinition = this.challengeFactory.create(0, { bossMode: true, mathLevel: profile.mathLevel });
      this.feedback = 'Mothership incoming!';
      this.feedbackSeconds = 1.6;
      this.screenShake = 1;
    } else {
      const profile = this.currentDifficulty();
      this.currentDefinition = this.challengeFactory.create(this.challengeIndex, { mathLevel: profile.mathLevel });
    }
    this.challengeStartedAt = this.elapsedSeconds + this.challengeDelaySeconds;
  }

  private completeGame(): void {
    this.phase = 'complete';
    this.entities = [];
    this.bossHealth = 0;
    this.bossStage = 3;
    this.score += 1200 + this.hearts * 200 + Math.round(this.snapshot().accuracy * 500);
    this.feedback = 'Galaxy saved!';
    this.feedbackSeconds = 2;
    this.reward = REWARDS[(this.bestCombo + this.stars + this.challengeIndex) % REWARDS.length] ?? REWARDS[0] ?? null;
    this.screenShake = 1;
  }

  private spawnCurrentChallenge(): void {
    if (this.phase !== 'playing' && this.phase !== 'boss') return;
    this.lockTargetId = null;
    this.lockProgress = 0;
    this.lockIsCorrect = false;
    const plan = this.waveDirector.create({
      challenge: this.currentDefinition,
      challengeIndex: this.challengeIndex,
      bossStage: this.bossStage,
      bossMode: this.phase === 'boss',
      difficulty: this.currentDifficulty(),
    });
    const transient = this.entities.filter((entity) => entity.kind === 'explosion' || entity.kind === 'debris');
    this.entities = [...transient, ...plan.entities.map((blueprint) => this.fromBlueprint(blueprint))];
    this.waveName = plan.name;
    this.wavePattern = plan.pattern;
    this.challengeDelaySeconds = 0;
    this.challengeStartedAt = this.elapsedSeconds;
  }

  private activeChallenge(): ActiveChallenge {
    return {
      id: this.currentDefinition.id,
      kind: this.currentDefinition.kind,
      prompt: this.currentDefinition.prompt,
      answer: this.currentDefinition.answer,
      targetCount: this.currentDefinition.targetCount,
      progress: this.currentProgress,
      mathLevel: this.currentDefinition.mathLevel,
    };
  }

  private currentDifficulty(): DifficultyProfile {
    return this.difficultyDirector.profile(this.challengeIndex + (this.phase === 'boss' ? 2 : 0));
  }

  private fromBlueprint(blueprint: EntityBlueprint): MutableEntity {
    return { id: this.id(blueprint.kind), ...blueprint };
  }

  private removeEntity(id: string): void {
    this.entities = this.entities.filter((entity) => entity.id !== id);
    if (this.lockTargetId === id) {
      this.lockTargetId = null;
      this.lockProgress = 0;
      this.lockIsCorrect = false;
    }
  }

  private id(prefix: string): string {
    const id = `${prefix}-${this.nextEntityId}`;
    this.nextEntityId += 1;
    return id;
  }
}
