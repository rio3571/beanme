import PasswordForm from "./PasswordForm";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  return (
    <div>
      <h1 className="text-lg font-bold text-stone-800 mb-1">비밀번호 변경</h1>
      <p className="text-sm text-stone-500 mb-4">
        새 비밀번호를 입력하세요. 변경 후 다음 로그인부터 적용돼요.
      </p>
      <PasswordForm />
    </div>
  );
}
