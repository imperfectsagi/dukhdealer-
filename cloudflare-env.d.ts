// Cloudflare Worker bindings available via getCloudflareContext().env
// Keep this in sync with wrangler.jsonc.
interface CloudflareEnv {
  DB: D1Database;
  MEDIA_BUCKET: R2Bucket;
  ASSETS: Fetcher;
  ADMIN_SETUP_KEY?: string;
}
