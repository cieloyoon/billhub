import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  eslint: {
    // 빌드 시 ESLint 오류를 경고로 처리하여 배포 가능하게 함
    ignoreDuringBuilds: false,
  },
  typescript: {
    // 빌드 시 TypeScript 오류를 무시할지 설정
    ignoreBuildErrors: false,
  },
  /* config options here */
};

export default nextConfig;
