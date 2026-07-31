import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { areEditorialPagesEnabled } from "@/lib/site-features";

export default function robots(): MetadataRoute.Robots {
  const editorialDisallow = areEditorialPagesEnabled()
    ? []
    : ["/stack", "/radar", "/insights"];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Auth-gated and account surfaces carry nothing worth indexing.
        disallow: [
          "/account",
          "/my-projects",
          "/starred",
          "/sign-in",
          "/sign-up",
          "/api/",
          ...editorialDisallow,
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
