import { Button } from "@/components/ui/button";
import { ChevronLeft, X } from "lucide-react";
import { useTheme } from "next-themes";
import { DEFAULT_THEME, getVariant } from "../lib/themes";

interface AppPageHeaderProps {
  title: string;
  onClose: () => void;
  closeOcid?: string;
  onBack?: () => void;
  backLabel?: string;
  backOcid?: string;
  subtitle?: string;
}

export default function AppPageHeader({
  title,
  onClose,
  closeOcid = "page-header.close.button",
  onBack,
  backLabel = "Back",
  backOcid = "page-header.back.button",
  subtitle,
}: AppPageHeaderProps) {
  const { theme } = useTheme();
  const currentTheme = theme || DEFAULT_THEME;
  const isDark = getVariant(currentTheme) === "dark";
  const logoSrc = isDark
    ? "/assets/hyvmind_logo_dark.png"
    : "/assets/hyvmind_logo_light.png";

  return (
    <header className="relative flex items-center justify-between border-b border-dashed border-border pl-[12px] pr-2 py-3">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="flex cursor-pointer items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          data-ocid={backOcid}
        >
          <ChevronLeft className="h-4 w-4" />
          {backLabel}
        </button>
      ) : (
        <img
          src={logoSrc}
          alt="hyvmind"
          className="h-5 object-contain"
          style={!isDark ? { mixBlendMode: "multiply" } : undefined}
        />
      )}
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-baseline">
        <h1 className="font-mono text-sm font-medium">{title}</h1>
        {subtitle && (
          <span className="ml-2 font-mono text-xs text-muted-foreground">
            / {subtitle}
          </span>
        )}
      </div>
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
