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
    id: "quattrocento-mulish",
    name: "Quattrocento Sans + Mulish",
    headingFont: "Quattrocento Sans",
    bodyFont: "Mulish",
  },
  {
    id: "josefin-cardo",
    name: "Josefin Sans + Cardo",
    headingFont: "Josefin Sans",
    bodyFont: "Cardo",
  },
  {
    id: "oswald-barlow",
    name: "Oswald + Barlow",
    headingFont: "Oswald",
    bodyFont: "Barlow",
  },
  {
    id: "montserrat-source-sans",
    name: "Montserrat + Source Sans 3",
    headingFont: "Montserrat",
    bodyFont: "Source Sans 3",
  },
  {
    id: "chivo-krub",
    name: "Chivo + Krub",
    headingFont: "Chivo",
    bodyFont: "Krub",
  },
  {
    id: "lora-roboto",
    name: "Lora + Roboto",
    headingFont: "Lora",
    bodyFont: "Roboto",
  },
  {
    id: "rubik-assistant",
    name: "Rubik + Assistant",
    headingFont: "Rubik",
    bodyFont: "Assistant",
  },
  {
    id: "six-caps-open-sans",
    name: "Six Caps + Open Sans",
    headingFont: "Six Caps",
    bodyFont: "Open Sans",
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
    `'${pairing.headingFont}', sans-serif`,
  );
  document.documentElement.style.setProperty(
    "--font-body",
    `'${pairing.bodyFont}', sans-serif`,
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
