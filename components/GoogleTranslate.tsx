"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe } from "lucide-react";

declare global {
  interface Window {
    google: {
      translate: {
        TranslateElement: {
          new (
            options: {
              pageLanguage: string;
              includedLanguages: string;
              layout: number;
              autoDisplay: boolean;
            },
            element: string,
          ): void;
          InlineLayout: { SIMPLE: number };
        };
      };
    };
    googleTranslateElementInit: () => void;
  }
}

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ar", label: "Arabic", flag: "🇸🇦" },
  { code: "fr", label: "French", flag: "🇫🇷" },
  { code: "zh-CN", label: "Chinese", flag: "🇨🇳" },
  { code: "es", label: "Spanish", flag: "🇪🇸" },
  { code: "ja", label: "Japanese", flag: "🇯🇵" },
];

export default function GoogleTranslate() {
  const [currentLang, setCurrentLang] = useState("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Delay setting mounted to avoid synchronous state update lint error
    const timer = setTimeout(() => setMounted(true), 0);

    // Check initial language from cookie
    const cookies = document.cookie.split(";");
    const googtrans = cookies.find((c) => c.trim().startsWith("googtrans="));
    if (googtrans) {
      const lang = googtrans.split("/").pop();
      if (lang && LANGUAGES.some((l) => l.code === lang)) {
        setTimeout(() => setCurrentLang(lang), 0);
      }
    }

    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: "en,ar,fr,zh-CN,es,ja",
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
        },
        "google_translate_element",
      );
    };

    return () => clearTimeout(timer);
  }, []);

  const handleLanguageChange = (value: string) => {
    setCurrentLang(value);

    if (value === "en") {
      // Clear cookies to reset to original
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      window.location.reload();
    } else {
      // Set cookie for target language (Note: Google uses /auto/code or /en/code)
      document.cookie = `googtrans=/auto/${value}; path=/; domain=${window.location.hostname}`;
      document.cookie = `googtrans=/auto/${value}; path=/;`;

      // Attempt to trigger hidden element
      const element = document.querySelector(
        ".goog-te-combo",
      ) as HTMLSelectElement;
      if (element) {
        element.value = value;
        element.dispatchEvent(new Event("change"));
      } else {
        // Fallback: Reload to apply cookie
        window.location.reload();
      }
    }
  };

  if (!mounted) return null;

  return (
    <>
      {/* Hidden Container for Google Widget */}
      <div id="google_translate_element" className="hidden" />

      {/* Custom Floating Trigger */}
      <div className="fixed bottom-4 right-4 z-50 notranslate">
        <Select value={currentLang} onValueChange={handleLanguageChange}>
          <SelectTrigger className="w-[140px] bg-background/80 backdrop-blur shadow-lg border-primary/20 rounded-full h-10 px-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <SelectValue placeholder="Language" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                <span className="mr-2">{lang.flag}</span> {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Script
        src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />

      <style jsx global>{`
        /* Hide Top Banner Iframe */
        .goog-te-banner-frame {
          display: none !important;
        }
        iframe.goog-te-banner-frame {
          display: none !important;
        }
        /* Fix Body Shift */
        body {
          top: 0px !important;
        }
        /* Hide "Suggest an edit" tooltips if they annoy */
        .VIpgJd-ZVi9od-ORHb-OEVmcd {
          display: none !important;
        }
      `}</style>
    </>
  );
}
