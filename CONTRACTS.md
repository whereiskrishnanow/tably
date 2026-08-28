# Tably — Screen Implementation Contracts

Tably is a premium dine-in ordering app (Expo SDK 57, expo-router, TypeScript, React 19, RN 0.86).
The current diner is at **Table 12** of **The Courtyard Kitchen**. The killer feature is
cross-table discovery: see what other tables ordered and copy items into your own order.

**Read these files before writing any code** (they are the API you build against):

- `src/theme/tokens.ts` — colors, spacing, radius, fonts, type variants, shadows, `currency(paise)`
- `src/domain/types.ts` — all domain types
- `src/data/menu.ts` — `categories`, `menuItems`, `getItem(id)`
- `src/data/seed.ts` — `restaurant`, `session`, `activeTables`
- `src/store/cart.ts` — `useCart`, `selectMyLines`, `selectCompanionLines`, `selectMyItemCount`, `cartTotals(lines)`, `lineTotal(line)`, `computeUnitPrice`, `defaultVariantSelections`, `AddConfig`
- `src/store/tables.ts` — `useTables`, `selectTablesByRecency`, `selectTable(id)`, `selectPopularity`
- `src/store/orders.ts` — `useOrders`, `selectOrder(id)`, `selectActiveOrders`
- `src/store/toast.ts` — `showToast(message, emoji?)`
- `src/store/notifications.ts` — `useNotifications`, `selectUnreadCount`
- `src/store/sessionStore.ts` — `useSession` (`joined`, `join()`), re-exports `session`
- Components in `src/components/` and `src/components/ui/` (AppText, Button, Chip, Badges, Stepper, Sheet, Skeleton, EmptyState, SectionHeader, PressableScale, Toast; AddButton, FoodRow, FoodCard, TableCard, OrderLineRow, StatusTimeline, CartPill)

## Hard rules

1. **TypeScript must be clean.** No `any`, no `@ts-ignore`. Imports must resolve (relative paths, no `@/` alias for new files).
2. **Never use raw `<Text>`/colors.** Use `AppText` + tokens from `src/theme/tokens.ts`. No hex literals in screens.
3. **Money is integer paise** — always render with `currency()`.
4. **Navigation:** `import { router } from 'expo-router'`; push object form for dynamic routes:
   `router.push({ pathname: '/item/[id]', params: { id } })`. Static: `router.push('/cart')`.
   Tab routes live at `/(tabs)` (`/(tabs)/menu` etc.). Back: `router.back()`.
   To pass a category to menu: `router.push({ pathname: '/(tabs)/menu', params: { category: id } })` and read with `useLocalSearchParams`.
5. **Safe areas:** screens handle their own insets via `useSafeAreaInsets()` from `react-native-safe-area-context`. Tab screens must add bottom padding of at least `120` to scroll content so the tab bar + cart pill never cover content. Non-tab screens: bottom inset + 24.
6. **Cross-platform:** everything must run on iOS, Android AND web (react-native-web). No native-only APIs beyond what's already used (expo-haptics is already wrapped in PressableScale). Do not import reanimated; use core `Animated` from react-native if needed.
7. **Images:** `import { Image } from 'expo-image'` with `contentFit="cover"`, `transition={200}`, and `backgroundColor: colors.surfaceSunken` placeholder. Menu item images come from `item.image` (bundled assets).
8. **Micro-interactions:** every tappable is `PressableScale` (or a component built on it). Adds must feel instant + `showToast(...)` confirmations.
9. **Accessibility:** meaningful `accessibilityLabel`/`accessibilityRole` on interactive elements; never color-only indicators (DietaryDot/Tag components already handle this).
10. **No dead buttons.** Everything visible must work. Don't invent features that need a backend we don't have; the stores above are the whole backend.
11. **Copy tone:** warm, short, confident. No lorem ipsum. ₹ prices, Indian English ("Customisable").
12. Default export a React component from each route file. Add `// eslint-disable` never; write clean code instead.

## Layout language (follow strictly)

- Screen background `colors.background`; cards `colors.surface` with `borderWidth: 1, borderColor: colors.border`, `radius.lg`, `shadows.card`.
- Horizontal screen padding: `spacing.lg` (20).
- Section title: `SectionHeader` (title + optional subtitle + optional action).
- Headers on pushed screens: custom in-screen header row — back button (PressableScale circle 40px, `colors.surface`, border, Ionicons `chevron-back` 22 `colors.ink`) + `AppText variant="heading"` title centered, right slot as needed. Top padding: `insets.top + spacing.sm`.
- Primary CTAs: `Button` component, usually pinned above the bottom inset inside a surface footer with top border.
- Icons: `@expo/vector-icons` Ionicons only, size 20–24, colors from tokens.
