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
  private laserSound: Audio.Sound | null = null;
  private successSound: Audio.Sound | null = null;
  private readonly ready: Promise<void>;
  private stopped = false;

  public constructor() {
    this.ready = this.prepareAudio();
  }

  public speak(text: string): void {
    Speech.stop();
    Speech.speak(text, {
      language: 'en-US',
      rate: 0.88,
      pitch: 1.12,
      volume: 1,
    });
  }

  public async laser(): Promise<void> {
    await Promise.all([
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
      this.play(() => this.laserSound),
    ]);
  }

  public async correct(): Promise<void> {
    await Promise.all([
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
      this.play(() => this.successSound),
    ]);
  }

  public async collision(): Promise<void> {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }

  public async powerUp(): Promise<void> {
    await Promise.all([
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
      this.play(() => this.successSound),
    ]);
  }

  public stop(): void {
    Speech.stop();
    this.stopped = true;
    void this.ready.finally(async () => {
      const sounds = [this.laserSound, this.successSound].filter(
        (sound): sound is Audio.Sound => sound !== null,
      );
      this.laserSound = null;
      this.successSound = null;
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
      const [laser, success] = await Promise.all([
        Audio.Sound.createAsync(require('../../assets/sfx/laser.wav'), {
          shouldPlay: false,
          volume: 1,
        }),
        Audio.Sound.createAsync(require('../../assets/sfx/correct.wav'), {
          shouldPlay: false,
          volume: 0.9,
        }),
      ]);

      if (this.stopped) {
        await Promise.allSettled([
          laser.sound.unloadAsync(),
          success.sound.unloadAsync(),
        ]);
        return;
      }

      this.laserSound = laser.sound;
      this.successSound = success.sound;
    } catch {
      // Audio feedback is non-critical and must never interrupt gameplay.
    }
  }

  private async play(getSound: () => Audio.Sound | null): Promise<void> {
    try {
      await this.ready;
      await getSound()?.replayAsync();
    } catch {
      // Keep gameplay running if audio is unavailable on a device.
    }
  }
}
