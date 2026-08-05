import type { AudioCatalogPort, AudioEffect, AudioMode, SoundPoolFactoryPort, SoundPoolPort } from './AudioContracts';

const EFFECT_CONFIG: Record<AudioEffect, { voices: number; volume: number; rate?: number }> = {
  'laser-primary': { voices: 5, volume: 0.92 },
  'laser-secondary': { voices: 4, volume: 0.58 },
  success: { voices: 2, volume: 0.82 },
  collision: { voices: 2, volume: 0.86 },
  'power-up': { voices: 2, volume: 0.88 },
  'target-lock': { voices: 2, volume: 0.48 },
  'explosion-small': { voices: 4, volume: 0.76 },
  'explosion-large': { voices: 2, volume: 0.96 },
  warning: { voices: 2, volume: 0.68 },
  'ambient-flight': { voices: 1, volume: 0.055 },
  'ambient-combat': { voices: 1, volume: 0.075 },
  'ambient-boss': { voices: 1, volume: 0.105 },
};

const AMBIENCE_BY_MODE: Record<AudioMode, AudioEffect> = {
  flight: 'ambient-flight',
  combat: 'ambient-combat',
  boss: 'ambient-boss',
};

export class GameAudioDirector {
  private readonly pools = new Map<AudioEffect, SoundPoolPort>();
  private mode: AudioMode = 'flight';
  private stopped = false;
  private laserVariation = 0;

  public constructor(
    private readonly catalog: AudioCatalogPort,
    private readonly factory: SoundPoolFactoryPort,
  ) {}

  public async initialize(): Promise<void> {
    const entries = await Promise.all((Object.keys(EFFECT_CONFIG) as AudioEffect[]).map(async (effect) => {
      const config = EFFECT_CONFIG[effect];
      const pool = await this.factory.create(this.catalog.sourceFor(effect), config.voices, {
        volume: config.volume,
        rate: config.rate ?? 1,
      });
      return [effect, pool] as const;
    }));
    if (this.stopped) {
      await Promise.allSettled(entries.map(([, pool]) => pool.unload()));
      return;
    }
    entries.forEach(([effect, pool]) => this.pools.set(effect, pool));
    await this.setMode(this.mode);
  }

  public async laser(): Promise<void> {
    this.laserVariation += 1;
    await Promise.all([
      this.play('laser-primary', { rate: 0.96 + (this.laserVariation % 4) * 0.055 }),
      this.play('laser-secondary', { delayMs: 22, rate: 0.88 + (this.laserVariation % 3) * 0.04 }),
    ]);
  }

  public correct(): Promise<void> { return this.play('success'); }
  public collision(): Promise<void> { return this.play('collision'); }
  public powerUp(): Promise<void> { return this.play('power-up'); }
  public lock(): Promise<void> { return this.play('target-lock'); }
  public warning(): Promise<void> { return this.play('warning'); }
  public explosion(big = false): Promise<void> { return this.play(big ? 'explosion-large' : 'explosion-small'); }

  public async setMode(mode: AudioMode): Promise<void> {
    this.mode = mode;
    const desired = AMBIENCE_BY_MODE[mode];
    await Promise.allSettled((Object.values(AMBIENCE_BY_MODE) as AudioEffect[]).map(async (effect) => {
      const pool = this.pools.get(effect);
      if (!pool) return;
      if (effect === desired) {
        await pool.setLooping(true);
        await pool.play();
      } else {
        await pool.stop();
      }
    }));
  }

  public async stop(): Promise<void> {
    this.stopped = true;
    const pools = [...this.pools.values()];
    this.pools.clear();
    await Promise.allSettled(pools.map((pool) => pool.unload()));
  }

  private async play(effect: AudioEffect, options: { volume?: number; rate?: number; delayMs?: number } = {}): Promise<void> {
    if (this.stopped) return;
    await this.pools.get(effect)?.play(options);
  }
}
