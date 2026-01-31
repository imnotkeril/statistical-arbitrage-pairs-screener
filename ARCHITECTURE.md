# System Architecture

## Overview

The system is built on a modular principle, where each module can work independently but uses shared infrastructure (database, API structure).

## Current Modules

### 1. Screener Module (`backend/app/modules/screener/`)

**Purpose**: Search and screen cryptocurrency pairs for statistical arbitrage

**Main Components**:
- `data_loader.py` - Data loading from Binance API
- `cointegration.py` - Cointegration tests (Engle-Granger)
- `correlation.py` - Correlation analysis
- `hurst.py` - Hurst exponent calculation
- `screener.py` - Main screening logic

**API Endpoints**: `/api/v1/screener/*`

**Database**:
- `pairs_screening_results` - Screening results
- `screening_sessions` - Screening sessions
- `price_data_cache` - Price data cache

## Future Modules

### 2. Backtester Module (planned)

**Purpose**: Backtesting of pairs trading strategies

**Integration**:
- Reads results from `pairs_screening_results`
- Uses saved `beta`, `spread_std` for position calculation
- Saves results to `backtest_results` table

**New Tables**:
```sql
backtest_results (
    id, pair_id, start_date, end_date,
    total_return, sharpe_ratio, max_drawdown,
    win_rate, total_trades, ...
)

backtest_trades (
    id, backtest_id, entry_date, exit_date,
    entry_price_a, exit_price_a, entry_price_b, exit_price_b,
    pnl, ...
)
```

### 3. Trading Bot Module (planned)

**Purpose**: Automated trading based on signals

**Integration**:
- Subscribes to `pairs_screening_results` updates
- Monitors Z-score in real-time
- Executes trades via CCXT
- Saves trades to `trades` table

**New Tables**:
```sql
trades (
    id, pair_id, entry_time, exit_time,
    side, entry_price, exit_price, quantity,
    pnl, status, ...
)

positions (
    id, pair_id, asset_a, asset_b,
    quantity_a, quantity_b, entry_price,
    current_pnl, status, ...
)
```

## General Architecture

```
┌─────────────────────────────────────────────────┐
│              Frontend (React)                    │
│  - ScreenerDashboard                            │
│  - BacktesterDashboard (future)                 │
│  - TradingBotDashboard (future)                  │
└──────────────────┬──────────────────────────────┘
                   │
                   │ HTTP/REST
                   │
┌──────────────────▼──────────────────────────────┐
│           FastAPI Backend                         │
│  ┌──────────────────────────────────────────┐   │
│  │  API Routes                              │   │
│  │  - /api/v1/screener/*                    │   │
│  │  - /api/v1/backtester/* (future)         │   │
│  │  - /api/v1/trading/* (future)            │   │
│  └──────────────────────────────────────────┘   │
│                                                   │
│  ┌──────────────────────────────────────────┐   │
│  │  Modules                                  │   │
│  │  - screener/                              │   │
│  │  - backtester/ (future)                   │   │
│  │  - trading_bot/ (future)                 │   │
│  │  - shared/ (common utilities)            │   │
│  └──────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────┘
                   │
                   │ SQLAlchemy ORM
                   │
┌──────────────────▼──────────────────────────────┐
│         PostgreSQL Database                      │
│  - pairs_screening_results                       │
│  - screening_sessions                            │
│  - price_data_cache                              │
│  - backtest_results (future)                     │
│  - trades (future)                               │
└──────────────────────────────────────────────────┘
```

## Adding a New Module

### Step 1: Create Module Structure

```bash
backend/app/modules/
├── new_module/
│   ├── __init__.py
│   ├── module_logic.py
│   └── ...
```

### Step 2: Create API Routes

```python
# backend/app/api/routes_new_module.py
router = APIRouter()

@router.get("/endpoint")
async def endpoint():
    ...
```

Add to `backend/app/main.py`:
```python
from app.api.routes_new_module import router as new_module_router
app.include_router(new_module_router, prefix=f"{settings.API_V1_PREFIX}/new_module", tags=["new_module"])
```

### Step 3: Create Database Models

```python
# backend/app/database.py
class NewModuleTable(Base):
    __tablename__ = "new_module_table"
    ...
```

### Step 4: Create Frontend Components

```typescript
// frontend/src/components/NewModuleDashboard.tsx
```

## Common Utilities

### Shared Models (`backend/app/modules/shared/models.py`)

Contains common Pydantic models used by all modules:
- `PairInfo` - Pair information
- `ScreeningConfig` - Screening configuration

### Database Session

All modules use the common `get_db()` dependency from `backend/app/database.py`

## Configuration

All settings in `backend/app/config.py` via environment variables (`.env`)

## Testing

Each module should have:
- Unit tests for logic
- Integration tests for API endpoints
- Tests in `backend/tests/`

## Deployment

1. Backend: FastAPI + Uvicorn
2. Frontend: Vite build → static files
3. Database: SQLite (default, PostgreSQL optional)
4. See `DEPLOYMENT_NO_DOCKER.md` for server deployment instructions

## Scaling

- Backend: can run multiple instances behind load balancer
- Database: replication for reading
- Cache: Redis cluster for large volumes
