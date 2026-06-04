# ICP Lead Intelligence — Frontend Dashboard

## Overview

A production-ready Next.js 15 frontend dashboard for the Job Portal Scraper & ICP Lead Intelligence Platform. It connects directly to the **same MongoDB instance** (`icp_leads` database) used by the backend scraper — no separate database.

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally or Atlas connection string
- Backend scraper at `d:/Job Portal Scraper` (optional — for live scraping)

### Setup

```bash
# 1. Navigate to frontend directory
cd "d:/Job portal frontend"

# 2. Install dependencies
npm install

# 3. Configure environment
# Edit .env.local and ensure MONGODB_URI matches your backend's .env

# 4. Run development server
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) — the app redirects to `/dashboard`.

---

## Environment Variables

Create or edit `.env.local`:

```env
# MongoDB — must match the backend scraper's .env
MONGODB_URI=mongodb://localhost:27017
DATABASE_NAME=icp_leads

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3001
PORT=3001

# Path to the backend scraper (for spawning orchestrator)
SCRAPER_PATH=d:/Job Portal Scraper
```

> [!IMPORTANT]
> The `MONGODB_URI` and `DATABASE_NAME` must match exactly what's in `d:/Job Portal Scraper/.env`. Both apps share the same database — **do not create a second database**.

---

## MongoDB Integration

The frontend reads from and writes to these collections in `icp_leads`:

| Collection | Purpose |
|---|---|
| `companies` | Discovered & enriched companies |
| `leads` | Fully scored ICP leads |
| `jobs` | Job postings from all portals |
| `signals` | Buying intent signals |
| `scrape_runs` | Scraper execution history |

The MongoDB connection is managed in [`lib/mongodb.ts`](lib/mongodb.ts) using a Next.js-safe singleton pattern.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard` | Dashboard metrics + chart data |
| POST | `/api/scraper/start` | Start a new scrape run |
| POST | `/api/scraper/stop` | Stop the active scrape run |
| GET | `/api/scraper/status` | Live status of running scrape |
| GET | `/api/leads` | Paginated + filtered leads |
| GET | `/api/companies` | Paginated company list |
| GET | `/api/company/:id` | Company detail + tabs |
| GET | `/api/history` | Scrape run history |

### POST `/api/scraper/start`
```json
{
  "region": "Hyderabad",
  "sector": "SaaS",
  "sources": ["indeed", "glassdoor", "upwork"]
}
```

### GET `/api/leads` Query Parameters
- `page` — Page number (default: 1)
- `limit` — Items per page (default: 25, max: 100)
- `search` — Full-text search (company, name, email, title)
- `region` — Filter by region/country
- `sector` — Filter by industry sector
- `icpTier` — Filter by ICP tier (`Hot`, `Warm`, `Cold`)
- `minIcp`, `maxIcp` — ICP score range filter

---

## Pages

| Route | Description |
|---|---|
| `/dashboard` | Metrics cards + 4 charts |
| `/scraper` | Control center with live status |
| `/leads` | Searchable lead explorer with CSV export |
| `/companies` | Company list with hiring scores |
| `/companies/[id]` | Company detail with Jobs/Leads/Signals/History tabs |
| `/history` | Scrape run history with detail modal |

---

## Project Structure

```
d:/Job portal frontend/
├── app/
│   ├── api/
│   │   ├── dashboard/route.ts
│   │   ├── scraper/
│   │   │   ├── start/route.ts
│   │   │   ├── stop/route.ts
│   │   │   └── status/route.ts
│   │   ├── leads/route.ts
│   │   ├── companies/route.ts
│   │   ├── company/[id]/route.ts
│   │   └── history/route.ts
│   ├── dashboard/page.tsx
│   ├── scraper/page.tsx
│   ├── leads/page.tsx
│   ├── companies/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── history/page.tsx
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── layout/Sidebar.tsx
│   └── ui/
│       ├── button.tsx
│       ├── badge.tsx
│       └── card.tsx
├── lib/
│   ├── mongodb.ts       ← MongoDB singleton
│   ├── types.ts         ← TypeScript types
│   ├── utils.ts         ← Utility functions + constants
│   └── api.ts           ← Client-side API helpers
├── .env.local           ← Environment variables
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v3 |
| UI Components | Radix UI primitives + custom components |
| Charts | Recharts |
| Icons | Lucide React |
| Toasts | Sonner |
| Database | MongoDB (shared with backend) |

---

## Running in Production

```bash
npm run build
npm run start
```

The production server runs on port 3001 by default.

---

## Backend Integration

When **Start Scraping** is clicked:

1. Frontend calls `POST /api/scraper/start` with `{ region, sector, sources }`
2. API creates a `scrape_runs` document in MongoDB with `status: "running"`
3. API attempts to spawn `d:/Job Portal Scraper/src/Orchastrater.ts` as a child process
4. The orchestrator reads `SCRAPE_REGION`, `SCRAPE_SECTOR`, and `SCRAPE_SOURCES` env vars
5. The `/api/scraper/status` endpoint is polled every 3 seconds to show live progress

> [!NOTE]
> If the orchestrator can't be spawned (e.g. tsx not in PATH), the run record is still created in MongoDB and appears in History. The scraper can also be run independently from the backend directory.

---

## Troubleshooting

**MongoDB connection failed**: Ensure MongoDB is running and `MONGODB_URI` in `.env.local` matches the backend.

**Charts show no data**: Run a scrape from the Scraper Control Center to populate data.

**Build errors**: Ensure all packages are installed with `npm install`.

**Port conflict**: Change `PORT=3001` in `.env.local` and update `NEXT_PUBLIC_APP_URL`.
