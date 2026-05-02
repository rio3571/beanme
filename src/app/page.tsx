import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-b from-emerald-50 to-white">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold mb-4 text-zinc-900 tracking-tight">
          beanme
        </h1>
        <p className="text-xl text-zinc-700 mb-2">당신만을 위한 원두</p>
        <p className="text-sm text-zinc-500 mb-12 leading-relaxed">
          간단한 8문항으로
          <br />
          당신의 커피 유형과 추천 블렌드를 찾아드려요
        </p>
        <Link
          href="/quiz"
          className="inline-block px-10 py-4 bg-emerald-700 text-white rounded-full font-medium hover:bg-emerald-800 transition shadow-lg"
        >
          취향 테스트 시작하기 →
        </Link>
      </div>
    </main>
  );
}
