import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import type * as React from "react";
import { TiltButton } from "react-tilt-button";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const variantTiltMap = {
  default: {
    variant: "solid" as const,
    surfaceColor: "var(--primary)",
    sideColor: "color-mix(in srgb, var(--primary), #000 25%)",
    textColor: "var(--primary-foreground)",
    borderColor: "transparent",
    borderWidth: 0,
    elevation: 10,
    pressInset: 4,
    tilt: 2,
    radius: 6,
  },
  destructive: {
    variant: "solid" as const,
    surfaceColor: "var(--destructive)",
    sideColor: "color-mix(in srgb, var(--destructive), #000 25%)",
    textColor: "var(--destructive-foreground)",
    borderColor: "transparent",
    borderWidth: 0,
    elevation: 10,
    pressInset: 4,
    tilt: 2,
    radius: 6,
  },
  outline: {
    variant: "outline" as const,
    surfaceColor: "var(--background)",
    sideColor: "color-mix(in srgb, var(--muted), #000 15%)",
    textColor: "var(--foreground)",
    borderColor: "var(--border)",
    borderWidth: 1,
    elevation: 8,
    pressInset: 3,
    tilt: 1,
    radius: 6,
  },
  secondary: {
    variant: "solid" as const,
    surfaceColor: "var(--secondary)",
    sideColor: "color-mix(in srgb, var(--secondary), #000 25%)",
    textColor: "var(--secondary-foreground)",
    borderColor: "transparent",
    borderWidth: 0,
    elevation: 10,
    pressInset: 4,
    tilt: 2,
    radius: 6,
  },
  ghost: {
    variant: "solid" as const,
    surfaceColor: "transparent",
    sideColor: "transparent",
    textColor: "var(--foreground)",
    borderColor: "transparent",
    borderWidth: 0,
    elevation: 0,
    pressInset: 0,
    tilt: 0,
    radius: 4,
  },
  link: {
    variant: "solid" as const,
    surfaceColor: "transparent",
    sideColor: "transparent",
    textColor: "var(--primary)",
    borderColor: "transparent",
    borderWidth: 0,
    elevation: 0,
    pressInset: 0,
    tilt: 0,
    radius: 0,
  },
};

function Button({
  className,
  variant,
  size,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  if (asChild) {
    const Comp = Slot;
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </Comp>
    );
  }

  const tiltVariant = variant ?? "default";
  const tiltSize = size ?? "default";
  const tiltProps =
    variantTiltMap[tiltVariant as keyof typeof variantTiltMap] ??
    variantTiltMap.default;

  const width = tiltSize === "icon" ? 36 : "auto";
  const heightMap = { default: 36, sm: 32, lg: 40, icon: 36 } as const;
  const height =
    heightMap[tiltSize as keyof typeof heightMap] ?? heightMap.default;

  return (
    <TiltButton
      data-slot="button"
      {...tiltProps}
      width={width}
      height={height}
      motion={120}
      className={cn("font-mono text-xs", className)}
      {...props}
    >
      <span className="inline-flex items-center gap-1.5 text-xs font-mono">
        {children}
      </span>
    </TiltButton>
  );
}

export { Button, buttonVariants };
