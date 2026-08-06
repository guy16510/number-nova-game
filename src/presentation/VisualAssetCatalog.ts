import type { EnemyArchetype, EntityKind } from '../domain/types';

export interface VisualAssetDefinition {
  readonly fill: string;
  readonly stroke: string;
  readonly glow: string;
  readonly detail: string;
}

const ASSETS: Record<string, VisualAssetDefinition> = {
  ship: { fill: '#EAF8FF', stroke: '#54DFFF', glow: '#39D6FF', detail: '#7657FF' },
  asteroid: { fill: '#7B4630', stroke: '#F08A3C', glow: '#FFB15C', detail: '#41261F' },
  'number-drone': { fill: '#241A5C', stroke: '#7DE7FF', glow: '#30D9FF', detail: '#FFFFFF' },
  'zigzag-alien': { fill: '#34205D', stroke: '#B98CFF', glow: '#8C6AFF', detail: '#FFE66A' },
  'bomber-alien': { fill: '#5A1834', stroke: '#FF6F91', glow: '#FF406A', detail: '#FFD0D9' },
  'shield-ship': { fill: '#123A54', stroke: '#72F5FF', glow: '#43D6FF', detail: '#FFFFFF' },
  boss: { fill: '#48164F', stroke: '#FF82E8', glow: '#D93DFF', detail: '#FFE66A' },
  star: { fill: '#FFE34B', stroke: '#FFF5A6', glow: '#FFE66A', detail: '#FFFFFF' },
  powerUp: { fill: '#1D5D57', stroke: '#64FFD5', glow: '#2FFFC6', detail: '#FFFFFF' },
  ally: { fill: '#193B6A', stroke: '#73E6FF', glow: '#39D6FF', detail: '#FFFFFF' },
  projectile: { fill: '#FFFFFF', stroke: '#7DE7FF', glow: '#FFFFFF', detail: '#FFFFFF' },
  enemyProjectile: { fill: '#FF5D7A', stroke: '#FFD0D9', glow: '#FF406A', detail: '#FFFFFF' },
  explosion: { fill: '#FF8A3D', stroke: '#FFE28A', glow: '#FFD84D', detail: '#FFFFFF' },
  gate: { fill: '#172954', stroke: '#7DE7FF', glow: '#30D9FF', detail: '#FFE66A' },
  debris: { fill: '#6A7298', stroke: '#AAB4DA', glow: '#7D87B5', detail: '#FFFFFF' },
};

export const visualAssetFor = (kind: EntityKind, archetype?: EnemyArchetype): VisualAssetDefinition => {
  if (kind === 'hazard') return ASSETS.asteroid;
  if (kind === 'enemy') return ASSETS[archetype ?? 'number-drone'] ?? ASSETS['number-drone'];
  return ASSETS[kind] ?? ASSETS.debris;
};

export const SHIP_VISUAL_ASSET = ASSETS.ship;
