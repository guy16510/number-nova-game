import React, { useMemo } from 'react';
import { Platform, StyleSheet, useWindowDimensions } from 'react-native';
import {
  Canvas,
  Circle,
  Fill,
  Group,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  RoundedRect,
  Skia,
  Text,
  matchFont,
  vec,
} from '@shopify/react-native-skia';
import type { GameSnapshot, WorldEntity } from '../domain/types';

interface GameCanvasProps {
  readonly snapshot: GameSnapshot;
}

interface ProjectedEntity {
  readonly entity: WorldEntity;
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

const answerFont = matchFont({
  fontFamily: Platform.select({ ios: 'Avenir Next', default: 'sans-serif' }),
  fontSize: 64,
  fontWeight: 'bold',
});

const createStarPath = (outerRadius: number, innerRadius: number) => {
  const path = Skia.Path.Make();
  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (point * Math.PI) / 5;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (point === 0) {
      path.moveTo(x, y);
    } else {
      path.lineTo(x, y);
    }
  }
  path.close();
  return path;
};

const createShipPath = () => {
  const path = Skia.Path.Make();
  path.moveTo(0, -72);
  path.cubicTo(44, -60, 78, -18, 82, 30);
  path.lineTo(52, 58);
  path.lineTo(22, 42);
  path.lineTo(-22, 42);
  path.lineTo(-52, 58);
  path.lineTo(-82, 30);
  path.cubicTo(-78, -18, -44, -60, 0, -72);
  path.close();
  return path;
};

const createHazardSpike = () => {
  const path = Skia.Path.Make();
  path.moveTo(0, -76);
  path.lineTo(12, -50);
  path.lineTo(-12, -50);
  path.close();
  return path;
};

const starPath = createStarPath(42, 18);
const smallStarPath = createStarPath(10, 4);
const shipPath = createShipPath();
const hazardSpike = createHazardSpike();

const STAR_FIELD = Array.from({ length: 80 }, (_, index) => ({
  x: ((index * 73) % 997) / 997,
  y: ((index * 191) % 991) / 991,
  radius: 0.7 + ((index * 31) % 10) / 10,
  opacity: 0.3 + ((index * 17) % 7) / 10,
}));

const project = (entity: WorldEntity, width: number, height: number): ProjectedEntity => {
  const depth = Math.max(0, Math.min(1.15, 1 - entity.z));
  const spread = 0.17 + depth * 0.88;
  const scale = 0.25 + depth * depth * 1.6;
  return {
    entity,
    x: width / 2 + entity.x * width * 0.45 * spread,
    y: height * 0.27 + entity.y * height * 0.38 * spread + depth * height * 0.19,
    scale,
  };
};

const Asteroid = ({ item, locked, lockProgress, lockCorrect }: {
  readonly item: ProjectedEntity;
  readonly locked: boolean;
  readonly lockProgress: number;
  readonly lockCorrect: boolean;
}) => {
  const { entity, x, y, scale } = item;
  const radius = 68;
  const label = entity.label ?? '';
  const labelOffset = label.length > 1 ? -36 : -19;
  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scale }]}>
      <Circle cx={0} cy={0} r={radius + 8} color={`${entity.color}55`} />
      <Circle cx={0} cy={0} r={radius} color={entity.color}>
        <RadialGradient
          c={vec(-22, -26)}
          r={95}
          colors={['#FFFFFFDD', entity.color, '#11122C']}
          positions={[0, 0.28, 1]}
        />
      </Circle>
      <Circle cx={-20} cy={-19} r={10} color="#11142F55" />
      <Circle cx={27} cy={8} r={14} color="#11142F66" />
      <Circle cx={-10} cy={31} r={8} color="#11142F55" />
      <Text x={labelOffset} y={23} text={label} font={answerFont} color="#FFFFFF" />
      {locked ? (
        <>
          <Circle
            cx={0}
            cy={0}
            r={radius + 21}
            style="stroke"
            strokeWidth={7}
            color={lockCorrect ? '#8CFF44' : '#FF4A66'}
            opacity={0.9}
          />
          <Circle
            cx={0}
            cy={0}
            r={radius + 31}
            style="stroke"
            strokeWidth={4 + lockProgress * 6}
            color={lockCorrect ? '#E6FF7A' : '#FF9CAF'}
            opacity={0.45 + lockProgress * 0.5}
          />
        </>
      ) : null}
    </Group>
  );
};

const Hazard = ({ item }: { readonly item: ProjectedEntity }) => {
  const { x, y, scale, entity } = item;
  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scale: scale * 0.78 }]}>
      {Array.from({ length: 8 }, (_, index) => (
        <Group key={index} transform={[{ rotate: (index * Math.PI) / 4 }]}>
          <Path path={hazardSpike} color="#FF6B28" />
        </Group>
      ))}
      <Circle cx={0} cy={0} r={57} color={entity.color}>
        <RadialGradient c={vec(-20, -24)} r={82} colors={['#7A8199', '#282943', '#060712']} />
      </Circle>
      <Circle cx={0} cy={0} r={23} color="#FF3B23" />
      <Circle cx={0} cy={0} r={10} color="#FFD052" />
    </Group>
  );
};

const CollectibleStar = ({ item }: { readonly item: ProjectedEntity }) => {
  const { x, y, scale } = item;
  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scale: scale * 0.9 }]}>
      <Circle cx={0} cy={0} r={58} color="#FFD83B35" />
      <Path path={starPath} color="#FFD43B" />
      <Path path={starPath} color="#FFF4A8" style="stroke" strokeWidth={5} />
    </Group>
  );
};

const PlayerShip = ({ x, y, width, height, shield }: {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly shield: boolean;
}) => {
  const screenX = width / 2 + x * width * 0.32;
  const screenY = height * (0.79 + y * 0.08);
  const shipScale = Math.min(width / 1100, height / 650) * 1.18;
  return (
    <Group transform={[{ translateX: screenX }, { translateY: screenY }, { scale: shipScale }]}>
      <RoundedRect x={-50} y={48} width={25} height={72} r={12} color="#16C7FF">
        <LinearGradient start={vec(-40, 48)} end={vec(-40, 120)} colors={['#FFFFFF', '#1AC9FF', '#0055FF00']} />
      </RoundedRect>
      <RoundedRect x={25} y={48} width={25} height={72} r={12} color="#16C7FF">
        <LinearGradient start={vec(40, 48)} end={vec(40, 120)} colors={['#FFFFFF', '#1AC9FF', '#0055FF00']} />
      </RoundedRect>
      <Path path={shipPath} color="#E9EEF8">
        <LinearGradient start={vec(0, -70)} end={vec(0, 62)} colors={['#FFFFFF', '#DCE6F4', '#66748E']} />
      </Path>
      <Circle cx={-58} cy={22} r={28} color="#E44B25" />
      <Circle cx={58} cy={22} r={28} color="#E44B25" />
      <Circle cx={0} cy={-23} r={43} color="#74D9FF88" />
      <Circle cx={0} cy={-18} r={32} color="#203A66" />
      <Circle cx={0} cy={-23} r={18} color="#C66A2A" />
      <Path path={smallStarPath} color="#FFD43B" transform={[{ translateY: 28 }, { scale: 1.7 }]} />
      {shield ? (
        <Circle cx={0} cy={0} r={105} color="#2CCAFF22" style="stroke" strokeWidth={10} />
      ) : null}
    </Group>
  );
};

const Boss = ({ width, height, health, maxHealth }: {
  readonly width: number;
  readonly height: number;
  readonly health: number;
  readonly maxHealth: number;
}) => {
  const scale = Math.min(width / 1200, height / 700);
  return (
    <Group transform={[{ translateX: width / 2 }, { translateY: height * 0.23 }, { scale }]}>
      <Circle cx={0} cy={0} r={94} color="#8B43FF44" />
      <RoundedRect x={-148} y={-28} width={296} height={72} r={36} color="#522AA7" />
      <Circle cx={0} cy={-27} r={67} color="#C9F4FF" />
      <Circle cx={0} cy={-22} r={51} color="#17244F" />
      <Circle cx={-18} cy={-25} r={7} color="#79FFEF" />
      <Circle cx={18} cy={-25} r={7} color="#79FFEF" />
      <Path path="M -22 2 Q 0 22 22 2" color="#FF78DC" style="stroke" strokeWidth={5} />
      <RoundedRect x={-112} y={64} width={224} height={18} r={9} color="#1B163A" />
      <RoundedRect x={-108} y={68} width={(216 * health) / maxHealth} height={10} r={5} color="#FF4E72" />
    </Group>
  );
};

export const GameCanvas = ({ snapshot }: GameCanvasProps) => {
  const { width, height } = useWindowDimensions();
  const projected = useMemo(
    () => snapshot.entities.map((entity) => project(entity, width, height)).sort((a, b) => b.entity.z - a.entity.z),
    [snapshot.entities, width, height],
  );
  const laserEnd = snapshot.laser
    ? project({ id: 'laser', kind: 'answer', x: snapshot.laser.x, y: snapshot.laser.y, z: snapshot.laser.z, radius: 0.1, color: '#B9FF4A' }, width, height)
    : null;
  const shipScreenX = width / 2 + snapshot.ship.x * width * 0.32;
  const shipScreenY = height * (0.79 + snapshot.ship.y * 0.08);

  return (
    <Canvas style={styles.canvas}>
      <Fill>
        <LinearGradient start={vec(0, 0)} end={vec(width, height)} colors={['#02031A', '#071156', '#160040']} />
      </Fill>
      <Circle cx={width * 0.16} cy={height * 0.21} r={height * 0.09} color="#6A24FF30" />
      <Circle cx={width * 0.84} cy={height * 0.24} r={height * 0.07} color="#FF7B2D35" />
      <Path
        path={`M ${-width * 0.08} ${height * 0.67} C ${width * 0.18} ${height * 0.28}, ${width * 0.34} ${height * 0.92}, ${width * 0.56} ${height * 0.58} S ${width * 0.88} ${height * 0.28}, ${width * 1.12} ${height * 0.51}`}
        style="stroke"
        strokeWidth={height * 0.065}
        color="#9B2CFF45"
      />
      {STAR_FIELD.map((star, index) => (
        <Circle
          key={index}
          cx={star.x * width}
          cy={star.y * height}
          r={star.radius}
          color="#DDF5FF"
          opacity={star.opacity}
        />
      ))}
      {snapshot.phase === 'boss' ? (
        <Boss width={width} height={height} health={snapshot.bossHealth} maxHealth={snapshot.bossMaxHealth} />
      ) : null}
      {projected.map((item) => {
        if (item.entity.kind === 'answer') {
          return (
            <Asteroid
              key={item.entity.id}
              item={item}
              locked={snapshot.lockTargetId === item.entity.id}
              lockProgress={snapshot.lockProgress}
              lockCorrect={snapshot.lockIsCorrect}
            />
          );
        }
        if (item.entity.kind === 'hazard') {
          return <Hazard key={item.entity.id} item={item} />;
        }
        return <CollectibleStar key={item.entity.id} item={item} />;
      })}
      {snapshot.laser && laserEnd ? (
        <Line
          p1={vec(shipScreenX, shipScreenY - 60)}
          p2={vec(laserEnd.x, laserEnd.y)}
          color="#B9FF4A"
          strokeWidth={10}
        />
      ) : null}
      <PlayerShip
        x={snapshot.ship.x}
        y={snapshot.ship.y}
        width={width}
        height={height}
        shield={snapshot.ship.shieldSeconds > 0}
      />
      <Rect x={0} y={0} width={width} height={height} color="#02031310" />
    </Canvas>
  );
};

const styles = StyleSheet.create({
  canvas: {
    ...StyleSheet.absoluteFillObject,
  },
});
