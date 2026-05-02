"use client";

import { useState } from "react";

export default function TestPage() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleTest() {
    setLoading(true);
    setResult("요청 중...");
    try {
      const r = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pathType: "b2c",
          answers: { q1: "A", q2: "B" },
          resultType: "BRIGHT",
          blendName: "선라이즈 블렌드",
          customer: { name: "테스트", email: "test@test.com" },
        }),
      });
      const data = await r.json();
      if (r.ok) {
        setResult(
          `✅ 성공\nstatus: ${r.status}\nquizResultId: ${data.quizResultId}\ncustomerId: ${data.customerId}`
        );
      } else {
        setResult(
          `❌ 실패\nstatus: ${r.status}\nerror: ${data.error}\ndetails: ${JSON.stringify(data.details, null, 2)}`
        );
      }
    } catch (err) {
      setResult(
        `❌ 네트워크 오류\n${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-zinc-50">
      <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-sm border border-zinc-100">
        <h1 className="text-xl font-bold text-zinc-900 mb-2">
          Supabase 연결 테스트
        </h1>
        <p className="text-sm text-zinc-500 mb-6">
          버튼 클릭 시 /api/quiz 에 테스트 데이터 POST → Supabase에 저장 확인용.
          이 페이지는 테스트 후 삭제 예정.
        </p>
        <button
          onClick={handleTest}
          disabled={loading}
          className="w-full py-3 bg-emerald-700 text-white rounded-xl font-medium hover:bg-emerald-800 transition disabled:bg-zinc-300"
        >
          {loading ? "전송 중..." : "테스트 데이터 전송"}
        </button>
        {result && (
          <pre className="mt-6 p-4 bg-zinc-900 text-zinc-100 rounded-xl text-xs whitespace-pre-wrap leading-relaxed">
            {result}
          </pre>
        )}
      </div>
    </main>
  );
}
