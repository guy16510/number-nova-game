import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ParentGateScreenProps {
  readonly onUnlock: () => void;
  readonly onCancel: () => void;
}

const OPTIONS = [48, 56, 54] as const;

export const ParentGateScreen = ({ onUnlock, onCancel }: ParentGateScreenProps) => {
  const [feedback, setFeedback] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      <View style={styles.planetOne} />
      <View style={styles.planetTwo} />
      <View style={styles.card}>
        <Text style={styles.kicker}>GROWN-UPS ONLY</Text>
        <Text style={styles.title}>Parent access check</Text>
        <Text style={styles.body}>What is 7 × 8?</Text>
        <View style={styles.options}>
          {OPTIONS.map((option) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityLabel={`Answer ${option}`}
              onPress={() => {
                if (option === 56) {
                  onUnlock();
                } else {
                  setFeedback('That is not it. Try again.');
                }
              }}
              style={({ pressed }: { pressed: boolean }) => [styles.option, pressed && styles.pressed]}
            >
              <Text style={styles.optionText}>{option}</Text>
            </Pressable>
          ))}
        </View>
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
        <Pressable onPress={onCancel} style={styles.cancel}>
          <Text style={styles.cancelText}>Back to the game</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#02031A', overflow: 'hidden' },
  planetOne: { position: 'absolute', width: 360, height: 360, borderRadius: 180, left: -140, top: -150, backgroundColor: '#5D2BBD', opacity: 0.45 },
  planetTwo: { position: 'absolute', width: 300, height: 300, borderRadius: 150, right: -110, bottom: -140, backgroundColor: '#167DA4', opacity: 0.4 },
  card: { width: '58%', minWidth: 520, maxWidth: 760, alignItems: 'center', borderRadius: 30, borderWidth: 3, borderColor: '#39D6FF', backgroundColor: '#071345F2', paddingHorizontal: 38, paddingVertical: 28 },
  kicker: { color: '#FFE15A', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#FFFFFF', fontSize: 31, fontWeight: '900', marginTop: 4 },
  body: { color: '#CDE0FF', fontSize: 24, fontWeight: '800', marginTop: 17 },
  options: { flexDirection: 'row', gap: 18, marginTop: 22 },
  option: { width: 112, height: 74, borderRadius: 23, borderWidth: 3, borderColor: '#62E8FF', backgroundColor: '#123F92', alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ scale: 0.96 }] },
  optionText: { color: '#FFFFFF', fontSize: 28, fontWeight: '900' },
  feedback: { color: '#FF9EAF', fontSize: 14, fontWeight: '800', marginTop: 13 },
  cancel: { marginTop: 17, paddingHorizontal: 18, paddingVertical: 10 },
  cancelText: { color: '#9FDFFF', fontSize: 14, fontWeight: '800' },
});
