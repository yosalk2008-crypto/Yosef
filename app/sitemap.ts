import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/musterwebsite", "/impressum", "/datenschutz"].map((p) => ({ url: site.url + p }));
}
