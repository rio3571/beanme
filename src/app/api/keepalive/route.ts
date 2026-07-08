import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";

// 콜드 스타트 방지용 — Vercel Cron이 주기적으로 호출해 서버·DB를 깨워둠.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = createAdminClient();
    await admin.from("products").select("id").limit(1);
  } catch {
    // 워밍 실패해도 무시 (목적은 인스턴스 유지)
  }
  return NextResponse.json({ ok: true });
}
