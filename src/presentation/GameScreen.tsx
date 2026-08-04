import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { GameEngine } from '../domain/GameEngine';
import type { GameSnapshot, SteeringInput } from '../domain/types';
import { ExpoFeedbackService } from '../infrastructure/FeedbackService';
import { ExpoMotionInput } from '../infrastructure/ExpoMotionInput';
import { GameCanvas } from './GameCanvas';
import { GameHud } from './GameHud';
import { TouchSteeringLayer } from './TouchSteeringLayer';

interface GameScreenProps {
  readonly seed: number;
  readonly onExit: () => void;
  readonly onFinish: (snapshot: GameSnapshot) => void;
}

type ControlMode = 'motion' | 'touch';

export const GameScreen = ({ seed, onExit, onFinish }: GameScreenProps) => {
  const engineRef = useRef(new GameEngine({ seed }));
  const motionRef = useRef(new ExpoMotionInput());
  const feedbackRef = useRef(new ExpoFeedbackService());
  const inputRef = useRef<SteeringInput>({ x: 0, y: 0 });
  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const previousSnapshotRef = useRef<GameSnapshot>(engineRef.current.snapshot());
  const finishSentRef = useRef(false);

  const [snapshot, setSnapshot] = useState<GameSnapshot>(engineRef.current.snapshot());
  const [started, setStarted] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [controlMode, setControlMode] = useState<ControlMode>('motion');
  const [showPause, setShowPause] = useState(false);

  useEffect(() => {
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT);
    const motion = motionRef.current;
    const feedback = feedbackRef.current;
    return () => {
      motion.stop();
      feedback.stop();
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && started) {
        engineRef.current.pause();
        setSnapshot(engineRef.current.snapshot());
        setShowPause(true);
      }
    });
    return () => subscription.remove();
  }, [started]);

  const publishFeedback = useCallback((next: GameSnapshot) => {
    const previous = previousSnapshotRef.current;
    if (next.challenge.id !== previous.challenge.id || (next.phase === 'boss' && previous.phase !== 'boss')) {
      feedbackRef.current.speak(next.challenge.prompt);
    }

    const laserFired = next.laser !== null && previous.laser === null;
    if (laserFired) {
      void feedbackRef.current.laser();
    }
    if (next.score > previous.score && !laserFired) {
      void feedbackRef.current.correct();
    }
    if (next.ship.hearts < previous.ship.hearts) {
      void feedbackRef.current.collision();
    }
    previousSnapshotRef.current = next;
  }, []);

  useEffect(() => {
    if (!started) {
      return;
    }

    const tick = (timestamp: number) => {
      const last = lastFrameRef.current ?? timestamp;
      const deltaSeconds = Math.min(0.05, (timestamp - last) / 1000);
      lastFrameRef.current = timestamp;
      engineRef.current.update(deltaSeconds, inputRef.current);
      const next = engineRef.current.snapshot();
      publishFeedback(next);
      setSnapshot(next);
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [publishFeedback, started]);

  useEffect(() => {
    if (finishSentRef.current || (snapshot.phase !== 'complete' && snapshot.phase !== 'failed')) {
      return;
    }
    finishSentRef.current = true;
    const timeout = setTimeout(() => onFinish(snapshot), 700);
    return () => clearTimeout(timeout);
  }, [onFinish, snapshot]);

  const startGame = useCallback(async (requestedMode: ControlMode) => {
    if (calibrating || started) {
      return;
    }
    setCalibrating(true);
    let mode = requestedMode;

    if (requestedMode === 'motion') {
      try {
        const available = await motionRef.current.start((input) => {
          inputRef.current = input;
        });
        if (available) {
          await motionRef.current.calibrate();
        } else {
          mode = 'touch';
        }
      } catch {
        mode = 'touch';
      }
    }

    setControlMode(mode);
    inputRef.current = { x: 0, y: 0 };
    engineRef.current.start();
    const next = engineRef.current.snapshot();
    previousSnapshotRef.current = next;
    setSnapshot(next);
    setStarted(true);
    setCalibrating(false);
    feedbackRef.current.speak(next.challenge.prompt);
  }, [calibrating, started]);

  const handlePause = useCallback(() => {
    engineRef.current.pause();
    setSnapshot(engineRef.current.snapshot());
    setShowPause(true);
  }, []);

  const handleResume = useCallback(() => {
    inputRef.current = { x: 0, y: 0 };
    engineRef.current.resume();
    setSnapshot(engineRef.current.snapshot());
    lastFrameRef.current = null;
    setShowPause(false);
  }, []);

  const handleShield = useCallback(() => {
    if (engineRef.current.useShield()) {
      void feedbackRef.current.powerUp();
      setSnapshot(engineRef.current.snapshot());
    }
  }, []);

  const handleMagnet = useCallback(() => {
    if (engineRef.current.useMagnet()) {
      void feedbackRef.current.powerUp();
      setSnapshot(engineRef.current.snapshot());
    }
  }, []);

  return (
    <View style={styles.container}>
      <GameCanvas snapshot={snapshot} />
      <TouchSteeringLayer
        enabled={started && controlMode === 'touch' && !showPause}
        onInput={(input) => { inputRef.current = input; }}
      />
      {started ? (
        <GameHud snapshot={snapshot} onPause={handlePause} onShield={handleShield} onMagnet={handleMagnet} />
      ) : null}

      {!started ? (
        <View style={styles.overlay}>
          <View style={styles.calibrationCard}>
            <Text style={styles.eyebrow}>FLIGHT TRAINING</Text>
            <Text style={styles.title}>Hold the phone comfortably</Text>
            <Text style={styles.body}>
              Keep it level, then calibrate. Tilt left and right to steer through the asteroid field.
            </Text>
            <View style={styles.phoneDiagram}>
              <Text style={styles.phoneIcon}>📱</Text>
              <Text style={styles.arrows}>↙  TILT  ↘</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={calibrating}
              onPress={() => void startGame('motion')}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.primaryButtonText}>{calibrating ? 'CALIBRATING…' : 'CALIBRATE & LAUNCH'}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={calibrating}
              onPress={() => void startGame('touch')}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Use touch controls instead</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {showPause ? (
        <View style={styles.overlay}>
          <View style={styles.pauseCard}>
            <Text style={styles.pauseTitle}>Mission paused</Text>
            <Pressable onPress={handleResume} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>RESUME</Text>
            </Pressable>
            {controlMode === 'motion' ? (
              <Pressable
                onPress={() => {
                  setShowPause(false);
                  engineRef.current.resume();
                  void motionRef.current.calibrate();
                }}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Recalibrate steering</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={onExit} style={styles.exitButton}>
              <Text style={styles.exitText}>Exit mission</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#02031A' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#02031AB8',
    padding: 24,
  },
  calibrationCard: {
    width: '70%',
    maxWidth: 650,
    minWidth: 430,
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 3,
    borderColor: '#30D9FF',
    backgroundColor: '#071345F2',
    paddingHorizontal: 34,
    paddingVertical: 24,
  },
  eyebrow: { color: '#7DE7FF', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#FFFFFF', fontSize: 31, fontWeight: '900', marginTop: 5, textAlign: 'center' },
  body: { color: '#C6D6FF', fontSize: 17, lineHeight: 24, textAlign: 'center', marginTop: 8 },
  phoneDiagram: { alignItems: 'center', marginVertical: 12 },
  phoneIcon: { fontSize: 49, transform: [{ rotate: '90deg' }] },
  arrows: { color: '#FFD84D', fontSize: 16, fontWeight: '900', marginTop: 5 },
  primaryButton: {
    minWidth: 250,
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#B7F8FF',
    backgroundColor: '#1468DF',
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.8 },
  secondaryButton: { marginTop: 12, paddingHorizontal: 18, paddingVertical: 9 },
  secondaryButtonText: { color: '#9FDFFF', fontSize: 15, fontWeight: '800' },
  pressed: { transform: [{ scale: 0.97 }] },
  pauseCard: {
    minWidth: 350,
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 3,
    borderColor: '#8C6AFF',
    backgroundColor: '#071345F7',
    padding: 30,
  },
  pauseTitle: { color: '#FFFFFF', fontSize: 34, fontWeight: '900', marginBottom: 22 },
  exitButton: { marginTop: 10, padding: 10 },
  exitText: { color: '#FF9EAF', fontSize: 16, fontWeight: '800' },
});
