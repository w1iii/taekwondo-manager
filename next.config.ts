import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Event images live in Cloudinary in production; the same host is used by
    // next/image for resizing/encoding. Local dev uploads are same-origin
    // (/uploads/...) and need no pattern here.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      // Uploads cap at 15 MB; multipart adds ~10-20 KB overhead on top of the
      // raw body, so give headroom.
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
