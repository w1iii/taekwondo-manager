import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Uploads cap at 15 MB; multipart adds ~10-20 KB overhead on top of the
      // raw body, so give headroom.
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
