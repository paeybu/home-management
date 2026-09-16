import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Home Management",
    short_name: "Home",
    description: "Recurring home maintenance tasks, assets and costs.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f766e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
