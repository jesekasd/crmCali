import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getCoachContext() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: coach, error: coachError } = await supabase
    .from("coaches")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (coachError || !coach) {
    return { error: NextResponse.json({ error: "Coach profile not found" }, { status: 403 }) };
  }

  return { supabase, user, coachId: coach.id };
}
