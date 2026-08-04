import type { RandomSource } from './types';

export class SeededRandom implements RandomSource {
  private state: number;

  public constructor(seed: number) {
    this.state = seed >>> 0 || 0x9e3779b9;
  }

  public next(): number {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state / 0x100000000;
  }

  public integer(minInclusive: number, maxInclusive: number): number {
    if (maxInclusive < minInclusive) {
      throw new Error('maxInclusive must be greater than or equal to minInclusive');
    }
    return minInclusive + Math.floor(this.next() * (maxInclusive - minInclusive + 1));
  }

  public pick<T>(values: readonly T[]): T {
    if (values.length === 0) {
      throw new Error('Cannot pick from an empty array');
    }
    return values[this.integer(0, values.length - 1)] as T;
  }

  public shuffle<T>(values: readonly T[]): T[] {
    const copy = [...values];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = this.integer(0, index);
      const current = copy[index] as T;
      copy[index] = copy[swapIndex] as T;
      copy[swapIndex] = current;
    }
    return copy;
  }
}
