import type { ActiveChallenge } from './types';

export interface LearningHint {
  readonly level: 1 | 2;
  readonly title: string;
  readonly message: string;
  readonly visual: string;
}

const additionVisual = (answer: number): string => {
  const left = Math.max(1, Math.floor(answer / 2));
  const right = Math.max(0, answer - left);
  return `${'●'.repeat(Math.min(10, left))} + ${'●'.repeat(Math.min(10, right))}`;
};

const numberLine = (answer: number): string => {
  const start = Math.max(0, answer - 2);
  return Array.from({ length: 5 }, (_, index) => start + index)
    .map((value) => value === answer ? `[${value}]` : String(value))
    .join('  ');
};

export const createLearningHint = (
  challenge: ActiveChallenge,
  misses: number,
): LearningHint | null => {
  if (misses < 2 || challenge.answer === undefined) return null;
  const answer = challenge.answer;
  const level: 1 | 2 = misses >= 3 ? 2 : 1;

  if (challenge.kind === 'addition') {
    return {
      level,
      title: level === 1 ? 'Pip hint' : 'Let’s build the answer',
      message: level === 1
        ? `Count the two groups together. The answer is ${answer}.`
        : `Start with the first group, then count on until you reach ${answer}.`,
      visual: additionVisual(answer),
    };
  }

  if (challenge.kind === 'subtraction') {
    return {
      level,
      title: level === 1 ? 'Take-away hint' : 'Use the number line',
      message: `Count backward to land on ${answer}. Look for the ship marked ${answer}.`,
      visual: numberLine(answer),
    };
  }

  if (challenge.kind === 'comparison') {
    return {
      level,
      title: 'Find the greater number',
      message: `${answer} is farther to the right on the number line. Blast ${answer}.`,
      visual: numberLine(answer),
    };
  }

  if (challenge.kind === 'collect') return null;

  return {
    level,
    title: level === 1 ? 'Scanner hint' : 'Target identified',
    message: `Hold steady and look for ${answer}.`,
    visual: `TARGET  ${answer}`,
  };
};
