import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { GameSnapshot } from '../domain/types';

interface Props { readonly snapshot: GameSnapshot; readonly onPause: () => void; readonly onShield: () => void; readonly onMagnet: () => void }

const Logo = () => <View pointerEvents="none" style={s.logo}><Text style={s.logoTop}>NUMBER</Text><Text style={s.logoBottom}>NOVA</Text><View style={s.orbit} /><Text style={s.logoStar}>★</Text></View>;
const Heart = ({ filled }: { readonly filled: boolean }) => <Text style={[s.heart, !filled && s.emptyHeart]}>{filled ? '♥' : '♡'}</Text>;

const Bot = ({ answer, feedback }: { readonly answer: number | undefined; readonly feedback: string | null }) => (
  <View pointerEvents="none" style={s.botRow}>
    <View style={s.bot}><View style={s.antenna} /><View style={s.antennaTip} /><View style={s.face}><View style={s.eyes}><View style={s.eye} /><View style={s.eye} /></View><Text style={s.smile}>⌣</Text></View></View>
    <View style={s.bubble}><Text numberOfLines={2} style={s.bubbleText}>{feedback ?? (typeof answer === 'number' ? `You got this!\nLook for ${answer}!` : 'Fly through the stars!')}</Text></View>
  </View>
);

const Power = ({ type, label, charges, active, onPress }: { readonly type: 'shield' | 'boost'; readonly label: string; readonly charges: number; readonly active: boolean; readonly onPress: () => void }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${charges} remaining`} disabled={charges <= 0 || active} onPress={onPress} style={({ pressed }) => [s.power, active && s.powerActive, charges <= 0 && s.disabled, pressed && s.pressed]}>
    <View style={s.powerGlow} /><View style={s.powerCircle}>
      {type === 'shield' ? <View style={s.shield}><View style={s.shieldShine} /></View> : <View style={s.rocket}><View style={s.window} /><View style={s.flame} /></View>}
      <View style={s.badge}><Text style={s.badgeText}>{charges}</Text></View>
    </View>
    <View style={s.labelPlate}><Text style={s.powerLabel}>{label}</Text></View>
  </Pressable>
);

export const GameHud = ({ snapshot, onPause, onShield, onMagnet }: Props) => {
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const missionWidth = `${Math.max(6, Math.min(100, (snapshot.challengeNumber / snapshot.totalChallenges) * 100))}%` as `${number}%`;
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Logo />
      <View pointerEvents="none" style={[s.hearts, compact && s.heartsCompact]}>{[0, 1, 2].map((i) => <Heart key={i} filled={i < snapshot.ship.hearts} />)}</View>
      <View pointerEvents="none" style={s.score}><Text style={s.scoreStar}>★</Text><Text style={s.scoreText}>{snapshot.score.toLocaleString()}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Pause" onPress={onPause} style={({ pressed }) => [s.pause, pressed && s.pressed]}><Text style={s.pauseText}>Ⅱ</Text></Pressable>
      <View pointerEvents="none" style={[s.prompt, compact && s.promptCompact]}><View style={s.promptInner} /><Text adjustsFontSizeToFit numberOfLines={1} style={[s.promptText, compact && s.promptTextCompact]}>{snapshot.challenge.prompt}</Text>{snapshot.challenge.kind === 'collect' ? <Text style={s.progress}>{snapshot.challenge.progress} / {snapshot.challenge.targetCount}</Text> : null}</View>
      {!compact ? <Bot answer={snapshot.challenge.answer} feedback={snapshot.feedback} /> : null}
      {compact && snapshot.feedback ? <View pointerEvents="none" style={s.feedback}><Text style={s.feedbackText}>{snapshot.feedback}</Text></View> : null}
      <View pointerEvents="box-none" style={s.bottom}>
        <Power type="shield" label="BUBBLE SHIELD" charges={snapshot.shieldCharges} active={snapshot.ship.shieldSeconds > 0} onPress={onShield} />
        <View pointerEvents="none" style={s.mission}><View style={s.track}><View style={[s.fill, { width: missionWidth }]} /></View><Text style={s.missionText}>{snapshot.phase === 'boss' ? `BOSS CORE ${snapshot.bossHealth}/${snapshot.bossMaxHealth}` : `MISSION ${snapshot.challengeNumber} OF ${snapshot.totalChallenges}`}</Text></View>
        <Power type="boost" label="ROCKET BOOST" charges={snapshot.magnetCharges} active={snapshot.ship.magnetSeconds > 0} onPress={onMagnet} />
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  logo: { position: 'absolute', left: 24, top: 18, width: 155, height: 96, alignItems: 'center', transform: [{ rotate: '-4deg' }] },
  logoTop: { color: '#FFE24A', fontSize: 29, lineHeight: 31, fontWeight: '900', letterSpacing: 1.4, textShadowColor: '#FF6A16', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 4, zIndex: 3 },
  logoBottom: { color: '#77ECFF', fontSize: 47, lineHeight: 48, fontWeight: '900', letterSpacing: 1.5, textShadowColor: '#253CFF', textShadowOffset: { width: 1, height: 4 }, textShadowRadius: 7, zIndex: 3 },
  orbit: { position: 'absolute', left: 4, right: 4, bottom: 5, height: 29, borderWidth: 4, borderColor: '#C852FF', borderRadius: 80, transform: [{ rotate: '-8deg' }], opacity: 0.82 },
  logoStar: { position: 'absolute', right: 22, top: 39, color: '#FFFFFF', fontSize: 16, zIndex: 5 },
  hearts: { position: 'absolute', top: 16, left: '38%', minWidth: 218, height: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 34, borderWidth: 3, borderColor: '#6E75A8', backgroundColor: '#080D2FEC' },
  heartsCompact: { left: '31%', minWidth: 190, height: 58 },
  heart: { color: '#FF4057', fontSize: 51, lineHeight: 53, fontWeight: '900', marginHorizontal: 2, textShadowColor: '#FFFFFF', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  emptyHeart: { color: '#5E688D', opacity: 0.45 },
  score: { position: 'absolute', right: 92, top: 17, minWidth: 190, height: 66, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderRadius: 33, borderWidth: 3, borderColor: '#69739F', backgroundColor: '#090D2EEC', paddingHorizontal: 19 },
  scoreStar: { color: '#FFD43B', fontSize: 39, marginRight: 13, textShadowColor: '#FF9F1F', textShadowRadius: 4 },
  scoreText: { color: '#FFFFFF', fontSize: 28, fontWeight: '900' },
  pause: { position: 'absolute', top: 19, right: 22, height: 62, width: 62, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#64E4FF', backgroundColor: '#164BCBEE', shadowColor: '#37D7FF', shadowOpacity: 0.8, shadowRadius: 8 },
  pauseText: { color: '#FFFFFF', fontSize: 31, lineHeight: 34, fontWeight: '900' },
  prompt: { position: 'absolute', top: 94, left: '27%', width: '46%', minHeight: 96, justifyContent: 'center', alignItems: 'center', borderRadius: 31, borderWidth: 4, borderColor: '#1DDBFF', backgroundColor: '#071348F0', paddingHorizontal: 32, shadowColor: '#A326FF', shadowOpacity: 0.95, shadowRadius: 16 },
  promptCompact: { left: '23%', width: '54%', top: 83, minHeight: 80 },
  promptInner: { position: 'absolute', left: 6, right: 6, top: 6, bottom: 6, borderRadius: 25, borderWidth: 2, borderColor: '#A34DFF88' },
  promptText: { color: '#FFFFFF', fontSize: 42, lineHeight: 49, fontWeight: '900', letterSpacing: 0.6, textShadowColor: '#000000', textShadowOffset: { width: 1, height: 3 }, textShadowRadius: 5 },
  promptTextCompact: { fontSize: 34, lineHeight: 40 },
  progress: { color: '#FFE85A', fontSize: 17, fontWeight: '900' },
  botRow: { position: 'absolute', top: 86, right: 44, width: 275, height: 118, flexDirection: 'row', alignItems: 'center' },
  bot: { width: 88, height: 88, borderRadius: 44, borderWidth: 5, borderColor: '#BEF6FF', backgroundColor: '#EFFCFF', alignItems: 'center', justifyContent: 'center', zIndex: 4, shadowColor: '#29DBFF', shadowOpacity: 0.9, shadowRadius: 9 },
  antenna: { position: 'absolute', top: -20, width: 6, height: 23, borderRadius: 3, backgroundColor: '#57DFFF' },
  antennaTip: { position: 'absolute', top: -29, width: 16, height: 16, borderRadius: 8, backgroundColor: '#FF67DA', borderWidth: 3, borderColor: '#FFFFFF' },
  face: { width: 65, height: 50, borderRadius: 20, backgroundColor: '#162555', alignItems: 'center', justifyContent: 'center' },
  eyes: { flexDirection: 'row' }, eye: { width: 8, height: 11, borderRadius: 5, backgroundColor: '#56FFEB', marginHorizontal: 10 },
  smile: { color: '#FF77DE', fontSize: 24, lineHeight: 23, fontWeight: '900', marginTop: -1 },
  bubble: { marginLeft: -4, flex: 1, minHeight: 76, borderRadius: 18, borderWidth: 3, borderColor: '#49DFFF', backgroundColor: '#0D4DBCEB', paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  bubbleText: { color: '#FFFFFF', fontSize: 18, lineHeight: 23, fontWeight: '900', textAlign: 'center' },
  feedback: { position: 'absolute', top: 170, alignSelf: 'center', borderRadius: 18, borderWidth: 2, borderColor: '#E685FF', backgroundColor: '#742CDAEE', paddingHorizontal: 20, paddingVertical: 7 },
  feedbackText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  bottom: { position: 'absolute', left: 25, right: 25, bottom: 17, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  power: { width: 145, height: 145, alignItems: 'center', justifyContent: 'flex-end' }, powerActive: { transform: [{ scale: 1.04 }] }, disabled: { opacity: 0.43 }, pressed: { transform: [{ scale: 0.96 }] },
  powerGlow: { position: 'absolute', top: 0, width: 116, height: 116, borderRadius: 58, backgroundColor: '#0A78FF33', borderWidth: 8, borderColor: '#18CFFF22' },
  powerCircle: { position: 'absolute', top: 9, width: 104, height: 104, borderRadius: 52, borderWidth: 4, borderColor: '#5DE8FF', backgroundColor: '#093485EE', alignItems: 'center', justifyContent: 'center', shadowColor: '#1BCBFF', shadowOpacity: 0.9, shadowRadius: 11 },
  shield: { width: 55, height: 63, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, borderWidth: 5, borderColor: '#D9FCFF', backgroundColor: '#1BB8FF', transform: [{ scaleX: 0.86 }], overflow: 'hidden' },
  shieldShine: { position: 'absolute', left: 7, top: 6, width: 14, height: 45, borderRadius: 10, backgroundColor: '#FFFFFF77' },
  rocket: { width: 38, height: 68, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, borderWidth: 4, borderColor: '#FFFFFF', backgroundColor: '#EC3E3A', transform: [{ rotate: '42deg' }], alignItems: 'center' },
  window: { marginTop: 11, width: 15, height: 15, borderRadius: 8, backgroundColor: '#57E9FF', borderWidth: 2, borderColor: '#FFFFFF' },
  flame: { position: 'absolute', bottom: -18, width: 18, height: 24, borderBottomLeftRadius: 9, borderBottomRightRadius: 9, backgroundColor: '#FFE348', borderWidth: 3, borderColor: '#FF8F21' },
  badge: { position: 'absolute', top: -8, right: -9, height: 35, minWidth: 35, paddingHorizontal: 6, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7734D5', borderWidth: 3, borderColor: '#FFFFFF' },
  badgeText: { color: '#FFFFFF', fontWeight: '900', fontSize: 18 },
  labelPlate: { minWidth: 135, borderRadius: 12, borderWidth: 2, borderColor: '#6676B2', backgroundColor: '#070B28F5', paddingHorizontal: 9, paddingVertical: 6, alignItems: 'center' },
  powerLabel: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  mission: { minWidth: 200, marginBottom: 4, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 17, backgroundColor: '#060B31D9', borderColor: '#536FC0', borderWidth: 2, alignItems: 'center' },
  track: { width: 164, height: 7, borderRadius: 4, backgroundColor: '#1E2858', overflow: 'hidden', marginBottom: 5 }, fill: { height: 7, borderRadius: 4, backgroundColor: '#51E7FF' },
  missionText: { color: '#C7D5FF', fontSize: 12, fontWeight: '900', letterSpacing: 0.7 },
});
