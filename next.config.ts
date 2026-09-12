import type { NextConfig } from "next";
const config: NextConfig = { poweredByHeader: false, serverExternalPackages: ["@google/genai", "pdfjs-dist"], outputFileTracingIncludes: {"/api/ai": ["./scripts/pdf-extract-worker.mjs", "./node_modules/pdfjs-dist/legacy/build/**"]}, distDir: process.env.BIDDESK_DIST_DIR || ".next" };
export default config;
