import React, { useMemo } from 'react';
import { Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { Canvas, Circle, Fill, Group, Line, LinearGradient, Path, RadialGradient, Rect, RoundedRect, Skia, Text, matchFont, vec } from '@shopify/react-native-skia';
import type { GameSnapshot, WorldEntity } from '../domain/types';

interface Props { readonly snapshot: GameSnapshot }
interface Projected { readonly entity: WorldEntity; readonly x: number; readonly y: number; readonly scale: number }

const family = Platform.select({ ios: 'Avenir Next', default: 'sans-serif' });
const answerFont = matchFont({ fontFamily: family, fontSize: 70, fontWeight: 'bold' });

const star = (outer: number, inner: number) => {
  const path = Skia.Path.Make();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) path.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else path.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  path.close();
  return path;
};

const jagged = (radius: number, seed: number) => {
  const path = Skia.Path.Make();
  for (let i = 0; i < 18; i += 1) {
    const a = (i / 18) * Math.PI * 2;
    const r = radius + Math.sin(i * 3.7 + seed) * 7;
    if (i === 0) path.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else path.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  path.close();
  return path;
};

const shipBody = () => {
  const path = Skia.Path.Make();
  path.moveTo(0, -90);
  path.cubicTo(60, -78, 98, -35, 100, 24);
  path.cubicTo(90, 62, 54, 82, 22, 68);
  path.lineTo(-22, 68);
  path.cubicTo(-54, 82, -90, 62, -100, 24);
  path.cubicTo(-98, -35, -60, -78, 0, -90);
  path.close();
  return path;
};

const asteroidA = jagged(70, 2.3);
const asteroidB = jagged(70, 5.8);
const mineBody = jagged(56, 7.2);
const starPath = star(42, 18);
const badgeStar = star(10, 4);
const bodyPath = shipBody();

const STARS = Array.from({ length: 118 }, (_, i) => ({ x: ((i * 73) % 997) / 997, y: ((i * 191) % 991) / 991, r: 0.7 + ((i * 31) % 12) / 8, p: ((i * 29) % 100) / 100 }));
const ROCKS = Array.from({ length: 28 }, (_, i) => ({ x: ((i * 101) % 941) / 941, y: 0.12 + (((i * 71) % 811) / 811) * 0.7, r: 3 + ((i * 17) % 10), p: ((i * 37) % 100) / 100 }));

const project = (entity: WorldEntity, width: number, height: number): Projected => {
  const depth = Math.max(0, Math.min(1.2, 1 - entity.z));
  const spread = 0.16 + depth * 0.92;
  return { entity, x: width / 2 + entity.x * width * 0.46 * spread, y: height * 0.29 + entity.y * height * 0.37 * spread + depth * height * 0.18, scale: 0.24 + depth * depth * 1.66 };
};

const Asteroid = ({ item, locked, correct, progress, time }: { readonly item: Projected; readonly locked: boolean; readonly correct: boolean; readonly progress: number; readonly time: number }) => {
  const { entity, x, y, scale } = item;
  const label = entity.label ?? '';
  const offset = label.length > 1 ? -42 : -22;
  const path = entity.id.charCodeAt(entity.id.length - 1) % 2 === 0 ? asteroidA : asteroidB;
  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scale: scale * (1 + Math.sin(time * 3 + x) * 0.018) }, { rotate: Math.sin(time * 0.4 + y) * 0.07 }]}>
      <Circle cx={0} cy={4} r={88} color={`${entity.color}24`} />
      <Circle cx={0} cy={4} r={77} color="#00000055" />
      <Path path={path} color={entity.color}><RadialGradient c={vec(-26, -30)} r={110} colors={['#FFFFFFEE', entity.color, '#15142B']} positions={[0, 0.28, 1]} /></Path>
      <Path path={path} color="#FFFFFF55" style="stroke" strokeWidth={3} />
      <Circle cx={-27} cy={-22} r={13} color="#10142B70" /><Circle cx={30} cy={11} r={17} color="#10142B78" /><Circle cx={-8} cy={34} r={10} color="#10142B66" />
      <Text x={offset + 4} y={28} text={label} font={answerFont} color="#05061699" /><Text x={offset} y={23} text={label} font={answerFont} color="#FFFFFF" />
      {locked ? <><Circle cx={0} cy={0} r={88} color={correct ? '#9CFF3A22' : '#FF405B22'} /><Circle cx={0} cy={0} r={84 + progress * 9} style="stroke" strokeWidth={6 + progress * 4} color={correct ? '#B9FF4A' : '#FF5471'} /><Path path="M -104 -70 L -104 -104 L -70 -104 M 104 -70 L 104 -104 L 70 -104 M -104 70 L -104 104 L -70 104 M 104 70 L 104 104 L 70 104" style="stroke" strokeWidth={6} color="#F0FF9A" /></> : null}
    </Group>
  );
};

const Mine = ({ item, time }: { readonly item: Projected; readonly time: number }) => {
  const { x, y, scale } = item;
  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scale: scale * 0.82 }, { rotate: time * 0.22 }]}>
      <Circle cx={0} cy={0} r={84} color="#FF2B1A18" />
      {Array.from({ length: 12 }, (_, i) => <Path key={i} path="M 0 -94 L 14 -51 L -14 -51 Z" color={i % 2 === 0 ? '#FF6A28' : '#A91824'} transform={[{ rotate: (i * Math.PI) / 6 }]} />)}
      <Path path={mineBody} color="#25263F"><RadialGradient c={vec(-18, -22)} r={90} colors={['#85899C', '#292A43', '#050610']} /></Path>
      {Array.from({ length: 6 }, (_, i) => <Circle key={i} cx={Math.cos((i / 6) * Math.PI * 2) * 35} cy={Math.sin((i / 6) * Math.PI * 2) * 35} r={8} color="#FF3B23" />)}
      <Circle cx={0} cy={0} r={24} color="#FF3B23" /><Circle cx={0} cy={0} r={12} color="#FFD45B" /><Circle cx={-5} cy={-7} r={5} color="#FFFFFFCC" />
    </Group>
  );
};

const Ship = ({ snapshot, width, height, time }: { readonly snapshot: GameSnapshot; readonly width: number; readonly height: number; readonly time: number }) => {
  const x = width / 2 + snapshot.ship.x * width * 0.32;
  const y = height * (0.8 + snapshot.ship.y * 0.075) + Math.sin(time * 4.2) * 3;
  const scale = Math.min(width / 1120, height / 650) * 1.28;
  const flame = snapshot.ship.magnetSeconds > 0 ? 132 : 88 + Math.sin(time * 9) * 10;
  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scale }, { rotate: Math.max(-0.14, Math.min(0.14, snapshot.ship.x * 0.13)) }]}>
      <Circle cx={0} cy={18} r={132} color="#139BFF14" />
      {[-58, 0, 58].map((engineX) => <Group key={engineX}><RoundedRect x={engineX - 14} y={58} width={28} height={flame} r={14} color="#2ACBFF"><LinearGradient start={vec(engineX, 56)} end={vec(engineX, 58 + flame)} colors={['#FFFFFF', '#49E8FF', '#0A6CFF', '#5C15FF00']} /></RoundedRect><RoundedRect x={engineX - 6} y={62} width={12} height={flame * 0.7} r={6} color="#FFFFFFCC" /></Group>)}
      <Path path="M -48 -16 L -126 18 L -118 70 L -60 54 Z" color="#D84225"><LinearGradient start={vec(-120, 0)} end={vec(-50, 80)} colors={['#FF774A', '#D43A22', '#671426']} /></Path>
      <Path path="M 48 -16 L 126 18 L 118 70 L 60 54 Z" color="#D84225"><LinearGradient start={vec(120, 0)} end={vec(50, 80)} colors={['#FF774A', '#D43A22', '#671426']} /></Path>
      <Circle cx={-104} cy={38} r={30} color="#E74726" /><Circle cx={104} cy={38} r={30} color="#E74726" /><Circle cx={-104} cy={38} r={15} color="#2FE2FF" /><Circle cx={104} cy={38} r={15} color="#2FE2FF" />
      <Path path={bodyPath} color="#E9EEF8"><LinearGradient start={vec(-80, -90)} end={vec(84, 88)} colors={['#FFFFFF', '#E4EBF5', '#8995AA', '#4E5668']} /></Path><Path path={bodyPath} color="#FFFFFF99" style="stroke" strokeWidth={3} />
      <RoundedRect x={-36} y={44} width={72} height={46} r={18} color="#C83A21" /><Path path={badgeStar} color="#FFD43B" transform={[{ translateY: 66 }, { scale: 2.1 }]} />
      <Circle cx={0} cy={-31} r={61} color="#3ACDFF42" /><Circle cx={0} cy={-31} r={53} color="#A7F1FF66" /><Circle cx={0} cy={-25} r={44} color="#17305A" />
      <Circle cx={0} cy={-39} r={25} color="#E9A16D" /><Circle cx={0} cy={-47} r={27} color="#8B3F19" /><Circle cx={-16} cy={-52} r={12} color="#6F2F13" /><Circle cx={14} cy={-54} r={14} color="#6F2F13" />
      <RoundedRect x={-32} y={-12} width={64} height={20} r={10} color="#12284E" /><Circle cx={-19} cy={-2} r={5} color="#40E8FF" /><Circle cx={0} cy={-2} r={5} color="#FFD443" /><Circle cx={19} cy={-2} r={5} color="#FF6E73" />
      {snapshot.ship.shieldSeconds > 0 ? <><Circle cx={0} cy={0} r={145} color="#2CCAFF16" /><Circle cx={0} cy={0} r={142} color="#7BE9FF" style="stroke" strokeWidth={8} /></> : null}
    </Group>
  );
};

export const GameCanvas = ({ snapshot }: Props) => {
  const { width, height } = useWindowDimensions();
  const time = snapshot.elapsedSeconds;
  const entities = useMemo(() => snapshot.entities.map((entity) => project(entity, width, height)).sort((a, b) => b.entity.z - a.entity.z), [snapshot.entities, width, height]);
  const target = snapshot.laser ? project({ id: 'laser', kind: 'answer', x: snapshot.laser.x, y: snapshot.laser.y, z: snapshot.laser.z, radius: 0.1, color: '#B9FF4A' }, width, height) : null;
  const shipX = width / 2 + snapshot.ship.x * width * 0.32;
  const shipY = height * (0.8 + snapshot.ship.y * 0.075);
  const leftRock = `M 0 0 L 105 0 L 54 ${height * 0.15} L 132 ${height * 0.28} L 62 ${height * 0.42} L 145 ${height * 0.57} L 72 ${height * 0.73} L 130 ${height * 0.86} L 48 ${height} L 0 ${height} Z`;
  const rightRock = `M ${width} 0 L ${width - 105} 0 L ${width - 54} ${height * 0.15} L ${width - 132} ${height * 0.28} L ${width - 62} ${height * 0.42} L ${width - 145} ${height * 0.57} L ${width - 72} ${height * 0.73} L ${width - 130} ${height * 0.86} L ${width - 48} ${height} L ${width} ${height} Z`;
  return (
    <Canvas style={styles.canvas}>
      <Fill><LinearGradient start={vec(0, 0)} end={vec(width, height)} colors={['#020316', '#06104D', '#19003C', '#02020E']} /></Fill>
      <Circle cx={width * 0.2} cy={height * 0.3} r={height * 0.25} color="#3B22FF16" /><Circle cx={width * 0.76} cy={height * 0.36} r={height * 0.27} color="#B321FF12" />
      <Circle cx={width * 0.1} cy={height * 0.28} r={height * 0.073} color="#D57351"><RadialGradient c={vec(width * 0.08, height * 0.25)} r={height * 0.11} colors={['#FFE2A3', '#D57351', '#59283E']} /></Circle>
      <Path path={`M ${width * 0.82} ${height * 0.22} Q ${width * 0.9} ${height * 0.31} ${width * 0.98} ${height * 0.2}`} style="stroke" strokeWidth={10} color="#D993FF88" /><Circle cx={width * 0.9} cy={height * 0.22} r={height * 0.077} color="#A255D3"><RadialGradient c={vec(width * 0.87, height * 0.19)} r={height * 0.12} colors={['#FFD9A8', '#A255D3', '#35175A']} /></Circle>
      <Path path={`M ${-width * 0.1} ${height * 0.78} C ${width * 0.14} ${height * 0.28}, ${width * 0.34} ${height * 0.91}, ${width * 0.54} ${height * 0.6} S ${width * 0.86} ${height * 0.28}, ${width * 1.1} ${height * 0.55}`} style="stroke" strokeWidth={height * 0.09} color="#9B2CFF25" />
      {STARS.map((s, i) => <Circle key={i} cx={s.x * width} cy={s.y * height} r={s.r * (0.9 + Math.sin(time * 2.2 + s.p * 8) * 0.18)} color="#E8F8FF" opacity={0.35 + Math.sin(time * 2.2 + s.p * 8) * 0.22} />)}
      {ROCKS.map((r, i) => <Circle key={i} cx={r.x * width} cy={((r.y + time * (0.015 + r.p * 0.02)) % 0.82) * height} r={r.r} color="#65545C"><RadialGradient c={vec(r.x * width - r.r * 0.3, r.y * height - r.r * 0.3)} r={r.r * 1.7} colors={['#B9A394', '#584A52', '#201B2C']} /></Circle>)}
      <Path path={`M ${width * 0.06} ${height * 0.4} L ${width * 0.15} ${height * 0.5} L ${width * 0.11} ${height * 0.56} L ${width * 0.22} ${height * 0.69}`} style="stroke" strokeWidth={7} color="#44DFFF55" /><Path path={`M ${width * 0.94} ${height * 0.4} L ${width * 0.86} ${height * 0.49} L ${width * 0.9} ${height * 0.55} L ${width * 0.79} ${height * 0.68}`} style="stroke" strokeWidth={7} color="#44DFFF55" />
      {entities.map((item) => item.entity.kind === 'answer' ? <Asteroid key={item.entity.id} item={item} locked={snapshot.lockTargetId === item.entity.id} correct={snapshot.lockIsCorrect} progress={snapshot.lockProgress} time={time} /> : item.entity.kind === 'hazard' ? <Mine key={item.entity.id} item={item} time={time} /> : <Group key={item.entity.id} transform={[{ translateX: item.x }, { translateY: item.y }, { scale: item.scale * (0.9 + Math.sin(time * 5) * 0.1) }]}><Circle cx={0} cy={0} r={62} color="#FFD83B25" /><Path path={starPath} color="#FFD43B" /><Path path={starPath} color="#FFF4A8" style="stroke" strokeWidth={5} /></Group>)}
      {target ? <><Line p1={vec(shipX, shipY - 76)} p2={vec(target.x, target.y)} color="#B9FF4A22" strokeWidth={24} /><Line p1={vec(shipX, shipY - 76)} p2={vec(target.x, target.y)} color="#B9FF4A" strokeWidth={10} /><Line p1={vec(shipX, shipY - 76)} p2={vec(target.x, target.y)} color="#FFFFFF" strokeWidth={3} /><Circle cx={target.x} cy={target.y} r={20} color="#D8FF4A66" /></> : null}
      <Ship snapshot={snapshot} width={width} height={height} time={time} />
      <Path path={leftRock} color="#241C2A"><LinearGradient start={vec(0, 0)} end={vec(width * 0.13, height)} colors={['#090910', '#302129', '#4B2B29', '#120D16']} /></Path><Path path={rightRock} color="#241C2A"><LinearGradient start={vec(width, 0)} end={vec(width * 0.87, height)} colors={['#090910', '#302129', '#4B2B29', '#120D16']} /></Path>
      <Rect x={0} y={0} width={width} height={height} color="#02031308" />
    </Canvas>
  );
};

const styles = StyleSheet.create({ canvas: { ...StyleSheet.absoluteFillObject } });
