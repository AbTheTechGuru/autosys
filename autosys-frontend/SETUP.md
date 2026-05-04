# AutoSys Frontend — Setup Guide

## Prerequisites
- Node.js ≥ 20
- Backend running at http://localhost:3001

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# VITE_API_URL=/v1   (uses Vite proxy to backend — no CORS issues)

# 3. Start dev server
npm run dev
# Opens http://localhost:5173
# All /v1/* requests are proxied to http://localhost:3001
```

## Build for Production

```bash
npm run build
# Output: dist/
# Deploy dist/ to Vercel, Netlify, Nginx, or any static host
# Set VITE_API_URL to your production API domain
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/v1` | Backend API base path |
| `VITE_APP_URL` | `http://localhost:5173` | Frontend URL for metadata |

## Architecture Notes

- **Auth**: Access token kept in memory only. Refresh token in httpOnly cookie set by backend.
- **API proxy**: In dev, Vite forwards `/v1/*` to `localhost:3001`. In production, configure your reverse proxy (Nginx/Cloudflare) to do the same.
- **AI features**: All Claude calls go through the backend — no Anthropic key needed in frontend.
- **Seed data**: Stores show placeholder data instantly, then replace with real backend data.
