import { useEffect, useRef } from 'react';
import { Animated, type DimensionValue } from 'react-native';
import { colors, radius } from '../../theme/tokens';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: object;
}

/** Pulsing placeholder block for loading states. */
export function Skeleton({ width = '100%', height = 16, borderRadius = radius.xs, style }: SkeletonProps) {
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return <Animated.View style={[{ width, height, borderRadius, backgroundColor: colors.surfaceSunken, opacity: pulse }, style]} />;
}
