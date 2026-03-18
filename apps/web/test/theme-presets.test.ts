import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME_ID,
  listAvailableThemes,
  parseCustomThemeJson,
  resolveThemeDefinition,
} from "../src/lib/theme-presets";

const customThemeJson = JSON.stringify({
  id: "developer-oasis",
  name: "Developer Oasis",
  description: "A custom shell-inspired theme",
  author: "Test Suite",
  tokens: {
    light: {
      background: "oklch(0.98 0.01 210)",
      foreground: "oklch(0.2 0.02 250)",
      card: "oklch(1 0 0)",
      cardForeground: "oklch(0.2 0.02 250)",
      popover: "oklch(1 0 0)",
      popoverForeground: "oklch(0.2 0.02 250)",
      primary: "oklch(0.6 0.17 260)",
      primaryForeground: "oklch(0.98 0.01 210)",
      secondary: "oklch(0.94 0.02 210)",
      secondaryForeground: "oklch(0.2 0.02 250)",
      muted: "oklch(0.94 0.02 210)",
      mutedForeground: "oklch(0.55 0.01 240)",
      accent: "oklch(0.9 0.05 180)",
      accentForeground: "oklch(0.2 0.02 250)",
      destructive: "oklch(0.62 0.19 28)",
      destructiveForeground: "oklch(0.98 0.01 210)",
      border: "oklch(0.9 0.01 220)",
      input: "oklch(0.9 0.01 220)",
      ring: "oklch(0.72 0.15 260)",
      chart1: "oklch(0.6 0.17 260)",
      chart2: "oklch(0.7 0.12 180)",
      chart3: "oklch(0.75 0.14 90)",
      chart4: "oklch(0.68 0.15 320)",
      chart5: "oklch(0.73 0.14 35)",
      sidebar: "oklch(0.96 0.015 215)",
      sidebarForeground: "oklch(0.2 0.02 250)",
      sidebarPrimary: "oklch(0.6 0.17 260)",
      sidebarPrimaryForeground: "oklch(0.98 0.01 210)",
      sidebarAccent: "oklch(0.91 0.04 180)",
      sidebarAccentForeground: "oklch(0.2 0.02 250)",
      sidebarBorder: "oklch(0.9 0.01 220)",
      sidebarRing: "oklch(0.72 0.15 260)",
      success: "oklch(0.7 0.14 170)",
      danger: "oklch(0.65 0.18 28)",
    },
    dark: {
      background: "oklch(0.17 0.02 245)",
      foreground: "oklch(0.95 0.01 210)",
      card: "oklch(0.22 0.02 245)",
      cardForeground: "oklch(0.95 0.01 210)",
      popover: "oklch(0.22 0.02 245)",
      popoverForeground: "oklch(0.95 0.01 210)",
      primary: "oklch(0.75 0.17 260)",
      primaryForeground: "oklch(0.18 0.02 245)",
      secondary: "oklch(0.28 0.02 245)",
      secondaryForeground: "oklch(0.95 0.01 210)",
      muted: "oklch(0.28 0.02 245)",
      mutedForeground: "oklch(0.72 0.01 215)",
      accent: "oklch(0.33 0.07 180)",
      accentForeground: "oklch(0.95 0.01 210)",
      destructive: "oklch(0.73 0.18 28)",
      destructiveForeground: "oklch(0.18 0.02 245)",
      border: "oklch(1 0 0 / 12%)",
      input: "oklch(1 0 0 / 16%)",
      ring: "oklch(0.75 0.17 260)",
      chart1: "oklch(0.75 0.17 260)",
      chart2: "oklch(0.78 0.13 180)",
      chart3: "oklch(0.8 0.15 90)",
      chart4: "oklch(0.76 0.16 320)",
      chart5: "oklch(0.8 0.15 35)",
      sidebar: "oklch(0.2 0.02 245)",
      sidebarForeground: "oklch(0.95 0.01 210)",
      sidebarPrimary: "oklch(0.75 0.17 260)",
      sidebarPrimaryForeground: "oklch(0.18 0.02 245)",
      sidebarAccent: "oklch(0.3 0.07 180)",
      sidebarAccentForeground: "oklch(0.95 0.01 210)",
      sidebarBorder: "oklch(1 0 0 / 12%)",
      sidebarRing: "oklch(0.75 0.17 260)",
      success: "oklch(0.76 0.14 170)",
      danger: "oklch(0.74 0.18 28)",
    },
  },
});

describe("theme presets", () => {
  it("parses a custom theme json definition with strict tokens", () => {
    const parsedTheme = parseCustomThemeJson(customThemeJson);
    expect(parsedTheme.id).toBe("developer-oasis");
    expect(parsedTheme.tokens.dark.primary).toBe("oklch(0.75 0.17 260)");
  });

  it("resolves built-in and custom themes together", () => {
    const customTheme = parseCustomThemeJson(customThemeJson);
    const availableThemes = listAvailableThemes([customTheme]);
    expect(
      availableThemes.some((themeDefinition) => themeDefinition.id === DEFAULT_THEME_ID),
    ).toBe(true);
    expect(resolveThemeDefinition(customTheme.id, [customTheme]).name).toBe(
      "Developer Oasis",
    );
  });
});
