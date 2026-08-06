import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

export interface ResponsiveLandscapeMetrics {
  readonly width: number;
  readonly height: number;
  readonly isCompact: boolean;
  readonly isShort: boolean;
  readonly scale: number;
  readonly spacingScale: number;
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const useResponsiveLandscape = (): ResponsiveLandscapeMetrics => {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const scale = clamp(Math.min(width / 844, height / 390), 0.72, 1.12);
    const spacingScale = clamp(Math.min(width / 932, height / 430), 0.75, 1);

    return {
      width,
      height,
      isCompact: width < 760 || height < 360,
      isShort: height < 390,
      scale,
      spacingScale,
    };
  }, [height, width]);
};
