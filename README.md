# Railwise

Railwise is a modern train search tool for Indian Railways. Timetables tell you when a train is *scheduled* to arrive, but they don't tell you how punctual it actually is. Railwise pulls real running data from recent days to calculate an evidence-based reliability score, helping you pick the train least likely to disrupt your travel plans.

---

## Features

- **Live Station Search**: Autocomplete for station names and codes with full keyboard navigation.
- **Schedule & Route Details**: Departure, arrival, total duration, halts, and running days.
- **Punctuality Scoring**: A 5-tier reliability score (Very reliable, Reliable, Moderate, Unreliable, Severe delays) calculated from actual destination arrival records over recent running days.
- **Recent Runs Breakdown**: A clean per-run table showing boarding delay vs destination arrival delay, making it easy to spot trains that recover time en route vs those that accumulate delays.
- **Smart Filtering & Sorting**: Filter by departure window (Morning, Afternoon, Evening, Night) or reliable-only, and sort by earliest departure, fastest journey, or reliability score.
- **Dark Mode**: High-contrast dark theme with system preference detection and manual toggle.
- **Shareable Links**: Search parameters sync to the URL (`?from=&to=&date=`) so routes and dates can be bookmarked or shared directly.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, CSS Modules, Lucide icons
- **Backend**: Express 5 (lightweight proxy managing upstream rate limits, request queueing, and on-disk JSON caching)
- **Data Source**: [RailRadar API](https://railradar.in)

---

## Getting Started

### Prerequisites

- Node.js 20+
- A [RailRadar API](https://railradar.in) key

### Installation

1. Clone the repository:
   ```bash
   git clone git@github.com:AnayP99/railwise.git
   cd railwise
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

   Add your RailRadar API key to `.env`:
   ```ini
   RAILRADAR_API_KEY=rr_live_your_actual_key
   ```

4. Start the development servers:
   ```bash
   npm run dev
   ```

   This runs both the Express proxy (`http://localhost:8787`) and the Vite frontend (`http://localhost:5173`) concurrently.

---

## Configuration

You can customize server behavior via environment variables in `.env`:

| Variable | Default | Description |
| --- | --- | --- |
| `RAILRADAR_API_KEY` | *(required)* | RailRadar API key |
| `HISTORY_DAYS` | `7` | Number of past running days sampled per analysed train |
| `MAX_TRAINS_PER_SEARCH` | `20` | Maximum train results returned per search |
| `AUTO_ANALYSE_MAX` | `3` | Automatically scores routes with this many trains or fewer |
| `PROVIDER_REQUESTS_PER_MINUTE` | `10` | Rate limiter spacing for upstream provider calls |
| `CACHE_FILE` | `.cache/provider.json` | Local disk cache file path |

---

## How Scoring Works

1. **Destination Arrival**: The reliability score is based on actual arrival delays at your destination station, not origin departure.
2. **On-Time Rate**: The percentage of sampled runs that arrived within 15 minutes of schedule.
3. **Average Delay**: Typical delay in minutes across sampled runs.
4. **Cancellations**: Cancelled runs are factored into the score calculation.
5. **Score Formula**: Combines on-time percentage (72%), arrival delay margin (28%), and a penalty for cancellations, yielding a score from 0 to 100.
6. **En-Route Analysis**: The detailed runs table compares boarding delay at your origin against arrival delay at your destination to show whether the train gained or lost time en route.

---

## Project Structure

```text
railwise/
├── server/
│   └── index.js              # Express proxy, rate limiting, and scoring logic
├── src/
│   ├── components/           # Modular UI components with co-located CSS modules
│   │   ├── DelayHistory/     # Recent runs table and en-route performance
│   │   ├── EmptyState/       # Zero-state and intro screens
│   │   ├── Header/           # Top navigation and dark mode toggle
│   │   ├── Hero/             # Hero banner and search trigger
│   │   ├── ReliabilityScore/ # Score ring and tooltip breakdown
│   │   ├── RouteTimeline/    # Key stops timeline
│   │   ├── SearchPanel/      # Station selectors and date picker
│   │   ├── StationPicker/    # Autocomplete popover
│   │   └── TrainCard/        # Expandable train card
│   ├── hooks/                # Custom React hooks (search, URL state, station autocomplete)
│   ├── lib/                  # Shared data types, API client, and formatters
│   ├── App.tsx               # Main layout orchestrator
│   └── App.css               # Global theme tokens and resets
├── index.html
├── package.json
└── vite.config.ts
```

---

## Disclaimer

Railwise is an independent travel planning tool. It is not affiliated with, authorized by, or endorsed by Indian Railways, IRCTC, or NTES.
