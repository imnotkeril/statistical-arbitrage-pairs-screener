# Statistical Arbitrage Pairs Screener

A modular system for screening cryptocurrency pairs for statistical arbitrage opportunities.

## Project Structure

```
stat_arb_system/
├── backend/          # FastAPI backend
├── frontend/         # React frontend
└── README.md
```

## Quick Start

### 1. Install Dependencies

**Backend:**
```bash
cd backend
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

**Using npm (if concurrently is installed):**
```bash
npm run install:all
```

### 2. Run the Project

**Option 1: Using npm (single window with colored output)**
```bash
# First install concurrently (one time)
npm install

# Then run
npm run dev
```

Stop: `Ctrl+C` in the same window

**Option 2: Manual run (if you need control)**

**Backend:**
```bash
cd backend
python run.py
```

**Frontend (in another terminal):**
```bash
cd frontend
npm run dev
```

### 3. Database Setup

The application uses SQLite by default (no additional setup required).

The database file will be created automatically at `backend/data/stat_arb.db` on first backend startup.

Optionally, create a `.env` file in the project root to customize settings:
```bash
cp .env.example .env
```

### 4. Run the Application

**Backend (in a separate terminal):**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Frontend (in a separate terminal):**
```bash
cd frontend
npm run dev
```

The application will be available at: http://localhost:5173

## API Endpoints

- `GET /api/v1/screener/status` - Screening status
- `POST /api/v1/screener/run` - Start screening
- `GET /api/v1/screener/results` - Screening results
- `GET /api/v1/screener/pairs/{pair_id}` - Pair details
- `GET /api/v1/screener/stats` - Statistics

API documentation is available at: http://localhost:8000/docs

## Usage

1. Open the web interface
2. Configure screening parameters (lookback days, min correlation, max ADF p-value)
3. Click "Run Screening"
4. Wait for completion (may take several minutes)
5. View results in the table and heatmap

## Modular Architecture

The system is built modularly for easy addition of new features:

- **Screener Module** (current) - Pair screening
- **Backtester Module** (future) - Strategy backtesting
- **Trading Bot Module** (future) - Automated trading

All modules use a shared database and API structure.

## Technologies

**Backend:**
- FastAPI
- SQLAlchemy
- SQLite (default, PostgreSQL optional)
- CCXT (Binance API)
- statsmodels (cointegration)

**Frontend:**
- React + TypeScript
- Vite
- React Query
- Recharts
- Tailwind CSS

## License

MIT
