import type { WorldEntity } from './types';

export interface CombatHit {
  readonly projectileId: string;
  readonly targetId: string;
}

export interface CombatUpdate {
  readonly entities: readonly WorldEntity[];
  readonly hits: readonly CombatHit[];
}

export interface CombatPort {
  update(entities: readonly WorldEntity[], deltaSeconds: number): CombatUpdate;
}

export class CombatSystem implements CombatPort {
  public update(entities: readonly WorldEntity[], deltaSeconds: number): CombatUpdate {
    const byId = new Map(entities.map((entity) => [entity.id, entity]));
    const next = entities.map((entity) => {
      if (entity.kind !== 'projectile') return entity;
      const target = entity.targetId ? byId.get(entity.targetId) : undefined;
      const homing = target
        ? {
            x: entity.x + (target.x - entity.x) * Math.min(1, deltaSeconds * 14),
            y: entity.y + (target.y - entity.y) * Math.min(1, deltaSeconds * 14),
          }
        : { x: entity.x + (entity.vx ?? 0) * deltaSeconds, y: entity.y + (entity.vy ?? 0) * deltaSeconds };
      return {
        ...entity,
        x: homing.x,
        y: homing.y,
        z: entity.z + (entity.vz ?? 2.8) * deltaSeconds,
        ttl: Math.max(0, (entity.ttl ?? 0.45) - deltaSeconds),
      };
    });

    const hits: CombatHit[] = [];
    const consumed = new Set<string>();
    for (const projectile of next) {
      if (projectile.kind !== 'projectile' || consumed.has(projectile.id)) continue;
      const target = projectile.targetId
        ? next.find((entity) => entity.id === projectile.targetId)
        : next.find((entity) => entity.shootable && Math.abs(entity.z - projectile.z) < 0.12);
      if (!target || !target.shootable) continue;
      if (Math.abs(target.z - projectile.z) > 0.17) continue;
      const dx = target.x - projectile.x;
      const dy = target.y - projectile.y;
      if (dx * dx + dy * dy > Math.max(0.045, target.radius * target.radius * 1.9)) continue;
      hits.push({ projectileId: projectile.id, targetId: target.id });
      consumed.add(projectile.id);
    }

    return {
      entities: next.filter((entity) => {
        if (consumed.has(entity.id)) return false;
        if (entity.kind === 'projectile' && (entity.ttl ?? 0) <= 0) return false;
        return true;
      }),
      hits,
    };
  }
}
