import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    ignore: [
      "**/server/.wwebjs_auth/**",
      "**/server/node_modules/**",
    ],
  },
};

export default nextConfig;
