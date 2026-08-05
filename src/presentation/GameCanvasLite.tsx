import React, { useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { GameSnapshot, WorldEntity } from '../domain/types';

interface Props { readonly snapshot: GameSnapshot }

const project = (entity: WorldEntity, width: number, height: number) => {
  const depth = Math.max(0, Math.min(1.25, 1 - entity.z));
  const spread = 0.11 + depth * 1.04;
  return {
    entity,
    x: width / 2 + entity.x * width * 0.49 * spread,
    y: height * 0.2 + entity.y * height * 0.34 * spread + depth * height * 0.17,
    size: Math.max(14, (0.18 + depth * depth * 1.3) * 74),
  };
};

const glyphFor = (entity: WorldEntity): string => {
  if (entity.label) return entity.label;
  switch (entity.kind) {
    case 'hazard': return '●';
    case 'enemyProjectile': return '•';
    case 'star': return '★';
    case 'powerUp': return '✦';
    case 'ally': return '▲';
    case 'projectile': return '│';
    case 'explosion': return '✹';
    case 'gate': return '◯';
    default: return '◆';
  }
};

export const GameCanvasLite = ({ snapshot }: Props) => {
  const { width, height } = useWindowDimensions();
  const projected = useMemo(
    () => snapshot.entities.map((entity) => project(entity, width, height)),
    [height, snapshot.entities, width],
  );
  const shipX = width / 2 + snapshot.ship.x * width * 0.31;
  const shipY = height * (0.84 + snapshot.ship.y * 0.045);

  return (
    <View pointerEvents="none" style={styles.canvas}>
      {Array.from({ length: 28 }, (_, index) => (
        <View key={index} style={[styles.star, {
          left: ((index * 73) % 997) / 997 * width,
          top: ((index * 191) % 991) / 991 * height,
          opacity: 0.25 + (index % 5) * 0.1,
        }]} />
      ))}
      {projected.map(({ entity, x, y, size }) => {
        const locked = snapshot.lockTargetId === entity.id;
        return (
          <View key={entity.id} style={[styles.entity, {
            left: x - size / 2,
            top: y - size / 2,
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: locked ? '#F4FF64' : `${entity.color}AA`,
            borderWidth: locked ? 4 : 2,
            backgroundColor: `${entity.color}38`,
          }]}>
            <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.glyph, { color: entity.color, fontSize: Math.max(12, size * 0.45) }]}>
              {glyphFor(entity)}
            </Text>
          </View>
        );
      })}
      <View style={[styles.shipGlow, { left: shipX - 43, top: shipY - 43 }]} />
      <Text style={[styles.ship, { left: shipX - 25, top: shipY - 32 }]}>▲</Text>
      {snapshot.laser ? <View style={[styles.laser, { left: shipX - 2, top: height * 0.18, height: Math.max(10, shipY - height * 0.18) }]} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  canvas: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', backgroundColor: '#05062A' },
  star: { position: 'absolute', width: 3, height: 3, borderRadius: 2, backgroundColor: '#EAF8FF' },
  entity: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  glyph: { fontWeight: '900', textAlign: 'center' },
  shipGlow: { position: 'absolute', width: 86, height: 86, borderRadius: 43, backgroundColor: '#42DFFF20' },
  ship: { position: 'absolute', color: '#55DFF2', fontSize: 56, lineHeight: 62, fontWeight: '900', transform: [{ rotate: '0deg' }] },
  laser: { position: 'absolute', width: 4, backgroundColor: '#F1FFFF', shadowColor: '#37D9FF', shadowOpacity: 1, shadowRadius: 8 },
});
