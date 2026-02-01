import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "kyduuhglexmzmwjyfnot.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // For Google Auth avatars
        port: "",
        pathname: "**",
      },
    ],
  },
};

export default nextConfig;
