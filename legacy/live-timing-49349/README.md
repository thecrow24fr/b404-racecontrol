# Validated Live Timing export (49349)

This isolated Next.js subproject preserves the Live Timing view approved on local port 49349. It is built separately from the main RaceControl site so the production change can be limited to `/live-timing/` and its dependencies.

## Public build

Build with `NEXT_PUBLIC_LIVE_TIMING_API_URL=https://api.b404ldc.fr`. The 49349 preview uses a local proxy to port 49350; that local proxy must never be baked into or published with this export.

The deployment must use the `--live-timing-only` uploader scope with `out/` as its source. Do not publish this subproject's root page or the whole export. The scope includes `/live-timing/`, its route RSC files, referenced static resources, and the dynamic `cars/` assets; it leaves the site homepage and shared favicon untouched.

No `.env`, local API process, or proxy server is included in this public build package.
