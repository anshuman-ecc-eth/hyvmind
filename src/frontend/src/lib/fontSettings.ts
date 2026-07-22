export type FontPairing = {
  id: string;
  name: string;
  headingFont: string;
  bodyFont: string;
  headingWeights: string;
  bodyWeights: string;
};

export type FontSize = "small" | "medium" | "large";

export const FONT_PAIRINGS: FontPairing[] = [
  {
    id: "system-default",
    name: "System Default",
    headingFont: "JetBrains Mono",
    bodyFont: "JetBrains Mono",
    headingWeights: "400;700",
    bodyWeights: "400;700",
  },
  {
    id: "cedarville-cursive",
    name: "Cedarville Cursive",
    headingFont: "Cedarville Cursive",
    bodyFont: "Cedarville Cursive",
    headingWeights: "400",
    bodyWeights: "400",
  },
  {
    id: "indie-flower",
    name: "Indie Flower",
    headingFont: "Indie Flower",
    bodyFont: "Indie Flower",
    headingWeights: "400",
    bodyWeights: "400",
  },
  {
    id: "zeyada",
    name: "Zeyada",
    headingFont: "Zeyada",
    bodyFont: "Zeyada",
    headingWeights: "400",
    bodyWeights: "400",
  },
  {
    id: "sue-ellen-francisco",
    name: "Sue Ellen Francisco",
    headingFont: "Sue Ellen Francisco",
    bodyFont: "Sue Ellen Francisco",
    headingWeights: "400",
    bodyWeights: "400",
  },
  {
    id: "architects-daughter",
    name: "Architects Daughter",
    headingFont: "Architects Daughter",
    bodyFont: "Architects Daughter",
    headingWeights: "400",
    bodyWeights: "400",
  },
  {
    id: "la-belle-aurore",
    name: "La Belle Aurore",
    headingFont: "La Belle Aurore",
    bodyFont: "La Belle Aurore",
    headingWeights: "400",
    bodyWeights: "400",
  },
  {
    id: "annie-use-your-telescope",
    name: "Annie Use Your Telescope",
    headingFont: "Annie Use Your Telescope",
    bodyFont: "Annie Use Your Telescope",
    headingWeights: "400",
    bodyWeights: "400",
  },
  {
    id: "give-you-glory",
    name: "Give You Glory",
    headingFont: "Give You Glory",
    bodyFont: "Give You Glory",
    headingWeights: "400",
    bodyWeights: "400",
  },
];

export const FONT_SIZE_OPTIONS: Record<FontSize, string> = {
  small: "100%",
  medium: "112.5%",
  large: "137.5%",
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
  if (stored === "small" || stored === "medium" || stored === "large")
    return stored;
  return DEFAULT_FONT_SIZE;
}

export function saveFontPairing(pairingId: string): void {
  localStorage.setItem("hyvmind-font-pairing", pairingId);
}

export function saveFontSize(size: FontSize): void {
  localStorage.setItem("hyvmind-font-size", size);
}
