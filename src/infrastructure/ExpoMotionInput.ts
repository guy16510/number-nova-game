import { DeviceMotion } from 'expo-sensors';
import { MotionFilter, type MotionFilterConfig } from '../domain/MotionFilter';
import { mapGravityToScreenTilt } from '../domain/ScreenTiltMapper';
import type { SteeringInput } from '../domain/types';

export interface MotionInputPort {
  start(listener: (input: SteeringInput) => void): Promise<boolean>;
  calibrate(): Promise<void>;
  stop(): void;
}

interface TiltSample {
  readonly beta: number;
  readonly gamma: number;
}

export class ExpoMotionInput implements MotionInputPort {
  private readonly filter: MotionFilter;
  private subscription: { remove(): void } | null = null;
  private listener: ((input: SteeringInput) => void) | null = null;
  private latestTilt: TiltSample = { beta: 0, gamma: 0 };
  private calibrationSamples: TiltSample[] = [];
  private calibrationResolve: (() => void) | null = null;
  private calibrationTimer: ReturnType<typeof setTimeout> | null = null;

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
      const gravity = measurement.accelerationIncludingGravity;
      if (!gravity) {
        return;
      }

      const tilt = mapGravityToScreenTilt(gravity, measurement.orientation);
      this.latestTilt = tilt;
      this.captureCalibrationSample(tilt);
      this.listener?.(this.filter.update(tilt.beta, tilt.gamma));
    });
    return true;
  }

  public async calibrate(): Promise<void> {
    this.cancelPendingCalibration();
    this.calibrationSamples = [];
    return new Promise<void>((resolve) => {
      this.calibrationResolve = resolve;
      this.calibrationTimer = setTimeout(() => {
        this.finishCalibration();
      }, 900);
    });
  }

  public stop(): void {
    this.subscription?.remove();
    this.subscription = null;
    this.listener = null;
    this.cancelPendingCalibration();
  }

  private captureCalibrationSample(sample: TiltSample): void {
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
    if (this.calibrationTimer) {
      clearTimeout(this.calibrationTimer);
      this.calibrationTimer = null;
    }
    const samples = this.calibrationSamples.length > 0
      ? this.calibrationSamples
      : [this.latestTilt];
    const beta = samples.reduce((sum, sample) => sum + sample.beta, 0) / samples.length;
    const gamma = samples.reduce((sum, sample) => sum + sample.gamma, 0) / samples.length;
    this.filter.calibrate(beta, gamma);
    const resolve = this.calibrationResolve;
    this.calibrationResolve = null;
    this.calibrationSamples = [];
    resolve();
  }

  private cancelPendingCalibration(): void {
    if (this.calibrationTimer) {
      clearTimeout(this.calibrationTimer);
      this.calibrationTimer = null;
    }
    const resolve = this.calibrationResolve;
    this.calibrationResolve = null;
    this.calibrationSamples = [];
    resolve?.();
  }
}
