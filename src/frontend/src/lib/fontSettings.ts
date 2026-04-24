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
    id: "quattrocento-muli",
    name: "Quattrocento Sans + Muli",
    headingFont: "Quattrocento Sans",
    bodyFont: "Muli",
    headingWeights: "400;700",
    bodyWeights: "300;400;600",
  },
  {
    id: "josefin-cardo",
    name: "Josefin Sans + Cardo",
    headingFont: "Josefin Sans",
    bodyFont: "Cardo",
    headingWeights: "300;400;700",
    bodyWeights: "400",
  },
  {
    id: "oswald-barlow",
    name: "Oswald + Barlow",
    headingFont: "Oswald",
    bodyFont: "Barlow",
    headingWeights: "400;500;700",
    bodyWeights: "300;400;500",
  },
  {
    id: "montserrat-source-sans",
    name: "Montserrat + Source Sans 3",
    headingFont: "Montserrat",
    bodyFont: "Source Sans 3",
    headingWeights: "400;600;700",
    bodyWeights: "300;400;600",
  },
  {
    id: "chivo-krub",
    name: "Chivo + Krub",
    headingFont: "Chivo",
    bodyFont: "Krub",
    headingWeights: "400;700",
    bodyWeights: "300;400",
  },
  {
    id: "lora-roboto",
    name: "Lora + Roboto",
    headingFont: "Lora",
    bodyFont: "Roboto",
    headingWeights: "400;500;700",
    bodyWeights: "300;400;500",
  },
  {
    id: "rubik-assistant",
    name: "Rubik + Assistant",
    headingFont: "Rubik",
    bodyFont: "Assistant",
    headingWeights: "400;500;700",
    bodyWeights: "300;400;600",
  },
  {
    id: "six-caps-open-sans",
    name: "Six Caps + Open Sans Condensed",
    headingFont: "Six Caps",
    bodyFont: "Open Sans Condensed",
    headingWeights: "400",
    bodyWeights: "300;400;700",
  },
];

export const FONT_SIZE_OPTIONS: Record<FontSize, string> = {
  small: "87.5%",
  medium: "100%",
  large: "112.5%",
};

export const DEFAULT_FONT_PAIRING = "system-default";
export const DEFAULT_FONT_SIZE: FontSize = "small";

export function getGoogleFontsUrl(pairingId: string): string {
  if (pairingId === "system-default") return "";
  const pairing = FONT_PAIRINGS.find((p) => p.id === pairingId);
  if (!pairing) return "";

  const headingFamily = pairing.headingFont.replace(/ /g, "+");
  const bodyFamily = pairing.bodyFont.replace(/ /g, "+");
  const headingWeights = pairing.headingWeights.replace(/;/g, ";");
  const bodyWeights = pairing.bodyWeights.replace(/;/g, ";");

  return `https://fonts.googleapis.com/css2?family=${headingFamily}:wght@${headingWeights}&family=${bodyFamily}:wght@${bodyWeights}&display=swap`;
}

export function applyFontPairing(pairingId: string): void {
  const existingLink = document.getElementById("hyvmind-google-fonts");
  if (existingLink) existingLink.remove();

  if (pairingId !== "system-default") {
    const url = getGoogleFontsUrl(pairingId);
    if (url) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.id = "hyvmind-google-fonts";
      link.href = url;
      document.head.appendChild(link);
    }
  }

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
