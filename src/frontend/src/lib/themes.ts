/**
 * themes.ts
 * Central theme configuration for the 21-theme system (minimalist + 24 tweakcn).
 *
 * IMPORTANT: next-themes applies the theme name as a CSS class on <html>.
 * So theme "violet-bloom-dark" → <html class="violet-bloom-dark">.
 * CSS selectors use .violet-bloom-dark { ... } class selectors.
 */

export const TWEAKCN_THEME_NAMES: string[] = [
  "modern-minimal",
  "violet-bloom",
  "mocha-mousse",
  "amethyst-haze",
  "doom-64",
  "kodama-grove",
  "cosmic-night",
  "quantum-rose",
  "bold-tech",
  "elegant-luxury",
  "amber-minimal",
  "neo-brutalism",
  "solar-dusk",
  "pastel-dreams",
  "clean-slate",
  "ocean-breeze",
  "retro-arcade",
  "midnight-bloom",
  "northern-lights",
  "vintage-paper",
  "sunset-horizon",
  "starry-night",
  "soft-pop",
  "sage-garden",
];

/** All 25 base theme names: minimalist first, then tweakcn themes */
export const THEME_NAMES: string[] = ["minimalist", ...TWEAKCN_THEME_NAMES];

/** Human-readable display names for each theme slug */
export const THEME_DISPLAY_NAMES: Record<string, string> = {
  minimalist: "Minimalist",
  "modern-minimal": "Modern Minimal",
  "violet-bloom": "Violet Bloom",
  "mocha-mousse": "Mocha Mousse",
  "amethyst-haze": "Amethyst Haze",
  "doom-64": "Doom 64",
  "kodama-grove": "Kodama Grove",
  "cosmic-night": "Cosmic Night",
  "quantum-rose": "Quantum Rose",
  "bold-tech": "Bold Tech",
  "elegant-luxury": "Elegant Luxury",
  "amber-minimal": "Amber Minimal",
  "neo-brutalism": "Neo Brutalism",
  "solar-dusk": "Solar Dusk",
  "pastel-dreams": "Pastel Dreams",
  "clean-slate": "Clean Slate",
  "ocean-breeze": "Ocean Breeze",
  "retro-arcade": "Retro Arcade",
  "midnight-bloom": "Midnight Bloom",
  "northern-lights": "Northern Lights",
  "vintage-paper": "Vintage Paper",
  "sunset-horizon": "Sunset Horizon",
  "starry-night": "Starry Night",
  "soft-pop": "Soft Pop",
  "sage-garden": "Sage Garden",
};

/** All 50 compound theme names: each base theme × 2 variants */
export const ALL_THEMES: string[] = THEME_NAMES.flatMap((name) => [
  `${name}-light`,
  `${name}-dark`,
]);

/** Default theme on first load */
export const DEFAULT_THEME = "minimalist-dark";

/**
 * Migrates old "light"/"dark" theme values (stored before multi-theme support)
 * to the new "minimalist-light"/"minimalist-dark" format.
 */
export function migrateTheme(stored: string): string {
  if (stored === "light") return "minimalist-light";
  if (stored === "dark") return "minimalist-dark";
  return stored;
}

/**
 * Extracts the base theme from a compound theme name.
 * e.g. "violet-bloom-dark" → "violet-bloom"
 * e.g. "minimalist-light" → "minimalist"
 */
export function getBaseTheme(theme: string): string {
  if (theme.endsWith("-light")) return theme.slice(0, -6);
  if (theme.endsWith("-dark")) return theme.slice(0, -5);
  return theme;
}

/**
 * Extracts the variant from a compound theme name.
 * e.g. "violet-bloom-dark" → "dark"
 * e.g. "minimalist-light" → "light"
 * Falls back to "dark" if no variant suffix is found.
 */
export function getVariant(theme: string): "light" | "dark" {
  if (theme.endsWith("-light")) return "light";
  if (theme.endsWith("-dark")) return "dark";
  return "dark";
}

/**
 * Flips the variant of a compound theme name.
 * e.g. "violet-bloom-dark" → "violet-bloom-light"
 * e.g. "minimalist-light" → "minimalist-dark"
 */
export function toggleVariant(theme: string): string {
  const base = getBaseTheme(theme);
  const variant = getVariant(theme);
  return `${base}-${variant === "dark" ? "light" : "dark"}`;
}

/**
 * Combines a base theme name with a variant.
 * e.g. ("violet-bloom", "dark") → "violet-bloom-dark"
 */
export function applyVariant(base: string, variant: "light" | "dark"): string {
  return `${base}-${variant}`;
}
