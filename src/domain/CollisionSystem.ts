import type { ShipState, WorldEntity } from './types';

export interface CollisionPort {
  collidesWithShip(entity: WorldEntity, ship: Pick<ShipState, 'x' | 'y'>): boolean;
  collides(first: WorldEntity, second: WorldEntity): boolean;
}

const distanceSquared = (ax: number, ay: number, bx: number, by: number): number => {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
};

export class CollisionSystem implements CollisionPort {
  public collidesWithShip(entity: WorldEntity, ship: Pick<ShipState, 'x' | 'y'>): boolean {
    if (entity.z > 0.11 || entity.z < -0.1) return false;
    const radius = entity.kind === 'star' || entity.kind === 'powerUp' ? 0.17 : 0.135;
    return distanceSquared(entity.x, entity.y, ship.x, ship.y) <= radius;
  }

  public collides(first: WorldEntity, second: WorldEntity): boolean {
    const combined = Math.max(0.08, (first.radius + second.radius) * 0.7);
    const dz = first.z - second.z;
    return Math.abs(dz) < 0.12
      && distanceSquared(first.x, first.y, second.x, second.y) <= combined * combined;
  }
}
