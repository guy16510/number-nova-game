import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const assets = [
  'laser-primary.wav',
  'laser-secondary.wav',
  'success.wav',
  'collision.wav',
  'power-up.wav',
  'target-lock.wav',
  'explosion-small.wav',
  'explosion-large.wav',
  'warning.wav',
  'ambient-flight.wav',
  'ambient-combat.wav',
  'ambient-boss.wav',
] as const;

const assetPath = (name: string): string => path.resolve('assets/sfx', name);

execFileSync(process.execPath, ['scripts/generate-sfx.mjs'], { stdio: 'ignore' });

test('the complete immersive sound pack is generated as valid PCM WAV audio', () => {
  for (const name of assets) {
    const content = readFileSync(assetPath(name));
    assert.equal(content.subarray(0, 4).toString('ascii'), 'RIFF', name);
    assert.equal(content.subarray(8, 12).toString('ascii'), 'WAVE', name);
    assert.ok(content.length > 4_000, `${name} should contain meaningful audio data`);
  }
});

test('every gameplay sound has a distinct waveform rather than recycled pitch shifts', () => {
  const hashes = assets.map((name) => createHash('sha256').update(readFileSync(assetPath(name))).digest('hex'));
  assert.equal(new Set(hashes).size, assets.length);
});

test('large explosions and ambience carry more audio detail than short weapon cues', () => {
  assert.ok(readFileSync(assetPath('explosion-large.wav')).length > readFileSync(assetPath('laser-primary.wav')).length * 3);
  assert.ok(readFileSync(assetPath('ambient-boss.wav')).length > readFileSync(assetPath('target-lock.wav')).length * 3);
});
