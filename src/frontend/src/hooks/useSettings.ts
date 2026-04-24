import { useEffect, useState } from "react";
import {
  type FontSize,
  applyFontPairing,
  applyFontSize,
  getSavedFontPairing,
  getSavedFontSize,
  saveFontPairing,
  saveFontSize,
} from "../lib/fontSettings";

export function useSettings() {
  const [activeTab, setActiveTabState] = useState<string>(
    () => localStorage.getItem("hyvmind-active-tab") ?? "sources",
  );
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(
    () => localStorage.getItem("hyvmind-sidebar-collapsed") === "true",
  );
  const [fontPairing, setFontPairingState] = useState<string>(() =>
    getSavedFontPairing(),
  );
  const [fontSize, setFontSizeState] = useState<FontSize>(() =>
    getSavedFontSize(),
  );

  // On mount, apply saved font settings
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only initialization
  useEffect(() => {
    applyFontPairing(fontPairing);
    applyFontSize(fontSize);
  }, []);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    localStorage.setItem("hyvmind-active-tab", tab);
  };

  const setSidebarCollapsed = (collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);
    localStorage.setItem("hyvmind-sidebar-collapsed", String(collapsed));
  };

  const setFontPairing = (pairing: string) => {
    setFontPairingState(pairing);
    saveFontPairing(pairing);
    applyFontPairing(pairing);
  };

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
    saveFontSize(size);
    applyFontSize(size);
  };

  return {
    activeTab,
    setActiveTab,
    sidebarCollapsed,
    setSidebarCollapsed,
    fontPairing,
    setFontPairing,
    fontSize,
    setFontSize,
  };
}
