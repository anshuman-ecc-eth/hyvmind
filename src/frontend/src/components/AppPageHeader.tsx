import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useTheme } from "next-themes";
import { DEFAULT_THEME, getVariant } from "../lib/themes";

interface AppPageHeaderProps {
  title: string;
  onClose: () => void;
  closeOcid?: string;
}

export default function AppPageHeader({
  title,
  onClose,
  closeOcid = "page-header.close.button",
}: AppPageHeaderProps) {
  const { theme } = useTheme();
  const currentTheme = theme || DEFAULT_THEME;
  const isDark = getVariant(currentTheme) === "dark";
  const logoSrc = isDark
    ? "/assets/hyvmind_logo_dark.png"
    : "/assets/hyvmind_logo_light.png";

  return (
    <header className="relative flex items-center justify-between border-b border-dashed border-border pl-[12px] pr-2 py-3">
      <img
        src={logoSrc}
        alt="hyvmind"
        className="h-5 object-contain"
        style={!isDark ? { mixBlendMode: "multiply" } : undefined}
      />
      <h1 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-sm font-medium">
        {title}
      </h1>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        aria-label="Close"
        className="font-mono text-xs hover:bg-accent hover:text-accent-foreground border border-dashed border-transparent hover:border-border"
        data-ocid={closeOcid}
      >
        <X className="h-4 w-4" />
      </Button>
    </header>
  );
}
