import type { MetadataRoute } from "next";

/** Name and icon when someone adds Koshertrivia to their home screen (Android, Chrome). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Koshertrivia",
    short_name: "Koshertrivia",
    description: "Tägliche Geografie-Rätsel, Länder-Quizze und Duelle mit Freunden",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f3ec",
    theme_color: "#f6f3ec",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
