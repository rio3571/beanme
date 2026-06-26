// 상품 목록을 산·바다·노을·디카페인 4종으로 교체.
// 실행: node scripts/seed_products.mjs
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const env = {};
for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const products = [
  { name: "산", category: "blend", unit: "kg", base_price: 0, sort_order: 1 },
  { name: "바다", category: "blend", unit: "kg", base_price: 0, sort_order: 2 },
  { name: "노을", category: "blend", unit: "kg", base_price: 0, sort_order: 3 },
  { name: "디카페인", category: "blend", unit: "kg", base_price: 0, sort_order: 4 },
];

async function main() {
  // 기존 상품 전체 삭제 (account_prices는 CASCADE로 함께 정리됨)
  const { error: delErr } = await sb
    .from("products")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (delErr) { console.error("✗ 삭제 실패:", delErr.message); process.exit(1); }
  console.log("✓ 기존 상품 삭제");

  const { error: insErr } = await sb.from("products").insert(products);
  if (insErr) { console.error("✗ 등록 실패:", insErr.message); process.exit(1); }
  console.log("✓ 산·바다·노을·디카페인 등록 완료");
}

main().catch((e) => { console.error(e); process.exit(1); });
