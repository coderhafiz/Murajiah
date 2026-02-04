"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") || "");

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      return params.toString();
    },
    [searchParams],
  );

  // Manual debounce implementation
  const handleSearch = (term: string) => {
    setValue(term);
    debouncedUrlUpdate(term);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedUrlUpdate = useCallback(
    debounce((term: string) => {
      router.push(`/?${createQueryString("q", term)}`, { scroll: false });
    }, 500),
    [createQueryString, router],
  );

  return (
    <div className="relative w-full max-w-xl">
      <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => handleSearch(e.target.value)}
        className="h-11 w-full rounded-full border-2 border-border bg-card pl-10 pr-4 text-base font-medium shadow-sm transition-all focus:border-primary focus:ring-4 focus:ring-primary/20 hover:border-primary/50 text-foreground placeholder:text-muted-foreground"
        placeholder="Find a quiz..."
      />
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
