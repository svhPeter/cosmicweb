import type { MetadataRoute } from "next";

import { bodies } from "@/data-static/bodies";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = [
    "",
    "/explore",
    "/planets",
    "/compare",
    "/compare/size",
    "/compare/gravity",
    "/compare/weight",
    "/today",
    "/about",
  ];
  const planetRoutes = bodies.map((b) => `/planets/${b.slug}`);
  return [...staticRoutes, ...planetRoutes].map((path) => ({
    url: `${site.url}${path}`,
    lastModified: now,
    changeFrequency: path.startsWith("/today") ? "daily" : "weekly",
    priority: path === "" ? 1 : path.startsWith("/planets/") ? 0.8 : 0.7,
  }));
}
