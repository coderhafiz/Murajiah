import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import OpenAI from "openai";

export const maxDuration = 60; // DALL-E 3 can take a bit

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API Key missing" },
        { status: 500 },
      );
    }

    // Initialize OpenAI with GitHub Models support if applicable
    const useGithubModels = apiKey.startsWith("github_");
    const baseURL = useGithubModels
      ? "https://models.inference.ai.azure.com"
      : undefined;

    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: baseURL,
    });

    // 1. Generate Image
    console.log("🎨 Generating image for:", prompt);
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
    });

    const image = response.data?.[0];
    if (!image?.b64_json) {
      throw new Error("No image data received from OpenAI");
    }

    const b64Json = image.b64_json;

    // 2. Convert Base64 to Buffer
    const buffer = Buffer.from(b64Json, "base64");

    // 3. Upload to Supabase Storage
    const fileName = `${user.id}/${Date.now()}_generated.png`;
    const { error: uploadError } = await supabase.storage
      .from("quiz_assets")
      .upload(fileName, buffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to upload generated image to storage");
    }

    // 4. Get Public URL
    const { data: urlData } = supabase.storage
      .from("quiz_assets")
      .getPublicUrl(fileName);

    return NextResponse.json({ imageUrl: urlData.publicUrl });
  } catch (error: unknown) {
    console.error("AI Image Gen Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate image";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
