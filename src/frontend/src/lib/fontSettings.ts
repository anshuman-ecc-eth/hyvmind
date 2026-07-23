export type FontPairing = {
  id: string;
  name: string;
  headingFont: string;
  bodyFont: string;
};

export type FontSize = "small" | "medium" | "large" | "huge" | "colossal";

export const FONT_PAIRINGS: FontPairing[] = [
  {
    id: "system-default",
    name: "System Default",
    headingFont: "Ubuntu Sans",
    bodyFont: "Ubuntu Sans",
  },
  {
    id: "annie-use-your-telescope",
    name: "Annie Use Your Telescope",
    headingFont: "Annie Use Your Telescope",
    bodyFont: "Annie Use Your Telescope",
  },
  {
    id: "architects-daughter",
    name: "Architects Daughter",
    headingFont: "Architects Daughter",
    bodyFont: "Architects Daughter",
  },
  {
    id: "cedarville-cursive",
    name: "Cedarville Cursive",
    headingFont: "Cedarville Cursive",
    bodyFont: "Cedarville Cursive",
  },
  {
    id: "crafty-girls",
    name: "Crafty Girls",
    headingFont: "Crafty Girls",
    bodyFont: "Crafty Girls",
  },
  {
    id: "give-you-glory",
    name: "Give You Glory",
    headingFont: "Give You Glory",
    bodyFont: "Give You Glory",
  },
  {
    id: "handlee",
    name: "Handlee",
    headingFont: "Handlee",
    bodyFont: "Handlee",
  },
  {
    id: "mansalva",
    name: "Mansalva",
    headingFont: "Mansalva",
    bodyFont: "Mansalva",
  },
  {
    id: "pangolin",
    name: "Pangolin",
    headingFont: "Pangolin",
    bodyFont: "Pangolin",
  },
];

export const FONT_SIZE_OPTIONS: Record<FontSize, string> = {
  small: "100%",
  medium: "112.5%",
  large: "137.5%",
  huge: "175%",
  colossal: "225%",
};

export const DEFAULT_FONT_PAIRING = "system-default";
export const DEFAULT_FONT_SIZE: FontSize = "medium";

export function applyFontPairing(pairingId: string): void {
  const pairing =
    FONT_PAIRINGS.find((p) => p.id === pairingId) ?? FONT_PAIRINGS[0];
  document.documentElement.style.setProperty(
    "--font-heading",
    `'${pairing.headingFont}', monospace`,
  );
  document.documentElement.style.setProperty(
    "--font-body",
    `'${pairing.bodyFont}', monospace`,
  );
}

export function applyFontSize(size: FontSize): void {
  document.documentElement.style.fontSize =
    FONT_SIZE_OPTIONS[size] ?? FONT_SIZE_OPTIONS.small;
}

export function getSavedFontPairing(): string {
  return localStorage.getItem("hyvmind-font-pairing") ?? DEFAULT_FONT_PAIRING;
}

export function getSavedFontSize(): FontSize {
  const stored = localStorage.getItem("hyvmind-font-size");
  if (stored !== null && stored in FONT_SIZE_OPTIONS) return stored as FontSize;
  return DEFAULT_FONT_SIZE;
}

export function saveFontPairing(pairingId: string): void {
  localStorage.setItem("hyvmind-font-pairing", pairingId);
}

export function saveFontSize(size: FontSize): void {
  localStorage.setItem("hyvmind-font-size", size);
}
