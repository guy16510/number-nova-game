import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DefaultEntityVisualPresenter,
  DeterministicRenderBudgetPolicy,
} from '../src/presentation/EntityVisualPresenter';
import type { WorldEntity } from '../src/domain/types';

const entity = (overrides: Partial<WorldEntity> = {}): WorldEntity => ({
  id: 'entity-1',
  kind: 'enemy',
  x: 0,
  y: 0,
  z: 0.5,
  radius: 0.1,
  color: '#FF00FF',
  ...overrides,
});

test('presenter maps enemy archetypes to recognizable visual shapes', () => {
  const presenter = new DefaultEntityVisualPresenter();
  assert.equal(presenter.present(entity({ archetype: 'number-drone' }), null).shape, 'drone');
  assert.equal(presenter.present(entity({ archetype: 'zigzag-alien' }), null).shape, 'zigzag');
  assert.equal(presenter.present(entity({ archetype: 'bomber-alien' }), null).shape, 'bomber');
  assert.equal(presenter.present(entity({ archetype: 'shield-ship' }), null).shape, 'shield');
  assert.equal(presenter.present(entity({ archetype: 'boss' }), null).shape, 'boss');
});

test('presenter clamps health and exposes warning and lock states', () => {
  const presenter = new DefaultEntityVisualPresenter();
  const visual = presenter.present(entity({ id: 'target', health: 15, maxHealth: 10, warning: true }), 'target');
  assert.equal(visual.healthRatio, 1);
  assert.equal(visual.warning, true);
  assert.equal(visual.locked, true);
  assert.equal(visual.hostile, true);
});

test('render budget keeps locked targets, bosses, warnings, and dangerous projectiles', () => {
  const policy = new DeterministicRenderBudgetPolicy(4);
  const entities: WorldEntity[] = [
    entity({ id: 'debris', kind: 'debris' }),
    entity({ id: 'star', kind: 'star' }),
    entity({ id: 'regular-enemy' }),
    entity({ id: 'warning', warning: true }),
    entity({ id: 'projectile', kind: 'enemyProjectile' }),
    entity({ id: 'boss', archetype: 'boss' }),
    entity({ id: 'locked', kind: 'star' }),
  ];

  const selected = policy.select(entities, 'locked').map((item) => item.id);
  assert.deepEqual(selected, ['locked', 'boss', 'warning', 'projectile']);
});

test('render budget is deterministic for equal-priority entities', () => {
  const policy = new DeterministicRenderBudgetPolicy(2);
  const entities = [
    entity({ id: 'c', z: 0.4 }),
    entity({ id: 'a', z: 0.4 }),
    entity({ id: 'b', z: 0.4 }),
  ];
  assert.deepEqual(policy.select(entities, null).map((item) => item.id), ['a', 'b']);
});

test('render budget rejects invalid limits', () => {
  assert.throws(() => new DeterministicRenderBudgetPolicy(0), /positive integer/);
});
