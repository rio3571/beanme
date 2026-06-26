"use server";

import { createClient } from "@/lib/supabase";
import { redirect } from "next/navigation";

export async function signOutAction() {
  const sb = await createClient();
  await sb.auth.signOut();
  redirect("/portal/login");
}
