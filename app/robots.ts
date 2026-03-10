import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/explore", "/pricing", "/login", "/join"],
        disallow: [
          "/dashboard/",
          "/account/",
          "/host/",
          "/play/",
          "/api/",
          "/auth/",
        ],
      },
    ],
    sitemap: "https://murajiah.vercel.app/sitemap.xml",
  };
}
