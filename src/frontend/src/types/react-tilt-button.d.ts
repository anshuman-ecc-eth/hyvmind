declare module "react-tilt-button" {
  import type { CSSProperties, ReactNode } from "react";

  export type TiltButtonVariant =
    | "solid"
    | "outline"
    | "dark"
    | "arcade"
    | "gum"
    | "carbon"
    | "warning"
    | "steel"
    | "gold"
    | "lavender";

  export interface TiltButtonProps {
    children?: ReactNode;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    variant?: TiltButtonVariant;
    elevation?: number;
    pressInset?: number;
    tilt?: number;
    pressTilt?: boolean;
    motion?: number;
    width?: number | string;
    height?: number | string;
    radius?: number;
    surfaceColor?: string;
    sideColor?: string;
    textColor?: string;
    borderColor?: string;
    borderWidth?: number;
    glareColor?: string;
    glareOpacity?: number;
    glareWidth?: number;
    className?: string;
    type?: "button" | "submit" | "reset";
    style?: CSSProperties;
  }

  export const TiltButton: React.FC<
    TiltButtonProps & React.ComponentPropsWithoutRef<"button">
  >;

  export const TiltButtonVariants: Record<
    TiltButtonVariant,
    {
      surfaceColor: string;
      sideColor: string;
      textColor: string;
      borderColor: string;
      borderWidth: number;
    }
  >;
}
