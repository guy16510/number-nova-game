import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LearningHint } from '../domain/HintDirector';

interface LearningHintOverlayProps {
  readonly hint: LearningHint | null;
  readonly companionName: string;
}

export const LearningHintOverlay = ({ hint, companionName }: LearningHintOverlayProps) => {
  if (!hint) return null;
  return (
    <View pointerEvents="none" style={styles.container}>
      <View style={styles.avatar}><Text style={styles.avatarFace}>•ᴗ•</Text></View>
      <View style={[styles.card, hint.level === 2 && styles.cardStrong]}>
        <Text style={styles.kicker}>{companionName.toUpperCase()} • LEVEL {hint.level} HINT</Text>
        <Text style={styles.title}>{hint.title}</Text>
        <Text style={styles.message}>{hint.message}</Text>
        <Text style={styles.visual}>{hint.visual}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'absolute', left: '21%', right: '21%', bottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 58, height: 58, borderRadius: 29, borderWidth: 4, borderColor: '#FFFFFF', backgroundColor: '#7DFFB2', alignItems: 'center', justifyContent: 'center', zIndex: 3, marginRight: -10 },
  avatarFace: { color: '#12355A', fontSize: 16, fontWeight: '900' },
  card: { flex: 1, maxWidth: 620, minHeight: 86, borderRadius: 21, borderWidth: 3, borderColor: '#62E8FF', backgroundColor: '#071548F2', paddingLeft: 24, paddingRight: 17, paddingVertical: 10, alignItems: 'center' },
  cardStrong: { borderColor: '#FFE15A', backgroundColor: '#33165AF2' },
  kicker: { color: '#8FEAFF', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', marginTop: 1 },
  message: { color: '#D6E4FF', fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  visual: { color: '#FFE86B', fontSize: 16, fontWeight: '900', letterSpacing: 2, marginTop: 4 },
});
