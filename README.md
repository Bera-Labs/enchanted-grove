# Enchanted Grove

A 1-hour focus timer that grows a magical grove with your work. Built with SvelteKit 5 + Vercel KV.

## Deploy to Vercel

1. **Push this repo to GitHub.**

2. **Import the project on [vercel.com](https://vercel.com)** — pick the repo, accept the SvelteKit defaults.

3. **Add a KV store** for persistence:
   - In the Vercel dashboard, open your project → **Storage** → **Create** → choose **KV**.
   - Click **Connect Project** so the KV credentials are wired in as env vars automatically.

4. **Redeploy** (or wait for the next push). Done.

The KV store provides a single shared state at the key `enchanted-grove:state:v1`.
There is no auth — anyone visiting the URL sees and edits the same grove (single-user mode).

## Local development

```sh
bun install
bun run dev
```

Without KV credentials locally, the app falls back to an empty in-memory state on each reload (the server logs `KV unavailable`).

To run locally **with** persistence, pull the env vars from Vercel:

```sh
npx vercel link
npx vercel env pull .env.local
bun run dev
```

## Stack

- **SvelteKit 5** (runes, `$state`, `$derived`)
- **@vercel/kv** (Upstash Redis)
- **Vercel adapter**
