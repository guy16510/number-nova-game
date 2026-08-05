import type { ChallengeDefinition, ChallengeKind, RandomSource } from './types';

export interface ChallengeContext {
  readonly bossMode?: boolean;
  readonly mathLevel?: number;
}

export interface ChallengeFactoryPort {
  create(index: number, context?: ChallengeContext): ChallengeDefinition;
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const MISSION_ROTATION: readonly ChallengeKind[] = [
  'addition',
  'number',
  'collect',
  'addition',
  'rescue',
  'comparison',
  'gate',
  'subtraction',
  'defense',
  'rapid',
  'memory',
];

export class ChallengeFactory implements ChallengeFactoryPort {
  public constructor(private readonly random: RandomSource) {}

  public create(index: number, context: ChallengeContext = {}): ChallengeDefinition {
    const mathLevel = clamp(context.mathLevel ?? 0, 0, 7);
    const bossMode = context.bossMode ?? false;
    const kind = bossMode ? this.bossKind(index, mathLevel) : (MISSION_ROTATION[index % MISSION_ROTATION.length] as ChallengeKind);

    switch (kind) {
      case 'collect': return this.createCollect(index, mathLevel);
      case 'addition': return this.createAddition(index, mathLevel, bossMode);
      case 'subtraction': return this.createSubtraction(index, mathLevel, bossMode);
      case 'comparison': return this.createComparison(index, mathLevel, bossMode);
      case 'rescue': return this.createStoryChallenge(index, mathLevel, 'rescue');
      case 'gate': return this.createStoryChallenge(index, mathLevel, 'gate');
      case 'memory': return this.createStoryChallenge(index, mathLevel, 'memory');
      case 'defense': return this.createStoryChallenge(index, mathLevel, 'defense');
      case 'rapid': return this.createStoryChallenge(index, mathLevel, 'rapid');
      default: return this.createNumber(index, mathLevel, bossMode);
    }
  }

  private bossKind(index: number, mathLevel: number): ChallengeKind {
    if (index === 0) return 'addition';
    if (index === 1 && mathLevel >= 3) return 'subtraction';
    return mathLevel >= 2 ? 'comparison' : 'number';
  }

  private createNumber(index: number, mathLevel: number, bossMode: boolean): ChallengeDefinition {
    const maximum = Math.min(20, 3 + mathLevel * 2);
    const answer = this.random.integer(1, maximum);
    return this.answerChallenge(
      `number-${index}-${answer}`,
      'number',
      bossMode ? `Break the boss shield, find ${answer}` : `Find ${answer}`,
      answer,
      1,
      mathLevel,
    );
  }

  private createAddition(index: number, mathLevel: number, bossMode: boolean): ChallengeDefinition {
    if (index === 0 && !bossMode) {
      return this.answerChallenge('addition-0-1-1', 'addition', 'Solve 1 + 1', 2, 1, mathLevel);
    }
    const maxSumByLevel = [3, 5, 7, 10, 12, 15, 18, 20] as const;
    const maxSum = maxSumByLevel[mathLevel] ?? 20;
    const left = this.random.integer(1, Math.max(1, maxSum - 1));
    const right = this.random.integer(1, Math.max(1, maxSum - left));
    const answer = left + right;
    return this.answerChallenge(
      `addition-${index}-${left}-${right}`,
      'addition',
      bossMode ? `Boss shield, ${left} plus ${right}` : `Solve ${left} + ${right}`,
      answer,
      1,
      mathLevel,
    );
  }

  private createSubtraction(index: number, mathLevel: number, bossMode: boolean): ChallengeDefinition {
    const maximum = mathLevel < 5 ? 5 : mathLevel < 7 ? 10 : 20;
    const left = this.random.integer(2, maximum);
    const right = this.random.integer(1, left);
    const answer = left - right;
    return this.answerChallenge(
      `subtraction-${index}-${left}-${right}`,
      'subtraction',
      bossMode ? `Crack the armor, ${left} minus ${right}` : `Solve ${left} - ${right}`,
      answer,
      1,
      mathLevel,
    );
  }

  private createComparison(index: number, mathLevel: number, bossMode: boolean): ChallengeDefinition {
    const maximum = Math.min(20, 5 + mathLevel * 2);
    const first = this.random.integer(1, maximum - 1);
    let second = this.random.integer(1, maximum);
    if (second === first) second = second === maximum ? second - 1 : second + 1;
    const answer = Math.max(first, second);
    return this.answerChallenge(
      `comparison-${index}-${first}-${second}`,
      'comparison',
      bossMode ? `Boss weak point, which is greater, ${first} or ${second}?` : `Which is greater, ${first} or ${second}?`,
      answer,
      1,
      mathLevel,
    );
  }

  private createStoryChallenge(index: number, mathLevel: number, kind: 'rescue' | 'gate' | 'memory' | 'defense' | 'rapid'): ChallengeDefinition {
    const maximum = Math.min(20, 4 + mathLevel * 2);
    const answer = this.random.integer(1, maximum);
    const prompts: Record<typeof kind, string> = {
      rescue: `Rescue the crew, blast ${answer}`,
      gate: `Fly through gate ${answer}`,
      memory: `Remember ${answer}, find it!`,
      defense: `Defend the ship, blast ${answer}`,
      rapid: `Rapid blast, hit ${answer} three times`,
    };
    return this.answerChallenge(
      `${kind}-${index}-${answer}`,
      kind,
      prompts[kind],
      answer,
      kind === 'rapid' || kind === 'defense' ? 3 : 1,
      mathLevel,
    );
  }

  private createCollect(index: number, mathLevel: number): ChallengeDefinition {
    const targetCount = this.random.integer(3, Math.min(7, 4 + Math.floor(mathLevel / 2)));
    return {
      id: `collect-${index}-${targetCount}`,
      kind: 'collect',
      prompt: `Collect ${targetCount} energy stars`,
      targetCount,
      options: [],
      mathLevel,
    };
  }

  private answerChallenge(
    id: string,
    kind: ChallengeKind,
    prompt: string,
    answer: number,
    targetCount: number,
    mathLevel: number,
  ): ChallengeDefinition {
    return {
      id,
      kind,
      prompt,
      answer,
      targetCount,
      options: this.createOptions(answer, mathLevel),
      mathLevel,
    };
  }

  private createOptions(answer: number, mathLevel: number): readonly number[] {
    const maximum = Math.min(20, Math.max(10, answer + 4, 5 + mathLevel * 2));
    const values = new Set<number>([answer]);
    const offsets = this.random.shuffle([-4, -3, -2, -1, 1, 2, 3, 4]);
    for (const offset of offsets) {
      values.add(clamp(answer + offset, 0, maximum));
      if (values.size === 3) break;
    }
    while (values.size < 3) values.add(this.random.integer(0, maximum));
    return this.random.shuffle([...values]);
  }
}
