import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
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
  private readonly laserPlayer = createAudioPlayer(require('../../assets/sfx/laser.wav'));
  private readonly successPlayer = createAudioPlayer(require('../../assets/sfx/correct.wav'));

  public constructor() {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    }).catch(() => undefined);
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
      this.replay(this.laserPlayer),
    ]);
  }

  public async correct(): Promise<void> {
    await Promise.all([
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
      this.replay(this.successPlayer),
    ]);
  }

  public async collision(): Promise<void> {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }

  public async powerUp(): Promise<void> {
    await Promise.all([
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
      this.replay(this.successPlayer),
    ]);
  }

  public stop(): void {
    Speech.stop();
    this.release(this.laserPlayer);
    this.release(this.successPlayer);
  }

  private async replay(player: AudioPlayer): Promise<void> {
    try {
      await player.seekTo(0);
      player.play();
    } catch {
      // Audio feedback is non-critical and must never interrupt gameplay.
    }
  }

  private release(player: AudioPlayer): void {
    try {
      player.pause();
      player.release();
    } catch {
      // The native player may already be released during fast refresh.
    }
  }
}
