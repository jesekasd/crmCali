import { redirect } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: coach } = await supabase.from("coaches").select("name").eq("user_id", user.id).maybeSingle();

  return (
    <main className="min-h-screen p-4 md:p-6">
      <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-[250px_1fr]">
        <aside className="card h-fit space-y-5 p-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">CalisTrack</h1>
            <p className="text-sm text-slate-500">{coach?.name ?? user.email}</p>
          </div>
          <Navigation />
          <SignOutButton />
        </aside>
        <section>{children}</section>
      </div>
    </main>
  );
}
