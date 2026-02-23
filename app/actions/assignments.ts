"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";

// --- Types ---

export type AssignmentSettings = {
  time_per_question?: number; // in seconds, 0 or null = unlimited
  attempts_allowed?: number; // default 1
  show_results?: boolean; // default true
  shuffle_answers?: boolean;
};

export type CreateAssignmentInput = {
  quizId: string;
  title: string;
  description?: string;
  deadline?: string; // ISO string
  settings: AssignmentSettings;
};

// --- Helpers ---

function generateToken(): string {
  // Generate a secure random token (e.g. 16 bytes hex)
  return randomBytes(16).toString("hex");
}

// --- Actions ---

export async function createAssignment(input: CreateAssignmentInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // Generate a unique token
  // In a high-concurrency real app, we might check for collisions, but 16 bytes hex is huge.
  const token = generateToken();

  const { data, error } = await supabase
    .from("assignments")
    .insert({
      quiz_id: input.quizId,
      creator_id: user.id,
      title: input.title,
      description: input.description,
      deadline: input.deadline,
      settings: input.settings,
      access_token: token,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating assignment:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/assignments");
  return { success: true, assignment: data };
}

export async function deleteAssignment(assignmentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // Ensure owner is deleting
  const { data: assignment, error: fetchError } = await supabase
    .from("assignments")
    .select("creator_id")
    .eq("id", assignmentId)
    .single();

  if (fetchError || !assignment) {
    return { success: false, error: "Assignment not found." };
  }

  if (assignment.creator_id !== user.id) {
    return { success: false, error: "Unauthorized to delete this assignment." };
  }

  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("id", assignmentId);

  if (error) {
    console.error("Error deleting assignment:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/assignments");
  return { success: true };
}

export async function getAssignmentByToken(token: string) {
  const supabase = createAdminClient();

  // 1. Fetch Assignment
  const { data: assignment, error } = await supabase
    .from("assignments")
    .select(
      `
      *,
      quiz:quizzes (
        id,
        title,
        cover_image,
        questions (
          id,
          title,
          question_type,
          answers (
            id,
            text,
            is_correct,
            color
          ),
          time_limit,
          media_url,
          order_index
        )
      )
    `,
    )
    .eq("access_token", token)
    .single();

  if (error || !assignment) {
    console.error("DEBUG getAssignmentByToken:", { token, error, assignment });
    return { success: false, error: "Assignment not found" };
  }

  // 2. Check Deadline
  if (assignment.deadline && new Date(assignment.deadline) < new Date()) {
    return {
      success: false,
      error: "This assignment has expired.",
      expired: true,
      assignment,
    };
  }

  // 3. Check Status
  if (assignment.status !== "active") {
    return { success: false, error: "This assignment is closed." };
  }

  return { success: true, assignment };
}

export async function startAttempt(assignmentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Please log in to start the assignment." };
  }

  // 1. Check existing attempts count
  const { count, error: countError } = await supabase
    .from("assignment_attempts")
    .select("*", { count: "exact", head: true })
    .eq("assignment_id", assignmentId)
    .eq("user_id", user.id);

  if (countError) {
    return { success: false, error: "Error checking attempts." };
  }

  // Get assignment settings to check limit
  const { data: assignment } = await supabase
    .from("assignments")
    .select("settings")
    .eq("id", assignmentId)
    .single();

  const attemptsAllowed = assignment?.settings?.attempts_allowed || 1;

  if ((count || 0) >= attemptsAllowed) {
    return { success: false, error: "Maximum attempts reached." };
  }

  // 2. Create new attempt
  const { data: attempt, error: insertError } = await supabase
    .from("assignment_attempts")
    .insert({
      assignment_id: assignmentId,
      user_id: user.id,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    console.error("Error creating attempt:", insertError);
    return { success: false, error: "Failed to start attempt." };
  }

  return { success: true, attempt };
}

export async function submitAttempt(
  attemptId: string,
  answers: {
    question_id: string;
    value: string | string[] | null;
    is_correct: boolean;
    points: number;
  }[],
  score: number,
  totalPoints: number,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  // Update the attempt
  const { error } = await supabase
    .from("assignment_attempts")
    .update({
      score,
      total_points: totalPoints,
      answers_snapshot: answers,
      completed_at: new Date().toISOString(),
      is_completed: true,
    })
    .eq("id", attemptId)
    .eq("user_id", user.id); // Security: ensure user owns the attempt

  if (error) {
    console.error("Error submitting attempt:", error);
    return { success: false, error: "Failed to submit." };
  }

  return { success: true };
}
