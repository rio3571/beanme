import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // popbill SDK(CommonJS)를 서버 번들에서 외부 패키지로 처리
  serverExternalPackages: ["popbill"],
};

export default nextConfig;
