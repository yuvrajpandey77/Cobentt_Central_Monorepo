export const palette = {
  dark: {
    bg: "#000000",
    bgElevated: "#0a0a0a",
    card: "#111111",
    border: "#1a1a1a",
    borderStrong: "#2a2a2a",
    text: "#e0e0e0",
    textBright: "#f5f5f5",
    textMuted: "#737373",
    textDim: "#545454",
    primary: "#16A34A",
    primaryMuted: "rgba(22,163,74,0.1)",
    primaryGlow: "rgba(22,163,74,0.2)",
    danger: "#ef4444",
    userBubble: "#1a1a1a",
    assistantText: "#c7c7c7",
    inputBg: "#222222",
    inputFocus: "#121212",
    tabBar: "#050505",
    hero: "#16A34A",
    upgrade: "#2563EB",
    upgradeText: "#ffffff",
  },
  light: {
    bg: "#ffffff",
    bgElevated: "#f5f5f5",
    card: "#ffffff",
    border: "#e5e5e5",
    borderStrong: "#d4d4d4",
    text: "#1a1a1a",
    textBright: "#000000",
    textMuted: "#737373",
    textDim: "#a1a1aa",
    primary: "#16A34A",
    primaryMuted: "rgba(22,163,74,0.1)",
    primaryGlow: "rgba(22,163,74,0.15)",
    danger: "#ef4444",
    userBubble: "#e5e5e5",
    assistantText: "#1a1a1a",
    inputBg: "#ffffff",
    inputFocus: "#fafafa",
    tabBar: "#ffffff",
    hero: "#16A34A",
    upgrade: "#2563EB",
    upgradeText: "#ffffff",
  },
} as const;

export const fonts = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  mono: "JetBrainsMono_400Regular",
  monoMedium: "JetBrainsMono_500Medium",
} as const;

export const typography = {
  displayLg: { fontSize: 48, lineHeight: 1.1, fontFamily: fonts.semibold },
  display: { fontSize: 36, lineHeight: 1.15, fontFamily: fonts.semibold },
  title: { fontSize: 24, lineHeight: 1.2, fontFamily: fonts.semibold },
  titleSm: { fontSize: 20, lineHeight: 1.25, fontFamily: fonts.semibold },
  body: { fontSize: 16, lineHeight: 1.5, fontFamily: fonts.regular },
  bodySm: { fontSize: 14, lineHeight: 1.5, fontFamily: fonts.regular },
  label: { fontSize: 12, lineHeight: 1.4, fontFamily: fonts.medium },
  labelStrong: { fontSize: 12, lineHeight: 1.4, fontFamily: fonts.semibold },
  button: { fontSize: 14, lineHeight: 1.4, fontFamily: fonts.semibold },
  caption: { fontSize: 12, lineHeight: 1.4, fontFamily: fonts.regular },
  captionMedium: { fontSize: 12, lineHeight: 1.4, fontFamily: fonts.medium },
  micro: { fontSize: 10, lineHeight: 1.3, fontFamily: fonts.medium },
  microStrong: { fontSize: 10, lineHeight: 1.3, fontFamily: fonts.semibold },
  tab: { fontSize: 13, lineHeight: 1.4, fontFamily: fonts.medium },
  code: { fontSize: 14, lineHeight: 1.5, fontFamily: fonts.mono },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
} as const;

export type PaletteToken = keyof typeof palette.dark;
export type TypographyToken = keyof typeof typography;
export type SpacingToken = keyof typeof spacing;
