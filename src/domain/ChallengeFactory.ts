import type { ChallengeDefinition, ChallengeKind, RandomSource } from './types';

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

export class ChallengeFactory {
  public constructor(private readonly random: RandomSource) {}

  public create(index: number, bossMode = false): ChallengeDefinition {
    const kind = this.kindForIndex(index, bossMode);
    if (kind === 'collect') {
      return this.createCollect(index);
    }
    if (kind === 'addition') {
      return this.createAddition(index, bossMode);
    }
    return this.createNumber(index, bossMode);
  }

  private kindForIndex(index: number, bossMode: boolean): ChallengeKind {
    if (bossMode) {
      return index % 2 === 0 ? 'addition' : 'number';
    }
    return (['number', 'addition', 'collect'] as const)[index % 3] as ChallengeKind;
  }

  private createNumber(index: number, bossMode: boolean): ChallengeDefinition {
    const answer = this.random.integer(bossMode ? 4 : 1, 9);
    return {
      id: `number-${index}-${answer}`,
      kind: 'number',
      prompt: bossMode ? `Break the shield, find ${answer}` : `Find ${answer}`,
      answer,
      targetCount: 1,
      options: this.createOptions(answer),
    };
  }

  private createAddition(index: number, bossMode: boolean): ChallengeDefinition {
    const left = this.random.integer(1, bossMode ? 6 : 5);
    const right = this.random.integer(1, Math.max(1, 10 - left));
    const answer = left + right;
    return {
      id: `addition-${index}-${left}-${right}`,
      kind: 'addition',
      prompt: bossMode ? `Boss shield, ${left} plus ${right}` : `Solve ${left} + ${right}`,
      answer,
      targetCount: 1,
      options: this.createOptions(answer),
    };
  }

  private createCollect(index: number): ChallengeDefinition {
    const targetCount = this.random.integer(3, 6);
    return {
      id: `collect-${index}-${targetCount}`,
      kind: 'collect',
      prompt: `Collect ${targetCount} stars`,
      targetCount,
      options: [],
    };
  }

  private createOptions(answer: number): readonly number[] {
    const values = new Set<number>([answer]);
    const offsets = this.random.shuffle([-3, -2, -1, 1, 2, 3]);
    for (const offset of offsets) {
      values.add(clamp(answer + offset, 0, 10));
      if (values.size === 3) {
        break;
      }
    }
    while (values.size < 3) {
      values.add(this.random.integer(0, 10));
    }
    return this.random.shuffle([...values]);
  }
}
