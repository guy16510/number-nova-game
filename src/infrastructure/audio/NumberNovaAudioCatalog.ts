import type { AVPlaybackSource } from 'expo-av';
import type { AudioCatalogPort, AudioEffect } from './AudioContracts';

const SOURCES: Record<AudioEffect, AVPlaybackSource> = {
  'laser-primary': require('../../../assets/sfx/laser-primary.wav'),
  'laser-secondary': require('../../../assets/sfx/laser-secondary.wav'),
  success: require('../../../assets/sfx/success.wav'),
  collision: require('../../../assets/sfx/collision.wav'),
  'power-up': require('../../../assets/sfx/power-up.wav'),
  'target-lock': require('../../../assets/sfx/target-lock.wav'),
  'explosion-small': require('../../../assets/sfx/explosion-small.wav'),
  'explosion-large': require('../../../assets/sfx/explosion-large.wav'),
  warning: require('../../../assets/sfx/warning.wav'),
  'ambient-flight': require('../../../assets/sfx/ambient-flight.wav'),
  'ambient-combat': require('../../../assets/sfx/ambient-combat.wav'),
  'ambient-boss': require('../../../assets/sfx/ambient-boss.wav'),
};

export class NumberNovaAudioCatalog implements AudioCatalogPort {
  public sourceFor(effect: AudioEffect): AVPlaybackSource {
    return SOURCES[effect];
  }
}
