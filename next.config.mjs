/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pure static export — no server, ready for GitHub Pages.
  output: "export",
  images: { unoptimized: true },
  // Set BASE_PATH=/your-repo-name when building for a GitHub Pages project site.
  // Leave empty for local dev / user pages / CloudStudio preview.
  basePath: process.env.BASE_PATH || "",
  trailingSlash: true,
};

export default nextConfig;
