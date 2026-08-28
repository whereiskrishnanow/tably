// Tably design tokens — single source of truth for the visual language.
// Premium, warm, minimal: cream canvas, warm charcoal ink, terracotta accent.

export const colors = {
  // Canvas & surfaces
  background: '#FAF6F0',
  surface: '#FFFFFF',
  surfaceSubtle: '#F4EEE6',
  surfaceSunken: '#EFE8DE',
  overlay: 'rgba(30, 27, 22, 0.45)',

  // Ink
  ink: '#1E1B16',
  inkSecondary: '#6F675C',
  inkTertiary: '#A39A8C',
  inkInverse: '#FFF9F2',

  // Accent (terracotta / burnt saffron)
  accent: '#B4531F',
  accentPressed: '#96431A',
  accentSoft: '#F7E7DB',
  accentSoftBorder: '#EDD5C2',

  // Semantic
  veg: '#1E7A46',
  vegSoft: '#E3F2E8',
  nonVeg: '#96431A',
  nonVegSoft: '#F7E7DB',
  gold: '#A8781C',
  goldSoft: '#F6EDD9',
  danger: '#B3352C',
  dangerSoft: '#F9E5E3',
  success: '#1E7A46',
  successSoft: '#E3F2E8',
  info: '#375E97',
  infoSoft: '#E7EDF6',

  // Lines
  border: '#EAE2D7',
  borderStrong: '#DDD2C3',

  // Dark chrome (toasts, pills on photos)
  chip: '#28241D',
  chipInk: '#FFF9F2',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 44,
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayMedium: 'Fraunces_500Medium',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const type = {
  display: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.4, color: colors.ink },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, letterSpacing: -0.3, color: colors.ink },
  heading: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2, color: colors.ink },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.ink },
  secondary: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19, color: colors.inkSecondary },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 17, color: colors.inkSecondary },
  micro: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0.4, color: colors.inkSecondary, textTransform: 'uppercase' as const },
} as const;

export const shadows = {
  card: {
    shadowColor: '#3E2E1E',
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  raised: {
    shadowColor: '#3E2E1E',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  subtle: {
    shadowColor: '#3E2E1E',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
} as const;

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;

export const currency = (paise: number): string => {
  const rupees = paise / 100;
  const formatted = rupees % 1 === 0 ? rupees.toLocaleString('en-IN') : rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `₹${formatted}`;
};
