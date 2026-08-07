import assert from 'node:assert/strict';
import test from 'node:test';
import { SHIP_VISUAL_ASSET, visualAssetFor } from '../src/presentation/VisualAssetCatalog';

const rgb = (hex: string): readonly [number, number, number] => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
};

const isWarmRenderColor = (hex: string): boolean => {
  const [red, , blue] = rgb(hex);
  return red >= 150 && red > blue * 1.18;
};

test('enemy archetypes have distinct production art palettes', () => {
  const drone = visualAssetFor('enemy', 'number-drone');
  const bomber = visualAssetFor('enemy', 'bomber-alien');
  const boss = visualAssetFor('enemy', 'boss');
  assert.notEqual(drone.stroke, bomber.stroke);
  assert.notEqual(bomber.stroke, boss.stroke);
  assert.match(boss.fill, /^#[0-9A-F]{6}$/i);
});

test('hazards retain a warm body and ship has four visual channels', () => {
  const hazard = visualAssetFor('hazard');
  assert.equal(hazard.stroke, '#F08A3C');
  assert.equal(isWarmRenderColor(hazard.fill), true);
  assert.ok(SHIP_VISUAL_ASSET.fill);
  assert.ok(SHIP_VISUAL_ASSET.stroke);
  assert.ok(SHIP_VISUAL_ASSET.glow);
  assert.ok(SHIP_VISUAL_ASSET.detail);
});
