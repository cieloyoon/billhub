import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  eslint: {
    // 빌드 시 ESLint 오류를 무시하여 배포 가능하게 함
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 빌드 시 TypeScript 오류를 무시할지 설정
    ignoreBuildErrors: false,
  },
  /* config options here */
};

export default nextConfig;
