import { View } from 'react-native';
import { colors, fonts, radius, shadows } from '../theme/tokens';
import type { MenuItem } from '../domain/types';
import { selectMyLines, useCart } from '../store/cart';
import { AppText } from './ui/AppText';
import { PressableScale } from './ui/PressableScale';
import { Stepper } from './ui/Stepper';

interface AddButtonProps {
  item: MenuItem;
  /** Show the small "Customisable" hint under the button. */
  showHint?: boolean;
}

/**
 * The standard "+ Add" control. Adds instantly with default options (toast
 * confirms); once the item is in your order it becomes a quantity stepper.
 * Customization happens on the item's detail sheet.
 */
export function AddButton({ item, showHint = true }: AddButtonProps) {
  const myLines = useCart(selectMyLines);
  const addItem = useCart((s) => s.addItem);
  const setQuantity = useCart((s) => s.setQuantity);

  const itemLines = myLines.filter((l) => l.menuItemId === item.id);
  const quantity = itemLines.reduce((n, l) => n + l.quantity, 0);
  const lastLine = itemLines[itemLines.length - 1];
  const customisable = item.variantGroups.length > 0 || item.addons.length > 0;

  return (
    <View style={{ alignItems: 'center', gap: 3 }}>
      {quantity === 0 ? (
        <PressableScale
          haptic
          accessibilityRole="button"
          accessibilityLabel={`Add ${item.name} to your order`}
          onPress={() => addItem(item.id)}
          style={[
            {
              backgroundColor: colors.surface,
              borderWidth: 1.5,
              borderColor: colors.accent,
              borderRadius: radius.sm,
              paddingHorizontal: 22,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
            },
            shadows.subtle,
          ]}
        >
          <AppText style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.accent, letterSpacing: 0.6 }}>ADD</AppText>
        </PressableScale>
      ) : (
        <Stepper
          size="sm"
          value={quantity}
          onChange={(next) => {
            if (!lastLine) return;
            if (next > quantity) setQuantity(lastLine.id, lastLine.quantity + 1);
            else setQuantity(lastLine.id, lastLine.quantity - 1);
          }}
        />
      )}
      {showHint && customisable ? (
        <AppText style={{ fontFamily: fonts.regular, fontSize: 10, color: colors.inkTertiary }}>Customisable</AppText>
      ) : null}
    </View>
  );
}
