import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

export interface FeedbackPort {
  speak(text: string): void;
  laser(): Promise<void>;
  correct(): Promise<void>;
  collision(): Promise<void>;
  powerUp(): Promise<void>;
  stop(): void;
}

export class ExpoFeedbackService implements FeedbackPort {
  private laserHigh: Audio.Sound | null = null;
  private laserLow: Audio.Sound | null = null;
  private successSound: Audio.Sound | null = null;
  private collisionSound: Audio.Sound | null = null;
  private powerSound: Audio.Sound | null = null;
  private readonly ready: Promise<void>;
  private stopped = false;

  public constructor() {
    this.ready = this.prepareAudio();
  }

  public speak(text: string): void {
    Speech.stop();
    Speech.speak(text, {
      language: 'en-US',
      rate: 0.9,
      pitch: 1.08,
      volume: 0.9,
    });
  }

  public async laser(): Promise<void> {
    await this.ready;
    await Promise.all([
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
      this.play(this.laserHigh),
      this.playAfter(this.laserLow, 18),
    ]);
  }

  public async correct(): Promise<void> {
    await this.ready;
    await Promise.all([
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
      this.play(this.successSound),
    ]);
  }

  public async collision(): Promise<void> {
    await this.ready;
    await Promise.all([
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
      this.play(this.collisionSound),
    ]);
  }

  public async powerUp(): Promise<void> {
    await this.ready;
    await Promise.all([
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
      this.play(this.powerSound),
    ]);
  }

  public stop(): void {
    Speech.stop();
    this.stopped = true;
    void this.ready.finally(async () => {
      const sounds = [
        this.laserHigh,
        this.laserLow,
        this.successSound,
        this.collisionSound,
        this.powerSound,
      ].filter((sound): sound is Audio.Sound => sound !== null);
      this.laserHigh = null;
      this.laserLow = null;
      this.successSound = null;
      this.collisionSound = null;
      this.powerSound = null;
      await Promise.allSettled(sounds.map((sound) => sound.unloadAsync()));
    });
  }

  private async prepareAudio(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
      });

      const [laserHigh, laserLow, success, collision, power] = await Promise.all([
        Audio.Sound.createAsync(require('../../assets/sfx/laser.wav'), {
          shouldPlay: false,
          volume: 0.95,
          rate: 1.2,
          shouldCorrectPitch: false,
        }),
        Audio.Sound.createAsync(require('../../assets/sfx/laser.wav'), {
          shouldPlay: false,
          volume: 0.58,
          rate: 0.72,
          shouldCorrectPitch: false,
        }),
        Audio.Sound.createAsync(require('../../assets/sfx/correct.wav'), {
          shouldPlay: false,
          volume: 0.82,
          rate: 1.08,
          shouldCorrectPitch: false,
        }),
        Audio.Sound.createAsync(require('../../assets/sfx/laser.wav'), {
          shouldPlay: false,
          volume: 0.78,
          rate: 0.42,
          shouldCorrectPitch: false,
        }),
        Audio.Sound.createAsync(require('../../assets/sfx/correct.wav'), {
          shouldPlay: false,
          volume: 0.84,
          rate: 1.38,
          shouldCorrectPitch: false,
        }),
      ]);

      if (this.stopped) {
        await Promise.allSettled([
          laserHigh.sound.unloadAsync(),
          laserLow.sound.unloadAsync(),
          success.sound.unloadAsync(),
          collision.sound.unloadAsync(),
          power.sound.unloadAsync(),
        ]);
        return;
      }

      this.laserHigh = laserHigh.sound;
      this.laserLow = laserLow.sound;
      this.successSound = success.sound;
      this.collisionSound = collision.sound;
      this.powerSound = power.sound;
    } catch {
      // Audio feedback is non-critical and must never interrupt gameplay.
    }
  }

  private async play(sound: Audio.Sound | null): Promise<void> {
    try {
      await sound?.replayAsync();
    } catch {
      // Keep gameplay running if audio is unavailable on a device.
    }
  }

  private async playAfter(sound: Audio.Sound | null, delayMs: number): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    await this.play(sound);
  }
}
