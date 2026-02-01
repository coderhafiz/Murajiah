import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const start = Date.now();
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  console.log(`[API] Auth check took ${Date.now() - start}ms`);

  if (authError || !user) {
    console.warn("[API] Unauthorized create attempt:", authError);
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  const quizId = formData.get("quizId") as string;
  const isPreview = formData.get("isPreview") === "true";

  if (!quizId) {
    return new NextResponse("Quiz ID required", { status: 400 });
  }

  // Generate random 6 digit PIN
  const pin = Math.floor(100000 + Math.random() * 900000).toString();

  const { data: game, error } = await supabase
    .from("games")
    .insert({
      quiz_id: quizId,
      host_id: user.id,
      pin: pin,
      status: "waiting",
      is_preview: isPreview,
    })
    .select()
    .single();

  if (error) {
    console.error(error);
    return new NextResponse("Failed to create game", { status: 500 });
  }

  // Redirect to host page
  // Since this is a form submission in a new tab, a 303 See Other is appropriate
  const url = new URL(`/host/${game.id}`, request.url);
  return NextResponse.redirect(url, 303);
}
