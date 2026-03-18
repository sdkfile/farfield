import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyThemeToDocument,
  listAvailableThemes,
  parseCustomThemeJson,
  parseStoredThemeMode,
  readStoredCustomThemes,
  readStoredThemePresetId,
  resolveThemeDefinition,
  type ThemeDefinition,
  type ThemeMode,
  writeStoredCustomThemes,
  writeStoredThemeMode,
  writeStoredThemePresetId,
} from "@/lib/theme-presets";

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => parseStoredThemeMode());
  const [themePresetId, setThemePresetIdState] = useState(() =>
    readStoredThemePresetId(),
  );
  const [customThemes, setCustomThemes] = useState<ThemeDefinition[]>(() =>
    readStoredCustomThemes(),
  );

  const availableThemes = useMemo(
    () => listAvailableThemes(customThemes),
    [customThemes],
  );
  const activeTheme = useMemo(
    () => resolveThemeDefinition(themePresetId, customThemes),
    [customThemes, themePresetId],
  );

  useEffect(() => {
    applyThemeToDocument(theme, activeTheme);
    writeStoredThemeMode(theme);
    writeStoredThemePresetId(activeTheme.id);
  }, [activeTheme, theme]);

  useEffect(() => {
    writeStoredCustomThemes(customThemes);
  }, [customThemes]);

  const toggle = useCallback(() => {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  }, []);

  const setMode = useCallback((nextTheme: ThemeMode) => {
    setTheme(nextTheme);
  }, []);

  const setThemePresetId = useCallback((nextThemeId: string) => {
    setThemePresetIdState(nextThemeId);
  }, []);

  const addCustomThemeFromJson = useCallback((input: string): ThemeDefinition => {
    const parsedTheme = parseCustomThemeJson(input);
    setCustomThemes((previousThemes) => {
      const remainingThemes = previousThemes.filter(
        (themeDefinition) => themeDefinition.id !== parsedTheme.id,
      );
      return [...remainingThemes, parsedTheme];
    });
    setThemePresetIdState(parsedTheme.id);
    return parsedTheme;
  }, []);

  const removeCustomTheme = useCallback((themeId: string) => {
    setCustomThemes((previousThemes) =>
      previousThemes.filter((themeDefinition) => themeDefinition.id !== themeId),
    );
    setThemePresetIdState((currentThemeId) =>
      currentThemeId === themeId ? "farfield" : currentThemeId,
    );
  }, []);

  return {
    theme,
    toggle,
    setMode,
    themePresetId,
    setThemePresetId,
    activeTheme,
    availableThemes,
    customThemes,
    addCustomThemeFromJson,
    removeCustomTheme,
  };
}
