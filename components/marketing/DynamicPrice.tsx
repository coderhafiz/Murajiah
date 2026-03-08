"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface DynamicPriceProps {
  baseAmountNGN: number;
}

export function DynamicPrice({ baseAmountNGN }: DynamicPriceProps) {
  const [loading, setLoading] = useState(true);
  const [formattedPrice, setFormattedPrice] = useState("₦3,000.00 /mo");
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchPricing() {
      try {
        // 1. Get User's Currency ISO code based on IP
        let userCurrency = "NGN";
        try {
          // Attempt ipapi first
          const ipRes = await fetch("https://ipapi.co/json/");
          if (ipRes.ok) {
            const ipData = await ipRes.json();
            if (ipData.currency) userCurrency = ipData.currency;
          } else {
            // Fallback to ipwho.is if rate limited
            const fallbackRes = await fetch("https://ipwho.is/");
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json();
              if (fallbackData.connection?.currency?.code) {
                userCurrency = fallbackData.connection.currency.code;
              }
            }
          }
        } catch (e) {
          console.warn("Could not fetch IP location, defaulting to NGN", e);
        }

        // 2. If it's already NGN, no conversion needed
        if (userCurrency === "NGN") {
          setFormattedPrice(
            new Intl.NumberFormat("en-NG", {
              style: "currency",
              currency: "NGN",
            }).format(baseAmountNGN) + " /mo",
          );
          setLoading(false);
          return;
        }

        // 3. Fetch Exchange Rate from NGN to user's currency
        const rateRes = await fetch("https://open.er-api.com/v6/latest/NGN");
        if (!rateRes.ok) throw new Error("Could not fetch exchange rates");
        const rateData = await rateRes.json();

        const rate = rateData.rates[userCurrency];

        if (!rate) {
          // Fallback if currency not supported by exchange API
          throw new Error("Unsupported currency");
        }

        const convertedAmount = baseAmountNGN * rate;

        // 4. Format the final string
        const finalString = new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: userCurrency,
        }).format(convertedAmount);

        setFormattedPrice(`${finalString} /mo`);
      } catch (err) {
        console.error("Pricing conversion error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchPricing();
  }, [baseAmountNGN]);

  if (loading) {
    return (
      <div className="mt-4 flex items-center text-3xl font-extrabold text-muted-foreground animate-pulse">
        <Loader2 className="w-8 h-8 animate-spin mr-2 opacity-50" />
        <span className="text-xl">Calculating...</span>
      </div>
    );
  }

  // If there was any error (ad-blocker blocking IP api, rate limit, etc), fallback safely to standard NGN
  if (error) {
    return (
      <div className="mt-4 flex items-baseline text-5xl font-extrabold">
        ₦3,000
        <span className="text-xl text-muted-foreground font-medium">/mo</span>
      </div>
    );
  }

  return (
    <div className="mt-4 flex items-baseline text-5xl font-extrabold">
      {formattedPrice.split(" ")[0]}
      <span className="text-xl text-muted-foreground font-medium ml-1">
        /mo
      </span>
    </div>
  );
}
