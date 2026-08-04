import type { SteeringInput } from './types';

export interface MotionFilterConfig {
  readonly horizontalRangeRadians: number;
  readonly verticalRangeRadians: number;
  readonly deadZone: number;
  readonly smoothing: number;
  readonly sensitivity: number;
}

export const DEFAULT_MOTION_FILTER_CONFIG: MotionFilterConfig = {
  horizontalRangeRadians: 0.42,
  verticalRangeRadians: 0.32,
  deadZone: 0.06,
  smoothing: 0.22,
  sensitivity: 1,
};

const clamp = (value: number): number => Math.max(-1, Math.min(1, value));

const applyDeadZone = (value: number, deadZone: number): number => {
  if (Math.abs(value) <= deadZone) {
    return 0;
  }
  const sign = Math.sign(value);
  return sign * ((Math.abs(value) - deadZone) / (1 - deadZone));
};

export class MotionFilter {
  private neutralBeta = 0;
  private neutralGamma = 0;
  private filtered: SteeringInput = { x: 0, y: 0 };

  public constructor(private readonly config: MotionFilterConfig = DEFAULT_MOTION_FILTER_CONFIG) {}

  public calibrate(beta: number, gamma: number): void {
    this.neutralBeta = beta;
    this.neutralGamma = gamma;
    this.filtered = { x: 0, y: 0 };
  }

  public update(beta: number, gamma: number): SteeringInput {
    const rawX = Math.max(-1, Math.min(1, ((gamma - this.neutralGamma) / this.config.horizontalRangeRadians) * this.config.sensitivity));
    const rawY = Math.max(-1, Math.min(1, (-(beta - this.neutralBeta) / this.config.verticalRangeRadians) * this.config.sensitivity));
    const targetX = applyDeadZone(rawX, this.config.deadZone);
    const targetY = applyDeadZone(rawY, this.config.deadZone);
    const alpha = this.config.smoothing;
    this.filtered = {
      x: this.filtered.x + (targetX - this.filtered.x) * alpha,
      y: this.filtered.y + (targetY - this.filtered.y) * alpha,
    };
    return this.filtered;
  }
}
