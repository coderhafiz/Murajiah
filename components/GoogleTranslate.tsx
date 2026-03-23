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
import { cn } from "@/lib/utils";

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

export const LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ar", label: "Arabic", flag: "🇸🇦" },
  { code: "fr", label: "French", flag: "🇫🇷" },
  { code: "zh-CN", label: "Chinese", flag: "🇨🇳" },
  { code: "es", label: "Spanish", flag: "🇪🇸" },
  { code: "ja", label: "Japanese", flag: "🇯🇵" },
];

export function LanguageSwitcher({ className }: { className?: string }) {
  const [currentLang, setCurrentLang] = useState("en");

  useEffect(() => {
    const checkLang = () => {
      const cookies = document.cookie.split(";");
      const googtrans = cookies.find((c) => c.trim().startsWith("googtrans="));
      if (googtrans) {
        const lang = googtrans.split("/").pop();
        if (lang && LANGUAGES.some((l) => l.code === lang)) {
          setCurrentLang(lang);
        }
      }
    };

    checkLang();
    // Re-check on a small interval to handle changes from other instances
    const interval = setInterval(checkLang, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLanguageChange = (value: string) => {
    setCurrentLang(value);

    if (value === "en") {
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      window.location.reload();
    } else {
      document.cookie = `googtrans=/auto/${value}; path=/; domain=${window.location.hostname}`;
      document.cookie = `googtrans=/auto/${value}; path=/;`;

      const element = document.querySelector(
        ".goog-te-combo",
      ) as HTMLSelectElement;
      if (element) {
        element.value = value;
        element.dispatchEvent(new Event("change"));
      } else {
        window.location.reload();
      }
    }
  };

  return (
    <div className={cn("notranslate", className)}>
      <Select value={currentLang} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-full bg-background/80 backdrop-blur shadow-sm border-primary/20 rounded-full h-10 px-3">
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
  );
}

export default function GoogleTranslate() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);

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

  if (!mounted) return null;

  return (
    <>
      <div id="google_translate_element" className="hidden" />

      {/* Floating Trigger - Hidden on Mobile */}
      <LanguageSwitcher className="fixed bottom-4 right-4 z-50 hidden md:block w-[140px]" />

      <Script
        src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />

      <style jsx global>{`
        .goog-te-banner-frame {
          display: none !important;
        }
        iframe.goog-te-banner-frame {
          display: none !important;
        }
        body {
          top: 0px !important;
        }
        .VIpgJd-ZVi9od-ORHb-OEVmcd {
          display: none !important;
        }
      `}</style>
    </>
  );
}
