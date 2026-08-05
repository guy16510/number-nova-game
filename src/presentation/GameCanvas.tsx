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
  Skia,
  Text,
  matchFont,
  vec,
} from '@shopify/react-native-skia';
import type { GameSnapshot, WorldEntity } from '../domain/types';

interface Props { readonly snapshot: GameSnapshot }
interface Projected { readonly entity: WorldEntity; readonly x: number; readonly y: number; readonly scale: number }

const family = Platform.select({ ios: 'Avenir Next', default: 'sans-serif' });
const numberFont = matchFont({ fontFamily: family, fontSize: 62, fontWeight: 'bold' });
const smallFont = matchFont({ fontFamily: family, fontSize: 22, fontWeight: 'bold' });
const CAMERA_SCALE = 0.7;

const starPath = (outer: number, inner: number) => {
  const path = Skia.Path.Make();
  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    if (index === 0) path.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    else path.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  path.close();
  return path;
};

const jaggedPath = (radius: number, seed: number, points = 15) => {
  const path = Skia.Path.Make();
  for (let index = 0; index < points; index += 1) {
    const angle = (index / points) * Math.PI * 2;
    const pointRadius = radius + Math.sin(index * 3.7 + seed) * 7;
    if (index === 0) path.moveTo(Math.cos(angle) * pointRadius, Math.sin(angle) * pointRadius);
    else path.lineTo(Math.cos(angle) * pointRadius, Math.sin(angle) * pointRadius);
  }
  path.close();
  return path;
};

const enemyHull = Skia.Path.MakeFromSVGString('M -84 20 L -44 -16 L -24 -62 L 0 -84 L 24 -62 L 44 -16 L 84 20 L 54 42 L 24 31 L 0 58 L -24 31 L -54 42 Z')!;
const enemyWing = Skia.Path.MakeFromSVGString('M -96 8 L -42 -28 L -34 10 L -74 39 Z M 96 8 L 42 -28 L 34 10 L 74 39 Z')!;
const bossHull = Skia.Path.MakeFromSVGString('M -150 12 L -104 -46 L -55 -55 L -22 -104 L 0 -124 L 22 -104 L 55 -55 L 104 -46 L 150 12 L 108 54 L 62 40 L 26 78 L 0 92 L -26 78 L -62 40 L -108 54 Z')!;
const shipHull = Skia.Path.MakeFromSVGString('M 0 -88 L 46 -34 L 102 24 L 48 22 L 34 64 L 0 43 L -34 64 L -48 22 L -102 24 L -46 -34 Z')!;
const asteroidA = jaggedPath(64, 2.4);
const asteroidB = jaggedPath(60, 8.9);
const minePath = jaggedPath(50, 7.2, 12);
const collectibleStar = starPath(38, 16);
const explosionStar = starPath(60, 14);

const STAR_FIELD = Array.from({ length: 70 }, (_, index) => ({
  x: ((index * 73) % 997) / 997,
  y: ((index * 191) % 991) / 991,
  r: 0.7 + ((index * 31) % 11) / 7,
  opacity: 0.28 + ((index * 19) % 55) / 100,
}));

const SPEED_LINES = Array.from({ length: 22 }, (_, index) => ({
  x: ((index * 83) % 941) / 941,
  y: ((index * 157) % 887) / 887,
  length: 14 + ((index * 23) % 42),
  speed: 0.16 + ((index * 13) % 22) / 100,
}));

const project = (entity: WorldEntity, width: number, height: number): Projected => {
  const depth = Math.max(0, Math.min(1.25, 1 - entity.z));
  const spread = 0.11 + depth * 1.04;
  return {
    entity,
    x: width / 2 + entity.x * width * 0.49 * spread,
    y: height * 0.2 + entity.y * height * 0.34 * spread + depth * height * 0.17,
    scale: (0.18 + depth * depth * 1.3) * CAMERA_SCALE,
  };
};

const Backdrop = ({ width, height, time, shipX }: { readonly width: number; readonly height: number; readonly time: number; readonly shipX: number }) => (
  <>
    <Fill>
      <LinearGradient start={vec(0, 0)} end={vec(width, height)} colors={['#01020F', '#07104C', '#19053D', '#02020D']} />
    </Fill>
    <Circle cx={width * 0.11} cy={height * 0.24} r={height * 0.07} color="#D57351">
      <RadialGradient c={vec(width * 0.085, height * 0.2)} r={height * 0.13} colors={['#FFF0B8', '#D57351', '#54233E']} />
    </Circle>
    <Circle cx={width * 0.9} cy={height * 0.18} r={height * 0.065} color="#9E55D5">
      <RadialGradient c={vec(width * 0.87, height * 0.14)} r={height * 0.12} colors={['#FFDDB5', '#9E55D5', '#301456']} />
    </Circle>
    <Path
      path={`M ${-width * 0.1} ${height * 0.75} C ${width * 0.14} ${height * 0.32}, ${width * 0.36} ${height * 0.9}, ${width * 0.58} ${height * 0.58} S ${width * 0.86} ${height * 0.29}, ${width * 1.1} ${height * 0.53}`}
      style="stroke"
      strokeWidth={height * 0.07}
      color="#A137FF1D"
    />
    {STAR_FIELD.map((point, index) => (
      <Circle
        key={index}
        cx={point.x * width - shipX * width * 0.006}
        cy={point.y * height}
        r={point.r}
        color="#EAF8FF"
        opacity={point.opacity}
      />
    ))}
    {SPEED_LINES.map((line, index) => {
      const travel = (line.y + time * line.speed) % 1;
      const x = line.x * width + (line.x - 0.5) * travel * width * 0.18 - shipX * width * 0.02;
      const y = travel * height;
      const length = line.length * (0.35 + travel);
      return (
        <Line
          key={index}
          p1={vec(x, y)}
          p2={vec(x + (line.x - 0.5) * length * 0.42, y + length)}
          color="#9CEBFF"
          strokeWidth={0.7 + travel * 1.8}
          opacity={0.12 + travel * 0.34}
        />
      );
    })}
  </>
);

const Enemy = ({ item, snapshot }: { readonly item: Projected; readonly snapshot: GameSnapshot }) => {
  const { entity, x, y } = item;
  const boss = entity.archetype === 'boss';
  const shielded = (entity.health ?? 1) > 1;
  const locked = snapshot.lockTargetId === entity.id;
  const correct = entity.correct === true;
  const scale = item.scale * (boss ? 1.4 : entity.archetype === 'shield-ship' ? 1.08 : 1);
  const label = entity.label ?? '';
  const labelOffset = label.length > 1 ? -35 : -18;
  const bank = boss ? Math.sin(snapshot.elapsedSeconds * 0.7) * 0.04 : Math.sin(snapshot.elapsedSeconds * 1.8 + x * 0.01) * 0.12;
  const pulse = 1 + Math.sin(snapshot.elapsedSeconds * 4 + y) * 0.025;

  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scale: scale * pulse }, { rotate: bank }]}>
      <Circle cx={0} cy={0} r={boss ? 180 : 112} color={`${entity.color}22`} />
      <Path path={boss ? bossHull : enemyWing} color="#171D48">
        <LinearGradient start={vec(-100, -50)} end={vec(100, 60)} colors={[entity.color, '#1B2858', '#070A20']} />
      </Path>
      {!boss ? (
        <Path path={enemyHull} color="#263A72">
          <LinearGradient start={vec(0, -84)} end={vec(0, 60)} colors={['#EAF8FF', entity.color, '#151A43']} />
        </Path>
      ) : null}
      <Circle cx={0} cy={boss ? 8 : 14} r={boss ? 45 : 31} color="#07102C" />
      <Circle cx={0} cy={boss ? 8 : 14} r={boss ? 39 : 27} color={`${entity.color}E8`} />
      {label ? (
        <>
          <Text x={labelOffset + 3} y={boss ? 31 : 35} text={label} font={numberFont} color="#030617B0" />
          <Text x={labelOffset} y={boss ? 27 : 31} text={label} font={numberFont} color="#FFFFFF" />
        </>
      ) : null}
      {entity.archetype === 'bomber-alien' ? (
        <>
          <Circle cx={-58} cy={31} r={12} color="#FF3A68" />
          <Circle cx={58} cy={31} r={12} color="#FF3A68" />
        </>
      ) : null}
      {shielded ? (
        <Circle cx={0} cy={0} r={boss ? 168 : 102} style="stroke" strokeWidth={8} color="#72F3FFCC" />
      ) : null}
      {boss ? (
        <>
          <Circle cx={-70} cy={22} r={15} color="#FF6A36" />
          <Circle cx={70} cy={22} r={15} color="#FF6A36" />
          <Text x={-55} y={-82} text={`STAGE ${snapshot.bossStage}`} font={smallFont} color="#FFF083" />
        </>
      ) : null}
      {locked ? (
        <>
          <Circle cx={0} cy={0} r={(boss ? 170 : 105) + snapshot.lockProgress * 8} color={correct ? '#A8FF4A1A' : '#FF405B1A'} />
          <Circle
            cx={0}
            cy={0}
            r={(boss ? 164 : 99) + snapshot.lockProgress * 7}
            style="stroke"
            strokeWidth={5 + snapshot.lockProgress * 4}
            color={correct ? '#F3FF62' : '#FF5B72'}
          />
        </>
      ) : null}
    </Group>
  );
};

const Hazard = ({ item, time }: { readonly item: Projected; readonly time: number }) => {
  const { entity, x, y, scale } = item;
  const number = Number(entity.id.split('-').at(-1)) || 0;
  const mine = number % 3 === 0 || entity.warning;
  const path = number % 2 === 0 ? asteroidA : asteroidB;
  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scale: scale * 0.78 }, { rotate: time * (mine ? 0.58 : 0.22) + number }]}>
      <Circle cx={0} cy={0} r={mine ? 78 : 82} color={mine ? '#FF2B1A20' : '#FFAA6628'} />
      <Path path={mine ? minePath : path} color={mine ? '#2A2E4E' : '#67515B'}>
        <RadialGradient c={vec(-18, -22)} r={88} colors={mine ? ['#9EA6C4', '#292D4C', '#050610'] : ['#DFC29A', '#765664', '#201B2C']} />
      </Path>
      {mine ? [0, 1, 2, 3].map((index) => (
        <Path key={index} path="M 0 -82 L 12 -48 L -12 -48 Z" color="#FF5B2E" transform={[{ rotate: (index * Math.PI) / 2 }]} />
      )) : null}
      <Circle cx={0} cy={0} r={mine ? 18 : 0} color="#FF3B23" />
      {entity.shootable ? <Circle cx={0} cy={0} r={70} style="stroke" strokeWidth={5} color="#F4FF64" /> : null}
    </Group>
  );
};

const Gate = ({ item, locked }: { readonly item: Projected; readonly locked: boolean }) => {
  const { entity, x, y, scale } = item;
  const label = entity.label ?? '';
  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scale: scale * 1.1 }]}>
      <Circle cx={0} cy={0} r={92} style="stroke" strokeWidth={16} color={`${entity.color}CC`} />
      <Circle cx={0} cy={0} r={67} style="stroke" strokeWidth={4} color="#FFFFFFAA" />
      <Text x={label.length > 1 ? -34 : -18} y={22} text={label} font={numberFont} color="#FFFFFF" />
      {locked ? <Circle cx={0} cy={0} r={108} style="stroke" strokeWidth={5} color="#F4FF64" /> : null}
    </Group>
  );
};

const PowerUp = ({ item, time }: { readonly item: Projected; readonly time: number }) => {
  const label = item.entity.label ?? '★';
  return (
    <Group transform={[{ translateX: item.x }, { translateY: item.y }, { scale: item.scale * (0.9 + Math.sin(time * 5) * 0.08) }, { rotate: time * 0.6 }]}>
      <Circle cx={0} cy={0} r={67} color={`${item.entity.color}30`} />
      <Circle cx={0} cy={0} r={48} color={item.entity.color} />
      <Circle cx={0} cy={0} r={45} style="stroke" strokeWidth={5} color="#FFFFFFCC" />
      <Text x={label.length > 1 ? -25 : -11} y={9} text={label} font={smallFont} color="#FFFFFF" />
    </Group>
  );
};

const Collectible = ({ item, time }: { readonly item: Projected; readonly time: number }) => (
  <Group transform={[{ translateX: item.x }, { translateY: item.y }, { scale: item.scale * (0.86 + Math.sin(time * 5) * 0.08) }, { rotate: time * 0.45 }]}>
    <Circle cx={0} cy={0} r={58} color="#FFD83B25" />
    <Path path={collectibleStar} color="#FFD43B" />
    <Path path={collectibleStar} color="#FFF4A8" style="stroke" strokeWidth={5} />
  </Group>
);

const Ally = ({ item, time }: { readonly item: Projected; readonly time: number }) => (
  <Group transform={[{ translateX: item.x }, { translateY: item.y }, { scale: item.scale * 0.8 }, { rotate: Math.sin(time * 2) * 0.05 }]}>
    <Path path={shipHull} color="#55DFF2">
      <LinearGradient start={vec(0, -90)} end={vec(0, 70)} colors={['#FFFFFF', '#55DFF2', '#173A72']} />
    </Path>
    <Circle cx={0} cy={-14} r={18} color="#85FFB8" />
  </Group>
);

const Projectile = ({ item }: { readonly item: Projected }) => (
  <Group transform={[{ translateX: item.x }, { translateY: item.y }, { scale: Math.max(0.4, item.scale) }]}>
    <Circle cx={0} cy={0} r={18} color={`${item.entity.color}40`} />
    <Line p1={vec(0, 24)} p2={vec(0, -24)} strokeWidth={8} color={item.entity.color} />
    <Circle cx={0} cy={-24} r={7} color="#FFFFFF" />
  </Group>
);

const Explosion = ({ item, time }: { readonly item: Projected; readonly time: number }) => {
  const life = Math.max(0.2, item.entity.ttl ?? 0.4);
  const pulse = 0.8 + Math.sin(time * 18 + item.x) * 0.16;
  return (
    <Group transform={[{ translateX: item.x }, { translateY: item.y }, { scale: item.scale * pulse }]}>
      <Circle cx={0} cy={0} r={92 * life} color={`${item.entity.color}55`} />
      <Path path={explosionStar} color={item.entity.color} />
      <Circle cx={0} cy={0} r={28} color="#FFFFFF" />
    </Group>
  );
};

const PlayerShip = ({ snapshot, width, height }: { readonly snapshot: GameSnapshot; readonly width: number; readonly height: number }) => {
  const x = width / 2 + snapshot.ship.x * width * 0.31;
  const y = height * (0.84 + snapshot.ship.y * 0.045) + Math.sin(snapshot.elapsedSeconds * 4.2) * 2;
  const scale = Math.min(width / 1536, height / 864) * 0.72;
  const bank = Math.max(-0.2, Math.min(0.2, snapshot.ship.x * 0.18));
  const weaponColor = snapshot.ship.weapon === 'rainbow-beam'
    ? '#FF67ED'
    : snapshot.ship.weapon === 'comet-missile'
      ? '#FF9A3C'
      : snapshot.ship.weapon === 'triple-shot'
        ? '#63F0FF'
        : '#3EC8FF';
  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scale }, { rotate: bank }]}>
      <Circle cx={0} cy={12} r={170} color="#42DFFF16" />
      {snapshot.ship.shieldSeconds > 0 ? (
        <Circle cx={0} cy={0} r={146} style="stroke" strokeWidth={12} color="#70EDFFD0" />
      ) : null}
      <Path path={shipHull} color="#264E94">
        <LinearGradient start={vec(0, -92)} end={vec(0, 70)} colors={['#F4FBFF', '#41B9FF', '#19306D']} />
      </Path>
      <Circle cx={0} cy={-20} r={27} color="#071B47" />
      <Circle cx={0} cy={-22} r={22} color="#79F3FF" />
      <Circle cx={-41} cy={42} r={14} color="#FF7B31" />
      <Circle cx={41} cy={42} r={14} color="#FF7B31" />
      <Line p1={vec(-41, 48)} p2={vec(-41, 100 + Math.sin(snapshot.elapsedSeconds * 12) * 12)} strokeWidth={18} color={weaponColor} />
      <Line p1={vec(41, 48)} p2={vec(41, 100 + Math.cos(snapshot.elapsedSeconds * 12) * 12)} strokeWidth={18} color={weaponColor} />
    </Group>
  );
};

const LaserBurst = ({ snapshot, width, height }: { readonly snapshot: GameSnapshot; readonly width: number; readonly height: number }) => {
  if (!snapshot.laser) return null;
  const shipX = width / 2 + snapshot.ship.x * width * 0.31;
  const shipY = height * (0.84 + snapshot.ship.y * 0.045);
  const target = project({
    id: 'laser-target', kind: 'projectile', x: snapshot.laser.x, y: snapshot.laser.y, z: snapshot.laser.z,
    radius: 0.01, color: '#FFFFFF',
  }, width, height);
  const offsets = snapshot.laser.beams >= 5 ? [-20, -10, 0, 10, 20] : snapshot.laser.beams >= 3 ? [-12, 0, 12] : [0];
  return (
    <>
      {offsets.map((offset) => (
        <React.Fragment key={offset}>
          <Line p1={vec(shipX + offset, shipY - 28)} p2={vec(target.x + offset * 0.3, target.y)} strokeWidth={10} color="#37D9FF44" />
          <Line p1={vec(shipX + offset, shipY - 28)} p2={vec(target.x + offset * 0.3, target.y)} strokeWidth={4} color={snapshot.ship.weapon === 'rainbow-beam' ? '#FF7AF3' : '#F1FFFF'} />
        </React.Fragment>
      ))}
    </>
  );
};

export const GameCanvas = ({ snapshot }: Props) => {
  const { width, height } = useWindowDimensions();
  const projected = useMemo(
    () => snapshot.entities.map((entity) => project(entity, width, height)).sort((left, right) => right.entity.z - left.entity.z),
    [height, snapshot.entities, width],
  );
  const shakeX = Math.sin(snapshot.elapsedSeconds * 71) * snapshot.screenShake * 6;
  const shakeY = Math.cos(snapshot.elapsedSeconds * 83) * snapshot.screenShake * 4;

  return (
    <Canvas style={styles.canvas}>
      <Backdrop width={width} height={height} time={snapshot.elapsedSeconds} shipX={snapshot.ship.x} />
      <Group transform={[{ translateX: shakeX }, { translateY: shakeY }]}>
        {projected.map((item) => {
          switch (item.entity.kind) {
            case 'enemy': return <Enemy key={item.entity.id} item={item} snapshot={snapshot} />;
            case 'hazard':
            case 'enemyProjectile': return <Hazard key={item.entity.id} item={item} time={snapshot.elapsedSeconds} />;
            case 'star': return <Collectible key={item.entity.id} item={item} time={snapshot.elapsedSeconds} />;
            case 'powerUp': return <PowerUp key={item.entity.id} item={item} time={snapshot.elapsedSeconds} />;
            case 'projectile': return <Projectile key={item.entity.id} item={item} />;
            case 'explosion': return <Explosion key={item.entity.id} item={item} time={snapshot.elapsedSeconds} />;
            case 'debris': return <Circle key={item.entity.id} cx={item.x} cy={item.y} r={Math.max(2, item.scale * 12)} color={item.entity.color} />;
            case 'gate': return <Gate key={item.entity.id} item={item} locked={snapshot.lockTargetId === item.entity.id} />;
            case 'ally': return <Ally key={item.entity.id} item={item} time={snapshot.elapsedSeconds} />;
            default: return null;
          }
        })}
        <LaserBurst snapshot={snapshot} width={width} height={height} />
        <PlayerShip snapshot={snapshot} width={width} height={height} />
      </Group>
      <Rect x={0} y={0} width={width} height={height} color="#02031308" />
    </Canvas>
  );
};

const styles = StyleSheet.create({ canvas: { flex: 1 } });
