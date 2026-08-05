import { Audio, type AVPlaybackSource } from 'expo-av';
import type { SoundPlaybackOptions, SoundPoolFactoryPort, SoundPoolPort } from './AudioContracts';

const clamp = (value: number, minimum: number, maximum: number): number => Math.min(maximum, Math.max(minimum, value));

export class ExpoSoundPoolFactory implements SoundPoolFactoryPort {
  public async create(source: AVPlaybackSource, voices: number, defaults: SoundPlaybackOptions = {}): Promise<SoundPoolPort> {
    const sounds = await Promise.all(
      Array.from({ length: Math.max(1, voices) }, async () => {
        const created = await Audio.Sound.createAsync(source, {
          shouldPlay: false,
          volume: clamp(defaults.volume ?? 1, 0, 1),
          rate: clamp(defaults.rate ?? 1, 0.5, 2),
          shouldCorrectPitch: false,
        });
        return created.sound;
      }),
    );
    return new ExpoSoundPool(sounds, defaults);
  }
}

class ExpoSoundPool implements SoundPoolPort {
  private cursor = 0;
  private volume: number;
  private rate: number;
  private looping = false;

  public constructor(
    private readonly sounds: readonly Audio.Sound[],
    defaults: SoundPlaybackOptions,
  ) {
    this.volume = clamp(defaults.volume ?? 1, 0, 1);
    this.rate = clamp(defaults.rate ?? 1, 0.5, 2);
  }

  public async play(options: SoundPlaybackOptions = {}): Promise<void> {
    if (options.delayMs && options.delayMs > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, options.delayMs));
    }
    const sound = this.sounds[this.cursor % this.sounds.length];
    this.cursor = (this.cursor + 1) % this.sounds.length;
    if (!sound) return;

    try {
      await sound.setStatusAsync({
        positionMillis: 0,
        shouldPlay: true,
        isLooping: this.looping,
        volume: clamp(options.volume ?? this.volume, 0, 1),
        rate: clamp(options.rate ?? this.rate, 0.5, 2),
        shouldCorrectPitch: false,
      });
    } catch {
      // Audio must never interrupt gameplay.
    }
  }

  public async setLooping(looping: boolean): Promise<void> {
    this.looping = looping;
    await Promise.allSettled(this.sounds.map((sound) => sound.setIsLoopingAsync(looping)));
  }

  public async setVolume(volume: number): Promise<void> {
    this.volume = clamp(volume, 0, 1);
    await Promise.allSettled(this.sounds.map((sound) => sound.setVolumeAsync(this.volume)));
  }

  public async setRate(rate: number): Promise<void> {
    this.rate = clamp(rate, 0.5, 2);
    await Promise.allSettled(this.sounds.map((sound) => sound.setRateAsync(this.rate, false)));
  }

  public async stop(): Promise<void> {
    await Promise.allSettled(this.sounds.map((sound) => sound.stopAsync()));
  }

  public async unload(): Promise<void> {
    await Promise.allSettled(this.sounds.map((sound) => sound.unloadAsync()));
  }
}
