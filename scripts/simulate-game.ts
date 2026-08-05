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

const PHASES: readonly GamePhase[] = ['ready', 'playing', 'paused', 'boss', 'complete', 'failed'];
const valueAfter = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const positiveInteger = (value: string | undefined, fallback: number, name: string): number => {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
};

const config: SimulationConfig = {
  seeds: positiveInteger(valueAfter('--seeds'), 200, '--seeds'),
  framesPerSeed: positiveInteger(valueAfter('--frames'), 900, '--frames'),
  solverSeeds: positiveInteger(valueAfter('--solver-seeds'), 50, '--solver-seeds'),
  reportPath: valueAfter('--report') ?? 'artifacts/simulation-report.json',
};

const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, value));
const finite = (value: number, label: string, seed: number, frame: number): void => {
  if (!Number.isFinite(value)) throw new Error(`seed ${seed}, frame ${frame}: ${label} is not finite`);
};

const assertSnapshot = (snapshot: GameSnapshot, seed: number, frame: number, previous?: GameSnapshot): void => {
  if (!PHASES.includes(snapshot.phase)) throw new Error(`seed ${seed}, frame ${frame}: invalid phase ${snapshot.phase}`);
  const numeric: readonly [string, number][] = [
    ['elapsedSeconds', snapshot.elapsedSeconds], ['ship.x', snapshot.ship.x], ['ship.y', snapshot.ship.y],
    ['ship.hearts', snapshot.ship.hearts], ['ship.weaponSeconds', snapshot.ship.weaponSeconds], ['score', snapshot.score],
    ['stars', snapshot.stars], ['combo', snapshot.combo], ['shotsFired', snapshot.shotsFired], ['shotsHit', snapshot.shotsHit],
    ['accuracy', snapshot.accuracy], ['collisions', snapshot.collisions], ['challengeNumber', snapshot.challengeNumber],
    ['lockProgress', snapshot.lockProgress], ['bossHealth', snapshot.bossHealth], ['bossStage', snapshot.bossStage],
    ['screenShake', snapshot.screenShake], ['challenge.progress', snapshot.challenge.progress], ['challenge.mathLevel', snapshot.challenge.mathLevel],
  ];
  for (const [label, value] of numeric) finite(value, label, seed, frame);
  if (snapshot.ship.x < -0.951 || snapshot.ship.x > 0.951) throw new Error(`seed ${seed}: ship.x out of bounds`);
  if (snapshot.ship.y < -0.151 || snapshot.ship.y > 0.801) throw new Error(`seed ${seed}: ship.y out of bounds`);
  if (snapshot.ship.hearts < 0 || snapshot.ship.hearts > 3) throw new Error(`seed ${seed}: invalid hearts`);
  if (snapshot.accuracy < 0 || snapshot.accuracy > 1) throw new Error(`seed ${seed}: invalid accuracy`);
  if (snapshot.challenge.mathLevel < 0 || snapshot.challenge.mathLevel > 7) throw new Error(`seed ${seed}: invalid math level`);
  if (snapshot.entities.length > 42) throw new Error(`seed ${seed}: entity cap exceeded (${snapshot.entities.length})`);
  if (snapshot.bossHealth < 0 || snapshot.bossHealth > snapshot.bossMaxHealth) throw new Error(`seed ${seed}: invalid boss health`);
  if (snapshot.phase === 'complete' && (!snapshot.reward || snapshot.bossHealth !== 0)) throw new Error(`seed ${seed}: completed game missing reward or boss defeat`);
  if (snapshot.phase === 'failed' && snapshot.ship.hearts !== 0) throw new Error(`seed ${seed}: failed game still has hearts`);

  const ids = new Set<string>();
  let correctShootable = 0;
  for (const entity of snapshot.entities) {
    finite(entity.x, `${entity.id}.x`, seed, frame);
    finite(entity.y, `${entity.id}.y`, seed, frame);
    finite(entity.z, `${entity.id}.z`, seed, frame);
    finite(entity.radius, `${entity.id}.radius`, seed, frame);
    if (ids.has(entity.id)) throw new Error(`seed ${seed}: duplicate entity ${entity.id}`);
    ids.add(entity.id);
    if (entity.shootable && entity.correct === true) correctShootable += 1;
  }
  if (snapshot.challenge.kind !== 'collect' && snapshot.phase !== 'complete' && snapshot.phase !== 'failed' && snapshot.entities.some((entity) => entity.shootable) && correctShootable !== 1) {
    throw new Error(`seed ${seed}, frame ${frame}: expected one correct shootable, found ${correctShootable}`);
  }
  if (snapshot.lockTargetId !== null && !ids.has(snapshot.lockTargetId)) throw new Error(`seed ${seed}: stale lock target`);
  if (previous) {
    if (snapshot.elapsedSeconds + 1e-9 < previous.elapsedSeconds) throw new Error(`seed ${seed}: time moved backward`);
    if (snapshot.score < previous.score || snapshot.stars < previous.stars) throw new Error(`seed ${seed}: score moved backward`);
  }
};

const outcomes = (): Record<GamePhase, number> => ({ ready: 0, playing: 0, paused: 0, boss: 0, complete: 0, failed: 0 });

const runStress = () => {
  const result = outcomes();
  const kinds = new Set<string>();
  const patterns = new Set<string>();
  const archetypes = new Set<string>();
  let frames = 0;
  let maximumEntities = 0;
  let maximumMathLevel = 0;
  let maximumScore = 0;

  for (let seed = 1; seed <= config.seeds; seed += 1) {
    const engine = new GameEngine({ seed });
    engine.start();
    let previous = engine.snapshot();
    assertSnapshot(previous, seed, 0);
    for (let frame = 1; frame <= config.framesPerSeed; frame += 1) {
      if (frame === 120 && (previous.phase === 'playing' || previous.phase === 'boss')) {
        engine.pause();
        const paused = engine.snapshot();
        engine.update(1, { x: 1, y: 1 });
        if (engine.snapshot().elapsedSeconds !== paused.elapsedSeconds) throw new Error(`seed ${seed}: paused engine advanced`);
        engine.resume();
      }
      if (frame % 150 === 0) engine.fire();
      if (frame % 360 === 1) engine.useShield();
      if (frame % 420 === 1) engine.useMagnet();
      const input: SteeringInput = {
        x: Math.sin((frame + seed * 17) * 0.041),
        y: Math.cos((frame + seed * 11) * 0.029) * 0.8,
      };
      engine.update(1 / 60, input);
      const next = engine.snapshot();
      assertSnapshot(next, seed, frame, previous);
      previous = next;
      frames += 1;
      kinds.add(next.challenge.kind);
      patterns.add(next.wavePattern);
      for (const entity of next.entities) if (entity.archetype) archetypes.add(entity.archetype);
      maximumEntities = Math.max(maximumEntities, next.entities.length);
      maximumMathLevel = Math.max(maximumMathLevel, next.challenge.mathLevel);
      maximumScore = Math.max(maximumScore, next.score);
      if (next.phase === 'complete' || next.phase === 'failed') break;
    }
    result[previous.phase] += 1;
  }

  return {
    seeds: config.seeds,
    requestedFramesPerSeed: config.framesPerSeed,
    simulatedFrames: frames,
    maximumEntities,
    maximumMathLevel,
    maximumScore,
    challengeKindsSeen: [...kinds].sort(),
    wavePatternsSeen: [...patterns].sort(),
    enemyArchetypesSeen: [...archetypes].sort(),
    outcomes: result,
  };
};

const solverInput = (snapshot: GameSnapshot): SteeringInput => {
  const star = snapshot.entities.filter((entity) => entity.kind === 'star').sort((left, right) => left.z - right.z)[0];
  return star ? { x: clamp(star.x / 0.88, -1, 1), y: clamp((star.y - 0.3) / 0.45, -1, 1) } : { x: 0, y: 0 };
};

const runSolver = () => {
  let completed = 0;
  let failed = 0;
  let timedOut = 0;
  let maximumElapsedSeconds = 0;
  let rewardsGranted = 0;
  const maxFrames = 120 * 60;

  for (let seed = 1; seed <= config.solverSeeds; seed += 1) {
    const engine = new GameEngine({ seed: seed * 7919, worldSpeed: 0.16 });
    engine.start();
    let previous = engine.snapshot();
    let finished = false;
    for (let frame = 1; frame <= maxFrames; frame += 1) {
      const current = engine.snapshot();
      if (current.phase === 'complete' || current.phase === 'failed') {
        completed += current.phase === 'complete' ? 1 : 0;
        failed += current.phase === 'failed' ? 1 : 0;
        rewardsGranted += current.reward ? 1 : 0;
        maximumElapsedSeconds = Math.max(maximumElapsedSeconds, current.elapsedSeconds);
        finished = true;
        break;
      }

      let input: SteeringInput = { x: 0, y: 0 };
      if (current.challenge.kind === 'collect') {
        if (current.shieldCharges > 0 && current.ship.shieldSeconds === 0) engine.useShield();
        if (current.magnetCharges > 0 && current.ship.magnetSeconds === 0) engine.useMagnet();
        input = solverInput(current);
      } else {
        const correct = current.entities.find((entity) => entity.shootable && entity.correct === true);
        if (correct) engine.resolveTarget(correct.id);
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
  if (timedOut > 0) throw new Error(`solver timed out for ${timedOut}/${config.solverSeeds} seeds`);
  if (completionRate < 0.9) throw new Error(`solver completion rate ${(completionRate * 100).toFixed(1)}% is below 90%`);
  if (rewardsGranted !== completed) throw new Error('completed games did not all grant rewards');
  return { seeds: config.solverSeeds, completed, failed, timedOut, rewardsGranted, completionRate: Number(completionRate.toFixed(4)), maximumElapsedSeconds: Number(maximumElapsedSeconds.toFixed(2)) };
};

const report = { generatedAt: new Date().toISOString(), config, stress: runStress(), solver: runSolver() };
const output = resolve(config.reportPath);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
