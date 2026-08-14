import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Event/chapter image uploads cap at 2 MB; multipart adds ~10-20 KB
      // overhead on top of the raw body, so give headroom.
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
