import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/kontakt", "/impressum", "/datenschutz"].map((p) => ({ url: site.url + p }));
}
