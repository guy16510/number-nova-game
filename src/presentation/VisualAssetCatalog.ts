import type { EnemyArchetype, EntityKind } from '../domain/types';

export interface VisualAssetDefinition {
  readonly fill: string;
  readonly stroke: string;
  readonly glow: string;
  readonly detail: string;
}

const SHIP_ASSET: VisualAssetDefinition = { fill: '#EAF8FF', stroke: '#54DFFF', glow: '#39D6FF', detail: '#7657FF' };
const ASTEROID_ASSET: VisualAssetDefinition = { fill: '#D96F32', stroke: '#F08A3C', glow: '#FFB15C', detail: '#5A2B1F' };
const DRONE_ASSET: VisualAssetDefinition = { fill: '#241A5C', stroke: '#7DE7FF', glow: '#30D9FF', detail: '#FFFFFF' };
const ZIGZAG_ASSET: VisualAssetDefinition = { fill: '#34205D', stroke: '#B98CFF', glow: '#8C6AFF', detail: '#FFE66A' };
const BOMBER_ASSET: VisualAssetDefinition = { fill: '#5A1834', stroke: '#FF6F91', glow: '#FF406A', detail: '#FFD0D9' };
const SHIELD_ASSET: VisualAssetDefinition = { fill: '#123A54', stroke: '#72F5FF', glow: '#43D6FF', detail: '#FFFFFF' };
const BOSS_ASSET: VisualAssetDefinition = { fill: '#48164F', stroke: '#FF82E8', glow: '#D93DFF', detail: '#FFE66A' };
const DEBRIS_ASSET: VisualAssetDefinition = { fill: '#6A7298', stroke: '#AAB4DA', glow: '#7D87B5', detail: '#FFFFFF' };

const ENEMY_ASSETS: Record<EnemyArchetype, VisualAssetDefinition> = {
  'number-drone': DRONE_ASSET,
  'zigzag-alien': ZIGZAG_ASSET,
  'bomber-alien': BOMBER_ASSET,
  'shield-ship': SHIELD_ASSET,
  boss: BOSS_ASSET,
};

const ENTITY_ASSETS: Partial<Record<EntityKind, VisualAssetDefinition>> = {
  star: { fill: '#FFE34B', stroke: '#FFF5A6', glow: '#FFE66A', detail: '#FFFFFF' },
  powerUp: { fill: '#1D5D57', stroke: '#64FFD5', glow: '#2FFFC6', detail: '#FFFFFF' },
  ally: { fill: '#193B6A', stroke: '#73E6FF', glow: '#39D6FF', detail: '#FFFFFF' },
  projectile: { fill: '#FFFFFF', stroke: '#7DE7FF', glow: '#FFFFFF', detail: '#FFFFFF' },
  enemyProjectile: { fill: '#FF5D7A', stroke: '#FFD0D9', glow: '#FF406A', detail: '#FFFFFF' },
  explosion: { fill: '#FF8A3D', stroke: '#FFE28A', glow: '#FFD84D', detail: '#FFFFFF' },
  gate: { fill: '#172954', stroke: '#7DE7FF', glow: '#30D9FF', detail: '#FFE66A' },
  debris: DEBRIS_ASSET,
};

export const visualAssetFor = (kind: EntityKind, archetype?: EnemyArchetype): VisualAssetDefinition => {
  if (kind === 'hazard') return ASTEROID_ASSET;
  if (kind === 'enemy') return archetype ? ENEMY_ASSETS[archetype] : DRONE_ASSET;
  return ENTITY_ASSETS[kind] ?? DEBRIS_ASSET;
};

export const SHIP_VISUAL_ASSET: VisualAssetDefinition = SHIP_ASSET;
