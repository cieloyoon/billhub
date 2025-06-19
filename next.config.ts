import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  eslint: {
    // 빌드 시 ESLint 완전 무시
    ignoreDuringBuilds: true,
  },
  typescript: {
    // TypeScript 오류는 검사
    ignoreBuildErrors: false,
  },
  /* config options here */
};

export default nextConfig;
