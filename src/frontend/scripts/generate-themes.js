/**
 * generate-themes.js
 * Fetches tweakcn theme presets and generates CSS class blocks for each theme.
 * Run from src/frontend/: node scripts/generate-themes.js
 *
 * The tailwind.config.js uses var(--background) directly (no oklch() wrapper),
 * so tweakcn hex values can be stored as-is in CSS variables.
 * The minimalist theme uses full oklch() values like oklch(0% 0 0).
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const TWEAKCN_URL =
  "https://raw.githubusercontent.com/jnsahaj/tweakcn/main/utils/theme-presets.ts";

// Brand-specific themes to exclude
const EXCLUDE_THEMES = new Set([
  "vercel",
  "supabase",
  "claude",
  "twitter",
  "t3-chat",
]);

async function fetchThemePresets() {
  const res = await fetch(TWEAKCN_URL);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  return res.text();
}

/**
 * Parse the TypeScript source to extract theme names and their CSS variable objects.
 * The source format is:
 *   "theme-name": {
 *     label: "...",
 *     styles: {
 *       light: { background: "#fff", ... },
 *       dark: { background: "#000", ... }
 *     }
 *   }
 */
function parseThemePresets(source) {
  const themes = {};

  // Match each top-level theme key
  // Pattern: "theme-key": {  ... then find styles.light and styles.dark blocks
  const themeBlockRegex = /^\s{2}"([^"]+)":\s*\{/gm;
  let themeMatch;

  while ((themeMatch = themeBlockRegex.exec(source)) !== null) {
    const themeName = themeMatch[1];

    if (EXCLUDE_THEMES.has(themeName)) continue;

    // Find the start of this theme block
    const blockStart = themeMatch.index;

    // Extract a chunk of source after this theme declaration (enough to find both variants)
    // We'll search for light: { ... } and dark: { ... } within the next ~2000 chars
    const chunk = source.substring(blockStart, blockStart + 8000);

    const lightVars = extractVariantVars(chunk, "light");
    const darkVars = extractVariantVars(chunk, "dark");

    if (lightVars && darkVars) {
      themes[themeName] = { light: lightVars, dark: darkVars };
    }
  }

  return themes;
}

/**
 * Extract CSS variables from a light or dark variant block within a chunk of source.
 */
function extractVariantVars(chunk, variant) {
  // Find "light: {" or "dark: {" in the chunk
  const variantRegex = new RegExp(`\\b${variant}:\\s*\\{`);
  const variantMatch = variantRegex.exec(chunk);
  if (!variantMatch) return null;

  const blockStart = variantMatch.index + variantMatch[0].length;

  // Extract the object body by tracking brace depth
  let depth = 1;
  let i = blockStart;
  while (i < chunk.length && depth > 0) {
    if (chunk[i] === "{") depth++;
    else if (chunk[i] === "}") depth--;
    i++;
  }

  const blockBody = chunk.substring(blockStart, i - 1);

  // Parse key-value pairs: "key": "value" or key: "value"
  const vars = {};
  // Match: "key": "value" OR key: "value"
  const kvRegex = /"?([a-zA-Z0-9_-]+)"?\s*:\s*"([^"]+)"/g;
  let kv;
  while ((kv = kvRegex.exec(blockBody)) !== null) {
    const key = kv[1];
    const value = kv[2];
    // Skip font variables and other non-CSS-variable keys
    if (key.startsWith("font-")) continue;
    vars[key] = value;
  }

  return Object.keys(vars).length > 0 ? vars : null;
}

/**
 * Convert a CSS variable name from camelCase/kebab to --css-var format.
 * Keys from tweakcn are already kebab-case without the -- prefix.
 */
function toCssVarName(key) {
  return `--${key}`;
}

/**
 * Generate CSS block for a single theme variant.
 */
function generateVariantBlock(slug, variant, vars) {
  const className = `.${slug}-${variant}`;
  const lines = [`${className} {`];

  const cssVarOrder = [
    "background",
    "foreground",
    "card",
    "card-foreground",
    "popover",
    "popover-foreground",
    "primary",
    "primary-foreground",
    "secondary",
    "secondary-foreground",
    "muted",
    "muted-foreground",
    "accent",
    "accent-foreground",
    "destructive",
    "destructive-foreground",
    "border",
    "input",
    "ring",
    "chart-1",
    "chart-2",
    "chart-3",
    "chart-4",
    "chart-5",
    "radius",
    "sidebar",
    "sidebar-foreground",
    "sidebar-primary",
    "sidebar-primary-foreground",
    "sidebar-accent",
    "sidebar-accent-foreground",
    "sidebar-border",
    "sidebar-ring",
  ];

  // Output in defined order first
  for (const key of cssVarOrder) {
    if (vars[key] !== undefined) {
      lines.push(`  ${toCssVarName(key)}: ${vars[key]};`);
    }
  }

  // Output any remaining keys not in the predefined order
  for (const [key, value] of Object.entries(vars)) {
    if (!cssVarOrder.includes(key)) {
      lines.push(`  ${toCssVarName(key)}: ${value};`);
    }
  }

  lines.push("}");
  return lines.join("\n");
}

async function main() {
  console.log("Fetching tweakcn theme presets...");
  const source = await fetchThemePresets();

  console.log("Parsing theme presets...");
  const themes = parseThemePresets(source);

  const themeNames = Object.keys(themes);
  console.log(
    `Found ${themeNames.length} themes: ${themeNames.join(", ")}\n`,
  );

  if (themeNames.length === 0) {
    throw new Error("No themes parsed — check the parsing logic");
  }

  const cssBlocks = [
    "/*",
    " * tweakcn-themes.css",
    " * Auto-generated by scripts/generate-themes.js",
    " * Do not edit manually — run node scripts/generate-themes.js to regenerate",
    " *",
    ` * Generated: ${new Date().toISOString()}`,
    ` * Themes: ${themeNames.join(", ")}`,
    " */",
    "",
  ];

  for (const [slug, { light, dark }] of Object.entries(themes)) {
    cssBlocks.push(`/* ── ${slug} ── */`);
    cssBlocks.push(generateVariantBlock(slug, "light", light));
    cssBlocks.push("");
    cssBlocks.push(generateVariantBlock(slug, "dark", dark));
    cssBlocks.push("");
  }

  const outputDir = join(__dirname, "../src/themes");
  mkdirSync(outputDir, { recursive: true });

  const outputPath = join(outputDir, "tweakcn-themes.css");
  writeFileSync(outputPath, cssBlocks.join("\n"), "utf8");

  console.log(`✓ Written to ${outputPath}`);
  console.log(`  Themes: ${themeNames.length}`);
  console.log(`  CSS classes: ${themeNames.length * 2} (light + dark each)`);

  // Print the theme slugs for use in themes.ts
  console.log("\nTheme slugs for themes.ts:");
  console.log(JSON.stringify(themeNames));
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
