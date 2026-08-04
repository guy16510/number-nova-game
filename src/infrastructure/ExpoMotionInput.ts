import { DeviceMotion } from 'expo-sensors';
import { MotionFilter, type MotionFilterConfig } from '../domain/MotionFilter';
import type { SteeringInput } from '../domain/types';

export interface MotionInputPort {
  start(listener: (input: SteeringInput) => void): Promise<boolean>;
  calibrate(): Promise<void>;
  stop(): void;
}

interface RotationSample {
  readonly beta: number;
  readonly gamma: number;
}

export class ExpoMotionInput implements MotionInputPort {
  private readonly filter: MotionFilter;
  private subscription: { remove(): void } | null = null;
  private listener: ((input: SteeringInput) => void) | null = null;
  private latestRotation: RotationSample = { beta: 0, gamma: 0 };
  private calibrationSamples: RotationSample[] = [];
  private calibrationResolve: (() => void) | null = null;

  public constructor(config?: MotionFilterConfig) {
    this.filter = new MotionFilter(config);
  }

  public async start(listener: (input: SteeringInput) => void): Promise<boolean> {
    this.listener = listener;
    const available = await DeviceMotion.isAvailableAsync();
    if (!available) {
      return false;
    }

    const permission = await DeviceMotion.requestPermissionsAsync();
    if (!permission.granted) {
      return false;
    }

    DeviceMotion.setUpdateInterval(16);
    this.subscription?.remove();
    this.subscription = DeviceMotion.addListener((measurement) => {
      const rotation = measurement.rotation;
      if (!rotation) {
        return;
      }
      this.latestRotation = { beta: rotation.beta, gamma: rotation.gamma };
      this.captureCalibrationSample(this.latestRotation);
      this.listener?.(this.filter.update(rotation.beta, rotation.gamma));
    });
    return true;
  }

  public async calibrate(): Promise<void> {
    this.calibrationSamples = [];
    return new Promise<void>((resolve) => {
      this.calibrationResolve = resolve;
      setTimeout(() => {
        this.finishCalibration();
      }, 900);
    });
  }

  public stop(): void {
    this.subscription?.remove();
    this.subscription = null;
    this.listener = null;
  }

  private captureCalibrationSample(sample: RotationSample): void {
    if (!this.calibrationResolve) {
      return;
    }
    this.calibrationSamples.push(sample);
    if (this.calibrationSamples.length >= 18) {
      this.finishCalibration();
    }
  }

  private finishCalibration(): void {
    if (!this.calibrationResolve) {
      return;
    }
    const samples = this.calibrationSamples.length > 0
      ? this.calibrationSamples
      : [this.latestRotation];
    const beta = samples.reduce((sum, sample) => sum + sample.beta, 0) / samples.length;
    const gamma = samples.reduce((sum, sample) => sum + sample.gamma, 0) / samples.length;
    this.filter.calibrate(beta, gamma);
    const resolve = this.calibrationResolve;
    this.calibrationResolve = null;
    this.calibrationSamples = [];
    resolve();
  }
}
