# Railway Deployment Guide

## Problem Analysis

The deployment failed because:
1. Railway detected the project as Node.js (due to `package.json` in root)
2. Railway tried to run `npm run dev` which attempts to run both backend and frontend
3. Python was not found in the Node.js environment
4. Dependencies were not installed

## Solution

This project is configured to deploy **only the backend** on Railway. The frontend should be deployed separately or built and served statically.

## Configuration Files Created

1. **`railway.json`** - Railway configuration
2. **`nixpacks.toml`** - Build configuration for Railway
3. **`Procfile`** - Process file (alternative)
4. **`runtime.txt`** - Python version specification

## Deployment Steps

### Option 1: Backend Only (Recommended)

1. In Railway dashboard, go to your service settings
2. Set **Root Directory** to: `backend`
3. Set **Start Command** to: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variable: `PORT` (Railway sets this automatically)

### Option 2: Using Configuration Files

1. The `railway.json` and `nixpacks.toml` files should automatically configure Railway
2. Make sure Railway detects Python (it should with `runtime.txt` and `nixpacks.toml`)
3. Railway will run the start command from `railway.json`

## Environment Variables

Add these in Railway dashboard:
- `DATABASE_URL=sqlite:///./data/stat_arb.db` (or PostgreSQL URL if using)
- `PORT` (automatically set by Railway)

## Frontend Deployment

For the frontend, you have two options:

### Option A: Separate Railway Service
1. Create a new service in Railway
2. Set root directory to `frontend`
3. Build command: `npm ci && npm run build`
4. Start command: `npx serve -s dist -l $PORT`

### Option B: Static Hosting
- Deploy frontend to Vercel, Netlify, or Cloudflare Pages
- Update API URL in `frontend/src/services/api.ts` to point to Railway backend URL

## Troubleshooting

If deployment still fails:
1. Check Railway logs for specific errors
2. Ensure Python 3.11 is available (check `runtime.txt`)
3. Verify all dependencies in `backend/requirements.txt` are installable
4. Check that `backend/app/main.py` exists and is correct
