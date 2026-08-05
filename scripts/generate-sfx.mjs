import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 11025;
const OUTPUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets/sfx');
fs.mkdirSync(OUTPUT, { recursive: true });

class Random {
  constructor(seed = 42) { this.value = seed >>> 0; }
  next() {
    this.value = (1664525 * this.value + 1013904223) >>> 0;
    return this.value / 0xffffffff;
  }
  bipolar() { return this.next() * 2 - 1; }
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const envelope = (time, duration, attack = 0.01, release = 0.2) => {
  if (time < attack) return time / attack;
  if (time > duration - release) return Math.max(0, (duration - time) / release);
  return 1;
};
const oscillator = (frequency, time, shape = 'sine') => {
  const phase = 2 * Math.PI * frequency * time;
  if (shape === 'square') return Math.sin(phase) >= 0 ? 1 : -1;
  if (shape === 'saw') return 2 * ((frequency * time) % 1) - 1;
  if (shape === 'triangle') return 2 * Math.abs(2 * ((frequency * time) % 1) - 1) - 1;
  return Math.sin(phase);
};

const writeWave = (name, samples) => {
  const peak = Math.max(1, ...samples.map((value) => Math.abs(value)));
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  samples.forEach((sample, index) => {
    buffer.writeInt16LE(Math.round(clamp((sample / peak) * 0.92, -1, 1) * 32767), 44 + index * 2);
  });
  fs.writeFileSync(path.join(OUTPUT, name), buffer);
};

const render = (duration, generator) => Array.from(
  { length: Math.floor(SAMPLE_RATE * duration) },
  (_, index) => generator(index / SAMPLE_RATE, duration),
);

const random = new Random();
writeWave('laser-primary.wav', render(0.22, (time, duration) => {
  const frequency = 1250 * (1 - time / duration) + 340 * (time / duration);
  return (0.65 * oscillator(frequency, time, 'square') + 0.25 * oscillator(frequency * 1.5, time) + 0.12 * random.bipolar())
    * envelope(time, duration, 0.003, 0.09);
}));
writeWave('laser-secondary.wav', render(0.28, (time, duration) => {
  const frequency = 700 + 450 * Math.sin(Math.PI * time / duration);
  return (0.55 * oscillator(frequency, time, 'saw') + 0.3 * oscillator(frequency * 2.02, time) + 0.08 * random.bipolar())
    * envelope(time, duration, 0.005, 0.12);
}));
writeWave('success.wav', render(0.55, (time) => [523.25, 659.25, 783.99, 1046.5].reduce((sum, note, index) => {
  const local = time - index * 0.09;
  return local >= 0 && local < 0.26
    ? sum + 0.42 * (oscillator(note, local) + 0.35 * oscillator(note * 2, local)) * envelope(local, 0.26, 0.005, 0.16)
    : sum;
}, 0)));
writeWave('collision.wav', render(0.42, (time, duration) => {
  const frequency = 150 - 80 * time / duration;
  return (0.55 * random.bipolar() + 0.5 * oscillator(frequency, time, 'square') + 0.25 * oscillator(frequency * 0.5, time))
    * envelope(time, duration, 0.002, 0.3);
}));
writeWave('power-up.wav', render(0.8, (time, duration) => {
  const frequency = 180 + 900 * Math.pow(time / duration, 1.6);
  return (0.45 * oscillator(frequency, time) + 0.22 * oscillator(frequency * 1.5, time) + 0.15 * oscillator(frequency * 0.5, time, 'triangle'))
    * envelope(time, duration, 0.01, 0.18);
}));
writeWave('target-lock.wav', render(0.32, (time) => [[0, 980], [0.11, 1320]].reduce((sum, [start, frequency]) => {
  const local = time - start;
  return local >= 0 && local < 0.075 ? sum + 0.7 * oscillator(frequency, local, 'square') * envelope(local, 0.075, 0.002, 0.03) : sum;
}, 0)));
const explosion = (duration, baseFrequency, large) => render(duration, (time) => {
  const frequency = baseFrequency * (1 - 0.55 * time / duration);
  const rumble = 0.65 * oscillator(frequency, time) + 0.28 * oscillator(frequency * 0.5, time, 'square');
  const crack = (time < 0.08 ? 0.9 : 0.35) * random.bipolar();
  return (rumble + crack) * (large ? 1 : 0.8) * envelope(time, duration, 0.001, large ? 0.45 : 0.3);
});
writeWave('explosion-small.wav', explosion(0.55, 150, false));
writeWave('explosion-large.wav', explosion(1.1, 95, true));
writeWave('warning.wav', render(0.9, (time) => [0, 0.36].reduce((sum, start) => {
  const local = time - start;
  return local >= 0 && local < 0.24
    ? sum + 0.55 * (oscillator(440, local, 'square') + 0.35 * oscillator(660, local)) * envelope(local, 0.24, 0.01, 0.08)
    : sum;
}, 0)));

const ambience = (duration, base, modulation, noise, pulseCount) => render(duration, (time) => {
  const frequency = base + modulation * Math.sin(2 * Math.PI * time / duration);
  const pulse = 0.72 + 0.18 * Math.sin(2 * Math.PI * pulseCount * time / duration);
  return (0.38 * oscillator(frequency, time) + 0.18 * oscillator(frequency * 2, time, 'saw') + noise * random.bipolar()) * pulse;
});
writeWave('ambient-flight.wav', ambience(1.2, 72, 8, 0.05, 1));
writeWave('ambient-combat.wav', ambience(1, 92, 18, 0.08, 2));
writeWave('ambient-boss.wav', ambience(1.2, 48, 10, 0.1, 1));

console.log('Generated 12 immersive Number Nova sound assets.');
