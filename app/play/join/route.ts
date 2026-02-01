import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pin = searchParams.get("pin");

  if (!pin) return redirect("/join");

  const supabase = await createClient();
  const { data: game } = await supabase
    .from("games")
    .select("id")
    .eq("pin", pin)
    .neq("status", "finished")
    .single();

  if (game) {
    return redirect(`/play/${game.id}`);
  }

  return redirect("/join?error=invalid_pin");
}
