# Quant Atelier MVP

Vue 3 + Vite + Pinia + Vuetify frontend with a Nitro API layer, normalized market data contracts, and pluggable `mock` / `twelvedata` providers.

## Folder Structure

```text
.
├─ design/                       # reference-only design assets
├─ shared/                       # normalized Candle/Quote types + zod schemas
├─ server/
│  ├─ routes/api/                # /api/health, /api/search, /api/quote, /api/candles
│  ├─ providers/                 # provider interface + mock + twelvedata
│  └─ utils/                     # cache, indicator calculation, provider resolution
├─ src/
│  ├─ components/                # search, states, chart, summary, toggles
│  ├─ plugins/                   # Vuetify setup
│  ├─ stores/                    # Pinia market store
│  ├─ styles/                    # global Quant Atelier theme
│  └─ utils/                     # client formatting + fetch helpers
└─ tests/                        # vitest coverage for schema/provider/indicator pipeline
```

## Core Design

- Frontend, server proxy, and provider interface are separated into `src`, `server/routes/api`, and `server/providers`.
- The frontend only talks to `/api/*`; the Twelve Data key stays server-side.
- `shared/market.ts` defines internal normalized `Quote` and `Candle` types used by every layer.
- `technicalindicators` computes EMA20/50/200, RSI14, MACD(12,26,9), Bollinger Bands(20,2), and ATR14 on the server.
- The app stays on `mock` unless `MARKET_DATA_PROVIDER=twelvedata` is explicitly enabled. Keeping only `TWELVEDATA_API_KEY` in `.env` does not activate live calls.
- Nitro responses are cached in memory using `API_CACHE_TTL_MS`.

## Features

- Symbol search
- Price hero and summary cards
- Lightweight Charts candlestick panel
- Volume, RSI, MACD, ATR subpanels
- EMA20/50/200 and Bollinger overlays
- Indicator on/off toggles
- Range controls: `1D/5D/1M/3M/6M/1Y`
- Interval controls: `1min/5min/15min/1h/1day`
- SignalSummary sentiment card
- Empty, loading, and error states

## Environment Variables

Copy `.env.example` to `.env`.

```bash
MARKET_DATA_PROVIDER=mock
TWELVEDATA_API_KEY=
API_CACHE_TTL_MS=60000
```

Provider selection rules:

- `mock`: always available
- `twelvedata`: used only when both `MARKET_DATA_PROVIDER=twelvedata` and `TWELVEDATA_API_KEY` exist

## API

- `GET /api/health`
- `GET /api/search?q=AAPL`
- `GET /api/quote?symbol=AAPL`
- `GET /api/candles?symbol=AAPL&range=3M&interval=1day`

## Run

1. Install dependencies:

```bash
npm install
```

2. Start frontend + Nitro server:

```bash
npm run dev
```

Use live Twelve Data mode only when you explicitly want real API traffic:

```bash
npm run dev:live
```

3. Open the Vite app at `http://localhost:5173`.

Vite proxies `/api/*` to Nitro on `http://localhost:3000`.

## Test

```bash
npm test
```

## E2E Test

Install the Playwright browser once:

```bash
npx playwright install chromium
```

Run browser E2E:

```bash
npm run test:e2e
```

`npm run test:e2e` always runs against `mock` to avoid consuming Twelve Data credits during normal regression checks.

Run the live-provider smoke test only when you explicitly want to spend Twelve Data credits:

```bash
npm run test:e2e:live
```

The live smoke test is intentionally limited to the initial dashboard load so it only triggers the quote and candles requests needed for the default symbol.

## Verification Checklist

- `npm run dev` starts both Vite and Nitro.
- `/api/health` returns `status: "ok"`.
- Search returns results for `AAPL`, `NVDA`, `BTCUSD`.
- Clearing `TWELVEDATA_API_KEY` still leaves the app usable with mock data.
- Indicator toggles hide/show overlays and subpanels.
- Range/interval changes trigger new `/api/candles` requests.
- Error UI appears for an invalid symbol such as `INVALID_SYM`.
- `npm test` passes schema, provider, and indicator pipeline tests.
- `npm run test:e2e` passes dashboard load, locale switch, search, error, and range/interval scenarios.
- `npm run test:e2e:live` passes when a valid `TWELVEDATA_API_KEY` is present.
