import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    // short links for social media; the utm_source shows up in Vercel Analytics (Referrers / UTM)
    const social = (path: string, src: string, to = "/") => ({ source: path, destination: `${to}?utm_source=${src}&utm_medium=social`, permanent: false });
    return [
      { source: "/musterwebsite/:path*", destination: "/", permanent: true },
      { source: "/taeglich/zeitreise", destination: "/", permanent: true },
      social("/tiktok", "tiktok"),
      social("/tt", "tiktok"),
      social("/tt/halal", "tiktok", "/halal"),
      social("/tt/koscher", "tiktok", "/koscher"),
      social("/tt/tiefgang", "tiktok", "/tiefgang"),
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
