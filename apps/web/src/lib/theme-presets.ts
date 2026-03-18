import { z } from "zod";

export const THEME_MODE_VALUES = ["light", "dark"] as const;
export type ThemeMode = (typeof THEME_MODE_VALUES)[number];

export const THEME_TOKEN_NAMES = [
  "background",
  "foreground",
  "card",
  "cardForeground",
  "popover",
  "popoverForeground",
  "primary",
  "primaryForeground",
  "secondary",
  "secondaryForeground",
  "muted",
  "mutedForeground",
  "accent",
  "accentForeground",
  "destructive",
  "destructiveForeground",
  "border",
  "input",
  "ring",
  "chart1",
  "chart2",
  "chart3",
  "chart4",
  "chart5",
  "sidebar",
  "sidebarForeground",
  "sidebarPrimary",
  "sidebarPrimaryForeground",
  "sidebarAccent",
  "sidebarAccentForeground",
  "sidebarBorder",
  "sidebarRing",
  "success",
  "danger",
] as const;

type ThemeTokenName = (typeof THEME_TOKEN_NAMES)[number];

const ThemeTokenSetSchema = z
  .object({
    background: z.string().min(1),
    foreground: z.string().min(1),
    card: z.string().min(1),
    cardForeground: z.string().min(1),
    popover: z.string().min(1),
    popoverForeground: z.string().min(1),
    primary: z.string().min(1),
    primaryForeground: z.string().min(1),
    secondary: z.string().min(1),
    secondaryForeground: z.string().min(1),
    muted: z.string().min(1),
    mutedForeground: z.string().min(1),
    accent: z.string().min(1),
    accentForeground: z.string().min(1),
    destructive: z.string().min(1),
    destructiveForeground: z.string().min(1),
    border: z.string().min(1),
    input: z.string().min(1),
    ring: z.string().min(1),
    chart1: z.string().min(1),
    chart2: z.string().min(1),
    chart3: z.string().min(1),
    chart4: z.string().min(1),
    chart5: z.string().min(1),
    sidebar: z.string().min(1),
    sidebarForeground: z.string().min(1),
    sidebarPrimary: z.string().min(1),
    sidebarPrimaryForeground: z.string().min(1),
    sidebarAccent: z.string().min(1),
    sidebarAccentForeground: z.string().min(1),
    sidebarBorder: z.string().min(1),
    sidebarRing: z.string().min(1),
    success: z.string().min(1),
    danger: z.string().min(1),
  })
  .strict();

const ThemeDefinitionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    description: z.string().min(1),
    author: z.string().min(1).optional(),
    sourceUrl: z.string().url().optional(),
    tokens: z
      .object({
        light: ThemeTokenSetSchema,
        dark: ThemeTokenSetSchema,
      })
      .strict(),
  })
  .strict();

const StoredCustomThemesSchema = z.array(ThemeDefinitionSchema);

export type ThemeTokenSet = z.infer<typeof ThemeTokenSetSchema>;
export type ThemeDefinition = z.infer<typeof ThemeDefinitionSchema>;

export const THEME_MODE_STORAGE_KEY = "theme";
export const THEME_PRESET_STORAGE_KEY = "theme-preset";
export const CUSTOM_THEMES_STORAGE_KEY = "theme-custom-presets";
export const DEFAULT_THEME_ID = "farfield";

function mergeThemeTokens(
  base: ThemeTokenSet,
  overrides: Partial<ThemeTokenSet>,
): ThemeTokenSet {
  return {
    ...base,
    ...overrides,
  };
}

const FARFIELD_LIGHT_TOKENS: ThemeTokenSet = {
  background: "oklch(1 0 0)",
  foreground: "oklch(0.145 0 0)",
  card: "oklch(1 0 0)",
  cardForeground: "oklch(0.145 0 0)",
  popover: "oklch(1 0 0)",
  popoverForeground: "oklch(0.145 0 0)",
  primary: "oklch(0.205 0 0)",
  primaryForeground: "oklch(0.985 0 0)",
  secondary: "oklch(0.97 0 0)",
  secondaryForeground: "oklch(0.205 0 0)",
  muted: "oklch(0.97 0 0)",
  mutedForeground: "oklch(0.556 0 0)",
  accent: "oklch(0.97 0 0)",
  accentForeground: "oklch(0.205 0 0)",
  destructive: "oklch(0.577 0.245 27.325)",
  destructiveForeground: "oklch(0.985 0 0)",
  border: "oklch(0.922 0 0)",
  input: "oklch(0.922 0 0)",
  ring: "oklch(0.708 0 0)",
  chart1: "oklch(0.646 0.222 41.116)",
  chart2: "oklch(0.6 0.118 184.704)",
  chart3: "oklch(0.398 0.07 227.392)",
  chart4: "oklch(0.828 0.189 84.429)",
  chart5: "oklch(0.769 0.188 70.08)",
  sidebar: "oklch(0.985 0 0)",
  sidebarForeground: "oklch(0.145 0 0)",
  sidebarPrimary: "oklch(0.205 0 0)",
  sidebarPrimaryForeground: "oklch(0.985 0 0)",
  sidebarAccent: "oklch(0.97 0 0)",
  sidebarAccentForeground: "oklch(0.205 0 0)",
  sidebarBorder: "oklch(0.922 0 0)",
  sidebarRing: "oklch(0.708 0 0)",
  success: "oklch(0.66 0.17 153)",
  danger: "oklch(0.59 0.21 25)",
};

const FARFIELD_DARK_TOKENS: ThemeTokenSet = {
  background: "oklch(0.145 0 0)",
  foreground: "oklch(0.985 0 0)",
  card: "oklch(0.205 0 0)",
  cardForeground: "oklch(0.985 0 0)",
  popover: "oklch(0.205 0 0)",
  popoverForeground: "oklch(0.985 0 0)",
  primary: "oklch(0.922 0 0)",
  primaryForeground: "oklch(0.205 0 0)",
  secondary: "oklch(0.269 0 0)",
  secondaryForeground: "oklch(0.985 0 0)",
  muted: "oklch(0.269 0 0)",
  mutedForeground: "oklch(0.708 0 0)",
  accent: "oklch(0.269 0 0)",
  accentForeground: "oklch(0.985 0 0)",
  destructive: "oklch(0.704 0.191 22.216)",
  destructiveForeground: "oklch(0.205 0 0)",
  border: "oklch(1 0 0 / 10%)",
  input: "oklch(1 0 0 / 15%)",
  ring: "oklch(0.556 0 0)",
  chart1: "oklch(0.488 0.243 264.376)",
  chart2: "oklch(0.696 0.17 162.48)",
  chart3: "oklch(0.769 0.188 70.08)",
  chart4: "oklch(0.627 0.265 303.9)",
  chart5: "oklch(0.645 0.246 16.439)",
  sidebar: "oklch(0.205 0 0)",
  sidebarForeground: "oklch(0.985 0 0)",
  sidebarPrimary: "oklch(0.488 0.243 264.376)",
  sidebarPrimaryForeground: "oklch(0.985 0 0)",
  sidebarAccent: "oklch(0.269 0 0)",
  sidebarAccentForeground: "oklch(0.985 0 0)",
  sidebarBorder: "oklch(1 0 0 / 10%)",
  sidebarRing: "oklch(0.556 0 0)",
  success: "oklch(0.72 0.16 154)",
  danger: "oklch(0.71 0.19 22)",
};

export const BUILTIN_THEMES: ReadonlyArray<ThemeDefinition> = [
  {
    id: "farfield",
    name: "Farfield",
    description: "The current clean default palette.",
    author: "Farfield",
    tokens: {
      light: FARFIELD_LIGHT_TOKENS,
      dark: FARFIELD_DARK_TOKENS,
    },
  },
  {
    id: "robbyrussell",
    name: "Robby Russell",
    description: "Warm terminal greens and golds inspired by the classic prompt.",
    author: "Inspired by oh-my-zsh",
    tokens: {
      light: mergeThemeTokens(FARFIELD_LIGHT_TOKENS, {
        background: "oklch(0.985 0.012 95)",
        foreground: "oklch(0.24 0.03 126)",
        primary: "oklch(0.55 0.17 145)",
        primaryForeground: "oklch(0.97 0.01 105)",
        secondary: "oklch(0.95 0.02 105)",
        accent: "oklch(0.93 0.05 92)",
        accentForeground: "oklch(0.28 0.05 118)",
        ring: "oklch(0.7 0.16 145)",
        sidebar: "oklch(0.965 0.016 98)",
        sidebarPrimary: "oklch(0.58 0.17 145)",
        success: "oklch(0.69 0.16 150)",
        danger: "oklch(0.67 0.17 33)",
      }),
      dark: mergeThemeTokens(FARFIELD_DARK_TOKENS, {
        background: "oklch(0.19 0.02 120)",
        foreground: "oklch(0.95 0.03 106)",
        card: "oklch(0.24 0.022 122)",
        cardForeground: "oklch(0.96 0.03 106)",
        primary: "oklch(0.78 0.18 149)",
        primaryForeground: "oklch(0.2 0.02 120)",
        secondary: "oklch(0.29 0.02 120)",
        secondaryForeground: "oklch(0.93 0.03 106)",
        muted: "oklch(0.26 0.018 120)",
        mutedForeground: "oklch(0.75 0.02 105)",
        accent: "oklch(0.33 0.05 95)",
        accentForeground: "oklch(0.96 0.03 106)",
        ring: "oklch(0.76 0.16 149)",
        sidebar: "oklch(0.22 0.02 120)",
        sidebarPrimary: "oklch(0.77 0.18 149)",
        sidebarAccent: "oklch(0.31 0.035 96)",
        success: "oklch(0.76 0.16 152)",
        danger: "oklch(0.74 0.16 31)",
      }),
    },
  },
  {
    id: "agnoster",
    name: "Agnoster",
    description: "Segmented navy, teal, and amber tones with strong contrast.",
    author: "Inspired by oh-my-zsh",
    tokens: {
      light: mergeThemeTokens(FARFIELD_LIGHT_TOKENS, {
        background: "oklch(0.985 0.006 230)",
        foreground: "oklch(0.27 0.03 238)",
        primary: "oklch(0.54 0.16 244)",
        primaryForeground: "oklch(0.97 0.01 230)",
        accent: "oklch(0.92 0.04 208)",
        accentForeground: "oklch(0.28 0.03 240)",
        ring: "oklch(0.68 0.15 244)",
        chart1: "oklch(0.58 0.16 243)",
        chart2: "oklch(0.66 0.14 190)",
        chart3: "oklch(0.76 0.16 75)",
        sidebarPrimary: "oklch(0.58 0.16 243)",
      }),
      dark: mergeThemeTokens(FARFIELD_DARK_TOKENS, {
        background: "oklch(0.18 0.025 248)",
        foreground: "oklch(0.95 0.015 220)",
        card: "oklch(0.22 0.03 246)",
        primary: "oklch(0.72 0.16 244)",
        primaryForeground: "oklch(0.2 0.025 248)",
        accent: "oklch(0.3 0.05 197)",
        accentForeground: "oklch(0.95 0.015 220)",
        ring: "oklch(0.74 0.16 244)",
        chart1: "oklch(0.71 0.16 244)",
        chart2: "oklch(0.76 0.14 186)",
        chart3: "oklch(0.8 0.15 77)",
        sidebar: "oklch(0.2 0.028 246)",
        sidebarPrimary: "oklch(0.72 0.16 244)",
        sidebarAccent: "oklch(0.27 0.04 196)",
      }),
    },
  },
  {
    id: "bira",
    name: "Bira",
    description: "Crisp cobalt, aqua, and slate with a clean shell-like glow.",
    author: "Inspired by oh-my-zsh",
    tokens: {
      light: mergeThemeTokens(FARFIELD_LIGHT_TOKENS, {
        background: "oklch(0.985 0.008 205)",
        foreground: "oklch(0.24 0.02 240)",
        primary: "oklch(0.56 0.16 254)",
        primaryForeground: "oklch(0.98 0.008 220)",
        accent: "oklch(0.92 0.03 200)",
        accentForeground: "oklch(0.25 0.03 244)",
        ring: "oklch(0.69 0.16 254)",
        chart2: "oklch(0.73 0.13 192)",
        sidebarPrimary: "oklch(0.56 0.16 254)",
        success: "oklch(0.71 0.14 190)",
      }),
      dark: mergeThemeTokens(FARFIELD_DARK_TOKENS, {
        background: "oklch(0.17 0.018 245)",
        foreground: "oklch(0.95 0.01 214)",
        card: "oklch(0.21 0.022 245)",
        primary: "oklch(0.74 0.17 255)",
        primaryForeground: "oklch(0.19 0.018 245)",
        accent: "oklch(0.31 0.045 199)",
        accentForeground: "oklch(0.95 0.01 214)",
        ring: "oklch(0.76 0.17 255)",
        chart1: "oklch(0.72 0.17 255)",
        chart2: "oklch(0.75 0.14 193)",
        sidebar: "oklch(0.19 0.02 245)",
        sidebarPrimary: "oklch(0.74 0.17 255)",
        sidebarAccent: "oklch(0.28 0.04 198)",
        success: "oklch(0.75 0.13 193)",
      }),
    },
  },
  {
    id: "af-magic",
    name: "af-magic",
    description: "A moody indigo prompt with magenta and cyan highlights.",
    author: "Inspired by oh-my-zsh",
    tokens: {
      light: mergeThemeTokens(FARFIELD_LIGHT_TOKENS, {
        background: "oklch(0.98 0.01 300)",
        foreground: "oklch(0.24 0.03 297)",
        primary: "oklch(0.58 0.2 310)",
        primaryForeground: "oklch(0.98 0.01 300)",
        accent: "oklch(0.92 0.05 255)",
        accentForeground: "oklch(0.26 0.05 298)",
        ring: "oklch(0.69 0.19 309)",
        chart1: "oklch(0.61 0.2 309)",
        chart2: "oklch(0.67 0.16 222)",
        chart5: "oklch(0.76 0.16 45)",
        sidebarPrimary: "oklch(0.61 0.2 309)",
      }),
      dark: mergeThemeTokens(FARFIELD_DARK_TOKENS, {
        background: "oklch(0.16 0.03 300)",
        foreground: "oklch(0.95 0.02 300)",
        card: "oklch(0.21 0.035 299)",
        primary: "oklch(0.75 0.21 310)",
        primaryForeground: "oklch(0.18 0.03 300)",
        accent: "oklch(0.32 0.08 257)",
        accentForeground: "oklch(0.95 0.02 300)",
        ring: "oklch(0.77 0.2 310)",
        chart1: "oklch(0.76 0.2 310)",
        chart2: "oklch(0.77 0.15 220)",
        chart5: "oklch(0.82 0.15 48)",
        sidebar: "oklch(0.18 0.032 300)",
        sidebarPrimary: "oklch(0.75 0.21 310)",
        sidebarAccent: "oklch(0.29 0.08 257)",
      }),
    },
  },
  {
    id: "candy",
    name: "Candy",
    description: "Playful mint, coral, and plum with soft contrast.",
    author: "Inspired by oh-my-zsh",
    tokens: {
      light: mergeThemeTokens(FARFIELD_LIGHT_TOKENS, {
        background: "oklch(0.985 0.012 350)",
        foreground: "oklch(0.26 0.04 336)",
        primary: "oklch(0.62 0.17 12)",
        primaryForeground: "oklch(0.985 0.012 350)",
        accent: "oklch(0.93 0.06 170)",
        accentForeground: "oklch(0.26 0.04 336)",
        ring: "oklch(0.72 0.15 11)",
        chart2: "oklch(0.72 0.13 171)",
        chart4: "oklch(0.76 0.16 330)",
        sidebarPrimary: "oklch(0.62 0.17 12)",
      }),
      dark: mergeThemeTokens(FARFIELD_DARK_TOKENS, {
        background: "oklch(0.18 0.03 334)",
        foreground: "oklch(0.96 0.015 4)",
        card: "oklch(0.22 0.035 333)",
        primary: "oklch(0.76 0.18 13)",
        primaryForeground: "oklch(0.19 0.03 334)",
        accent: "oklch(0.34 0.09 170)",
        accentForeground: "oklch(0.96 0.015 4)",
        ring: "oklch(0.78 0.17 13)",
        chart2: "oklch(0.76 0.14 171)",
        chart4: "oklch(0.78 0.16 331)",
        sidebar: "oklch(0.2 0.03 334)",
        sidebarPrimary: "oklch(0.76 0.18 13)",
        sidebarAccent: "oklch(0.31 0.09 170)",
      }),
    },
  },
  {
    id: "one-dark-pro",
    name: "One Dark Pro",
    description: "Atom's iconic One Dark palette adapted for the Farfield shell-like UI.",
    author: "Inspired by Binaryify/OneDark-Pro",
    sourceUrl: "https://github.com/Binaryify/OneDark-Pro",
    tokens: {
      light: mergeThemeTokens(FARFIELD_LIGHT_TOKENS, {
        background: "oklch(0.965 0.008 265)",
        foreground: "oklch(0.3 0.02 260)",
        card: "oklch(0.985 0.004 265)",
        cardForeground: "oklch(0.3 0.02 260)",
        primary: "oklch(0.62 0.16 61)",
        primaryForeground: "oklch(0.18 0.015 260)",
        secondary: "oklch(0.93 0.01 260)",
        secondaryForeground: "oklch(0.3 0.02 260)",
        muted: "oklch(0.93 0.008 260)",
        mutedForeground: "oklch(0.56 0.01 258)",
        accent: "oklch(0.9 0.025 220)",
        accentForeground: "oklch(0.29 0.02 258)",
        ring: "oklch(0.69 0.15 61)",
        chart1: "oklch(0.64 0.15 16)",
        chart2: "oklch(0.7 0.12 200)",
        chart3: "oklch(0.73 0.13 75)",
        chart4: "oklch(0.68 0.14 305)",
        chart5: "oklch(0.66 0.15 120)",
        sidebar: "oklch(0.94 0.008 265)",
        sidebarPrimary: "oklch(0.62 0.16 61)",
        sidebarAccent: "oklch(0.9 0.025 220)",
        success: "oklch(0.68 0.14 146)",
        danger: "oklch(0.64 0.16 20)",
      }),
      dark: mergeThemeTokens(FARFIELD_DARK_TOKENS, {
        background: "oklch(0.24 0.015 266)",
        foreground: "oklch(0.9 0.01 255)",
        card: "oklch(0.28 0.015 266)",
        cardForeground: "oklch(0.9 0.01 255)",
        popover: "oklch(0.28 0.015 266)",
        popoverForeground: "oklch(0.9 0.01 255)",
        primary: "oklch(0.72 0.16 61)",
        primaryForeground: "oklch(0.22 0.015 266)",
        secondary: "oklch(0.32 0.015 266)",
        secondaryForeground: "oklch(0.88 0.01 255)",
        muted: "oklch(0.31 0.012 266)",
        mutedForeground: "oklch(0.74 0.012 255)",
        accent: "oklch(0.36 0.03 220)",
        accentForeground: "oklch(0.9 0.01 255)",
        ring: "oklch(0.74 0.16 61)",
        chart1: "oklch(0.71 0.16 20)",
        chart2: "oklch(0.77 0.12 201)",
        chart3: "oklch(0.8 0.13 76)",
        chart4: "oklch(0.74 0.15 304)",
        chart5: "oklch(0.76 0.14 146)",
        sidebar: "oklch(0.27 0.015 266)",
        sidebarPrimary: "oklch(0.72 0.16 61)",
        sidebarAccent: "oklch(0.35 0.03 220)",
        success: "oklch(0.76 0.14 146)",
        danger: "oklch(0.72 0.16 20)",
      }),
    },
  },
  {
    id: "darcula",
    name: "Darcula",
    description: "JetBrains-style charcoal UI with amber and cyan accents.",
    author: "Inspired by JetBrains Darcula",
    sourceUrl: "https://www.jetbrains.com/help/webstorm/user-interface-themes.html",
    tokens: {
      light: mergeThemeTokens(FARFIELD_LIGHT_TOKENS, {
        background: "oklch(0.95 0.004 255)",
        foreground: "oklch(0.28 0.01 255)",
        card: "oklch(0.98 0.003 255)",
        primary: "oklch(0.66 0.14 70)",
        primaryForeground: "oklch(0.2 0.01 255)",
        secondary: "oklch(0.91 0.005 255)",
        muted: "oklch(0.91 0.005 255)",
        mutedForeground: "oklch(0.52 0.008 255)",
        accent: "oklch(0.9 0.02 225)",
        accentForeground: "oklch(0.28 0.015 255)",
        border: "oklch(0.85 0.004 255)",
        input: "oklch(0.85 0.004 255)",
        ring: "oklch(0.68 0.12 70)",
        chart2: "oklch(0.68 0.12 210)",
        sidebar: "oklch(0.93 0.004 255)",
        sidebarPrimary: "oklch(0.66 0.14 70)",
        sidebarAccent: "oklch(0.89 0.02 225)",
        success: "oklch(0.67 0.12 160)",
        danger: "oklch(0.63 0.15 25)",
      }),
      dark: mergeThemeTokens(FARFIELD_DARK_TOKENS, {
        background: "oklch(0.23 0.005 255)",
        foreground: "oklch(0.86 0.005 255)",
        card: "oklch(0.26 0.006 255)",
        cardForeground: "oklch(0.86 0.005 255)",
        popover: "oklch(0.26 0.006 255)",
        popoverForeground: "oklch(0.86 0.005 255)",
        primary: "oklch(0.71 0.13 72)",
        primaryForeground: "oklch(0.2 0.006 255)",
        secondary: "oklch(0.31 0.006 255)",
        secondaryForeground: "oklch(0.84 0.005 255)",
        muted: "oklch(0.3 0.006 255)",
        mutedForeground: "oklch(0.68 0.005 255)",
        accent: "oklch(0.34 0.02 225)",
        accentForeground: "oklch(0.86 0.005 255)",
        border: "oklch(0.38 0.005 255)",
        input: "oklch(0.36 0.005 255)",
        ring: "oklch(0.73 0.13 72)",
        chart1: "oklch(0.73 0.14 72)",
        chart2: "oklch(0.72 0.11 210)",
        chart3: "oklch(0.76 0.12 150)",
        chart4: "oklch(0.74 0.12 300)",
        chart5: "oklch(0.73 0.13 30)",
        sidebar: "oklch(0.25 0.005 255)",
        sidebarPrimary: "oklch(0.71 0.13 72)",
        sidebarAccent: "oklch(0.33 0.02 225)",
        sidebarBorder: "oklch(0.37 0.005 255)",
        success: "oklch(0.74 0.12 160)",
        danger: "oklch(0.72 0.14 25)",
      }),
    },
  },
  {
    id: "jellybeans",
    name: "Jellybeans",
    description: "A colorful dark classic with punchy magenta, lime, and cyan accents.",
    author: "Inspired by nanotech/jellybeans.vim",
    sourceUrl: "https://github.com/nanotech/jellybeans.vim",
    tokens: {
      light: mergeThemeTokens(FARFIELD_LIGHT_TOKENS, {
        background: "oklch(0.975 0.012 30)",
        foreground: "oklch(0.26 0.03 320)",
        card: "oklch(0.99 0.008 30)",
        primary: "oklch(0.62 0.2 325)",
        primaryForeground: "oklch(0.98 0.01 30)",
        secondary: "oklch(0.93 0.015 80)",
        secondaryForeground: "oklch(0.26 0.03 320)",
        muted: "oklch(0.94 0.01 40)",
        mutedForeground: "oklch(0.53 0.02 320)",
        accent: "oklch(0.91 0.05 165)",
        accentForeground: "oklch(0.24 0.03 320)",
        ring: "oklch(0.73 0.17 325)",
        chart1: "oklch(0.64 0.2 325)",
        chart2: "oklch(0.73 0.16 170)",
        chart3: "oklch(0.77 0.17 105)",
        chart4: "oklch(0.71 0.17 240)",
        chart5: "oklch(0.74 0.16 42)",
        sidebar: "oklch(0.96 0.012 35)",
        sidebarPrimary: "oklch(0.62 0.2 325)",
        sidebarAccent: "oklch(0.91 0.05 165)",
        success: "oklch(0.73 0.16 170)",
        danger: "oklch(0.66 0.18 18)",
      }),
      dark: mergeThemeTokens(FARFIELD_DARK_TOKENS, {
        background: "oklch(0.16 0.01 40)",
        foreground: "oklch(0.9 0.02 95)",
        card: "oklch(0.2 0.012 40)",
        cardForeground: "oklch(0.9 0.02 95)",
        popover: "oklch(0.2 0.012 40)",
        popoverForeground: "oklch(0.9 0.02 95)",
        primary: "oklch(0.75 0.2 325)",
        primaryForeground: "oklch(0.18 0.012 40)",
        secondary: "oklch(0.27 0.018 105)",
        secondaryForeground: "oklch(0.9 0.02 95)",
        muted: "oklch(0.25 0.014 40)",
        mutedForeground: "oklch(0.71 0.02 90)",
        accent: "oklch(0.31 0.08 170)",
        accentForeground: "oklch(0.91 0.02 95)",
        ring: "oklch(0.77 0.18 325)",
        chart1: "oklch(0.76 0.19 325)",
        chart2: "oklch(0.79 0.15 170)",
        chart3: "oklch(0.82 0.16 105)",
        chart4: "oklch(0.77 0.16 240)",
        chart5: "oklch(0.8 0.15 42)",
        sidebar: "oklch(0.19 0.012 40)",
        sidebarPrimary: "oklch(0.75 0.2 325)",
        sidebarAccent: "oklch(0.3 0.08 170)",
        sidebarBorder: "oklch(1 0 0 / 12%)",
        success: "oklch(0.79 0.15 170)",
        danger: "oklch(0.74 0.17 18)",
      }),
    },
  },
];

const BUILTIN_THEME_MAP = new Map(
  BUILTIN_THEMES.map((theme) => [theme.id, theme]),
);

function readLocalStorageValue(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorageValue(key: string, value: string): void {
  window.localStorage.setItem(key, value);
}

export function parseStoredThemeMode(): ThemeMode {
  const stored = readLocalStorageValue(THEME_MODE_STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function parseCustomThemeJson(input: string): ThemeDefinition {
  const parsed = JSON.parse(input);
  return ThemeDefinitionSchema.parse(parsed);
}

export function readStoredThemePresetId(): string {
  const stored = readLocalStorageValue(THEME_PRESET_STORAGE_KEY);
  if (!stored || stored.trim().length === 0) {
    return DEFAULT_THEME_ID;
  }
  return stored;
}

export function readStoredCustomThemes(): ThemeDefinition[] {
  const raw = readLocalStorageValue(CUSTOM_THEMES_STORAGE_KEY);
  if (!raw || raw.trim().length === 0) {
    return [];
  }
  const parsed = JSON.parse(raw);
  return StoredCustomThemesSchema.parse(parsed);
}

export function writeStoredThemeMode(mode: ThemeMode): void {
  writeLocalStorageValue(THEME_MODE_STORAGE_KEY, mode);
}

export function writeStoredThemePresetId(themeId: string): void {
  writeLocalStorageValue(THEME_PRESET_STORAGE_KEY, themeId);
}

export function writeStoredCustomThemes(themes: ThemeDefinition[]): void {
  writeLocalStorageValue(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(themes));
}

export function listAvailableThemes(
  customThemes: ThemeDefinition[],
): ReadonlyArray<ThemeDefinition> {
  return [...BUILTIN_THEMES, ...customThemes];
}

export function resolveThemeDefinition(
  themeId: string,
  customThemes: ThemeDefinition[],
): ThemeDefinition {
  const customTheme = customThemes.find((theme) => theme.id === themeId) ?? null;
  if (customTheme) {
    return customTheme;
  }
  return BUILTIN_THEME_MAP.get(themeId) ?? BUILTIN_THEME_MAP.get(DEFAULT_THEME_ID)!;
}

function themeCssVariableName(tokenName: ThemeTokenName): string {
  return `--${tokenName.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`)}`;
}

export function applyThemeToDocument(
  mode: ThemeMode,
  definition: ThemeDefinition,
): void {
  document.documentElement.classList.toggle("dark", mode === "dark");
  document.documentElement.dataset["themePreset"] = definition.id;
  const tokenSet = definition.tokens[mode];
  for (const tokenName of THEME_TOKEN_NAMES) {
    document.documentElement.style.setProperty(
      themeCssVariableName(tokenName),
      tokenSet[tokenName],
    );
  }
}

export function initializeThemeFromStorage(): {
  mode: ThemeMode;
  themeId: string;
  customThemes: ThemeDefinition[];
} {
  const mode = parseStoredThemeMode();
  const customThemes = readStoredCustomThemes();
  const requestedThemeId = readStoredThemePresetId();
  const resolvedTheme = resolveThemeDefinition(requestedThemeId, customThemes);
  applyThemeToDocument(mode, resolvedTheme);
  return {
    mode,
    themeId: resolvedTheme.id,
    customThemes,
  };
}
