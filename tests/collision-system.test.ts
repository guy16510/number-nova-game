import assert from 'node:assert/strict';
import test from 'node:test';
import { CollisionSystem } from '../src/domain/CollisionSystem';
import type { WorldEntity } from '../src/domain/types';

const entity = (id: string, kind: WorldEntity['kind']): WorldEntity => ({
  id,
  kind,
  x: 0,
  y: 0,
  z: 0,
  radius: 0.1,
  color: '#fff',
});

const ship = { x: 0, y: 0 };

test('only one overlapping hazard damages the ship during the cooldown window', () => {
  let now = 1_000;
  const collisions = new CollisionSystem(() => now, 900);

  assert.equal(collisions.collidesWithShip(entity('asteroid-1', 'hazard'), ship), true);
  assert.equal(collisions.collidesWithShip(entity('asteroid-2', 'hazard'), ship), false);

  now += 899;
  assert.equal(collisions.collidesWithShip(entity('asteroid-3', 'hazard'), ship), false);

  now += 1;
  assert.equal(collisions.collidesWithShip(entity('asteroid-4', 'hazard'), ship), true);
});

test('damage cooldown does not block stars or power-ups', () => {
  const collisions = new CollisionSystem(() => 1_000, 900);

  assert.equal(collisions.collidesWithShip(entity('asteroid', 'hazard'), ship), true);
  assert.equal(collisions.collidesWithShip(entity('star', 'star'), ship), true);
  assert.equal(collisions.collidesWithShip(entity('power-up', 'powerUp'), ship), true);
});

test('objects outside the collision radius do not start the cooldown', () => {
  let now = 1_000;
  const collisions = new CollisionSystem(() => now, 900);
  const missedAsteroid = { ...entity('miss', 'hazard'), x: 0.5 };

  assert.equal(collisions.collidesWithShip(missedAsteroid, ship), false);
  assert.equal(collisions.collidesWithShip(entity('hit', 'hazard'), ship), true);

  now += 100;
  assert.equal(collisions.collidesWithShip(entity('blocked', 'hazard'), ship), false);
});
