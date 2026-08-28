import { View } from 'react-native';
import { colors, currency, spacing } from '../theme/tokens';
import type { CartLine } from '../domain/types';
import { getItem } from '../data/menu';
import { lineTotal, useCart } from '../store/cart';
import { AppText } from './ui/AppText';
import { DietaryDot, Tag } from './ui/Badges';
import { Stepper } from './ui/Stepper';

interface OrderLineRowProps {
  line: CartLine;
  /** Editable rows get a stepper; read-only rows show "× qty". */
  editable?: boolean;
}

export function describeLineConfig(line: CartLine): string | null {
  const item = getItem(line.menuItemId);
  const parts: string[] = [];
  for (const group of item.variantGroups) {
    const opt = group.options.find((o) => o.id === line.variantSelections[group.id]);
    if (opt && opt.id !== group.defaultOptionId) parts.push(opt.name);
  }
  for (const addonId of line.addonIds) {
    const addon = item.addons.find((a) => a.id === addonId);
    if (addon) parts.push(addon.name);
  }
  if (line.note) parts.push(`“${line.note}”`);
  return parts.length ? parts.join(' · ') : null;
}

/** One line of an order: name + config on the left, stepper/qty + total on the right. */
export function OrderLineRow({ line, editable = false }: OrderLineRowProps) {
  const item = getItem(line.menuItemId);
  const setQuantity = useCart((s) => s.setQuantity);
  const config = describeLineConfig(line);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm }}>
      <DietaryDot dietary={item.dietary} size={13} />
      <View style={{ flex: 1, gap: 3 }}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {item.name}
        </AppText>
        {config ? (
          <AppText variant="caption" numberOfLines={1}>
            {config}
          </AppText>
        ) : null}
        {line.sourceRef ? <Tag label={`Inspired by Table ${line.sourceRef.tableNumber}`} tone="accent" /> : null}
      </View>
      {editable ? (
        <Stepper size="sm" value={line.quantity} onChange={(next) => setQuantity(line.id, next)} />
      ) : (
        <AppText variant="secondary">× {line.quantity}</AppText>
      )}
      <AppText variant="bodyStrong" style={{ minWidth: 64, textAlign: 'right', color: colors.ink }}>
        {currency(lineTotal(line))}
      </AppText>
    </View>
  );
}
