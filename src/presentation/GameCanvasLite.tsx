import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { GameSnapshot, WorldEntity } from '../domain/types';
import {
  defaultEntityVisualPresenter,
  defaultRenderBudgetPolicy,
  type EntityVisualModel,
} from './EntityVisualPresenter';

interface Props { readonly snapshot: GameSnapshot }

interface ProjectedEntity {
  readonly entity: WorldEntity;
  readonly visual: EntityVisualModel;
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

const INTERPOLATION_MS = 55;
const motionConfig = { duration: INTERPOLATION_MS, easing: Easing.linear } as const;

const project = (entity: WorldEntity, visual: EntityVisualModel, width: number, height: number): ProjectedEntity => {
  const depth = Math.max(0, Math.min(1.25, 1 - entity.z));
  const spread = 0.11 + depth * 1.04;
  return {
    entity,
    visual,
    x: width / 2 + entity.x * width * 0.49 * spread,
    y: height * 0.2 + entity.y * height * 0.34 * spread + depth * height * 0.17,
    size: Math.max(14, (0.18 + depth * depth * 1.3) * 74),
  };
};

const StarLayer = React.memo(({ width, height, count, speed, size }: {
  readonly width: number;
  readonly height: number;
  readonly count: number;
  readonly speed: number;
  readonly size: number;
}) => {
  const stars = useMemo(() => Array.from({ length: count }, (_, index) => ({
    key: `${speed}-${index}`,
    left: ((index * (73 + speed * 11)) % 997) / 997 * width,
    top: ((index * (191 + speed * 7)) % 991) / 991 * height,
    opacity: 0.18 + (index % 5) * 0.1,
    transform: [{ scale: 0.7 + (index % 3) * 0.18 }],
  })), [count, height, speed, width]);

  return <>{stars.map((star) => <View key={star.key} style={[styles.star, { width: size, height: size }, star]} />)}</>;
});

const HealthBar = ({ ratio, width }: { readonly ratio: number; readonly width: number }) => (
  <View style={[styles.healthTrack, { width: Math.max(24, width * 0.8) }]}>
    <View style={[styles.healthFill, { width: `${Math.round(ratio * 100)}%` }]} />
  </View>
);

const Silhouette = ({ visual, size }: { readonly visual: EntityVisualModel; readonly size: number }) => {
  const common = { borderColor: visual.color, backgroundColor: `${visual.color}35` };
  switch (visual.shape) {
    case 'asteroid':
      return <View style={[styles.asteroid, common, { width: size * 0.78, height: size * 0.68 }]} />;
    case 'zigzag':
      return <Text style={[styles.enemyGlyph, { color: visual.color, fontSize: size * 0.58 }]}>ϟ</Text>;
    case 'bomber':
      return <Text style={[styles.enemyGlyph, { color: visual.color, fontSize: size * 0.52 }]}>⬢</Text>;
    case 'shield':
      return <View style={[styles.shieldShip, common, { width: size * 0.7, height: size * 0.7 }]}><Text style={[styles.innerGlyph, { color: visual.color }]}>◆</Text></View>;
    case 'boss':
      return <View style={[styles.boss, common, { width: size * 0.9, height: size * 0.62 }]}><Text style={[styles.bossGlyph, { color: visual.color }]}>M</Text></View>;
    case 'drone':
      return <View style={[styles.drone, common, { width: size * 0.7, height: size * 0.5 }]}><Text style={[styles.innerGlyph, { color: visual.color }]}>●</Text></View>;
    case 'star':
      return <Text style={[styles.collectible, { color: visual.color, fontSize: size * 0.62 }]}>★</Text>;
    case 'power-up':
      return <View style={[styles.powerUp, common, { width: size * 0.62, height: size * 0.62 }]}><Text style={[styles.innerGlyph, { color: visual.color }]}>✦</Text></View>;
    case 'ally':
      return <Text style={[styles.ally, { color: visual.color, fontSize: size * 0.62 }]}>▲</Text>;
    case 'projectile':
      return <View style={[styles.playerProjectile, { backgroundColor: visual.color, height: size * 0.7 }]} />;
    case 'enemy-projectile':
      return <View style={[styles.enemyProjectile, { backgroundColor: visual.color, width: size * 0.24, height: size * 0.24 }]} />;
    case 'explosion':
      return <Text style={[styles.explosion, { color: visual.color, fontSize: size * 0.7 }]}>✹</Text>;
    case 'gate':
      return <View style={[styles.gate, { borderColor: visual.color, width: size * 0.82, height: size * 0.82 }]} />;
    case 'debris':
      return <View style={[styles.debris, { backgroundColor: visual.color, width: size * 0.2, height: size * 0.5 }]} />;
  }
};

const EntityView = ({ item }: { readonly item: ProjectedEntity }) => {
  const { entity, visual, x, y, size } = item;
  const translateX = useSharedValue(x - size / 2);
  const translateY = useSharedValue(y - size / 2);
  const scale = useSharedValue(1);

  useEffect(() => {
    translateX.value = withTiming(x - size / 2, motionConfig);
    translateY.value = withTiming(y - size / 2, motionConfig);
  }, [size, translateX, translateY, x, y]);

  useEffect(() => {
    scale.value = withTiming(visual.locked ? 1.08 : 1, { duration: 90 });
  }, [scale, visual.locked]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.entity, { width: size, height: size }, animatedStyle]}>
      {visual.warning ? <View style={[styles.warningRing, { borderColor: visual.color }]} /> : null}
      {visual.locked ? <View style={styles.lockRing} /> : null}
      <Silhouette visual={visual} size={size} />
      {visual.label ? <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.label, { color: visual.color, fontSize: Math.max(11, size * 0.28) }]}>{visual.label}</Text> : null}
      {visual.healthRatio !== null ? <HealthBar ratio={visual.healthRatio} width={size} /> : null}
      {entity.correct === true && visual.locked ? <Text style={styles.correctMarker}>✓</Text> : null}
    </Animated.View>
  );
};

const Entity = React.memo(EntityView, (previous, next) => {
  const a = previous.item;
  const b = next.item;
  return a.entity.id === b.entity.id
    && a.entity.label === b.entity.label
    && a.entity.color === b.entity.color
    && a.entity.health === b.entity.health
    && a.visual.locked === b.visual.locked
    && a.visual.warning === b.visual.warning
    && a.x === b.x
    && a.y === b.y
    && a.size === b.size;
});

const ShipView = ({ x, y, steeringX, shielded }: {
  readonly x: number;
  readonly y: number;
  readonly steeringX: number;
  readonly shielded: boolean;
}) => {
  const translateX = useSharedValue(x);
  const translateY = useSharedValue(y);
  const rotation = useSharedValue(steeringX * 14);

  useEffect(() => {
    translateX.value = withTiming(x, motionConfig);
    translateY.value = withTiming(y, motionConfig);
    rotation.value = withTiming(steeringX * 14, { duration: 90 });
  }, [rotation, steeringX, translateX, translateY, x, y]);

  const shipStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value - 32 },
      { translateY: translateY.value - 38 },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.shipContainer, shipStyle]}>
      {shielded ? <View style={styles.shipShield} /> : null}
      <View style={styles.engineTrail} />
      <View style={styles.shipBody}>
        <View style={styles.shipWingLeft} />
        <View style={styles.shipWingRight} />
        <View style={styles.shipCockpit} />
      </View>
    </Animated.View>
  );
};

const Ship = React.memo(ShipView);

export const GameCanvasLite = React.memo(({ snapshot }: Props) => {
  const { width, height } = useWindowDimensions();
  const visibleEntities = useMemo(
    () => defaultRenderBudgetPolicy.select(snapshot.entities, snapshot.lockTargetId),
    [snapshot.entities, snapshot.lockTargetId],
  );
  const projected = useMemo(
    () => visibleEntities.map((entity) => project(
      entity,
      defaultEntityVisualPresenter.present(entity, snapshot.lockTargetId),
      width,
      height,
    )),
    [height, snapshot.lockTargetId, visibleEntities, width],
  );
  const shipX = width / 2 + snapshot.ship.x * width * 0.31;
  const shipY = height * (0.84 + snapshot.ship.y * 0.045);
  const shakeX = snapshot.screenShake > 0 ? Math.sin(snapshot.elapsedSeconds * 95) * snapshot.screenShake * 4 : 0;

  return (
    <View pointerEvents="none" style={[styles.canvas, { transform: [{ translateX: shakeX }] }]}>
      <View style={styles.nebulaOne} />
      <View style={styles.nebulaTwo} />
      <View style={styles.planet} />
      <StarLayer width={width} height={height} count={18} speed={1} size={2} />
      <StarLayer width={width} height={height} count={14} speed={2} size={3} />
      <StarLayer width={width} height={height} count={10} speed={3} size={4} />
      {projected.map((item) => <Entity key={item.entity.id} item={item} />)}
      <Ship x={shipX} y={shipY} steeringX={snapshot.ship.x} shielded={snapshot.ship.shieldSeconds > 0} />
      {snapshot.laser ? (
        <View style={[styles.laserGlow, {
          height: Math.max(10, shipY - height * 0.18),
          transform: [{ translateX: shipX - 5 }, { translateY: height * 0.18 }],
        }]}>
          <View style={styles.laserCore} />
        </View>
      ) : null}
      {snapshot.screenShake > 0.55 ? <View style={styles.damageVignette} /> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  canvas: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', backgroundColor: '#05062A' },
  nebulaOne: { position: 'absolute', left: '-8%', top: '-28%', width: '55%', height: '95%', borderRadius: 300, backgroundColor: '#5A2FA730', transform: [{ rotate: '-18deg' }] },
  nebulaTwo: { position: 'absolute', right: '-16%', bottom: '-30%', width: '62%', height: '90%', borderRadius: 320, backgroundColor: '#007A9B24', transform: [{ rotate: '22deg' }] },
  planet: { position: 'absolute', right: '7%', top: '9%', width: 110, height: 110, borderRadius: 55, backgroundColor: '#7B59C840', borderWidth: 3, borderColor: '#B9A5FF55' },
  star: { position: 'absolute', borderRadius: 3, backgroundColor: '#EAF8FF' },
  entity: { position: 'absolute', left: 0, top: 0, alignItems: 'center', justifyContent: 'center' },
  warningRing: { position: 'absolute', width: '98%', height: '98%', borderRadius: 999, borderWidth: 3, opacity: 0.75 },
  lockRing: { position: 'absolute', width: '112%', height: '112%', borderRadius: 999, borderWidth: 3, borderColor: '#F4FF64' },
  label: { position: 'absolute', fontWeight: '900', textAlign: 'center', textShadowColor: '#000000', textShadowRadius: 4 },
  correctMarker: { position: 'absolute', right: -2, top: -2, color: '#7CFF8A', fontSize: 17, fontWeight: '900' },
  healthTrack: { position: 'absolute', bottom: -5, height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: '#160D2DCC' },
  healthFill: { height: '100%', borderRadius: 3, backgroundColor: '#7CFF8A' },
  asteroid: { borderWidth: 3, borderRadius: 18, transform: [{ rotate: '17deg' }] },
  drone: { borderWidth: 3, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  shieldShip: { borderWidth: 4, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  boss: { borderWidth: 4, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  innerGlyph: { fontSize: 20, fontWeight: '900' },
  bossGlyph: { fontSize: 24, fontWeight: '900' },
  enemyGlyph: { fontWeight: '900', textShadowColor: '#000000', textShadowRadius: 5 },
  collectible: { fontWeight: '900', textShadowColor: '#FFFFFF', textShadowRadius: 8 },
  powerUp: { borderWidth: 3, borderRadius: 10, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '45deg' }] },
  ally: { fontWeight: '900', textShadowColor: '#73E6FF', textShadowRadius: 8 },
  playerProjectile: { width: 5, borderRadius: 3, shadowColor: '#FFFFFF', shadowOpacity: 1, shadowRadius: 6 },
  enemyProjectile: { borderRadius: 999, shadowColor: '#FF5D7A', shadowOpacity: 1, shadowRadius: 7 },
  explosion: { fontWeight: '900', textShadowColor: '#FFE28A', textShadowRadius: 10 },
  gate: { borderWidth: 5, borderRadius: 999 },
  debris: { borderRadius: 4, transform: [{ rotate: '32deg' }] },
  shipContainer: { position: 'absolute', left: 0, top: 0, width: 64, height: 78, alignItems: 'center', justifyContent: 'center' },
  shipShield: { position: 'absolute', width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: '#72F5FFAA', backgroundColor: '#43D6FF16' },
  engineTrail: { position: 'absolute', bottom: -19, width: 14, height: 36, borderRadius: 8, backgroundColor: '#59E8FF88' },
  shipBody: { width: 28, height: 54, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: '#68E9FF', borderWidth: 3, borderColor: '#E9FDFF', alignItems: 'center' },
  shipWingLeft: { position: 'absolute', left: -18, bottom: 5, width: 22, height: 24, borderTopLeftRadius: 15, backgroundColor: '#2987CB', transform: [{ rotate: '-18deg' }] },
  shipWingRight: { position: 'absolute', right: -18, bottom: 5, width: 22, height: 24, borderTopRightRadius: 15, backgroundColor: '#2987CB', transform: [{ rotate: '18deg' }] },
  shipCockpit: { marginTop: 12, width: 14, height: 20, borderRadius: 8, backgroundColor: '#102961' },
  laserGlow: { position: 'absolute', left: 0, top: 0, width: 10, alignItems: 'center', backgroundColor: '#3EDBFF40' },
  laserCore: { width: 3, height: '100%', backgroundColor: '#FFFFFF' },
  damageVignette: { ...StyleSheet.absoluteFillObject, borderWidth: 14, borderColor: '#FF3B5E45' },
});
