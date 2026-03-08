"use client";

import { useEffect, useState } from "react";

export function useLocalCurrency(baseAmountNGN: number) {
  const [loading, setLoading] = useState(true);
  const [formattedPrice, setFormattedPrice] = useState(
    `₦${baseAmountNGN.toLocaleString()}`,
  );
  const [symbol, setSymbol] = useState("₦");
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchPricing() {
      try {
        let userCurrency = "NGN";
        try {
          const ipRes = await fetch("https://ipapi.co/json/");
          if (ipRes.ok) {
            const ipData = await ipRes.json();
            if (ipData.currency) userCurrency = ipData.currency;
          } else {
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

        const formatParts = new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: userCurrency,
        }).formatToParts(0);

        const localSymbol =
          formatParts.find((part) => part.type === "currency")?.value ||
          userCurrency;
        setSymbol(localSymbol);

        if (userCurrency === "NGN") {
          setFormattedPrice(
            new Intl.NumberFormat("en-NG", {
              style: "currency",
              currency: "NGN",
              maximumFractionDigits: baseAmountNGN === 0 ? 0 : 2,
            }).format(baseAmountNGN),
          );
          setLoading(false);
          return;
        }

        const rateRes = await fetch("https://open.er-api.com/v6/latest/NGN");
        if (!rateRes.ok) throw new Error("Could not fetch exchange rates");
        const rateData = await rateRes.json();
        const rate = rateData.rates[userCurrency];

        if (!rate) throw new Error("Unsupported currency");

        const convertedAmount = baseAmountNGN * rate;

        const finalString = new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: userCurrency,
          maximumFractionDigits: baseAmountNGN === 0 ? 0 : 2,
        }).format(convertedAmount);

        setFormattedPrice(finalString);
      } catch (err) {
        console.error("Pricing conversion error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchPricing();
  }, [baseAmountNGN]);

  return { formattedPrice, symbol, loading, error };
}
