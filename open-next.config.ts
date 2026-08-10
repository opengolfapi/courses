import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';

// Without an incrementalCache, OpenNext has nowhere to persist a rendered page,
// so every prerendered route is regenerated from Supabase on EVERY request.
// Measured 2026-08-10 on courses.opengolfapi.org: `x-nextjs-cache: MISS` on six
// consecutive requests, TTFB 3.8-4.1s each, despite the response carrying
// `x-nextjs-prerender: 1` and `s-maxage=3600`. The page was already prerendered;
// there was simply no store to read it back out of.
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
