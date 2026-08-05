import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { GameEngine } from '../domain/GameEngine';
import type { GameSnapshot, SteeringInput } from '../domain/types';
import { ExpoFeedbackService, type AudioMode } from '../infrastructure/FeedbackService';
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

const PHYSICS_STEP_SECONDS = 1 / 60;
const SNAPSHOT_INTERVAL_MS = 1000 / 30;
const MAX_PHYSICS_STEPS_PER_FRAME = 4;
const explosionCount = (snapshot: GameSnapshot): number => snapshot.entities.filter((entity) => entity.kind === 'explosion').length;

export const GameScreen = ({ seed, onExit, onFinish }: GameScreenProps) => {
  const engineRef = useRef(new GameEngine({ seed }));
  const motionRef = useRef(new ExpoMotionInput());
  const feedbackRef = useRef(new ExpoFeedbackService());
  const inputRef = useRef<SteeringInput>({ x: 0, y: 0 });
  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const accumulatorRef = useRef(0);
  const lastPublishRef = useRef(0);
  const previousSnapshotRef = useRef<GameSnapshot>(engineRef.current.snapshot());
  const finishSentRef = useRef(false);
  const audioModeRef = useRef<AudioMode>('flight');

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
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && started) {
        engineRef.current.pause();
        const next = engineRef.current.snapshot();
        previousSnapshotRef.current = next;
        setSnapshot(next);
        lastFrameRef.current = null;
        accumulatorRef.current = 0;
        setShowPause(true);
      }
    });
    return () => subscription.remove();
  }, [started]);

  const publishFeedback = useCallback((next: GameSnapshot) => {
    const previous = previousSnapshotRef.current;
    const feedback = feedbackRef.current;
    const challengeChanged = next.challenge.id !== previous.challenge.id;
    const bossStarted = next.phase === 'boss' && previous.phase !== 'boss';
    if (challengeChanged || bossStarted) feedback.speak(next.challenge.prompt);

    const desiredMode: AudioMode = next.phase === 'boss'
      ? 'boss'
      : next.entities.some((entity) => entity.kind === 'enemyProjectile' || entity.archetype === 'bomber-alien')
        ? 'combat'
        : 'flight';
    if (desiredMode !== audioModeRef.current) {
      audioModeRef.current = desiredMode;
      void feedback.setMode(desiredMode);
    }

    if (next.lockTargetId !== null && next.lockTargetId !== previous.lockTargetId) void feedback.lock();
    const laserFired = next.shotsFired > previous.shotsFired;
    if (laserFired) void feedback.laser();

    const exploded = explosionCount(next) > explosionCount(previous);
    if (exploded) void feedback.explosion(next.bossHealth < previous.bossHealth || next.screenShake > 0.65);

    const powerCollected = next.ship.weapon !== previous.ship.weapon
      || (next.ship.weaponSeconds > previous.ship.weaponSeconds + 1)
      || (next.ship.shieldSeconds > previous.ship.shieldSeconds + 1)
      || (next.ship.magnetSeconds > previous.ship.magnetSeconds + 1);
    if (powerCollected) void feedback.powerUp();
    if (next.score > previous.score && !laserFired && !exploded && !powerCollected) void feedback.correct();
    if (next.ship.hearts < previous.ship.hearts) void feedback.collision();
    if (bossStarted || (next.bossStage > previous.bossStage && next.phase === 'boss')) void feedback.warning();
    previousSnapshotRef.current = next;
  }, []);

  useEffect(() => {
    if (!started) return;
    const tick = (timestamp: number) => {
      const last = lastFrameRef.current ?? timestamp;
      const frameSeconds = Math.min(0.1, Math.max(0, (timestamp - last) / 1000));
      lastFrameRef.current = timestamp;
      accumulatorRef.current += frameSeconds;

      let physicsSteps = 0;
      while (accumulatorRef.current >= PHYSICS_STEP_SECONDS && physicsSteps < MAX_PHYSICS_STEPS_PER_FRAME) {
        engineRef.current.update(PHYSICS_STEP_SECONDS, inputRef.current);
        accumulatorRef.current -= PHYSICS_STEP_SECONDS;
        physicsSteps += 1;
      }
      if (physicsSteps === MAX_PHYSICS_STEPS_PER_FRAME) accumulatorRef.current = Math.min(accumulatorRef.current, PHYSICS_STEP_SECONDS);

      if (timestamp - lastPublishRef.current >= SNAPSHOT_INTERVAL_MS) {
        const next = engineRef.current.snapshot();
        publishFeedback(next);
        setSnapshot(next);
        lastPublishRef.current = timestamp;
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); };
  }, [publishFeedback, started]);

  useEffect(() => {
    if (finishSentRef.current || (snapshot.phase !== 'complete' && snapshot.phase !== 'failed')) return;
    finishSentRef.current = true;
    const timeout = setTimeout(() => onFinish(snapshot), 850);
    return () => clearTimeout(timeout);
  }, [onFinish, snapshot]);

  const startGame = useCallback(async (requestedMode: ControlMode) => {
    if (calibrating || started) return;
    setCalibrating(true);
    let mode = requestedMode;
    if (requestedMode === 'motion') {
      try {
        const available = await motionRef.current.start((input) => { inputRef.current = input; });
        if (available) await motionRef.current.calibrate();
        else mode = 'touch';
      } catch {
        mode = 'touch';
      }
    }

    setControlMode(mode);
    inputRef.current = { x: 0, y: 0 };
    engineRef.current.start();
    const next = engineRef.current.snapshot();
    previousSnapshotRef.current = next;
    lastFrameRef.current = null;
    accumulatorRef.current = 0;
    lastPublishRef.current = 0;
    setSnapshot(next);
    setStarted(true);
    setCalibrating(false);
    feedbackRef.current.speak(next.challenge.prompt);
    audioModeRef.current = 'combat';
    void feedbackRef.current.setMode('combat');
  }, [calibrating, started]);

  const handlePause = useCallback(() => {
    engineRef.current.pause();
    const next = engineRef.current.snapshot();
    previousSnapshotRef.current = next;
    setSnapshot(next);
    lastFrameRef.current = null;
    accumulatorRef.current = 0;
    setShowPause(true);
  }, []);

  const handleResume = useCallback(() => {
    inputRef.current = { x: 0, y: 0 };
    engineRef.current.resume();
    const next = engineRef.current.snapshot();
    previousSnapshotRef.current = next;
    setSnapshot(next);
    lastFrameRef.current = null;
    accumulatorRef.current = 0;
    lastPublishRef.current = 0;
    setShowPause(false);
  }, []);

  const handleShield = useCallback(() => {
    if (!engineRef.current.useShield()) return;
    void feedbackRef.current.powerUp();
    const next = engineRef.current.snapshot();
    previousSnapshotRef.current = next;
    setSnapshot(next);
  }, []);

  const handleMagnet = useCallback(() => {
    if (!engineRef.current.useMagnet()) return;
    void feedbackRef.current.powerUp();
    const next = engineRef.current.snapshot();
    previousSnapshotRef.current = next;
    setSnapshot(next);
  }, []);

  const handleFire = useCallback(() => {
    if (!engineRef.current.fire()) return;
    const next = engineRef.current.snapshot();
    publishFeedback(next);
    setSnapshot(next);
  }, [publishFeedback]);

  return (
    <View style={styles.container}>
      <GameCanvas snapshot={snapshot} />
      <TouchSteeringLayer enabled={started && controlMode === 'touch' && !showPause} onInput={(input) => { inputRef.current = input; }} />
      {started ? <GameHud snapshot={snapshot} onPause={handlePause} onShield={handleShield} onMagnet={handleMagnet} onFire={handleFire} /> : null}

      {!started ? (
        <View style={styles.overlay}>
          <View style={styles.calibrationCard}>
            <Text style={styles.eyebrow}>FLIGHT TRAINING</Text>
            <Text style={styles.title}>Hold the phone comfortably</Text>
            <Text style={styles.body}>Keep it level, then calibrate. Tilt to dodge asteroid tunnels, line up a glowing alien, and tap FIRE.</Text>
            <View style={styles.phoneDiagram}><Text style={styles.phoneIcon}>📱</Text><Text style={styles.arrows}>↙  TILT  ↘</Text></View>
            <Pressable accessibilityRole="button" disabled={calibrating} onPress={() => void startGame('motion')} style={({ pressed }: { pressed: boolean }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonText}>{calibrating ? 'CALIBRATING…' : 'CALIBRATE & LAUNCH'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={calibrating} onPress={() => void startGame('touch')} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Use touch controls instead</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {showPause ? (
        <View style={styles.overlay}>
          <View style={styles.pauseCard}>
            <Text style={styles.pauseTitle}>Mission paused</Text>
            <Pressable onPress={handleResume} style={styles.primaryButton}><Text style={styles.primaryButtonText}>RESUME</Text></Pressable>
            {controlMode === 'motion' ? (
              <Pressable onPress={() => {
                setShowPause(false);
                engineRef.current.resume();
                lastFrameRef.current = null;
                accumulatorRef.current = 0;
                void motionRef.current.calibrate();
              }} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Recalibrate steering</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={onExit} style={styles.exitButton}><Text style={styles.exitText}>Exit mission</Text></Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#02031A' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#02031AB8', padding: 24 },
  calibrationCard: { width: '70%', maxWidth: 650, minWidth: 430, alignItems: 'center', borderRadius: 28, borderWidth: 3, borderColor: '#30D9FF', backgroundColor: '#071345F2', paddingHorizontal: 34, paddingVertical: 24 },
  eyebrow: { color: '#7DE7FF', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#FFFFFF', fontSize: 31, fontWeight: '900', marginTop: 5, textAlign: 'center' },
  body: { color: '#C6D6FF', fontSize: 17, lineHeight: 24, textAlign: 'center', marginTop: 8 },
  phoneDiagram: { alignItems: 'center', marginVertical: 12 },
  phoneIcon: { fontSize: 49, transform: [{ rotate: '90deg' }] },
  arrows: { color: '#FFD84D', fontSize: 16, fontWeight: '900', marginTop: 5 },
  primaryButton: { minWidth: 250, alignItems: 'center', borderRadius: 22, borderWidth: 2, borderColor: '#B7F8FF', backgroundColor: '#1468DF', paddingHorizontal: 28, paddingVertical: 14 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.8 },
  secondaryButton: { marginTop: 12, paddingHorizontal: 18, paddingVertical: 9 },
  secondaryButtonText: { color: '#9FDFFF', fontSize: 15, fontWeight: '800' },
  pressed: { transform: [{ scale: 0.97 }] },
  pauseCard: { minWidth: 350, alignItems: 'center', borderRadius: 28, borderWidth: 3, borderColor: '#8C6AFF', backgroundColor: '#071345F7', padding: 30 },
  pauseTitle: { color: '#FFFFFF', fontSize: 34, fontWeight: '900', marginBottom: 22 },
  exitButton: { marginTop: 10, padding: 10 },
  exitText: { color: '#FF9EAF', fontSize: 16, fontWeight: '800' },
});
