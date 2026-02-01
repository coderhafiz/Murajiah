import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import OpenAI from "openai";

// Initialize OpenAI
const apiKey = process.env.OPENAI_API_KEY || "";
const isGitHubKey = apiKey.startsWith("github_");

const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: isGitHubKey ? "https://models.inference.ai.azure.com" : undefined,
});

export const maxDuration = 300; // Allow 5 minutes for generation

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API Key is missing. Please add it to .env.local" },
        { status: 500 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let sourceName = "";
    let uploadedFilePath = "";
    let fileSize = 0;
    let dataUrl = "";

    // Handle Content-Type
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "No file uploaded" },
          { status: 400 },
        );
      }
      sourceName = file.name;
      fileSize = file.size;

      // Upload to Supabase Storage (for record keeping)
      const storagePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (!uploadError) {
        uploadedFilePath = storagePath;
        console.log("✅ File uploaded to storage:", uploadedFilePath);
      } else {
        console.error("❌ Storage upload failed:", uploadError);
        // Continue even if storage fails, we can still generate the quiz
      }

      // 🔄 Convert to Base64 for Direct AI Processing
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Image = buffer.toString("base64");
      dataUrl = `data:${file.type};base64,${base64Image}`;
    } else {
      return NextResponse.json(
        { error: "Invalid request type" },
        { status: 400 },
      );
    }

    // Call OpenAI
    // Call OpenAI
    const systemPrompt = `You are an expert educational quiz generator specializing in analyzing visual content.

    CRITICAL INSTRUCTION: Analyze the provided image deeply.
    1. IGNORE irrelevant visual noise (page borders, shadows).
    2. FOCUS EXCLUSIVELY on the educational text, diagrams, and charts visible in the image.
    3. Generate questions that test understanding of the material shown.

    DETECT LANGUAGE: Analyze the language visible in the image.
    - If content is Arabic, generate the ENTIRE quiz (title, description, questions, answers) in Arabic.
    - For ALL other languages, MATCH the output language to the detected input language.

    OUTPUT FORMAT:
    The response MUST be a valid JSON object with the following schema:
    {
        "title": "String (Descriptive title based on the image topic)",
        "description": "String (Summary of the concepts shown)",
        "questions": [
            {
                "title": "String (The question text)",
                "time_limit": 20,
                "points_multiplier": 1,
                "question_type": "quiz",
                "answers": [
                    { "text": "String (Answer A)", "is_correct": boolean },
                    { "text": "String (Answer B)", "is_correct": boolean },
                    { "text": "String (Answer C)", "is_correct": boolean },
                    { "text": "String (Answer D)", "is_correct": boolean }
                ]
            }
        ]
    }

    REQUIREMENTS:
    - Generate EXACTLY 20 questions.
    - Ensure "questions" is an array.
    - Questions must be CHALLENGING and properly formatted.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Generate a quiz based on this educational image.",
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ] as any,
        },
      ],
    });

    const content = completion.choices[0].message.content;
    console.log("🤖 AI Vision Response Content:", content);
    if (!content) throw new Error("No AI response");

    const quizData = JSON.parse(content);

    if (
      !quizData.questions ||
      !Array.isArray(quizData.questions) ||
      quizData.questions.length === 0
    ) {
      throw new Error("AI failed to generate valid questions.");
    }

    // Save to Database (Same logic as main route)
    // 1. Create Quiz
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        title: quizData.title.slice(0, 255) || `Visual Quiz: ${sourceName}`,
        description: quizData.description || "Generated from image",
        creator_id: user.id,
        status: "draft",
      })
      .select()
      .single();

    if (quizError || !quiz)
      throw quizError || new Error("Failed to create quiz");

    // Save Source Document Reference
    if (uploadedFilePath) {
      await supabase.from("source_documents").insert({
        user_id: user.id,
        name: sourceName,
        file_path: uploadedFilePath,
        file_type: sourceName.split(".").pop()?.toLowerCase() || "image",
        file_size: fileSize,
        quiz_id: quiz.id,
      });
    }

    // 2. Create Questions & Answers
    if (quizData.questions && Array.isArray(quizData.questions)) {
      for (const [index, q] of quizData.questions.entries()) {
        const { data: question, error: qError } = await supabase
          .from("questions")
          .insert({
            quiz_id: quiz.id,
            title: q.title,
            time_limit: q.time_limit || 20,
            points_multiplier: q.points_multiplier || 1,
            question_type: q.question_type || "quiz",
            order_index: index,
          })
          .select()
          .single();

        if (qError || !question) continue;

        const answers = q.answers.map(
          (a: { text: string; is_correct: boolean }, i: number) => ({
            question_id: question.id,
            text: a.text,
            is_correct: a.is_correct,
            order_index: i,
            color:
              i === 0 ? "red" : i === 1 ? "blue" : i === 2 ? "yellow" : "green",
          }),
        );

        await supabase.from("answers").insert(answers);
      }
    }

    return NextResponse.json({ success: true, quizId: quiz.id });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Vision AI Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
