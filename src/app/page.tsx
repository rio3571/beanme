import Link from "next/link";
import pathsData from "../../data/paths.json";
import type { PathCard } from "@/types";

const paths = pathsData as PathCard[];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
      <div className="max-w-md mx-auto px-5 py-12">
        {/* 헤더 */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-zinc-900 tracking-tight mb-3">
            beanme
          </h1>
          <p className="text-zinc-600 text-base">
            당신에게 맞는 원두를 찾는 가장 쉬운 방법
          </p>
        </div>

        {/* 진입 카드 3개 */}
        <div className="space-y-4">
          {paths.map((p) => (
            <Link
              key={p.path}
              href={`/quiz/${p.path}`}
              className="block bg-white rounded-2xl p-6 border-2 border-zinc-100 hover:shadow-md transition group"
              style={{ borderColor: "#F4F4F5" }}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className="inline-block px-2.5 py-1 rounded-md text-xs font-bold tracking-wider"
                  style={{
                    backgroundColor: p.badgeColor,
                    color: p.badgeTextColor,
                  }}
                >
                  {p.badge}
                </span>
                <span
                  className="text-xs font-medium"
                  style={{ color: p.primaryColor }}
                >
                  시작하기 →
                </span>
              </div>
              <h2 className="text-xl font-bold text-zinc-900 mb-1.5">
                {p.title}
              </h2>
              <p className="text-sm text-zinc-600 mb-3 leading-relaxed">
                {p.desc}
              </p>
              <ul className="space-y-1">
                {p.bullet.map((b, i) => (
                  <li
                    key={i}
                    className="text-xs text-zinc-500 flex items-center gap-1.5"
                  >
                    <span style={{ color: p.primaryColor }}>•</span>
                    {b}
                  </li>
                ))}
              </ul>
            </Link>
          ))}
        </div>

        <p className="text-center text-xs text-zinc-400 mt-10">
          beanme — 원두 구독 · 공급 서비스
        </p>
      </div>
    </main>
  );
}
