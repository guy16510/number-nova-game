import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

export interface FeedbackPort {
  speak(text: string): void;
  correct(): Promise<void>;
  collision(): Promise<void>;
  powerUp(): Promise<void>;
  stop(): void;
}

export class ExpoFeedbackService implements FeedbackPort {
  public speak(text: string): void {
    Speech.stop();
    Speech.speak(text, {
      language: 'en-US',
      rate: 0.88,
      pitch: 1.12,
      volume: 1,
    });
  }

  public async correct(): Promise<void> {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  public async collision(): Promise<void> {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }

  public async powerUp(): Promise<void> {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  public stop(): void {
    Speech.stop();
  }
}
