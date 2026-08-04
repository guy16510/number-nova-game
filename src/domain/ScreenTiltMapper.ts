export interface GravitySample {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface ScreenTilt {
  readonly beta: number;
  readonly gamma: number;
}

const screenAxes = (
  gravity: GravitySample,
  orientation: number,
): GravitySample => {
  switch (orientation) {
    case 90:
      return { x: -gravity.y, y: gravity.x, z: gravity.z };
    case -90:
      return { x: gravity.y, y: -gravity.x, z: gravity.z };
    case 180:
      return { x: -gravity.x, y: -gravity.y, z: gravity.z };
    default:
      return gravity;
  }
};

/**
 * Maps the gravity vector into screen-relative tilt angles.
 *
 * Expo reports sensor axes relative to portrait hardware coordinates even when
 * the game is locked to landscape. Normalizing here keeps steering consistent
 * across landscape-left, landscape-right, and touch-test recordings.
 */
export const mapGravityToScreenTilt = (
  gravity: GravitySample,
  orientation: number,
): ScreenTilt => {
  const screen = screenAxes(gravity, orientation);
  const beta = Math.atan2(
    screen.y,
    Math.sqrt(screen.x * screen.x + screen.z * screen.z),
  );
  const gamma = Math.atan2(
    screen.x,
    Math.sqrt(screen.y * screen.y + screen.z * screen.z),
  );
  return { beta, gamma };
};
