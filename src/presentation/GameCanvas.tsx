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
const answerFont = matchFont({ fontFamily: family, fontSize: 76, fontWeight: 'bold' });
const LASER_DURATION_SECONDS = 0.16;
const CAMERA_SCALE = 0.78;

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

const jagged = (radius: number, seed: number) => {
  const path = Skia.Path.Make();
  for (let i = 0; i < 18; i += 1) {
    const angle = (i / 18) * Math.PI * 2;
    const pointRadius = radius + Math.sin(i * 3.7 + seed) * 7;
    if (i === 0) path.moveTo(Math.cos(angle) * pointRadius, Math.sin(angle) * pointRadius);
    else path.lineTo(Math.cos(angle) * pointRadius, Math.sin(angle) * pointRadius);
  }
  path.close();
  return path;
};

const mineBody = jagged(56, 7.2);
const starPath = star(42, 18);
const STARS = Array.from({ length: 150 }, (_, i) => ({
  x: ((i * 73) % 997) / 997,
  y: ((i * 191) % 991) / 991,
  r: 0.7 + ((i * 31) % 12) / 8,
  p: ((i * 29) % 100) / 100,
}));
const ROCKS = Array.from({ length: 34 }, (_, i) => ({
  x: ((i * 101) % 941) / 941,
  y: 0.12 + (((i * 71) % 811) / 811) * 0.7,
  r: 3 + ((i * 17) % 10),
  p: ((i * 37) % 100) / 100,
}));

const project = (entity: WorldEntity, width: number, height: number): Projected => {
  const depth = Math.max(0, Math.min(1.2, 1 - entity.z));
  const spread = 0.13 + depth * 1.02;
  return {
    entity,
    x: width / 2 + entity.x * width * 0.48 * spread,
    y: height * 0.23 + entity.y * height * 0.34 * spread + depth * height * 0.17,
    scale: (0.2 + depth * depth * 1.34) * CAMERA_SCALE,
  };
};

type LoadedImage = ReturnType<typeof useImage>;

const Asteroid = ({
  item,
  locked,
  correct,
  progress,
  time,
  image,
}: {
  readonly item: Projected;
  readonly locked: boolean;
  readonly correct: boolean;
  readonly progress: number;
  readonly time: number;
  readonly image: LoadedImage;
}) => {
  const { entity, x, y, scale } = item;
  const label = entity.label ?? '';
  const offset = label.length > 1 ? -44 : -23;
  const pulse = 1 + Math.sin(time * 3 + x) * 0.018;

  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scale: scale * pulse }, { rotate: Math.sin(time * 0.4 + y) * 0.055 }]}>
      <Circle cx={0} cy={3} r={104} color={`${entity.color}26`} />
      {image ? <SkiaImage image={image} x={-112} y={-112} width={224} height={224} fit="contain" /> : null}
      <Circle cx={0} cy={0} r={88} color={`${entity.color}58`} />
      <Circle cx={0} cy={0} r={91} color={`${entity.color}AA`} style="stroke" strokeWidth={4} />
      <Text x={offset + 5} y={31} text={label} font={answerFont} color="#050616B8" />
      <Text x={offset} y={25} text={label} font={answerFont} color="#FFFFFF" />
      {locked ? (
        <>
          <Circle cx={0} cy={0} r={103} color={correct ? '#9CFF3A20' : '#FF405B20'} />
          <Circle cx={0} cy={0} r={100 + progress * 9} style="stroke" strokeWidth={6 + progress * 4} color={correct ? '#B9FF4A' : '#FF5471'} />
          <Path path="M -119 -78 L -119 -119 L -78 -119 M 119 -78 L 119 -119 L 78 -119 M -119 78 L -119 119 L -78 119 M 119 78 L 119 119 L 78 119" style="stroke" strokeWidth={6} color="#F0FF9A" />
        </>
      ) : null}
    </Group>
  );
};

const Mine = ({ item, time }: { readonly item: Projected; readonly time: number }) => {
  const { x, y, scale } = item;
  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scale: scale * 0.8 }, { rotate: time * 0.22 }]}>
      <Circle cx={0} cy={0} r={88} color="#FF2B1A1A" />
      {Array.from({ length: 12 }, (_, i) => (
        <Path key={i} path="M 0 -99 L 15 -54 L -15 -54 Z" color={i % 2 === 0 ? '#FF6A28' : '#A91824'} transform={[{ rotate: (i * Math.PI) / 6 }]} />
      ))}
      <Path path={mineBody} color="#25263F"><RadialGradient c={vec(-18, -22)} r={90} colors={['#85899C', '#292A43', '#050610']} /></Path>
      {Array.from({ length: 6 }, (_, i) => <Circle key={i} cx={Math.cos((i / 6) * Math.PI * 2) * 35} cy={Math.sin((i / 6) * Math.PI * 2) * 35} r={8} color="#FF3B23" />)}
      <Circle cx={0} cy={0} r={24} color="#FF3B23" />
      <Circle cx={0} cy={0} r={12} color="#FFD45B" />
      <Circle cx={-5} cy={-7} r={5} color="#FFFFFFCC" />
    </Group>
  );
};

const Ship = ({ snapshot, width, height, time, image }: { readonly snapshot: GameSnapshot; readonly width: number; readonly height: number; readonly time: number; readonly image: LoadedImage }) => {
  const x = width / 2 + snapshot.ship.x * width * 0.29;
  const y = height * (0.82 + snapshot.ship.y * 0.055) + Math.sin(time * 4.2) * 2.5;
  const scale = Math.min(width / 1536, height / 864) * 0.82 * (snapshot.ship.magnetSeconds > 0 ? 1.06 : 1);
  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scale }, { rotate: Math.max(-0.11, Math.min(0.11, snapshot.ship.x * 0.11)) }]}>
      <Circle cx={0} cy={5} r={185} color="#139BFF14" />
      {image ? <SkiaImage image={image} x={-325} y={-210} width={650} height={420} fit="contain" /> : null}
      {snapshot.ship.shieldSeconds > 0 ? (
        <>
          <Circle cx={0} cy={-10} r={184} color="#2CCAFF16" />
          <Circle cx={0} cy={-10} r={180} color="#7BE9FF" style="stroke" strokeWidth={9} />
          <Circle cx={-54} cy={-72} r={30} color="#FFFFFF20" />
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
  const tailProgress = clamp01(progress - 0.26);
  const muzzles = [-118, 118];

  return (
    <>
      {muzzles.map((offset, index) => {
        const startX = shipX + offset * shipScale;
        const startY = shipY - 82 * shipScale;
        const tailX = lerp(startX, target.x, tailProgress);
        const tailY = lerp(startY, target.y, tailProgress);
        const headX = lerp(startX, target.x, progress);
        const headY = lerp(startY, target.y, progress);
        return (
          <React.Fragment key={offset}>
            <Circle cx={startX} cy={startY} r={18 * shipScale} color="#45E9FF44" />
            <Circle cx={startX} cy={startY} r={7 * shipScale} color="#FFFFFF" />
            <Line p1={vec(tailX, tailY)} p2={vec(headX, headY)} color="#30D9FF33" strokeWidth={24} />
            <Line p1={vec(tailX, tailY)} p2={vec(headX, headY)} color={index === 0 ? '#37E8FF' : '#8C7BFF'} strokeWidth={10} />
            <Line p1={vec(tailX, tailY)} p2={vec(headX, headY)} color="#FFFFFF" strokeWidth={3} />
            <Circle cx={headX} cy={headY} r={15} color="#55EEFF55" />
            <Circle cx={headX} cy={headY} r={5} color="#FFFFFF" />
          </React.Fragment>
        );
      })}
      <Circle cx={target.x} cy={target.y} r={26 + progress * 30} color="#8EFAFF33" />
      <Circle cx={target.x} cy={target.y} r={18 + progress * 18} color="#FFFFFF22" style="stroke" strokeWidth={5} />
    </>
  );
};

export const GameCanvas = ({ snapshot }: Props) => {
  const { width, height } = useWindowDimensions();
  const time = snapshot.elapsedSeconds;
  const background = useImage(require('../../assets/generated/concept-space-bg.webp'));
  const ship = useImage(require('../../assets/generated/ship-concept.webp'));
  const asteroid = useImage(require('../../assets/generated/asteroid-neutral.webp'));
  const entities = useMemo(
    () => snapshot.entities.map((entity) => project(entity, width, height)).sort((a, b) => b.entity.z - a.entity.z),
    [snapshot.entities, width, height],
  );
  const target = snapshot.laser
    ? project({ id: 'laser', kind: 'answer', x: snapshot.laser.x, y: snapshot.laser.y, z: snapshot.laser.z, radius: 0.1, color: '#B9FF4A' }, width, height)
    : null;
  const shipScale = Math.min(width / 1536, height / 864) * 0.82;
  const shipX = width / 2 + snapshot.ship.x * width * 0.29;
  const shipY = height * (0.82 + snapshot.ship.y * 0.055);
  const parallaxX = snapshot.ship.x * width * 0.022;
  const leftRock = `M 0 0 L 82 0 L 42 ${height * 0.15} L 104 ${height * 0.28} L 48 ${height * 0.42} L 110 ${height * 0.57} L 55 ${height * 0.73} L 100 ${height * 0.86} L 38 ${height} L 0 ${height} Z`;
  const rightRock = `M ${width} 0 L ${width - 82} 0 L ${width - 42} ${height * 0.15} L ${width - 104} ${height * 0.28} L ${width - 48} ${height * 0.42} L ${width - 110} ${height * 0.57} L ${width - 55} ${height * 0.73} L ${width - 100} ${height * 0.86} L ${width - 38} ${height} L ${width} ${height} Z`;

  return (
    <Canvas style={styles.canvas}>
      <Fill><LinearGradient start={vec(0, 0)} end={vec(width, height)} colors={['#020316', '#06104D', '#19003C', '#02020E']} /></Fill>
      {background ? <SkiaImage image={background} x={-width * 0.04 + parallaxX} y={-height * 0.04} width={width * 1.08} height={height * 1.08} fit="cover" opacity={0.95} /> : null}
      <Rect x={0} y={0} width={width} height={height} color="#0204193D" />
      <Circle cx={width * 0.1} cy={height * 0.28} r={height * 0.065} color="#D57351"><RadialGradient c={vec(width * 0.08, height * 0.25)} r={height * 0.1} colors={['#FFE2A3', '#D57351', '#59283E']} /></Circle>
      <Path path={`M ${width * 0.82} ${height * 0.22} Q ${width * 0.9} ${height * 0.31} ${width * 0.98} ${height * 0.2}`} style="stroke" strokeWidth={9} color="#D993FF88" />
      <Circle cx={width * 0.9} cy={height * 0.22} r={height * 0.068} color="#A255D3"><RadialGradient c={vec(width * 0.87, height * 0.19)} r={height * 0.11} colors={['#FFD9A8', '#A255D3', '#35175A']} /></Circle>
      <Path path={`M ${-width * 0.1} ${height * 0.78} C ${width * 0.14} ${height * 0.28}, ${width * 0.34} ${height * 0.91}, ${width * 0.54} ${height * 0.6} S ${width * 0.86} ${height * 0.28}, ${width * 1.1} ${height * 0.55}`} style="stroke" strokeWidth={height * 0.075} color="#9B2CFF2B" />
      {STARS.map((starPoint, index) => (
        <Circle key={index} cx={starPoint.x * width - parallaxX * starPoint.p} cy={starPoint.y * height} r={starPoint.r * (0.9 + Math.sin(time * 2.2 + starPoint.p * 8) * 0.18)} color="#E8F8FF" opacity={0.35 + Math.sin(time * 2.2 + starPoint.p * 8) * 0.22} />
      ))}
      {ROCKS.map((rock, index) => (
        <Circle key={index} cx={rock.x * width - parallaxX * (0.4 + rock.p)} cy={((rock.y + time * (0.015 + rock.p * 0.02)) % 0.82) * height} r={rock.r} color="#65545C">
          <RadialGradient c={vec(rock.x * width - rock.r * 0.3, rock.y * height - rock.r * 0.3)} r={rock.r * 1.7} colors={['#B9A394', '#584A52', '#201B2C']} />
        </Circle>
      ))}
      <Path path={`M ${width * 0.05} ${height * 0.4} L ${width * 0.13} ${height * 0.5} L ${width * 0.1} ${height * 0.56} L ${width * 0.19} ${height * 0.69}`} style="stroke" strokeWidth={6} color="#44DFFF44" />
      <Path path={`M ${width * 0.95} ${height * 0.4} L ${width * 0.87} ${height * 0.49} L ${width * 0.9} ${height * 0.55} L ${width * 0.81} ${height * 0.68}`} style="stroke" strokeWidth={6} color="#44DFFF44" />
      {entities.map((item) => item.entity.kind === 'answer'
        ? <Asteroid key={item.entity.id} item={item} locked={snapshot.lockTargetId === item.entity.id} correct={snapshot.lockIsCorrect} progress={snapshot.lockProgress} time={time} image={asteroid} />
        : item.entity.kind === 'hazard'
          ? <Mine key={item.entity.id} item={item} time={time} />
          : (
            <Group key={item.entity.id} transform={[{ translateX: item.x }, { translateY: item.y }, { scale: item.scale * (0.86 + Math.sin(time * 5) * 0.08) }]}>
              <Circle cx={0} cy={0} r={62} color="#FFD83B25" />
              <Path path={starPath} color="#FFD43B" />
              <Path path={starPath} color="#FFF4A8" style="stroke" strokeWidth={5} />
            </Group>
          ))}
      {target && snapshot.laser ? (
        <LaserBolts target={target} shipX={shipX} shipY={shipY} shipScale={shipScale} seconds={snapshot.laser.seconds} />
      ) : null}
      <Ship snapshot={snapshot} width={width} height={height} time={time} image={ship} />
      <Path path={leftRock} color="#241C2A"><LinearGradient start={vec(0, 0)} end={vec(width * 0.1, height)} colors={['#090910', '#302129', '#4B2B29', '#120D16']} /></Path>
      <Path path={rightRock} color="#241C2A"><LinearGradient start={vec(width, 0)} end={vec(width * 0.9, height)} colors={['#090910', '#302129', '#4B2B29', '#120D16']} /></Path>
      <Rect x={0} y={0} width={width} height={height} color="#02031308" />
    </Canvas>
  );
};

const styles = StyleSheet.create({ canvas: { ...StyleSheet.absoluteFillObject } });
