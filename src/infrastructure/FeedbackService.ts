import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import type { AudioMode } from './audio/AudioContracts';
import { ExpoSoundPoolFactory } from './audio/ExpoSoundPool';
import { GameAudioDirector } from './audio/GameAudioDirector';
import { NumberNovaAudioCatalog } from './audio/NumberNovaAudioCatalog';

export type { AudioMode } from './audio/AudioContracts';

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
  private readonly audio = new GameAudioDirector(new NumberNovaAudioCatalog(), new ExpoSoundPoolFactory());
  private readonly ready: Promise<void>;
  private stopped = false;

  public constructor() {
    this.ready = this.prepareAudio();
  }

  public speak(text: string): void {
    Speech.stop();
    Speech.speak(text, { language: 'en-US', rate: 0.9, pitch: 1.08, volume: 0.88 });
  }

  public async laser(): Promise<void> {
    await this.withAudio(() => this.audio.laser());
    await this.safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  }

  public async correct(): Promise<void> {
    await Promise.all([
      this.withAudio(() => this.audio.correct()),
      this.safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
    ]);
  }

  public async collision(): Promise<void> {
    await Promise.all([
      this.withAudio(() => this.audio.collision()),
      this.safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
    ]);
  }

  public async powerUp(): Promise<void> {
    await Promise.all([
      this.withAudio(() => this.audio.powerUp()),
      this.safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
    ]);
  }

  public async lock(): Promise<void> {
    await Promise.all([
      this.withAudio(() => this.audio.lock()),
      this.safeHaptic(() => Haptics.selectionAsync()),
    ]);
  }

  public async explosion(big = false): Promise<void> {
    await Promise.all([
      this.withAudio(() => this.audio.explosion(big)),
      this.safeHaptic(() => Haptics.impactAsync(big ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium)),
    ]);
  }

  public async warning(): Promise<void> {
    await Promise.all([
      this.withAudio(() => this.audio.warning()),
      this.safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
    ]);
  }

  public async setMode(mode: AudioMode): Promise<void> {
    await this.withAudio(() => this.audio.setMode(mode));
  }

  public stop(): void {
    Speech.stop();
    this.stopped = true;
    void this.ready.finally(() => this.audio.stop());
  }

  private async prepareAudio(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
      });
      if (!this.stopped) await this.audio.initialize();
    } catch {
      // Feedback is optional and must never block or crash gameplay.
    }
  }

  private async withAudio(action: () => Promise<void>): Promise<void> {
    try {
      await this.ready;
      if (!this.stopped) await action();
    } catch {
      // Gameplay remains authoritative if the operating system rejects audio.
    }
  }

  private async safeHaptic(action: () => Promise<void>): Promise<void> {
    try { await action(); } catch { /* haptics are optional */ }
  }
}
