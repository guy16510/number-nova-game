import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import type { MissionPlan } from './src/domain/LearningModel';
import { createMissionChoices } from './src/domain/MissionPlanner';
import { EMPTY_PLAYTEST_SUMMARY, type PlaytestSummary } from './src/domain/PlaytestTelemetry';
import type { GameSnapshot, RewardState } from './src/domain/types';
import { ExpoPlaytestTelemetryRepository } from './src/infrastructure/PlaytestTelemetryRepository';
import {
  EMPTY_PROGRESS,
  ExpoProgressRepository,
  type PlayerProgress,
} from './src/infrastructure/ProgressRepository';
import { GameScreen } from './src/presentation/GameScreen';
import { HangarScreen } from './src/presentation/HangarScreen';
import { MenuScreen } from './src/presentation/MenuScreen';
import { MissionMapScreen } from './src/presentation/MissionMapScreen';
import { ParentGateScreen } from './src/presentation/ParentGateScreen';
import { ParentScreen } from './src/presentation/ParentScreen';
import { ResultsScreen } from './src/presentation/ResultsScreen';

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 500, fade: true });

type Screen = 'menu' | 'missions' | 'game' | 'results' | 'parentGate' | 'parents' | 'hangar';

export default function App() {
  const repository = useMemo(() => new ExpoProgressRepository(), []);
  const telemetryRepository = useMemo(() => new ExpoPlaytestTelemetryRepository(), []);
  const [screen, setScreen] = useState<Screen>('menu');
  const [parentReturnScreen, setParentReturnScreen] = useState<'menu' | 'missions'>('menu');
  const [progress, setProgress] = useState<PlayerProgress>(EMPTY_PROGRESS);
  const [playtestSummary, setPlaytestSummary] = useState<PlaytestSummary>(EMPTY_PLAYTEST_SUMMARY);
  const [result, setResult] = useState<GameSnapshot | null>(null);
  const [selectedMission, setSelectedMission] = useState<MissionPlan | null>(null);
  const [lastHintsUsed, setLastHintsUsed] = useState(0);
  const [gameSeed, setGameSeed] = useState(() => Date.now());
  const [missionStartedAt, setMissionStartedAt] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [stored, telemetry] = await Promise.all([repository.load(), telemetryRepository.loadSummary()]);
        if (mounted) {
          setProgress(stored);
          setPlaytestSummary(telemetry);
        }
      } catch {
        if (mounted) setProgress(EMPTY_PROGRESS);
      } finally {
        if (mounted) {
          setReady(true);
          await SplashScreen.hideAsync();
        }
      }
    };
    void load();
    return () => { mounted = false; };
  }, [repository, telemetryRepository]);

  const missions = useMemo(
    () => createMissionChoices(progress.mastery, progress.highestMathLevel, progress.missionsCompleted),
    [progress.highestMathLevel, progress.mastery, progress.missionsCompleted],
  );

  const startMission = useCallback((mission: MissionPlan) => {
    setSelectedMission(mission);
    setResult(null);
    setLastHintsUsed(0);
    setGameSeed(Date.now());
    setMissionStartedAt(Date.now());
    setScreen('game');
  }, []);

  const replayMission = useCallback(() => {
    if (!selectedMission) {
      setScreen('missions');
      return;
    }
    setResult(null);
    setLastHintsUsed(0);
    setGameSeed(Date.now());
    setMissionStartedAt(Date.now());
    setScreen('game');
  }, [selectedMission]);

  const finishGame = useCallback(async (snapshot: GameSnapshot, hintsUsed: number) => {
    setResult(snapshot);
    setLastHintsUsed(hintsUsed);
    const durationSeconds = missionStartedAt ? Math.max(0, (Date.now() - missionStartedAt) / 1000) : snapshot.elapsedSeconds;
    const [nextProgress, telemetry] = await Promise.all([
      repository.recordGame(snapshot, selectedMission ?? undefined, hintsUsed),
      telemetryRepository.record({
        id: `${gameSeed}-${snapshot.phase}`,
        missionMode: selectedMission?.mode ?? 'unknown',
        controlMode: 'unknown',
        outcome: snapshot.phase === 'complete' ? 'complete' : 'failed',
        durationSeconds,
        accuracy: snapshot.accuracy,
        collisions: snapshot.collisions,
        shotsFired: snapshot.shotsFired,
        shotsHit: snapshot.shotsHit,
        hintsUsed,
        frameStalls: 0,
        recordedAt: new Date().toISOString(),
      }),
    ]);
    setProgress(nextProgress);
    setPlaytestSummary(telemetry);
    setMissionStartedAt(null);
    setScreen('results');
  }, [gameSeed, missionStartedAt, repository, selectedMission, telemetryRepository]);

  const abandonMission = useCallback(async () => {
    if (selectedMission && missionStartedAt) {
      const telemetry = await telemetryRepository.record({
        id: `${gameSeed}-abandoned`,
        missionMode: selectedMission.mode,
        controlMode: 'unknown',
        outcome: 'abandoned',
        durationSeconds: Math.max(0, (Date.now() - missionStartedAt) / 1000),
        accuracy: 0,
        collisions: 0,
        shotsFired: 0,
        shotsHit: 0,
        hintsUsed: 0,
        frameStalls: 0,
        recordedAt: new Date().toISOString(),
      });
      setPlaytestSummary(telemetry);
    }
    setMissionStartedAt(null);
    setScreen('missions');
  }, [gameSeed, missionStartedAt, selectedMission, telemetryRepository]);

  const equipReward = useCallback(async (rewardId: string, type: RewardState['type']) => {
    const next = await repository.equipReward(rewardId, type);
    setProgress(next);
  }, [repository]);

  const stopAtMenu = useCallback(async () => {
    const next = await repository.recordNaturalStop();
    setProgress(next);
    setScreen('menu');
  }, [repository]);

  const resetProgress = useCallback(async () => {
    await Promise.all([repository.reset(), telemetryRepository.reset()]);
    setProgress(EMPTY_PROGRESS);
    setPlaytestSummary(EMPTY_PLAYTEST_SUMMARY);
  }, [repository, telemetryRepository]);

  const openParentGate = useCallback((returnScreen: 'menu' | 'missions') => {
    setParentReturnScreen(returnScreen);
    setScreen('parentGate');
  }, []);

  if (!ready) return null;
  const companionName = progress.equippedRewards.companion === 'pip-companion' ? 'Pip' : 'Nova Coach';

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      {screen === 'menu' ? <MenuScreen progress={progress} onPlay={() => setScreen('missions')} onHangar={() => setScreen('hangar')} onParents={() => openParentGate('menu')} /> : null}
      {screen === 'missions' ? <MissionMapScreen missions={missions} progress={progress} onSelect={startMission} onBack={() => setScreen('menu')} onHangar={() => setScreen('hangar')} onParents={() => openParentGate('missions')} /> : null}
      {screen === 'game' && selectedMission ? <GameScreen key={gameSeed} seed={gameSeed} mission={selectedMission} companionName={companionName} onExit={() => { void abandonMission(); }} onFinish={(snapshot, hintsUsed) => { void finishGame(snapshot, hintsUsed); }} /> : null}
      {screen === 'results' && result && selectedMission ? <ResultsScreen snapshot={result} mission={selectedMission} hintsUsed={lastHintsUsed} progress={progress} onPlayAgain={replayMission} onNextMission={() => setScreen('missions')} onMenu={() => { void stopAtMenu(); }} /> : null}
      {screen === 'parentGate' ? <ParentGateScreen onUnlock={() => setScreen('parents')} onCancel={() => setScreen(parentReturnScreen)} /> : null}
      {screen === 'parents' ? <ParentScreen progress={progress} playtestSummary={playtestSummary} onReset={() => { void resetProgress(); }} onClose={() => setScreen(parentReturnScreen)} /> : null}
      {screen === 'hangar' ? <HangarScreen progress={progress} onEquip={(id, type) => { void equipReward(id, type); }} onClose={() => setScreen('menu')} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#02031A' } });
