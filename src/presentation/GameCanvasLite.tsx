import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { GameSnapshot, WorldEntity } from '../domain/types';

interface Props { readonly snapshot: GameSnapshot }

interface ProjectedEntity {
  readonly entity: WorldEntity;
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

const STAR_COUNT = 28;
const INTERPOLATION_MS = 55;
const motionConfig = { duration: INTERPOLATION_MS, easing: Easing.linear } as const;

const project = (entity: WorldEntity, width: number, height: number): ProjectedEntity => {
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

const StarFieldView = ({ width, height }: { readonly width: number; readonly height: number }) => {
  const stars = useMemo(() => Array.from({ length: STAR_COUNT }, (_, index) => ({
    key: index,
    left: ((index * 73) % 997) / 997 * width,
    top: ((index * 191) % 991) / 991 * height,
    opacity: 0.25 + (index % 5) * 0.1,
  })), [height, width]);

  return <>{stars.map((star) => <View key={star.key} style={[styles.star, star]} />)}</>;
};

const StarField = React.memo(StarFieldView);

const EntityView = ({ item, locked }: { readonly item: ProjectedEntity; readonly locked: boolean }) => {
  const { entity, x, y, size } = item;
  const translateX = useSharedValue(x - size / 2);
  const translateY = useSharedValue(y - size / 2);
  const scale = useSharedValue(1);

  useEffect(() => {
    translateX.value = withTiming(x - size / 2, motionConfig);
    translateY.value = withTiming(y - size / 2, motionConfig);
  }, [size, translateX, translateY, x, y]);

  useEffect(() => {
    scale.value = withTiming(locked ? 1.06 : 1, { duration: 90 });
  }, [locked, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.entity, {
      width: size,
      height: size,
      borderRadius: size / 2,
      borderColor: locked ? '#F4FF64' : `${entity.color}AA`,
      borderWidth: locked ? 4 : 2,
      backgroundColor: `${entity.color}38`,
    }, animatedStyle]}>
      <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.glyph, { color: entity.color, fontSize: Math.max(12, size * 0.45) }]}>
        {glyphFor(entity)}
      </Text>
    </Animated.View>
  );
};

const Entity = React.memo(EntityView, (previous, next) => {
  const a = previous.item;
  const b = next.item;
  return previous.locked === next.locked
    && a.entity.id === b.entity.id
    && a.entity.label === b.entity.label
    && a.entity.color === b.entity.color
    && a.entity.kind === b.entity.kind
    && a.x === b.x
    && a.y === b.y
    && a.size === b.size;
});

const ShipView = ({ x, y }: { readonly x: number; readonly y: number }) => {
  const translateX = useSharedValue(x);
  const translateY = useSharedValue(y);

  useEffect(() => {
    translateX.value = withTiming(x, motionConfig);
    translateY.value = withTiming(y, motionConfig);
  }, [translateX, translateY, x, y]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value - 43 },
      { translateY: translateY.value - 43 },
    ],
  }));
  const shipStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value - 25 },
      { translateY: translateY.value - 32 },
    ],
  }));

  return (
    <>
      <Animated.View style={[styles.shipGlow, glowStyle]} />
      <Animated.Text style={[styles.ship, shipStyle]}>▲</Animated.Text>
    </>
  );
};

const Ship = React.memo(ShipView);

export const GameCanvasLite = React.memo(({ snapshot }: Props) => {
  const { width, height } = useWindowDimensions();
  const projected = useMemo(
    () => snapshot.entities.map((entity) => project(entity, width, height)),
    [height, snapshot.entities, width],
  );
  const shipX = width / 2 + snapshot.ship.x * width * 0.31;
  const shipY = height * (0.84 + snapshot.ship.y * 0.045);

  return (
    <View pointerEvents="none" style={styles.canvas}>
      <StarField width={width} height={height} />
      {projected.map((item) => (
        <Entity key={item.entity.id} item={item} locked={snapshot.lockTargetId === item.entity.id} />
      ))}
      <Ship x={shipX} y={shipY} />
      {snapshot.laser ? (
        <View style={[styles.laser, {
          height: Math.max(10, shipY - height * 0.18),
          transform: [{ translateX: shipX - 2 }, { translateY: height * 0.18 }],
        }]} />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  canvas: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', backgroundColor: '#05062A' },
  star: { position: 'absolute', width: 3, height: 3, borderRadius: 2, backgroundColor: '#EAF8FF' },
  entity: { position: 'absolute', left: 0, top: 0, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontWeight: '900', textAlign: 'center' },
  shipGlow: { position: 'absolute', left: 0, top: 0, width: 86, height: 86, borderRadius: 43, backgroundColor: '#42DFFF20' },
  ship: { position: 'absolute', left: 0, top: 0, color: '#55DFF2', fontSize: 56, lineHeight: 62, fontWeight: '900' },
  laser: { position: 'absolute', left: 0, top: 0, width: 4, backgroundColor: '#F1FFFF' },
});
