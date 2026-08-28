import { useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, type PressableProps, type ViewStyle, type StyleProp } from 'react-native';
import * as Haptics from 'expo-haptics';

interface PressableScaleProps extends PressableProps {
  style?: StyleProp<ViewStyle>;
  /** How far to scale down while pressed. */
  pressedScale?: number;
  haptic?: boolean;
  children?: React.ReactNode;
}

// Style keys that must live on the OUTER Pressable so it participates in the
// parent's layout (the scale transform lives on an inner Animated.View).
const OUTER_KEYS = [
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'alignSelf',
  'width',
  'minWidth',
  'maxWidth',
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginHorizontal',
  'marginVertical',
  'position',
  'top',
  'bottom',
  'left',
  'right',
  'zIndex',
] as const;

/**
 * The app's standard tappable surface: scales down subtly while pressed and
 * (on device) gives a light haptic tick. Layout-positioning styles are hoisted
 * to the Pressable itself; visual styles stay on the animated inner view.
 */
export function PressableScale({ style, pressedScale = 0.97, haptic = false, onPressIn, onPress, children, ...rest }: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const flat = StyleSheet.flatten(style) ?? {};
  const outer: ViewStyle = {};
  const inner: ViewStyle = { ...flat };
  for (const key of OUTER_KEYS) {
    if (key in flat) {
      (outer as Record<string, unknown>)[key] = (flat as Record<string, unknown>)[key];
      delete (inner as Record<string, unknown>)[key];
    }
  }
  // When the outer box is being sized by the parent, let the inner face fill it.
  const outerSized = 'flex' in outer || 'width' in outer || 'alignSelf' in outer || flat.position === 'absolute';
  if (outerSized) {
    inner.flex = inner.flex ?? 1;
    inner.width = '100%';
  }

  return (
    <Pressable
      {...rest}
      style={outer}
      onPressIn={(e) => {
        Animated.spring(scale, { toValue: pressedScale, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
        onPressIn?.(e);
      }}
      onPressOut={() => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
      }}
      onPress={(e) => {
        if (haptic && Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        onPress?.(e);
      }}
    >
      <Animated.View style={[inner, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
