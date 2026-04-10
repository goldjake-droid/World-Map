# GEOSCOPE — Live Geopolitical Intelligence Map

Interactive world map with real-time geopolitical data, AI-powered country briefings, choropleth visualizations, and conflict analysis.

Built with **Next.js 15**, **Supabase**, **D3.js**, and **Claude AI**.

## Features

- **Political Stability Map** — Default view color-coded by stability (Very Stable → Critical)
- **6 Choropleth Modes** — Stability, Conflict, Freedom, GDP (live World Bank), Population (live), Region
- **AI-Powered Briefings** — Click any country for real-time intelligence via Claude with web search
- **Briefing Caching** — Cached in Supabase for 1 hour to reduce API calls
- **Country Search** — Autocomplete with fly-to zoom
- **Compare Mode** — Up to 3 countries side-by-side
- **Hotspots Feed** — Auto-ranked most critical countries
- **Alliance Overlays** — NATO, EU, BRICS, OPEC, ASEAN, African Union, Five Eyes, G7
- **Full Country Polygons** — GeoJSON with border mesh

## Setup

### 1. Install
```bash
npm install
```

### 2. Supabase
1. Create project at supabase.com
2. Run `supabase/schema.sql` in SQL Editor
3. Run `supabase/seed.sql` to populate data

### 3. Environment
```bash
cp .env.local.example .env.local
# Fill in your keys
```

### 4. Run
```bash
npm run dev
```

## Deploy
```bash
npx vercel
```
Set env vars in Vercel dashboard.
