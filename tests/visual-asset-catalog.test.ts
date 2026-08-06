import assert from 'node:assert/strict';
import test from 'node:test';
import { SHIP_VISUAL_ASSET, visualAssetFor } from '../src/presentation/VisualAssetCatalog';

test('enemy archetypes have distinct production art palettes', () => {
  const drone = visualAssetFor('enemy', 'number-drone');
  const bomber = visualAssetFor('enemy', 'bomber-alien');
  const boss = visualAssetFor('enemy', 'boss');
  assert.notEqual(drone.stroke, bomber.stroke);
  assert.notEqual(bomber.stroke, boss.stroke);
  assert.match(boss.fill, /^#[0-9A-F]{6}$/i);
});

test('hazards retain the warm render signature and ship has four visual channels', () => {
  const hazard = visualAssetFor('hazard');
  assert.equal(hazard.stroke, '#F08A3C');
  assert.ok(SHIP_VISUAL_ASSET.fill);
  assert.ok(SHIP_VISUAL_ASSET.stroke);
  assert.ok(SHIP_VISUAL_ASSET.glow);
  assert.ok(SHIP_VISUAL_ASSET.detail);
});
