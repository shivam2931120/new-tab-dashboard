import {
  BACKGROUND_GRADIENTS,
  BACKGROUND_MODES,
  LAYOUTS,
  THEMES
} from "./constants.js";

export function resolveTheme(theme) {
  if (!THEMES.includes(theme)) {
    return "light";
  }

  if (theme === "system") {
    return globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return theme;
}

export function applyAppearance(settings) {
  const root = document.documentElement;
  const resolvedTheme = resolveTheme(settings.theme);
  const layout = LAYOUTS.includes(settings.layout) ? settings.layout : "comfortable";
  const backgroundMode = BACKGROUND_MODES.includes(settings.backgroundMode)
    ? settings.backgroundMode
    : "gradient";

  root.dataset.theme = resolvedTheme;
  root.dataset.themePreference = settings.theme;
  root.dataset.layout = layout;
  root.dataset.backgroundMode = backgroundMode;
  root.style.setProperty("--dashboard-background", getBackgroundValue(settings, resolvedTheme));
}

export function getBackgroundValue(settings, resolvedTheme = resolveTheme(settings.theme)) {
  if (settings.backgroundMode === "solid") {
    return settings.backgroundColor || (resolvedTheme === "dark" ? "#151513" : "#f7f3ea");
  }

  if (settings.backgroundMode === "image" && settings.backgroundImageUrl) {
    const overlay =
      resolvedTheme === "dark"
        ? "linear-gradient(rgba(13, 13, 12, 0.72), rgba(13, 13, 12, 0.62))"
        : "linear-gradient(rgba(255, 252, 245, 0.72), rgba(255, 252, 245, 0.62))";
    const safeUrl = settings.backgroundImageUrl.replace(/["\\\n\r\f]/g, "");
    return `${overlay}, url("${safeUrl}") center / cover fixed`;
  }

  return BACKGROUND_GRADIENTS[settings.backgroundGradient] || BACKGROUND_GRADIENTS.clearMorning;
}

export function getNextTheme(theme) {
  const cycle = ["system", "light", "dark"];
  const index = cycle.indexOf(theme);
  return cycle[(index + 1) % cycle.length];
}

export function getNextLayout(layout) {
  return layout === "compact" ? "comfortable" : "compact";
}

export function subscribeToSystemTheme(callback) {
  const query = globalThis.matchMedia?.("(prefers-color-scheme: dark)");
  if (!query) {
    return () => {};
  }

  const listener = () => callback();
  if (query.addEventListener) {
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }

  query.addListener(listener);
  return () => query.removeListener(listener);
}
