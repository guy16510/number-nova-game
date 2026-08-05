import type {
  ChallengeDefinition,
  DifficultyProfile,
  EntityBlueprint,
  EnemyArchetype,
  PowerUpKind,
  RandomSource,
  WavePlan,
  WavePattern,
} from './types';

export interface WaveContext {
  readonly challenge: ChallengeDefinition;
  readonly challengeIndex: number;
  readonly bossStage: number;
  readonly bossMode: boolean;
  readonly difficulty: DifficultyProfile;
}

export interface WaveDirectorPort {
  create(context: WaveContext): WavePlan;
}

const ANSWER_COLORS = ['#36A8FF', '#73E632', '#FF8B20', '#B85CFF'];

export class WaveDirector implements WaveDirectorPort {
  public constructor(private readonly random: RandomSource) {}

  public create(context: WaveContext): WavePlan {
    if (context.bossMode) return this.createBossWave(context);
    if (context.challenge.kind === 'collect') return this.createStarTrail(context);

    const patterns: readonly WavePattern[] = [
      'asteroid-tunnel',
      'answer-formation',
      'alien-ambush',
      'minefield',
      'rescue-run',
      'number-gates',
      'defense-line',
    ];
    const pattern: WavePattern = context.challenge.kind === 'rescue'
      ? 'rescue-run'
      : context.challenge.kind === 'gate'
        ? 'number-gates'
        : context.challenge.kind === 'defense'
          ? 'defense-line'
          : context.challenge.kind === 'rapid'
            ? 'alien-ambush'
            : context.challenge.kind === 'memory'
              ? 'minefield'
              : patterns[context.challengeIndex % patterns.length] as WavePattern;
    const entities: EntityBlueprint[] = [
      ...this.answerFormation(context, pattern),
      ...this.hazards(context, pattern),
    ];

    if (context.challenge.kind === 'rescue') {
      entities.push({ kind: 'ally', x: -0.72, y: 0.42, z: 0.76, radius: 0.17, color: '#62E7FF' });
    }
    if (context.challengeIndex > 0 && context.challengeIndex % 3 === 0) {
      entities.push(this.powerUp(context.challengeIndex));
    }

    return {
      name: this.waveName(pattern),
      pattern,
      entities,
    };
  }

  private createBossWave(context: WaveContext): WavePlan {
    const stage = Math.max(1, Math.min(3, context.bossStage));
    const pattern: WavePattern = stage === 1 ? 'boss-shield' : stage === 2 ? 'boss-dodge' : 'boss-weak-point';
    const entities: EntityBlueprint[] = [
      {
        kind: 'enemy',
        archetype: 'boss',
        x: 0,
        y: -0.2,
        z: 0.9,
        radius: 0.34,
        color: stage === 1 ? '#8E65FF' : stage === 2 ? '#FF5B4A' : '#FFD43B',
        health: 3,
        maxHealth: 3,
        shootable: false,
      },
      ...this.answerFormation(context, pattern),
      ...this.hazards(context, pattern),
    ];

    if (stage === 2) {
      for (const x of [-0.68, -0.25, 0.25, 0.68]) {
        entities.push({
          kind: 'enemyProjectile',
          x,
          y: -0.15,
          z: 0.78 + Math.abs(x) * 0.15,
          radius: 0.1,
          color: '#FF3C6B',
          vz: -0.38,
          warning: true,
        });
      }
    }

    return {
      name: stage === 1 ? 'Crack the mothership shield' : stage === 2 ? 'Dodge the plasma storm' : 'Hit the glowing weak point',
      pattern,
      entities,
    };
  }

  private answerFormation(context: WaveContext, pattern: WavePattern): EntityBlueprint[] {
    const positions = pattern === 'number-gates'
      ? [-0.65, 0, 0.65]
      : this.random.shuffle([-0.62, 0, 0.62]);
    const archetype = context.bossMode
      ? context.bossStage === 1 ? 'shield-ship' : 'zigzag-alien'
      : this.archetypeFor(context.challengeIndex);
    const shielded = archetype === 'shield-ship';

    return context.challenge.options.map((value, index) => ({
      kind: pattern === 'number-gates' ? 'gate' : 'enemy',
      archetype,
      x: positions[index] ?? 0,
      y: this.random.integer(-16, 18) / 100,
      z: 0.76 + index * 0.06,
      radius: pattern === 'number-gates' ? 0.24 : 0.2,
      color: ANSWER_COLORS[index % ANSWER_COLORS.length] ?? '#36A8FF',
      label: String(value),
      correct: value === context.challenge.answer,
      health: shielded ? 2 : 1,
      maxHealth: shielded ? 2 : 1,
      shootable: true,
    }));
  }

  private archetypeFor(index: number): EnemyArchetype {
    if (index < 2) return 'number-drone';
    return (['zigzag-alien', 'bomber-alien', 'shield-ship', 'number-drone'] as const)[(index - 2) % 4];
  }

  private hazards(context: WaveContext, pattern: WavePattern): EntityBlueprint[] {
    const count = context.difficulty.hazardCount + (context.bossMode ? 2 : 0);
    const hazards: EntityBlueprint[] = [];
    const tunnelGap = ((context.challengeIndex % 3) - 1) * 0.42;

    for (let index = 0; index < count; index += 1) {
      let x = this.random.integer(-92, 92) / 100;
      let y = this.random.integer(-24, 68) / 100;
      if (pattern === 'asteroid-tunnel') {
        const side = index % 2 === 0 ? -1 : 1;
        x = Math.max(-0.94, Math.min(0.94, tunnelGap + side * (0.42 + (index % 3) * 0.12)));
        y = -0.1 + (index % 4) * 0.2;
      } else if (pattern === 'minefield' || pattern === 'boss-dodge') {
        x = -0.8 + (index % 5) * 0.4;
      } else if (pattern === 'defense-line') {
        y = 0.45;
      }

      hazards.push({
        kind: 'hazard',
        x,
        y,
        z: 0.34 + this.random.next() * 0.72 + index * 0.045,
        radius: 0.12,
        color: index % 3 === 0 ? '#FF472E' : index % 3 === 1 ? '#8D2CFF' : '#A96E4A',
        shootable: pattern === 'defense-line',
      });
    }
    return hazards;
  }

  private createStarTrail(context: WaveContext): WavePlan {
    const entities: EntityBlueprint[] = [];
    for (let index = 0; index < context.challenge.targetCount; index += 1) {
      entities.push({
        kind: 'star',
        x: Math.sin(index * 1.35) * 0.58,
        y: -0.05 + (index % 3) * 0.22,
        z: 0.58 + index * 0.15,
        radius: 0.12,
        color: '#FFD43B',
      });
    }
    entities.push(...this.hazards(context, 'star-trail'));
    if (context.challengeIndex > 1) entities.push(this.powerUp(context.challengeIndex));
    return { name: 'Follow the glowing star trail', pattern: 'star-trail', entities };
  }

  private powerUp(index: number): EntityBlueprint {
    const kinds: readonly PowerUpKind[] = ['triple-shot', 'comet-missile', 'rainbow-beam', 'shield', 'magnet'];
    const powerUp = kinds[index % kinds.length] as PowerUpKind;
    return {
      kind: 'powerUp',
      powerUp,
      x: index % 2 === 0 ? -0.35 : 0.35,
      y: 0.28,
      z: 0.92,
      radius: 0.14,
      color: powerUp === 'triple-shot' ? '#50E8FF' : powerUp === 'comet-missile' ? '#FF7B38' : '#E75CFF',
      label: powerUp === 'triple-shot' ? '3X' : powerUp === 'comet-missile' ? '🚀' : '★',
    };
  }

  private waveName(pattern: WavePattern): string {
    const names: Record<WavePattern, string> = {
      'asteroid-tunnel': 'Asteroid tunnel',
      'answer-formation': 'Number drone formation',
      'alien-ambush': 'Alien ambush',
      'minefield': 'Plasma minefield',
      'star-trail': 'Energy star trail',
      'rescue-run': 'Rescue run',
      'defense-line': 'Asteroid defense',
      'number-gates': 'Number gates',
      'boss-shield': 'Boss shield',
      'boss-dodge': 'Boss plasma storm',
      'boss-weak-point': 'Boss weak point',
    };
    return names[pattern];
  }
}
