import * as React from "react";
import { cn } from "@/lib/utils";
// Note: Created lib/utils.ts below if not exists, or I will create it.

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "ghost"
    | "destructive"
    | "game-red"
    | "game-blue"
    | "game-yellow"
    | "game-green";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variants = {
      default:
        "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95",
      secondary:
        "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm active:scale-95 transition-transform",
      outline:
        "border border-input bg-background hover:bg-accent hover:text-accent-foreground active:scale-95 transition-transform",
      ghost:
        "hover:bg-accent hover:text-accent-foreground active:scale-95 transition-transform",
      destructive:
        "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg active:scale-95 transition-transform",
      "game-red":
        "bg-game-red text-white hover:brightness-110 shadow-[0_4px_0_#b91c32] active:shadow-none active:translate-y-[4px] border-b-0 transition-all",
      "game-blue":
        "bg-game-blue text-white hover:brightness-110 shadow-[0_4px_0_#1059b0] active:shadow-none active:translate-y-[4px] border-b-0 transition-all",
      "game-yellow":
        "bg-game-yellow text-white hover:brightness-110 shadow-[0_4px_0_#b58500] active:shadow-none active:translate-y-[4px] border-b-0 transition-all",
      "game-green":
        "bg-game-green text-white hover:brightness-110 shadow-[0_4px_0_#1e6b09] active:shadow-none active:translate-y-[4px] border-b-0 transition-all",
    };

    const sizes = {
      default: "h-12 px-6 py-2 text-lg font-bold rounded-lg",
      sm: "h-9 rounded-md px-3 text-sm font-semibold",
      lg: "h-16 rounded-xl px-10 text-2xl font-black", // Big game buttons
      icon: "h-10 w-10",
    };

    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button };
