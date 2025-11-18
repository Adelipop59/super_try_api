import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import ProDashboardClient from "./pro-dashboard-client";

export default async function ProDashboardPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // If user is not pro, redirect to user dashboard
  if (profile?.role !== "pro") {
    redirect("/dashboard");
  }

  return <ProDashboardClient user={user} profile={profile} />;
}
