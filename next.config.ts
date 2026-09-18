import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Browsers request /favicon.ico on their own, regardless of what <head>
      // says. Serving that request from the CMS-backed route means the uploaded
      // favicon wins there too, instead of a stale or missing static file.
      // NOTE: there must be no file at public/favicon.ico — a static file would
      // take precedence over this rewrite. The bundled fallback is deliberately
      // named favicon-default.png for that reason.
      { source: "/favicon.ico", destination: "/api/favicon" },
    ];
  },
};

export default nextConfig;

// Enables the wrangler.jsonc bindings (D1, R2) to be available via
// getCloudflareContext() when running `next dev` locally. No-op in
// deployed/production builds (those get real bindings from the Worker runtime).
initOpenNextCloudflareForDev();
