import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

// Enables the wrangler.jsonc bindings (D1, R2) to be available via
// getCloudflareContext() when running `next dev` locally. No-op in
// deployed/production builds (those get real bindings from the Worker runtime).
initOpenNextCloudflareForDev();
