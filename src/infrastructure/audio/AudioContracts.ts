import type { AVPlaybackSource } from 'expo-av';

export type AudioMode = 'flight' | 'combat' | 'boss';

export interface SoundPlaybackOptions {
  readonly volume?: number;
  readonly rate?: number;
  readonly delayMs?: number;
}

export interface SoundPoolPort {
  play(options?: SoundPlaybackOptions): Promise<void>;
  setLooping(looping: boolean): Promise<void>;
  setVolume(volume: number): Promise<void>;
  setRate(rate: number): Promise<void>;
  stop(): Promise<void>;
  unload(): Promise<void>;
}

export interface SoundPoolFactoryPort {
  create(source: AVPlaybackSource, voices: number, defaults?: SoundPlaybackOptions): Promise<SoundPoolPort>;
}

export interface AudioCatalogPort {
  sourceFor(effect: AudioEffect): AVPlaybackSource;
}

export type AudioEffect =
  | 'laser-primary'
  | 'laser-secondary'
  | 'success'
  | 'collision'
  | 'power-up'
  | 'target-lock'
  | 'explosion-small'
  | 'explosion-large'
  | 'warning'
  | 'ambient-flight'
  | 'ambient-combat'
  | 'ambient-boss';
