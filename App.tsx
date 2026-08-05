import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import type { GameSnapshot } from './src/domain/types';
import {
  EMPTY_PROGRESS,
  ExpoProgressRepository,
  type PlayerProgress,
} from './src/infrastructure/ProgressRepository';
import { GameScreen } from './src/presentation/GameScreen';
import { MenuScreen } from './src/presentation/MenuScreen';
import { ParentScreen } from './src/presentation/ParentScreen';
import { ResultsScreen } from './src/presentation/ResultsScreen';

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 500, fade: true });

type Screen = 'menu' | 'game' | 'results' | 'parents';

export default function App() {
  const repository = useMemo(() => new ExpoProgressRepository(), []);
  const [screen, setScreen] = useState<Screen>('menu');
  const [progress, setProgress] = useState<PlayerProgress>(EMPTY_PROGRESS);
  const [result, setResult] = useState<GameSnapshot | null>(null);
  const [gameSeed, setGameSeed] = useState(() => Date.now());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const stored = await repository.load();
        if (mounted) setProgress(stored);
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
  }, [repository]);

  const startGame = useCallback(() => {
    setResult(null);
    setGameSeed(Date.now());
    setScreen('game');
  }, []);

  const finishGame = useCallback(async (snapshot: GameSnapshot) => {
    setResult(snapshot);
    const nextProgress = await repository.recordGame(snapshot);
    setProgress(nextProgress);
    setScreen('results');
  }, [repository]);

  const resetProgress = useCallback(async () => {
    await repository.reset();
    setProgress(EMPTY_PROGRESS);
  }, [repository]);

  if (!ready) return null;

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      {screen === 'menu' ? <MenuScreen progress={progress} onPlay={startGame} onParents={() => setScreen('parents')} /> : null}
      {screen === 'game' ? (
        <GameScreen
          key={gameSeed}
          seed={gameSeed}
          onExit={() => setScreen('menu')}
          onFinish={(snapshot) => { void finishGame(snapshot); }}
        />
      ) : null}
      {screen === 'results' && result ? <ResultsScreen snapshot={result} onPlayAgain={startGame} onMenu={() => setScreen('menu')} /> : null}
      {screen === 'parents' ? <ParentScreen progress={progress} onReset={() => { void resetProgress(); }} onClose={() => setScreen('menu')} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#02031A' } });
