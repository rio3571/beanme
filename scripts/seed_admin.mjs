// 관리자 계정(rio3571@gmail.com) 생성/갱신 스크립트.
// 실행: node scripts/seed_admin.mjs [비밀번호]
// .env.local 에서 URL + SECRET 키를 읽음.
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const env = {};
for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = env.SUPABASE_SECRET_KEY;
const ADMIN_EMAIL = "rio3571@gmail.com";
const ADMIN_PW = process.argv[2] || "Heeyeonjae!2026";

if (!URL || !SECRET) {
  console.error("환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY");
  process.exit(1);
}

const sb = createClient(URL, SECRET, { auth: { persistSession: false } });

async function main() {
  let userId;
  const { data: created, error } = await sb.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PW,
    email_confirm: true,
  });
  if (created?.user) {
    userId = created.user.id;
    console.log("✓ auth 사용자 생성:", userId);
  } else {
    console.log("· createUser:", error?.message);
    const { data: list } = await sb.auth.admin.listUsers();
    const u = list?.users?.find((x) => x.email === ADMIN_EMAIL);
    if (!u) {
      console.error("✗ 사용자 생성/조회 실패");
      process.exit(1);
    }
    userId = u.id;
    await sb.auth.admin.updateUserById(userId, { password: ADMIN_PW });
    console.log("✓ 기존 auth 사용자 — 비밀번호 갱신:", userId);
  }

  const { data: existing } = await sb
    .from("b2b_accounts")
    .select("id")
    .eq("email", ADMIN_EMAIL)
    .maybeSingle();

  if (existing) {
    const { error: upErr } = await sb
      .from("b2b_accounts")
      .update({ auth_user_id: userId, role: "admin", active: true })
      .eq("id", existing.id);
    if (upErr) { console.error("✗ 계정 업데이트:", upErr.message); process.exit(1); }
    console.log("✓ 관리자 계정 행 업데이트");
  } else {
    const { error: insErr } = await sb.from("b2b_accounts").insert({
      auth_user_id: userId,
      company_name: "희연재 원두사업부(관리자)",
      email: ADMIN_EMAIL,
      role: "admin",
      active: true,
    });
    if (insErr) { console.error("✗ 계정 생성:", insErr.message); process.exit(1); }
    console.log("✓ 관리자 계정 행 생성");
  }

  console.log("\n=== 완료 ===");
  console.log("로그인 이메일:", ADMIN_EMAIL);
  console.log("비밀번호:", ADMIN_PW);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
