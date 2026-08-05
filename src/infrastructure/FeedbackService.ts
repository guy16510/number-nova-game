import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

export type AudioMode = 'flight' | 'combat' | 'boss';

export interface FeedbackPort {
  speak(text: string): void;
  laser(): Promise<void>;
  correct(): Promise<void>;
  collision(): Promise<void>;
  powerUp(): Promise<void>;
  lock(): Promise<void>;
  explosion(big?: boolean): Promise<void>;
  warning(): Promise<void>;
  setMode(mode: AudioMode): Promise<void>;
  stop(): void;
}

export class ExpoFeedbackService implements FeedbackPort {
  private laserHigh: Audio.Sound | null = null;
  private laserLow: Audio.Sound | null = null;
  private successSound: Audio.Sound | null = null;
  private collisionSound: Audio.Sound | null = null;
  private powerSound: Audio.Sound | null = null;
  private lockSound: Audio.Sound | null = null;
  private explosionSound: Audio.Sound | null = null;
  private warningSound: Audio.Sound | null = null;
  private ambientHum: Audio.Sound | null = null;
  private readonly ready: Promise<void>;
  private stopped = false;
  private mode: AudioMode = 'flight';
  private laserVariant = 0;

  public constructor() {
    this.ready = this.prepareAudio();
  }

  public speak(text: string): void {
    Speech.stop();
    Speech.speak(text, { language: 'en-US', rate: 0.9, pitch: 1.08, volume: 0.88 });
  }

  public async laser(): Promise<void> {
    await this.ready;
    this.laserVariant += 1;
    const highRate = 1.05 + (this.laserVariant % 3) * 0.12;
    try { await this.laserHigh?.setRateAsync(highRate, false); } catch { /* non-critical */ }
    await Promise.all([
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
      this.play(this.laserHigh),
      this.playAfter(this.laserLow, 18),
    ]);
  }

  public async correct(): Promise<void> {
    await this.ready;
    await Promise.all([Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), this.play(this.successSound)]);
  }

  public async collision(): Promise<void> {
    await this.ready;
    await Promise.all([Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error), this.play(this.collisionSound)]);
  }

  public async powerUp(): Promise<void> {
    await this.ready;
    await Promise.all([Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), this.play(this.powerSound)]);
  }

  public async lock(): Promise<void> {
    await this.ready;
    await Promise.all([Haptics.selectionAsync(), this.play(this.lockSound)]);
  }

  public async explosion(big = false): Promise<void> {
    await this.ready;
    try {
      await this.explosionSound?.setRateAsync(big ? 0.24 : 0.38, false);
      await this.explosionSound?.setVolumeAsync(big ? 0.95 : 0.7);
    } catch { /* non-critical */ }
    await Promise.all([
      Haptics.impactAsync(big ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium),
      this.play(this.explosionSound),
    ]);
  }

  public async warning(): Promise<void> {
    await this.ready;
    await Promise.all([Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning), this.play(this.warningSound)]);
  }

  public async setMode(mode: AudioMode): Promise<void> {
    this.mode = mode;
    await this.ready;
    if (!this.ambientHum) return;
    const config = mode === 'boss'
      ? { rate: 0.42, volume: 0.11 }
      : mode === 'combat'
        ? { rate: 0.31, volume: 0.075 }
        : { rate: 0.22, volume: 0.045 };
    try {
      await this.ambientHum.setRateAsync(config.rate, false);
      await this.ambientHum.setVolumeAsync(config.volume);
      const status = await this.ambientHum.getStatusAsync();
      if (status.isLoaded && !status.isPlaying) await this.ambientHum.playAsync();
    } catch {
      // Ambient audio is optional.
    }
  }

  public stop(): void {
    Speech.stop();
    this.stopped = true;
    void this.ready.finally(async () => {
      const sounds = [this.laserHigh, this.laserLow, this.successSound, this.collisionSound, this.powerSound, this.lockSound, this.explosionSound, this.warningSound, this.ambientHum]
        .filter((sound): sound is Audio.Sound => sound !== null);
      this.laserHigh = null;
      this.laserLow = null;
      this.successSound = null;
      this.collisionSound = null;
      this.powerSound = null;
      this.lockSound = null;
      this.explosionSound = null;
      this.warningSound = null;
      this.ambientHum = null;
      await Promise.allSettled(sounds.map((sound) => sound.unloadAsync()));
    });
  }

  private async prepareAudio(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false, shouldDuckAndroid: false });
      const [laserHigh, laserLow, success, collision, power, lock, explosion, warning, hum] = await Promise.all([
        Audio.Sound.createAsync(require('../../assets/sfx/laser.wav'), { shouldPlay: false, volume: 0.92, rate: 1.12, shouldCorrectPitch: false }),
        Audio.Sound.createAsync(require('../../assets/sfx/laser.wav'), { shouldPlay: false, volume: 0.5, rate: 0.7, shouldCorrectPitch: false }),
        Audio.Sound.createAsync(require('../../assets/sfx/correct.wav'), { shouldPlay: false, volume: 0.82, rate: 1.08, shouldCorrectPitch: false }),
        Audio.Sound.createAsync(require('../../assets/sfx/laser.wav'), { shouldPlay: false, volume: 0.78, rate: 0.42, shouldCorrectPitch: false }),
        Audio.Sound.createAsync(require('../../assets/sfx/correct.wav'), { shouldPlay: false, volume: 0.84, rate: 1.38, shouldCorrectPitch: false }),
        Audio.Sound.createAsync(require('../../assets/sfx/correct.wav'), { shouldPlay: false, volume: 0.34, rate: 1.72, shouldCorrectPitch: false }),
        Audio.Sound.createAsync(require('../../assets/sfx/laser.wav'), { shouldPlay: false, volume: 0.85, rate: 0.34, shouldCorrectPitch: false }),
        Audio.Sound.createAsync(require('../../assets/sfx/correct.wav'), { shouldPlay: false, volume: 0.55, rate: 0.58, shouldCorrectPitch: false }),
        Audio.Sound.createAsync(require('../../assets/sfx/laser.wav'), { shouldPlay: false, isLooping: true, volume: 0.045, rate: 0.22, shouldCorrectPitch: false }),
      ]);

      if (this.stopped) {
        await Promise.allSettled([laserHigh, laserLow, success, collision, power, lock, explosion, warning, hum].map((entry) => entry.sound.unloadAsync()));
        return;
      }
      this.laserHigh = laserHigh.sound;
      this.laserLow = laserLow.sound;
      this.successSound = success.sound;
      this.collisionSound = collision.sound;
      this.powerSound = power.sound;
      this.lockSound = lock.sound;
      this.explosionSound = explosion.sound;
      this.warningSound = warning.sound;
      this.ambientHum = hum.sound;
      await this.setMode(this.mode);
    } catch {
      // Audio feedback must never block gameplay.
    }
  }

  private async play(sound: Audio.Sound | null): Promise<void> {
    try { await sound?.replayAsync(); } catch { /* keep gameplay running */ }
  }

  private async playAfter(sound: Audio.Sound | null, delayMs: number): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    await this.play(sound);
  }
}
