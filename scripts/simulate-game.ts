import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { GameEngine } from '../src/domain/GameEngine';
import type { GamePhase, GameSnapshot, SteeringInput } from '../src/domain/types';

interface SimulationConfig {
  readonly seeds: number;
  readonly framesPerSeed: number;
  readonly solverSeeds: number;
  readonly reportPath: string;
}

interface OutcomeCounts {
  ready: number;
  playing: number;
  paused: number;
  boss: number;
  complete: number;
  failed: number;
}

interface StressSummary {
  readonly seeds: number;
  readonly requestedFramesPerSeed: number;
  readonly simulatedFrames: number;
  readonly pauseResumeChecks: number;
  readonly maximumEntities: number;
  readonly minimumHearts: number;
  readonly maximumScore: number;
  readonly maximumStars: number;
  readonly challengeKindsSeen: readonly string[];
  readonly outcomes: OutcomeCounts;
}

interface SolverSummary {
  readonly seeds: number;
  readonly completed: number;
  readonly failed: number;
  readonly timedOut: number;
  readonly completionRate: number;
  readonly maximumElapsedSeconds: number;
}

const PHASES: readonly GamePhase[] = ['ready', 'playing', 'paused', 'boss', 'complete', 'failed'];

const argumentValue = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const positiveInteger = (value: string | undefined, fallback: number, name: string): number => {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer, received ${value}`);
  }
  return parsed;
};

const config: SimulationConfig = {
  seeds: positiveInteger(argumentValue('--seeds'), 200, '--seeds'),
  framesPerSeed: positiveInteger(argumentValue('--frames'), 900, '--frames'),
  solverSeeds: positiveInteger(argumentValue('--solver-seeds'), 50, '--solver-seeds'),
  reportPath: argumentValue('--report') ?? 'artifacts/simulation-report.json',
};

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.max(minimum, Math.min(maximum, value));

const assertFinite = (value: number, label: string, seed: number, frame: number): void => {
  if (!Number.isFinite(value)) {
    throw new Error(`seed ${seed}, frame ${frame}: ${label} is not finite (${value})`);
  }
};

const assertSnapshot = (
  snapshot: GameSnapshot,
  seed: number,
  frame: number,
  previous?: GameSnapshot,
): void => {
  if (!PHASES.includes(snapshot.phase)) {
    throw new Error(`seed ${seed}, frame ${frame}: invalid phase ${snapshot.phase}`);
  }

  const numericValues: readonly [string, number][] = [
    ['elapsedSeconds', snapshot.elapsedSeconds],
    ['ship.x', snapshot.ship.x],
    ['ship.y', snapshot.ship.y],
    ['ship.hearts', snapshot.ship.hearts],
    ['ship.shieldSeconds', snapshot.ship.shieldSeconds],
    ['ship.magnetSeconds', snapshot.ship.magnetSeconds],
    ['score', snapshot.score],
    ['stars', snapshot.stars],
    ['challengeNumber', snapshot.challengeNumber],
    ['totalChallenges', snapshot.totalChallenges],
    ['lockProgress', snapshot.lockProgress],
    ['bossHealth', snapshot.bossHealth],
    ['bossMaxHealth', snapshot.bossMaxHealth],
    ['shieldCharges', snapshot.shieldCharges],
    ['magnetCharges', snapshot.magnetCharges],
    ['challenge.targetCount', snapshot.challenge.targetCount],
    ['challenge.progress', snapshot.challenge.progress],
  ];
  for (const [label, value] of numericValues) {
    assertFinite(value, label, seed, frame);
  }

  if (snapshot.ship.x < -0.951 || snapshot.ship.x > 0.951) {
    throw new Error(`seed ${seed}, frame ${frame}: ship.x out of bounds (${snapshot.ship.x})`);
  }
  if (snapshot.ship.y < -0.151 || snapshot.ship.y > 0.801) {
    throw new Error(`seed ${seed}, frame ${frame}: ship.y out of bounds (${snapshot.ship.y})`);
  }
  if (snapshot.ship.hearts < 0 || snapshot.ship.hearts > 3) {
    throw new Error(`seed ${seed}, frame ${frame}: invalid hearts (${snapshot.ship.hearts})`);
  }
  if (snapshot.ship.shieldSeconds < 0 || snapshot.ship.magnetSeconds < 0) {
    throw new Error(`seed ${seed}, frame ${frame}: power-up timer became negative`);
  }
  if (snapshot.shieldCharges < 0 || snapshot.shieldCharges > 2) {
    throw new Error(`seed ${seed}, frame ${frame}: invalid shield charges (${snapshot.shieldCharges})`);
  }
  if (snapshot.magnetCharges < 0 || snapshot.magnetCharges > 2) {
    throw new Error(`seed ${seed}, frame ${frame}: invalid magnet charges (${snapshot.magnetCharges})`);
  }
  if (snapshot.score < 0 || snapshot.stars < 0) {
    throw new Error(`seed ${seed}, frame ${frame}: score or stars became negative`);
  }
  if (snapshot.challengeNumber < 1 || snapshot.challengeNumber > snapshot.totalChallenges) {
    throw new Error(`seed ${seed}, frame ${frame}: invalid challenge number ${snapshot.challengeNumber}`);
  }
  if (snapshot.challenge.targetCount < 1) {
    throw new Error(`seed ${seed}, frame ${frame}: challenge target count must be positive`);
  }
  if (snapshot.challenge.progress < 0 || snapshot.challenge.progress > snapshot.challenge.targetCount) {
    throw new Error(
      `seed ${seed}, frame ${frame}: challenge progress ${snapshot.challenge.progress}/${snapshot.challenge.targetCount}`,
    );
  }
  if (snapshot.bossHealth < 0 || snapshot.bossHealth > snapshot.bossMaxHealth) {
    throw new Error(`seed ${seed}, frame ${frame}: invalid boss health ${snapshot.bossHealth}`);
  }

  const ids = new Set<string>();
  const answerLabels = new Set<string>();
  let answerCount = 0;
  let correctAnswerCount = 0;
  for (const entity of snapshot.entities) {
    assertFinite(entity.x, `${entity.id}.x`, seed, frame);
    assertFinite(entity.y, `${entity.id}.y`, seed, frame);
    assertFinite(entity.z, `${entity.id}.z`, seed, frame);
    assertFinite(entity.radius, `${entity.id}.radius`, seed, frame);
    if (entity.radius <= 0) {
      throw new Error(`seed ${seed}, frame ${frame}: ${entity.id} has invalid radius ${entity.radius}`);
    }
    if (ids.has(entity.id)) {
      throw new Error(`seed ${seed}, frame ${frame}: duplicate entity id ${entity.id}`);
    }
    ids.add(entity.id);

    if (entity.kind === 'answer') {
      answerCount += 1;
      if (entity.correct === true) {
        correctAnswerCount += 1;
      }
      if (entity.label === undefined || answerLabels.has(entity.label)) {
        throw new Error(`seed ${seed}, frame ${frame}: answer labels are missing or duplicated`);
      }
      answerLabels.add(entity.label);
    }
  }

  if (answerCount > 0 && correctAnswerCount !== 1) {
    throw new Error(
      `seed ${seed}, frame ${frame}: expected exactly one correct answer, found ${correctAnswerCount}`,
    );
  }
  if (snapshot.lockTargetId !== null && !ids.has(snapshot.lockTargetId)) {
    throw new Error(`seed ${seed}, frame ${frame}: lock target ${snapshot.lockTargetId} is not active`);
  }
  if (snapshot.phase === 'complete' && snapshot.bossHealth !== 0) {
    throw new Error(`seed ${seed}, frame ${frame}: completed game still has boss health`);
  }
  if (snapshot.phase === 'failed' && snapshot.ship.hearts > 0) {
    throw new Error(`seed ${seed}, frame ${frame}: failed game still has hearts`);
  }

  if (previous !== undefined) {
    if (snapshot.elapsedSeconds + 1e-9 < previous.elapsedSeconds) {
      throw new Error(`seed ${seed}, frame ${frame}: elapsed time moved backwards`);
    }
    if (snapshot.score < previous.score) {
      throw new Error(`seed ${seed}, frame ${frame}: score moved backwards`);
    }
    if (snapshot.stars < previous.stars) {
      throw new Error(`seed ${seed}, frame ${frame}: stars moved backwards`);
    }
  }
};

const emptyOutcomes = (): OutcomeCounts => ({
  ready: 0,
  playing: 0,
  paused: 0,
  boss: 0,
  complete: 0,
  failed: 0,
});

const runStressSimulation = (): StressSummary => {
  const outcomes = emptyOutcomes();
  const challengeKinds = new Set<string>();
  let simulatedFrames = 0;
  let pauseResumeChecks = 0;
  let maximumEntities = 0;
  let minimumHearts = 3;
  let maximumScore = 0;
  let maximumStars = 0;

  for (let seed = 1; seed <= config.seeds; seed += 1) {
    const engine = new GameEngine({ seed });
    engine.start();
    let previous = engine.snapshot();
    assertSnapshot(previous, seed, 0);

    for (let frame = 1; frame <= config.framesPerSeed; frame += 1) {
      if (frame === Math.min(120, config.framesPerSeed) && (previous.phase === 'playing' || previous.phase === 'boss')) {
        engine.pause();
        const paused = engine.snapshot();
        assertSnapshot(paused, seed, frame, previous);
        engine.update(1, { x: 1, y: 1 });
        const stillPaused = engine.snapshot();
        if (stillPaused.elapsedSeconds !== paused.elapsedSeconds) {
          throw new Error(`seed ${seed}, frame ${frame}: paused engine advanced time`);
        }
        engine.resume();
        previous = engine.snapshot();
        pauseResumeChecks += 1;
      }

      if (frame % 360 === 1) {
        engine.useShield();
      }
      if (frame % 420 === 1) {
        engine.useMagnet();
      }

      const input: SteeringInput = {
        x: Math.sin((frame + seed * 17) * 0.041),
        y: Math.cos((frame + seed * 11) * 0.029) * 0.8,
      };
      engine.update(1 / 60, input);
      const next = engine.snapshot();
      assertSnapshot(next, seed, frame, previous);
      previous = next;
      simulatedFrames += 1;
      challengeKinds.add(next.challenge.kind);
      maximumEntities = Math.max(maximumEntities, next.entities.length);
      minimumHearts = Math.min(minimumHearts, next.ship.hearts);
      maximumScore = Math.max(maximumScore, next.score);
      maximumStars = Math.max(maximumStars, next.stars);

      if (next.phase === 'complete' || next.phase === 'failed') {
        break;
      }
    }

    outcomes[previous.phase] += 1;
  }

  return {
    seeds: config.seeds,
    requestedFramesPerSeed: config.framesPerSeed,
    simulatedFrames,
    pauseResumeChecks,
    maximumEntities,
    minimumHearts,
    maximumScore,
    maximumStars,
    challengeKindsSeen: [...challengeKinds].sort(),
    outcomes,
  };
};

const solverInput = (snapshot: GameSnapshot): SteeringInput => {
  const nearestStar = snapshot.entities
    .filter((entity) => entity.kind === 'star')
    .toSorted((left, right) => left.z - right.z)[0];
  if (nearestStar === undefined) {
    return { x: 0, y: 0 };
  }
  return {
    x: clamp(nearestStar.x / 0.88, -1, 1),
    y: clamp((nearestStar.y - 0.3) / 0.45, -1, 1),
  };
};

const runSolverSimulation = (): SolverSummary => {
  let completed = 0;
  let failed = 0;
  let timedOut = 0;
  let maximumElapsedSeconds = 0;
  const maxFrames = 90 * 60;

  for (let seed = 1; seed <= config.solverSeeds; seed += 1) {
    const engine = new GameEngine({ seed: seed * 7919, worldSpeed: 0.32 });
    engine.start();
    let previous = engine.snapshot();
    assertSnapshot(previous, seed, 0);
    let finished = false;

    for (let frame = 1; frame <= maxFrames; frame += 1) {
      const current = engine.snapshot();
      if (current.phase === 'complete') {
        completed += 1;
        maximumElapsedSeconds = Math.max(maximumElapsedSeconds, current.elapsedSeconds);
        finished = true;
        break;
      }
      if (current.phase === 'failed') {
        failed += 1;
        maximumElapsedSeconds = Math.max(maximumElapsedSeconds, current.elapsedSeconds);
        finished = true;
        break;
      }

      let input: SteeringInput = { x: 0, y: 0 };
      if (current.challenge.kind === 'collect') {
        if (current.magnetCharges > 0 && current.ship.magnetSeconds === 0) {
          engine.useMagnet();
        }
        if (current.shieldCharges > 0 && current.ship.shieldSeconds === 0) {
          engine.useShield();
        }
        input = solverInput(current);
      } else {
        const correct = current.entities.find(
          (entity) => entity.kind === 'answer' && entity.correct === true,
        );
        if (correct !== undefined) {
          engine.resolveTarget(correct.id);
        }
      }

      engine.update(1 / 60, input);
      const next = engine.snapshot();
      assertSnapshot(next, seed, frame, previous);
      previous = next;
    }

    if (!finished) {
      timedOut += 1;
      maximumElapsedSeconds = Math.max(maximumElapsedSeconds, previous.elapsedSeconds);
    }
  }

  const completionRate = completed / config.solverSeeds;
  if (timedOut > 0) {
    throw new Error(`solver timed out for ${timedOut}/${config.solverSeeds} seeds`);
  }
  if (completionRate < 0.8) {
    throw new Error(
      `solver completion rate ${(completionRate * 100).toFixed(1)}% is below the 80% safety threshold`,
    );
  }

  return {
    seeds: config.solverSeeds,
    completed,
    failed,
    timedOut,
    completionRate: Number(completionRate.toFixed(4)),
    maximumElapsedSeconds: Number(maximumElapsedSeconds.toFixed(2)),
  };
};

const stress = runStressSimulation();
const solver = runSolverSimulation();
const report = {
  generatedAt: new Date().toISOString(),
  config,
  stress,
  solver,
};

const absoluteReportPath = resolve(config.reportPath);
mkdirSync(dirname(absoluteReportPath), { recursive: true });
writeFileSync(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
