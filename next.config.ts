import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Move the dev-mode indicator off the bottom-left so it does not sit on top
  // of the sidebar account footer. Dev-only; absent from production builds.
  devIndicators: {
    position: "bottom-right",
  },
};

export default nextConfig;
