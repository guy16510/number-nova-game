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
  const spread = 0.16 + depth * 0.92;
  return {
    entity,
    x: width / 2 + entity.x * width * 0.46 * spread,
    y: height * 0.29 + entity.y * height * 0.37 * spread + depth * height * 0.18,
    scale: 0.24 + depth * depth * 1.66,
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
    <Group transform={[{ translateX: x }, { translateY: y }, { scale: scale * 0.9 }, { rotate: time * 0.22 }]}>
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
  const x = width / 2 + snapshot.ship.x * width * 0.32;
  const y = height * (0.79 + snapshot.ship.y * 0.07) + Math.sin(time * 4.2) * 3;
  const scale = Math.min(width / 1536, height / 864) * (snapshot.ship.magnetSeconds > 0 ? 1.08 : 1);
  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scale }, { rotate: Math.max(-0.12, Math.min(0.12, snapshot.ship.x * 0.12)) }]}>
      <Circle cx={0} cy={5} r={220} color="#139BFF14" />
      {image ? <SkiaImage image={image} x={-375} y={-242} width={750} height={484} fit="contain" /> : null}
      {snapshot.ship.shieldSeconds > 0 ? (
        <>
          <Circle cx={0} cy={-12} r={220} color="#2CCAFF16" />
          <Circle cx={0} cy={-12} r={215} color="#7BE9FF" style="stroke" strokeWidth={10} />
          <Circle cx={-65} cy={-85} r={35} color="#FFFFFF20" />
        </>
      ) : null}
    </Group>
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
  const shipX = width / 2 + snapshot.ship.x * width * 0.32;
  const shipY = height * (0.79 + snapshot.ship.y * 0.07);
  const parallaxX = snapshot.ship.x * width * 0.025;
  const leftRock = `M 0 0 L 105 0 L 54 ${height * 0.15} L 132 ${height * 0.28} L 62 ${height * 0.42} L 145 ${height * 0.57} L 72 ${height * 0.73} L 130 ${height * 0.86} L 48 ${height} L 0 ${height} Z`;
  const rightRock = `M ${width} 0 L ${width - 105} 0 L ${width - 54} ${height * 0.15} L ${width - 132} ${height * 0.28} L ${width - 62} ${height * 0.42} L ${width - 145} ${height * 0.57} L ${width - 72} ${height * 0.73} L ${width - 130} ${height * 0.86} L ${width - 48} ${height} L ${width} ${height} Z`;

  return (
    <Canvas style={styles.canvas}>
      <Fill><LinearGradient start={vec(0, 0)} end={vec(width, height)} colors={['#020316', '#06104D', '#19003C', '#02020E']} /></Fill>
      {background ? <SkiaImage image={background} x={-width * 0.05 + parallaxX} y={-height * 0.05} width={width * 1.1} height={height * 1.1} fit="cover" opacity={0.95} /> : null}
      <Rect x={0} y={0} width={width} height={height} color="#02041945" />
      <Circle cx={width * 0.1} cy={height * 0.28} r={height * 0.073} color="#D57351"><RadialGradient c={vec(width * 0.08, height * 0.25)} r={height * 0.11} colors={['#FFE2A3', '#D57351', '#59283E']} /></Circle>
      <Path path={`M ${width * 0.82} ${height * 0.22} Q ${width * 0.9} ${height * 0.31} ${width * 0.98} ${height * 0.2}`} style="stroke" strokeWidth={10} color="#D993FF88" />
      <Circle cx={width * 0.9} cy={height * 0.22} r={height * 0.077} color="#A255D3"><RadialGradient c={vec(width * 0.87, height * 0.19)} r={height * 0.12} colors={['#FFD9A8', '#A255D3', '#35175A']} /></Circle>
      <Path path={`M ${-width * 0.1} ${height * 0.78} C ${width * 0.14} ${height * 0.28}, ${width * 0.34} ${height * 0.91}, ${width * 0.54} ${height * 0.6} S ${width * 0.86} ${height * 0.28}, ${width * 1.1} ${height * 0.55}`} style="stroke" strokeWidth={height * 0.09} color="#9B2CFF32" />
      {STARS.map((starPoint, index) => (
        <Circle key={index} cx={starPoint.x * width - parallaxX * starPoint.p} cy={starPoint.y * height} r={starPoint.r * (0.9 + Math.sin(time * 2.2 + starPoint.p * 8) * 0.18)} color="#E8F8FF" opacity={0.35 + Math.sin(time * 2.2 + starPoint.p * 8) * 0.22} />
      ))}
      {ROCKS.map((rock, index) => (
        <Circle key={index} cx={rock.x * width - parallaxX * (0.4 + rock.p)} cy={((rock.y + time * (0.015 + rock.p * 0.02)) % 0.82) * height} r={rock.r} color="#65545C">
          <RadialGradient c={vec(rock.x * width - rock.r * 0.3, rock.y * height - rock.r * 0.3)} r={rock.r * 1.7} colors={['#B9A394', '#584A52', '#201B2C']} />
        </Circle>
      ))}
      <Path path={`M ${width * 0.06} ${height * 0.4} L ${width * 0.15} ${height * 0.5} L ${width * 0.11} ${height * 0.56} L ${width * 0.22} ${height * 0.69}`} style="stroke" strokeWidth={7} color="#44DFFF55" />
      <Path path={`M ${width * 0.94} ${height * 0.4} L ${width * 0.86} ${height * 0.49} L ${width * 0.9} ${height * 0.55} L ${width * 0.79} ${height * 0.68}`} style="stroke" strokeWidth={7} color="#44DFFF55" />
      {entities.map((item) => item.entity.kind === 'answer'
        ? <Asteroid key={item.entity.id} item={item} locked={snapshot.lockTargetId === item.entity.id} correct={snapshot.lockIsCorrect} progress={snapshot.lockProgress} time={time} image={asteroid} />
        : item.entity.kind === 'hazard'
          ? <Mine key={item.entity.id} item={item} time={time} />
          : (
            <Group key={item.entity.id} transform={[{ translateX: item.x }, { translateY: item.y }, { scale: item.scale * (0.9 + Math.sin(time * 5) * 0.1) }]}>
              <Circle cx={0} cy={0} r={62} color="#FFD83B25" />
              <Path path={starPath} color="#FFD43B" />
              <Path path={starPath} color="#FFF4A8" style="stroke" strokeWidth={5} />
            </Group>
          ))}
      {target ? (
        <>
          <Line p1={vec(shipX, shipY - 112)} p2={vec(target.x, target.y)} color="#B9FF4A22" strokeWidth={28} />
          <Line p1={vec(shipX, shipY - 112)} p2={vec(target.x, target.y)} color="#B9FF4A" strokeWidth={11} />
          <Line p1={vec(shipX, shipY - 112)} p2={vec(target.x, target.y)} color="#FFFFFF" strokeWidth={3} />
          <Circle cx={target.x} cy={target.y} r={23} color="#D8FF4A66" />
        </>
      ) : null}
      <Ship snapshot={snapshot} width={width} height={height} time={time} image={ship} />
      <Path path={leftRock} color="#241C2A"><LinearGradient start={vec(0, 0)} end={vec(width * 0.13, height)} colors={['#090910', '#302129', '#4B2B29', '#120D16']} /></Path>
      <Path path={rightRock} color="#241C2A"><LinearGradient start={vec(width, 0)} end={vec(width * 0.87, height)} colors={['#090910', '#302129', '#4B2B29', '#120D16']} /></Path>
      <Rect x={0} y={0} width={width} height={height} color="#02031308" />
    </Canvas>
  );
};

const styles = StyleSheet.create({ canvas: { ...StyleSheet.absoluteFillObject } });
