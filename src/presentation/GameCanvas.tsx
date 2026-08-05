import React, { useMemo } from 'react';
import { Platform, StyleSheet, useWindowDimensions } from 'react-native';
import {
  Canvas,
  Circle,
  Fill,
  Group,
  Image as SkiaImage,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Skia,
  Text,
  matchFont,
  useImage,
  vec,
} from '@shopify/react-native-skia';
import type { GameSnapshot, WorldEntity } from '../domain/types';

interface Props { readonly snapshot: GameSnapshot }
interface Projected { readonly entity: WorldEntity; readonly x: number; readonly y: number; readonly scale: number }

const family = Platform.select({ ios: 'Avenir Next', default: 'sans-serif' });
const answerFont = matchFont({ fontFamily: family, fontSize: 62, fontWeight: 'bold' });
const LASER_DURATION_SECONDS = 0.28;
const CAMERA_SCALE = 0.68;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const lerp = (start: number, end: number, progress: number): number => start + (end - start) * progress;

const star = (outer: number, inner: number) => {
  const path = Skia.Path.Make();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) path.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    else path.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  path.close();
  return path;
};

const jagged = (radius: number, seed: number, points = 15) => {
  const path = Skia.Path.Make();
  for (let i = 0; i < points; i += 1) {
    const angle = (i / points) * Math.PI * 2;
    const pointRadius = radius + Math.sin(i * 3.7 + seed) * 7;
    if (i === 0) path.moveTo(Math.cos(angle) * pointRadius, Math.sin(angle) * pointRadius);
    else path.lineTo(Math.cos(angle) * pointRadius, Math.sin(angle) * pointRadius);
  }
  path.close();
  return path;
};

const enemyHullPath = Skia.Path.MakeFromSVGString('M -86 20 L -42 -15 L -24 -64 L 0 -84 L 24 -64 L 42 -15 L 86 20 L 54 42 L 24 31 L 0 56 L -24 31 L -54 42 Z')!;
const enemyWingPath = Skia.Path.MakeFromSVGString('M -96 8 L -42 -28 L -34 10 L -74 39 Z M 96 8 L 42 -28 L 34 10 L 74 39 Z')!;
const enemyCanopyPath = Skia.Path.MakeFromSVGString('M -22 -38 Q 0 -65 22 -38 L 15 -5 L -15 -5 Z')!;
const asteroidPathA = jagged(66, 2.4);
const asteroidPathB = jagged(62, 8.9);
const mineBody = jagged(51, 7.2, 12);
const collectibleStarPath = star(38, 16);
const impactStarPath = star(54, 12);

const STAR_FIELD = Array.from({ length: 54 }, (_, i) => ({
  x: ((i * 73) % 997) / 997,
  y: ((i * 191) % 991) / 991,
  r: 0.8 + ((i * 31) % 9) / 7,
  opacity: 0.35 + ((i * 19) % 50) / 100,
}));

const SPEED_LINES = Array.from({ length: 16 }, (_, i) => ({
  x: ((i * 83) % 941) / 941,
  y: ((i * 157) % 887) / 887,
  length: 14 + ((i * 23) % 36),
  speed: 0.19 + ((i * 13) % 20) / 100,
}));

const project = (entity: WorldEntity, width: number, height: number): Projected => {
  const depth = Math.max(0, Math.min(1.2, 1 - entity.z));
  const spread = 0.1 + depth * 1.04;
  return {
    entity,
    x: width / 2 + entity.x * width * 0.49 * spread,
    y: height * 0.2 + entity.y * height * 0.33 * spread + depth * height * 0.16,
    scale: (0.18 + depth * depth * 1.28) * CAMERA_SCALE,
  };
};

type LoadedImage = ReturnType<typeof useImage>;

const StaticSpaceBackdropView = ({ width, height }: { readonly width: number; readonly height: number }) => {
  const background = useImage(require('../../assets/generated/concept-space-bg.webp'));
  return (
    <>
      <Fill>
        <LinearGradient start={vec(0, 0)} end={vec(width, height)} colors={['#01020F', '#06104D', '#1A063F', '#02020E']} />
      </Fill>
      {background ? (
        <SkiaImage image={background} x={-width * 0.03} y={-height * 0.03} width={width * 1.06} height={height * 1.06} fit="cover" opacity={0.78} />
      ) : null}
      <Rect x={0} y={0} width={width} height={height} color="#02041945" />
      <Circle cx={width * 0.1} cy={height * 0.28} r={height * 0.055} color="#D57351">
        <RadialGradient c={vec(width * 0.08, height * 0.25)} r={height * 0.1} colors={['#FFE2A3', '#D57351', '#59283E']} />
      </Circle>
      <Circle cx={width * 0.91} cy={height * 0.2} r={height * 0.06} color="#A255D3">
        <RadialGradient c={vec(width * 0.88, height * 0.17)} r={height * 0.11} colors={['#FFD9A8', '#A255D3', '#35175A']} />
      </Circle>
      {STAR_FIELD.map((point, index) => (
        <Circle
          key={index}
          cx={point.x * width}
          cy={point.y * height}
          r={point.r}
          color="#E8F8FF"
          opacity={point.opacity}
        />
      ))}
      <Path
        path={`M ${-width * 0.08} ${height * 0.78} C ${width * 0.15} ${height * 0.32}, ${width * 0.35} ${height * 0.88}, ${width * 0.55} ${height * 0.59} S ${width * 0.86} ${height * 0.3}, ${width * 1.08} ${height * 0.54}`}
        style="stroke"
        strokeWidth={height * 0.06}
        color="#9B2CFF20"
      />
    </>
  );
};

const StaticSpaceBackdrop = React.memo(StaticSpaceBackdropView);

const SpeedTunnel = ({ width, height, time, shipX }: { readonly width: number; readonly height: number; readonly time: number; readonly shipX: number }) => (
  <>
    {SPEED_LINES.map((line, index) => {
      const travel = (line.y + time * line.speed) % 1;
      const centerPull = (line.x - 0.5) * travel * width * 0.18;
      const x = line.x * width + centerPull - shipX * width * 0.018;
      const y = travel * height;
      const length = line.length * (0.4 + travel);
      return (
        <Line
          key={index}
          p1={vec(x, y)}
          p2={vec(x + (line.x - 0.5) * length * 0.4, y + length)}
          color="#9CEBFF"
          strokeWidth={0.8 + travel * 1.6}
          opacity={0.14 + travel * 0.35}
        />
      );
    })}
  </>
);

const EnemyTarget = ({
  item,
  locked,
  correct,
  progress,
  time,
  boss,
}: {
  readonly item: Projected;
  readonly locked: boolean;
  readonly correct: boolean;
  readonly progress: number;
  readonly time: number;
  readonly boss: boolean;
}) => {
  const { entity, x, y } = item;
  const scale = item.scale * (boss ? 1.18 : 1);
  const label = entity.label ?? '';
  const offset = label.length > 1 ? -35 : -18;
  const bank = Math.sin(time * 1.7 + x * 0.01) * 0.12;
  const pulse = 1 + Math.sin(time * 4 + y) * 0.025;

  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scale: scale * pulse }, { rotate: bank }]}>
      <Circle cx={0} cy={0} r={112} color={`${entity.color}20`} />
      <Path path={enemyWingPath} color="#151C45">
        <LinearGradient start={vec(-90, -20)} end={vec(90, 45)} colors={[entity.color, '#18234E', '#080B22']} />
      </Path>
      <Path path={enemyHullPath} color="#25386D">
        <LinearGradient start={vec(0, -86)} end={vec(0, 58)} colors={['#EAF7FF', entity.color, '#151A43']} />
      </Path>
      <Path path={enemyCanopyPath} color="#101A38">
        <LinearGradient start={vec(0, -60)} end={vec(0, -4)} colors={['#A9F5FF', '#1E5B9C', '#081029']} />
      </Path>
      <Circle cx={-49} cy={26} r={11} color="#FF6B36" />
      <Circle cx={49} cy={26} r={11} color="#FF6B36" />
      <Circle cx={-49} cy={27} r={5} color="#FFF18A" />
      <Circle cx={49} cy={27} r={5} color="#FFF18A" />
      <Circle cx={0} cy={14} r={31} color="#08112D" />
      <Circle cx={0} cy={14} r={28} color={`${entity.color}E8`} />
      <Text x={offset + 3} y={35} text={label} font={answerFont} color="#030617B0" />
      <Text x={offset} y={31} text={label} font={answerFont} color="#FFFFFF" />
      {locked ? (
        <>
          <Circle cx={0} cy={0} r={106 + progress * 8} color={correct ? '#A8FF4A1D' : '#FF405B1D'} />
          <Circle cx={0} cy={0} r={101 + progress * 7} style="stroke" strokeWidth={5 + progress * 4} color={correct ? '#EFFF6A' : '#FF5B72'} />
          <Path path="M -120 -72 L -120 -112 L -80 -112 M 120 -72 L 120 -112 L 80 -112 M -120 72 L -120 112 L -80 112 M 120 72 L 120 112 L 80 112" style="stroke" strokeWidth={5} color="#F5FFFF" />
        </>
      ) : null}
    </Group>
  );
};

const Hazard = ({ item, time, image }: { readonly item: Projected; readonly time: number; readonly image: LoadedImage }) => {
  const { entity, x, y, scale } = item;
  const entityNumber = Number(entity.id.split('-').at(-1)) || 0;
  const mine = entityNumber % 3 === 0;

  if (mine) {
    return (
      <Group transform={[{ translateX: x }, { translateY: y }, { scale: scale * 0.75 }, { rotate: time * 0.55 + entityNumber }]}>
        <Circle cx={0} cy={0} r={76} color="#FF2B1A18" />
        <Path path={mineBody} color="#262A45">
          <RadialGradient c={vec(-18, -22)} r={82} colors={['#8D94B0', '#292D4C', '#050610']} />
        </Path>
        {[0, 1, 2, 3].map((index) => (
          <Path key={index} path="M 0 -82 L 12 -48 L -12 -48 Z" color="#FF5B2E" transform={[{ rotate: (index * Math.PI) / 2 }]} />
        ))}
        <Circle cx={0} cy={0} r={22} color="#FF3B23" />
        <Circle cx={0} cy={0} r={10} color="#FFD45B" />
      </Group>
    );
  }

  const path = entityNumber % 2 === 0 ? asteroidPathA : asteroidPathB;
  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scale: scale * 0.78 }, { rotate: time * 0.22 + entityNumber }]}>
      <Circle cx={0} cy={0} r={82} color="#FFAA6630" />
      {image ? <SkiaImage image={image} x={-78} y={-78} width={156} height={156} fit="contain" /> : (
        <Path path={path} color="#67515B">
          <RadialGradient c={vec(-20, -24)} r={94} colors={['#D9B58B', '#755561', '#211C2C']} />
        </Path>
      )}
      <Path path={path} color="#E4C29B77" style="stroke" strokeWidth={4} />
      <Circle cx={-22} cy={-18} r={13} color="#20192766" />
      <Circle cx={24} cy={15} r={10} color="#20192766" />
    </Group>
  );
};

const Collectible = ({ item, time }: { readonly item: Projected; readonly time: number }) => (
  <Group transform={[{ translateX: item.x }, { translateY: item.y }, { scale: item.scale * (0.86 + Math.sin(time * 5) * 0.08) }, { rotate: time * 0.45 }]}>
    <Circle cx={0} cy={0} r={58} color="#FFD83B25" />
    <Path path={collectibleStarPath} color="#FFD43B" />
    <Path path={collectibleStarPath} color="#FFF4A8" style="stroke" strokeWidth={5} />
  </Group>
);

const Ship = ({ snapshot, width, height, time, image }: { readonly snapshot: GameSnapshot; readonly width: number; readonly height: number; readonly time: number; readonly image: LoadedImage }) => {
  const x = width / 2 + snapshot.ship.x * width * 0.31;
  const y = height * (0.84 + snapshot.ship.y * 0.045) + Math.sin(time * 4.2) * 2;
  const scale = Math.min(width / 1536, height / 864) * 0.72 * (snapshot.ship.magnetSeconds > 0 ? 1.05 : 1);
  const bank = Math.max(-0.18, Math.min(0.18, snapshot.ship.x * 0.16));
  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scale }, { rotate: bank }]}>
      <Circle cx={0} cy={12} r={170} color="#139BFF12" />
      <Circle cx={-84} cy={112} r={26 + Math.sin(time * 18) * 5} color="#28CFFF4D" />
      <Circle cx={84} cy={112} r={26 + Math.cos(time * 17) * 5} color="#28CFFF4D" />
      {image ? <SkiaImage image={image} x={-305} y={-197} width={610} height={394} fit="contain" /> : null}
      {snapshot.ship.shieldSeconds > 0 ? (
        <>
          <Circle cx={0} cy={-8} r={174} color="#2CCAFF14" />
          <Circle cx={0} cy={-8} r={169} color="#7BE9FF" style="stroke" strokeWidth={8} />
        </>
      ) : null}
    </Group>
  );
};

const LaserBolts = ({
  target,
  shipX,
  shipY,
  shipScale,
  seconds,
}: {
  readonly target: Projected;
  readonly shipX: number;
  readonly shipY: number;
  readonly shipScale: number;
  readonly seconds: number;
}) => {
  const progress = clamp01(1 - seconds / LASER_DURATION_SECONDS);
  const tailProgress = clamp01(progress - 0.34);
  const impact = clamp01((progress - 0.55) / 0.45);
  const muzzles = [-105, 105];

  return (
    <>
      {muzzles.map((offset, index) => {
        const startX = shipX + offset * shipScale;
        const startY = shipY - 74 * shipScale;
        const tailX = lerp(startX, target.x, tailProgress);
        const tailY = lerp(startY, target.y, tailProgress);
        const headX = lerp(startX, target.x, progress);
        const headY = lerp(startY, target.y, progress);
        return (
          <React.Fragment key={offset}>
            <Circle cx={startX} cy={startY} r={22 * shipScale} color="#45E9FF55" />
            <Circle cx={startX} cy={startY} r={8 * shipScale} color="#FFFFFF" />
            <Line p1={vec(tailX, tailY)} p2={vec(headX, headY)} color="#30D9FF2E" strokeWidth={32} />
            <Line p1={vec(tailX, tailY)} p2={vec(headX, headY)} color={index === 0 ? '#22E7FF' : '#9C65FF'} strokeWidth={14} />
            <Line p1={vec(tailX, tailY)} p2={vec(headX, headY)} color="#FFFFFF" strokeWidth={4} />
            <Circle cx={headX} cy={headY} r={19} color="#55EEFF66" />
            <Circle cx={headX} cy={headY} r={7} color="#FFFFFF" />
          </React.Fragment>
        );
      })}
      {impact > 0 ? (
        <Group transform={[{ translateX: target.x }, { translateY: target.y }, { scale: 0.45 + impact * 0.65 }, { rotate: progress * 2.2 }]}>
          <Circle cx={0} cy={0} r={70} color="#56EFFF30" />
          <Path path={impactStarPath} color="#FFF275" opacity={0.9 - impact * 0.35} />
          <Circle cx={0} cy={0} r={22} color="#FFFFFF" />
        </Group>
      ) : null}
    </>
  );
};

export const GameCanvas = ({ snapshot }: Props) => {
  const { width, height } = useWindowDimensions();
  const time = snapshot.elapsedSeconds;
  const shipImage = useImage(require('../../assets/generated/ship-concept.webp'));
  const asteroidImage = useImage(require('../../assets/generated/asteroid-neutral.webp'));
  const entities = useMemo(
    () => snapshot.entities
      .map((entity) => project(entity, width, height))
      .sort((a, b) => b.entity.z - a.entity.z),
    [snapshot.entities, width, height],
  );
  const target = snapshot.laser
    ? project({ id: 'laser', kind: 'answer', x: snapshot.laser.x, y: snapshot.laser.y, z: snapshot.laser.z, radius: 0.1, color: '#B9FF4A' }, width, height)
    : null;
  const shipScale = Math.min(width / 1536, height / 864) * 0.72;
  const shipX = width / 2 + snapshot.ship.x * width * 0.31;
  const shipY = height * (0.84 + snapshot.ship.y * 0.045);

  return (
    <Canvas style={styles.canvas}>
      <StaticSpaceBackdrop width={width} height={height} />
      <SpeedTunnel width={width} height={height} time={time} shipX={snapshot.ship.x} />
      {entities.map((item) => item.entity.kind === 'answer'
        ? (
          <EnemyTarget
            key={item.entity.id}
            item={item}
            locked={snapshot.lockTargetId === item.entity.id}
            correct={snapshot.lockIsCorrect}
            progress={snapshot.lockProgress}
            time={time}
            boss={snapshot.phase === 'boss'}
          />
        )
        : item.entity.kind === 'hazard'
          ? <Hazard key={item.entity.id} item={item} time={time} image={asteroidImage} />
          : <Collectible key={item.entity.id} item={item} time={time} />)}
      {target && snapshot.laser ? (
        <LaserBolts target={target} shipX={shipX} shipY={shipY} shipScale={shipScale} seconds={snapshot.laser.seconds} />
      ) : null}
      <Ship snapshot={snapshot} width={width} height={height} time={time} image={shipImage} />
      <Rect x={0} y={0} width={width} height={height} color="#02031308" />
    </Canvas>
  );
};

const styles = StyleSheet.create({ canvas: { ...StyleSheet.absoluteFillObject } });
