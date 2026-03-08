"use client";

import { Check, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocalCurrency } from "@/hooks/use-local-currency";

interface PricingCardProps {
  title: string;
  subtitle: string;
  baseAmountNGN: number;
  features: string[];
  isPremiumStyle?: boolean;
  buttonText: string;
  // If buttonHref is missing, use an onClick handler instead (or a disabled state)
  buttonHref?: string;
  isButtonDisabled?: boolean;
  buttonIcon?: React.ReactNode;
  footerText?: string;
}

export function PricingCard({
  title,
  subtitle,
  baseAmountNGN,
  features,
  isPremiumStyle = false,
  buttonText,
  buttonHref,
  isButtonDisabled = false,
  buttonIcon,
  footerText,
}: PricingCardProps) {
  const { formattedPrice, loading, error } = useLocalCurrency(baseAmountNGN);

  return (
    <div
      className={`border rounded-2xl p-8 flex flex-col relative overflow-hidden ${
        isPremiumStyle
          ? "border-2 border-purple-500 bg-card shadow-2xl shadow-purple-500/10"
          : "border-border/50 bg-card"
      }`}
    >
      {isPremiumStyle && (
        <>
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
          <div className="absolute top-4 right-4 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Most Popular
          </div>
        </>
      )}

      <div className="mb-8">
        <h3
          className={`text-2xl font-bold ${
            isPremiumStyle
              ? "bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600"
              : ""
          }`}
        >
          {title}
        </h3>
        <p className="text-muted-foreground mt-2">{subtitle}</p>

        {loading ? (
          <div className="mt-4 flex items-center text-3xl font-extrabold text-muted-foreground animate-pulse h-12">
            <Loader2 className="w-6 h-6 animate-spin mr-2 opacity-50" />
            <span className="text-lg">Calculating...</span>
          </div>
        ) : (
          <div className="mt-4 flex items-baseline text-5xl font-extrabold">
            {error ? `₦${baseAmountNGN}` : formattedPrice.split(" ")[0]}
            <span className="text-xl text-muted-foreground font-medium ml-1">
              /mo
            </span>
          </div>
        )}
      </div>

      <ul className="space-y-4 mb-8 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex gap-3">
            <Check
              className={`w-5 h-5 shrink-0 ${
                isPremiumStyle ? "text-purple-500" : "text-green-500"
              }`}
            />
            <span
              className={isPremiumStyle ? "font-medium text-foreground" : ""}
            >
              {feature}
            </span>
          </li>
        ))}
      </ul>

      {isButtonDisabled ? (
        <Button
          disabled
          className="w-full font-bold h-12 text-lg bg-green-600 opacity-100 text-white cursor-default hover:bg-green-600"
        >
          {buttonIcon} {buttonText}
        </Button>
      ) : (
        <a href={buttonHref}>
          <Button
            variant={isPremiumStyle ? "default" : "outline"}
            className={`w-full font-bold h-12 text-lg ${
              isPremiumStyle
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                : ""
            }`}
          >
            {buttonIcon} {buttonText}
          </Button>
        </a>
      )}

      {footerText && (
        <p className="text-center text-xs text-muted-foreground mt-4">
          {footerText}
        </p>
      )}
    </div>
  );
}
