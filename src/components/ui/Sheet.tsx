import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../../theme/tokens';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Fraction of screen height the sheet may grow to (content can be shorter). */
  maxHeightFraction?: number;
}

/**
 * Cross-platform bottom sheet (iOS / Android / web): dimmed backdrop,
 * spring-in panel with a grab handle, tap-outside or handle-drag area to close.
 */
export function Sheet({ visible, onClose, children, maxHeightFraction = 0.88 }: SheetProps) {
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;

  const animate = useCallback(
    (toValue: number, done?: () => void) => {
      Animated.timing(progress, { toValue, duration: 240, useNativeDriver: true }).start(done);
    },
    [progress],
  );

  useEffect(() => {
    if (visible) {
      setMounted(true);
      requestAnimationFrame(() => animate(1));
    } else if (mounted) {
      animate(0, () => setMounted(false));
    }
  }, [visible, mounted, animate]);

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={{ flex: 1, backgroundColor: colors.overlay, opacity: progress }}>
        <Pressable accessibilityLabel="Close" style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: screenHeight * maxHeightFraction,
          backgroundColor: colors.surface,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          paddingBottom: insets.bottom,
          overflow: 'hidden',
          transform: [
            {
              translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [screenHeight * maxHeightFraction, 0] }),
            },
          ],
        }}
      >
        <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong }} />
        </View>
        {children}
      </Animated.View>
    </Modal>
  );
}
