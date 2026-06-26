// 로그인 아이디 처리.
// Supabase Auth는 이메일을 식별자로 쓰므로, 영문 아이디는 내부용 이메일로 변환한다.
// 예: "purpapa1" → "purpapa1@beanme.local" (실제 메일 아님, 내부 식별용)
//     "a@b.com"  → 그대로 사용
export const LOGIN_DOMAIN = "beanme.local";

export function toAuthEmail(input: string): string {
  const v = (input || "").trim().toLowerCase();
  if (!v) return "";
  return v.includes("@") ? v : `${v}@${LOGIN_DOMAIN}`;
}

export function displayLoginId(email: string | null | undefined): string {
  const v = (email || "").trim();
  return v.toLowerCase().endsWith(`@${LOGIN_DOMAIN}`)
    ? v.slice(0, -(LOGIN_DOMAIN.length + 1))
    : v;
}

export function validLoginId(input: string): boolean {
  const v = (input || "").trim();
  if (v.includes("@")) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v); // 이메일 형식
  }
  return /^[a-zA-Z0-9._-]{2,}$/.test(v); // 영문/숫자/._- , 2자 이상
}
