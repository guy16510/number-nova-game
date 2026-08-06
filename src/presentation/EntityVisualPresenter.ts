import type { EnemyArchetype, EntityKind, WorldEntity } from '../domain/types';

export type VisualShape =
  | 'asteroid'
  | 'drone'
  | 'zigzag'
  | 'bomber'
  | 'shield'
  | 'boss'
  | 'star'
  | 'power-up'
  | 'ally'
  | 'projectile'
  | 'enemy-projectile'
  | 'explosion'
  | 'gate'
  | 'debris';

export interface EntityVisualModel {
  readonly id: string;
  readonly shape: VisualShape;
  readonly color: string;
  readonly label: string | null;
  readonly healthRatio: number | null;
  readonly warning: boolean;
  readonly locked: boolean;
  readonly hostile: boolean;
  readonly priority: number;
}

export interface EntityVisualPresenter {
  present(entity: WorldEntity, lockTargetId: string | null): EntityVisualModel;
}

export interface RenderBudgetPolicy {
  select(entities: readonly WorldEntity[], lockTargetId: string | null): readonly WorldEntity[];
}

const WARM_HAZARD_COLOR = '#F08A3C';

const shapeForEnemy = (archetype: EnemyArchetype | undefined): VisualShape => {
  switch (archetype) {
    case 'zigzag-alien': return 'zigzag';
    case 'bomber-alien': return 'bomber';
    case 'shield-ship': return 'shield';
    case 'boss': return 'boss';
    default: return 'drone';
  }
};

const shapeFor = (entity: WorldEntity): VisualShape => {
  switch (entity.kind) {
    case 'enemy': return shapeForEnemy(entity.archetype);
    case 'hazard': return 'asteroid';
    case 'star': return 'star';
    case 'powerUp': return 'power-up';
    case 'ally': return 'ally';
    case 'projectile': return 'projectile';
    case 'enemyProjectile': return 'enemy-projectile';
    case 'explosion': return 'explosion';
    case 'gate': return 'gate';
    case 'debris': return 'debris';
  }
};

const priorityFor = (entity: WorldEntity, locked: boolean): number => {
  if (locked) return 1000;
  if (entity.archetype === 'boss') return 900;
  if (entity.warning) return 800;
  const priorities: Record<EntityKind, number> = {
    enemyProjectile: 750,
    projectile: 700,
    enemy: 650,
    hazard: 600,
    powerUp: 550,
    ally: 500,
    gate: 450,
    explosion: 400,
    star: 300,
    debris: 100,
  };
  return priorities[entity.kind];
};

export class DefaultEntityVisualPresenter implements EntityVisualPresenter {
  present(entity: WorldEntity, lockTargetId: string | null): EntityVisualModel {
    const locked = lockTargetId === entity.id;
    const hasHealth = typeof entity.health === 'number' && typeof entity.maxHealth === 'number' && entity.maxHealth > 0;
    return {
      id: entity.id,
      shape: shapeFor(entity),
      color: entity.kind === 'hazard' ? WARM_HAZARD_COLOR : entity.color,
      label: entity.label ?? null,
      healthRatio: hasHealth ? Math.max(0, Math.min(1, entity.health! / entity.maxHealth!)) : null,
      warning: entity.warning === true,
      locked,
      hostile: entity.kind === 'enemy' || entity.kind === 'hazard' || entity.kind === 'enemyProjectile',
      priority: priorityFor(entity, locked),
    };
  }
}

export class DeterministicRenderBudgetPolicy implements RenderBudgetPolicy {
  constructor(private readonly maximumEntities = 72) {
    if (!Number.isInteger(maximumEntities) || maximumEntities < 1) {
      throw new Error('maximumEntities must be a positive integer');
    }
  }

  select(entities: readonly WorldEntity[], lockTargetId: string | null): readonly WorldEntity[] {
    if (entities.length <= this.maximumEntities) return entities;
    return [...entities]
      .sort((left, right) => {
        const priorityDelta = priorityFor(right, lockTargetId === right.id) - priorityFor(left, lockTargetId === left.id);
        if (priorityDelta !== 0) return priorityDelta;
        const depthDelta = left.z - right.z;
        if (depthDelta !== 0) return depthDelta;
        return left.id.localeCompare(right.id);
      })
      .slice(0, this.maximumEntities);
  }
}

export const defaultEntityVisualPresenter = new DefaultEntityVisualPresenter();
export const defaultRenderBudgetPolicy = new DeterministicRenderBudgetPolicy();
