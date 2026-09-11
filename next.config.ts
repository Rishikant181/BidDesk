import type { NextConfig } from "next";
const config: NextConfig = { poweredByHeader: false, distDir: process.env.BIDDESK_DIST_DIR || ".next" };
export default config;
