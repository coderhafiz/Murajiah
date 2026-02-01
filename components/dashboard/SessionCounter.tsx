"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function SessionCounter({
  initialCount,
  userId,
}: {
  initialCount: number;
  userId: string;
}) {
  const [count, setCount] = useState(initialCount);
  const supabase = createClient();

  useEffect(() => {
    // Refresh count function
    const refreshCount = async () => {
      const { count: freshCount } = await supabase
        .from("games")
        .select("*", { count: "exact", head: true })
        .eq("host_id", userId)
        .in("status", ["waiting", "active"])
        .or("is_preview.eq.false,is_preview.is.null");
      setCount(freshCount || 0);
    };

    const channel = supabase
      .channel("session_counter")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "games",
          filter: `host_id=eq.${userId}`,
        },
        () => {
          // On any change to user's games, re-fetch count to be safe
          refreshCount();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  if (count <= 0) return null;

  return (
    <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse shadow-sm">
      {count}
    </span>
  );
}
