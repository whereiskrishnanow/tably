import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, currency, fonts, radius, spacing } from '../../theme/tokens';
import { getItem } from '../../data/menu';
import { computeUnitPrice, defaultVariantSelections, useCart, type AddConfig } from '../../store/cart';
import { AppText } from '../../components/ui/AppText';
import { DietaryDot, SpiceIndicator, Tag } from '../../components/ui/Badges';
import { Button } from '../../components/ui/Button';
import { PressableScale } from '../../components/ui/PressableScale';
import { Sheet } from '../../components/ui/Sheet';
import { Stepper } from '../../components/ui/Stepper';

const NOTE_MAX = 120;

/** Food item detail, presented over a transparent modal route as a bottom sheet. */
export default function ItemDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';

  const item = useMemo(() => {
    try {
      return getItem(id);
    } catch {
      return undefined;
    }
  }, [id]);

  const addItem = useCart((s) => s.addItem);

  const [open, setOpen] = useState(true);
  const [qty, setQty] = useState(1);
  const [selections, setSelections] = useState<Record<string, string>>(() =>
    item ? defaultVariantSelections(item) : {},
  );
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const closingRef = useRef(false);

  const close = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setOpen(false);
    setTimeout(() => router.back(), 200);
  };

  useEffect(() => {
    if (!item) router.back();
  }, [item]);

  if (!item) return null;

  const unitPrice = computeUnitPrice(item, selections, addonIds);
  const total = unitPrice * qty;

  const toggleAddon = (addonId: string) =>
    setAddonIds((prev) => (prev.includes(addonId) ? prev.filter((a) => a !== addonId) : [...prev, addonId]));

  const addToOrder = () => {
    const trimmedNote = note.trim();
    const config: AddConfig = {
      quantity: qty,
      variantSelections: selections,
      addonIds,
      note: trimmedNote.length > 0 ? trimmedNote : undefined,
    };
    addItem(item.id, config);
    close();
  };

  return (
    <Sheet visible={open} onClose={close} maxHeightFraction={0.9}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flexShrink: 1 }}
      >
        <ScrollView
          style={{ flexShrink: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.lg }}
        >
          {/* Hero */}
          <View>
            <Image
              source={item.image}
              style={{ width: '100%', height: 230, backgroundColor: colors.surfaceSunken }}
              contentFit="cover"
              transition={200}
              accessibilityLabel={item.name}
            />
            <PressableScale
              haptic
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={close}
              style={{
                position: 'absolute',
                top: spacing.sm,
                right: spacing.md,
                width: 36,
                height: 36,
                borderRadius: radius.pill,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={20} color={colors.ink} />
            </PressableScale>
          </View>

          {/* Title block */}
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <DietaryDot dietary={item.dietary} />
              <AppText variant="title" style={{ flex: 1 }}>
                {item.name}
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
              {item.bestseller ? <Tag label="★ Bestseller" tone="gold" /> : null}
              {item.chefSpecial ? <Tag label="Chef's special" tone="accent" /> : null}
              <SpiceIndicator level={item.spice} />
            </View>
            <AppText variant="heading" style={{ marginTop: spacing.xxs }}>
              {currency(item.price)}
            </AppText>
            <AppText variant="secondary">{item.longDescription}</AppText>
          </View>

          {/* What's inside */}
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl, gap: spacing.sm }}>
            <AppText variant="bodyStrong">What's inside</AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {item.ingredients.map((ingredient) => (
                <View
                  key={ingredient}
                  style={{
                    backgroundColor: colors.surfaceSubtle,
                    borderRadius: radius.pill,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 5,
                  }}
                >
                  <AppText variant="caption">{ingredient}</AppText>
                </View>
              ))}
            </View>
            {item.allergens.length > 0 ? (
              <AppText variant="caption" style={{ color: colors.inkTertiary }}>
                Contains: {item.allergens.join(', ')}
              </AppText>
            ) : null}
          </View>

          {/* Variant groups */}
          {item.variantGroups.map((group) => (
            <View key={group.id} style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
              <AppText variant="bodyStrong" style={{ marginBottom: spacing.xxs }}>
                {group.name}
              </AppText>
              {group.options.map((option) => {
                const selected = selections[group.id] === option.id;
                return (
                  <PressableScale
                    key={option.id}
                    haptic
                    pressedScale={0.99}
                    accessibilityRole="radio"
                    accessibilityLabel={`${option.name}${option.priceDelta > 0 ? `, plus ${currency(option.priceDelta)}` : ''}`}
                    accessibilityState={{ selected }}
                    onPress={() => setSelections((prev) => ({ ...prev, [group.id]: option.id }))}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                      paddingVertical: spacing.sm,
                    }}
                  >
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        borderWidth: 1.5,
                        borderColor: selected ? colors.accent : colors.borderStrong,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {selected ? (
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent }} />
                      ) : null}
                    </View>
                    <AppText variant="body" style={{ flex: 1 }}>
                      {option.name}
                    </AppText>
                    {option.priceDelta > 0 ? (
                      <AppText variant="caption">+{currency(option.priceDelta)}</AppText>
                    ) : null}
                  </PressableScale>
                );
              })}
            </View>
          ))}

          {/* Add-ons */}
          {item.addons.length > 0 ? (
            <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
              <AppText variant="bodyStrong" style={{ marginBottom: spacing.xxs }}>
                Add-ons
              </AppText>
              {item.addons.map((addon) => {
                const checked = addonIds.includes(addon.id);
                return (
                  <PressableScale
                    key={addon.id}
                    haptic
                    pressedScale={0.99}
                    accessibilityRole="checkbox"
                    accessibilityLabel={`${addon.name}, plus ${currency(addon.price)}`}
                    accessibilityState={{ checked }}
                    onPress={() => toggleAddon(addon.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                      paddingVertical: spacing.sm,
                    }}
                  >
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        borderWidth: 1.5,
                        borderColor: checked ? colors.accent : colors.borderStrong,
                        backgroundColor: checked ? colors.accent : colors.surface,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {checked ? (
                        <AppText style={{ fontFamily: fonts.bold, fontSize: 11, lineHeight: 13, color: colors.inkInverse }}>
                          ✓
                        </AppText>
                      ) : null}
                    </View>
                    <AppText variant="body" style={{ flex: 1 }}>
                      {addon.name}
                    </AppText>
                    <AppText variant="caption">+{currency(addon.price)}</AppText>
                  </PressableScale>
                );
              })}
            </View>
          ) : null}

          {/* Special instructions */}
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl, gap: spacing.xs }}>
            <AppText variant="bodyStrong">Special instructions</AppText>
            <TextInput
              multiline
              value={note}
              onChangeText={setNote}
              maxLength={NOTE_MAX}
              placeholder="Add a note for the kitchen…"
              placeholderTextColor={colors.inkTertiary}
              accessibilityLabel="Special instructions for the kitchen"
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: spacing.sm,
                minHeight: 72,
                textAlignVertical: 'top',
                fontFamily: fonts.regular,
                fontSize: 15,
                lineHeight: 21,
                color: colors.ink,
              }}
            />
            {note.length > 0 ? (
              <AppText variant="caption" style={{ color: colors.inkTertiary, textAlign: 'right' }}>
                {note.length}/{NOTE_MAX}
              </AppText>
            ) : null}
          </View>
        </ScrollView>

        {/* Footer */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
          }}
        >
          <Stepper value={qty} onChange={setQty} min={1} />
          <Button
            label="Add to order"
            detail={currency(total)}
            onPress={addToOrder}
            style={{ flex: 1 }}
            accessibilityLabel={`Add ${qty} to order, ${currency(total)}`}
          />
        </View>
      </KeyboardAvoidingView>
    </Sheet>
  );
}
