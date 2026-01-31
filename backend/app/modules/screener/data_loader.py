"""
Data loader for fetching cryptocurrency price data from Binance
"""
import ccxt
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from app.database import PriceDataCache
from app.config import settings
import time
import threading
import pickle
from pathlib import Path


class DataLoader:
    """Loads and caches price data from Binance"""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        """Singleton pattern to share cache and rate limiting across instances"""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(DataLoader, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        # Only initialize once
        if hasattr(self, '_initialized'):
            return
        
        self.exchange = ccxt.binance({
            'apiKey': settings.BINANCE_API_KEY,
            'secret': settings.BINANCE_API_SECRET,
            'enableRateLimit': True,
            'rateLimit': 1200,  # 1200ms between requests (50 requests per minute)
            'options': {
                'defaultType': 'future'  # Use futures instead of spot (futures can be shorted)
            }
        })
        # In-memory cache to avoid duplicate requests
        self._price_cache: Dict[str, pd.Series] = {}
        self._cache_lock = threading.Lock()
        self._last_request_time = 0
        self._min_request_interval = 0.5  # Minimum 500ms between requests (2 requests per second max)
        self._request_lock = threading.Lock()  # Lock for serializing requests
        # Cache for failed symbols to avoid spam in logs and repeated requests
        self._failed_symbols: set = set()
        # Cache for symbols with insufficient data (to avoid repeated requests)
        self._insufficient_data_symbols: Dict[str, int] = {}  # symbol -> days_available
        
        # Locks for individual cache keys to prevent duplicate requests
        self._fetching_locks: Dict[str, threading.Lock] = {}
        self._fetching_locks_lock = threading.Lock()  # Lock for managing fetching_locks dict
        
        # Persistent file cache directory
        self._cache_dir = Path("cache/price_data")
        self._cache_dir.mkdir(parents=True, exist_ok=True)
        
        self._initialized = True
    
    def get_top_assets(self, limit: Optional[int] = None, min_volume_usd: float = 1_000_000) -> List[str]:
        """
        Get cryptocurrencies by volume from Binance (NO FALLBACK - real data only)
        
        Args:
            limit: Maximum number of assets to return (None = no limit, all assets passing filters)
            min_volume_usd: Minimum daily volume in USD
            
        Returns:
            List of asset symbols (e.g., ['BTC', 'ETH', 'SOL'])
            
        Raises:
            ValueError: If unable to fetch data from Binance
            TimeoutError: If request times out
        """
        # Rate limiting before request
        current_time = time.time()
        time_since_last = current_time - self._last_request_time
        if time_since_last < self._min_request_interval:
            time.sleep(self._min_request_interval - time_since_last)
        
        # Fetch tickers to get volume information (with increased timeout)
        # Use threading for timeout on Windows
        import threading
        tickers_result = [None]
        tickers_error = [None]
        
        def fetch_tickers_thread():
            try:
                tickers_result[0] = self.exchange.fetch_tickers()
            except Exception as e:
                tickers_error[0] = e
        
        thread = threading.Thread(target=fetch_tickers_thread)
        thread.daemon = True
        thread.start()
        thread.join(timeout=90)  # Increased timeout to 90 seconds
        
        # NO FALLBACK - throw error if timeout
        if thread.is_alive():
            raise TimeoutError("Binance API request timed out after 90 seconds. Please try again.")
        
        if tickers_error[0]:
            error = tickers_error[0]
            error_msg = str(error)
            # Check for geographic restriction (451)
            if '451' in error_msg or 'restricted location' in error_msg.lower() or 'Eligibility' in error_msg:
                raise ValueError("Binance API unavailable from your location (geographic restriction)")
            # Check if it's a rate limit error
            elif '418' in error_msg or '-1003' in error_msg or 'rate limit' in error_msg.lower():
                raise ValueError(f"Binance API rate limit exceeded: {error_msg}")
            else:
                raise ValueError(f"Failed to fetch assets from Binance: {error}")
        
        if tickers_result[0] is None:
            raise ValueError("Binance API returned None - no data received")
        
        tickers = tickers_result[0]
        self._last_request_time = time.time()
        
        # Filter and sort by volume
        valid_tickers = []
        for symbol, ticker in tickers.items():
            # Check if market is active
            if not ticker.get('active', True):
                continue
            
            # Filter only perpetual contracts (skip delivery futures with expiration)
            # Perpetual contracts don't have expiration date
            # Also check contract type if available
            contract_type = ticker.get('type', '').lower()
            if 'expiry' in ticker or 'expires' in ticker or 'expiration' in ticker:
                continue
            # Skip if it's explicitly a delivery contract
            if contract_type and 'delivery' in contract_type:
                continue
            # Skip contracts with date in symbol (e.g., BTCUSDT_240329 for delivery)
            if '_' in symbol and any(char.isdigit() for char in symbol.split('_')[-1]):
                continue
            
            base = None
            # Handle different symbol formats: BTC/USDT, BTCUSDT, BTC/USDT:USDT
            if '/' in symbol:
                parts = symbol.split('/')
                base = parts[0]
                quote = parts[1].split(':')[0] if ':' in parts[1] else parts[1]
            elif symbol.endswith('USDT'):
                # Futures format: BTCUSDT
                base = symbol.replace('USDT', '')
                quote = 'USDT'
            else:
                continue
            
            # Only USDT pairs
            if quote == 'USDT' and base:
                volume_usd = ticker.get('quoteVolume', 0) or ticker.get('volume', 0)
                if volume_usd and volume_usd >= min_volume_usd:
                    valid_tickers.append({
                        'symbol': base,
                        'volume': volume_usd
                    })
        
        # Sort by volume
        valid_tickers.sort(key=lambda x: x['volume'], reverse=True)
        
        # Exclude stablecoins
        stablecoins = {'USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'USDP', 'USDD'}
        top_assets = [t['symbol'] for t in valid_tickers if t['symbol'] not in stablecoins]
        
        if not top_assets:
            raise ValueError("No valid assets found from Binance matching the criteria")
        
        # Apply limit if specified
        if limit:
            top_assets = top_assets[:limit]
        
        return top_assets
    
    def fetch_ohlcv(
        self, 
        symbol: str, 
        days: int = 365,
        db: Optional[Session] = None
    ) -> pd.DataFrame:
        """
        Fetch OHLCV data for a symbol (NO CACHE CHECKING - just fetch from API)
        
        Args:
            symbol: Asset symbol (e.g., 'BTC')
            days: Number of days of historical data
            db: Database session for caching (optional)
            
        Returns:
            DataFrame with columns: date, open, high, low, close, volume
        """
        # Fetch from exchange with retry logic
        max_retries = 3
        retry_delay = 2  # seconds
        
        for attempt in range(max_retries):
            try:
                symbol_pair = f"{symbol}/USDT"
                timeframe = '1d'
                max_candles_per_request = 1000
                
                if days <= max_candles_per_request:
                    # Single request
                    since = self.exchange.milliseconds() - (days * 24 * 60 * 60 * 1000)
                    # Log request details for debugging
                    if symbol in ['1000SHIB', 'SHIB', 'GALA'] or days > 200:
                        print(f"  DEBUG {symbol}: Requesting {days} days, since={since} ({(self.exchange.milliseconds() - since) / (24*60*60*1000):.1f} days ago)")
                    ohlcv = self.exchange.fetch_ohlcv(symbol_pair, timeframe, since=since)
                    if symbol in ['1000SHIB', 'SHIB', 'GALA'] or days > 200:
                        print(f"  DEBUG {symbol}: Received {len(ohlcv) if ohlcv else 0} candles from API")
                else:
                    # Multiple requests needed for > 1000 days
                    # Binance returns data from 'since' to now, max 1000 candles
                    # Strategy: fetch batches going backwards in time
                    all_ohlcv = []
                    now_ms = self.exchange.milliseconds()
                    batches_needed = (days + 999) // 1000  # Round up
                    
                    for batch_num in range(batches_needed):
                        # Calculate how many days back we need to go
                        # Batch 0: most recent 1000 days (or less if days < 1000)
                        # Batch 1: days 1000-1999 back
                        # Batch 2: days 2000-2999 back, etc.
                        batch_start_days_back = batch_num * 1000
                        batch_end_days_back = min((batch_num + 1) * 1000, days)
                        
                        # Calculate since timestamp (how far back from now)
                        since = now_ms - (batch_end_days_back * 24 * 60 * 60 * 1000)
                        
                        try:
                            batch_ohlcv = self.exchange.fetch_ohlcv(
                                symbol_pair, timeframe, 
                                since=since, 
                                limit=max_candles_per_request
                            )
                        except Exception as e:
                            print(f"Error fetching batch {batch_num + 1}/{batches_needed} for {symbol}: {e}")
                            break
                        
                        if not batch_ohlcv:
                            break
                        
                        if batch_num == 0:
                            # First batch: take the most recent candles (up to batch_end_days_back)
                            # Binance returns from 'since' to now, so take the last batch_end_days_back candles
                            if len(batch_ohlcv) > batch_end_days_back:
                                batch_ohlcv = batch_ohlcv[-batch_end_days_back:]
                        else:
                            # Subsequent batches: filter out candles we already have
                            if all_ohlcv:
                                oldest_timestamp = min(candle[0] for candle in all_ohlcv)
                                # Take only candles older than what we already have
                                batch_ohlcv = [c for c in batch_ohlcv if c[0] < oldest_timestamp]
                                # Take the most recent ones from this batch (up to 1000)
                                if len(batch_ohlcv) > 1000:
                                    batch_ohlcv = batch_ohlcv[-1000:]
                        
                        if batch_ohlcv:
                            all_ohlcv.extend(batch_ohlcv)
                        
                        # Rate limiting between batches
                        if batch_num < batches_needed - 1:
                            time.sleep(0.5)
                    
                    # Sort by timestamp (oldest first) and remove duplicates
                    all_ohlcv.sort(key=lambda x: x[0])
                    seen = set()
                    unique_ohlcv = []
                    for candle in all_ohlcv:
                        if candle[0] not in seen:
                            seen.add(candle[0])
                            unique_ohlcv.append(candle)
                    ohlcv = unique_ohlcv
                    
                    # Take only the most recent 'days' candles
                    if len(ohlcv) > days:
                        ohlcv = ohlcv[-days:]
                
                if not ohlcv:
                    return pd.DataFrame()
                
                df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
                df['date'] = pd.to_datetime(df['timestamp'], unit='ms')
                df.set_index('date', inplace=True)
                df = df[['open', 'high', 'low', 'close', 'volume']]
                
                # Log date range for debugging
                if symbol in ['1000SHIB', 'SHIB', 'GALA'] or days > 200:
                    if len(df) > 0:
                        print(f"  DEBUG {symbol}: Data range: {df.index[0].date()} to {df.index[-1].date()} ({len(df)} candles)")
                
                # Ensure we have exactly 'days' candles (most recent)
                if len(df) > days:
                    df = df.tail(days)
                    if symbol in ['1000SHIB', 'SHIB', 'GALA'] or days > 200:
                        print(f"  DEBUG {symbol}: Trimmed to {len(df)} candles (most recent {days} days)")
                
                # Cache in database (optional)
                if db:
                    try:
                        for date, row in df.iterrows():
                            price_data = PriceDataCache(
                                symbol=symbol,
                                date=date.date(),
                                open=float(row['open']),
                                high=float(row['high']),
                                low=float(row['low']),
                                close=float(row['close']),
                                volume=float(row['volume'])
                            )
                            db.merge(price_data)  # Use merge to handle duplicates
                        db.commit()
                    except Exception as db_error:
                        # Database error is not critical
                        pass
                
                return df
                
            except ccxt.RateLimitExceeded as e:
                if attempt < max_retries - 1:
                    wait_time = retry_delay * (attempt + 1) * 5  # Longer wait for rate limit
                    print(f"Rate limit hit for {symbol}, waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                else:
                    print(f"Rate limit exceeded for {symbol} after {max_retries} attempts. IP may be temporarily banned.")
                    return pd.DataFrame()
            except Exception as e:
                error_msg = str(e)
                # Check for geographic restriction (451) - don't retry
                if '451' in error_msg or 'restricted location' in error_msg.lower() or 'Eligibility' in error_msg:
                    if attempt == 0:  # Only print once
                        print(f"⚠️  Binance API unavailable from your location (geographic restriction). Cannot fetch data for {symbol}.")
                    return pd.DataFrame()  # Don't retry for geographic restrictions
                # Check if it's a rate limit error (418 or -1003) or IP ban
                elif '418' in error_msg or '-1003' in error_msg or 'rate limit' in error_msg.lower() or 'banned' in error_msg.lower():
                    if attempt < max_retries - 1:
                        wait_time = retry_delay * (attempt + 1) * 10  # Much longer wait for IP ban
                        print(f"Rate limit/IP ban error for {symbol}, waiting {wait_time}s before retry...")
                        time.sleep(wait_time)
                    else:
                        print(f"Rate limit/IP ban exceeded for {symbol} after {max_retries} attempts. Please wait before trying again.")
                        return pd.DataFrame()
                else:
                    # Only print error once per symbol to avoid log spam
                    if symbol not in self._failed_symbols:
                        print(f"Error fetching data for {symbol}: {e}")
                        self._failed_symbols.add(symbol)
                    return pd.DataFrame()
        
        return pd.DataFrame()
    
    def get_price_series(self, symbol: str, days: int = 365, db: Optional[Session] = None) -> pd.Series:
        """
        Get closing price series for a symbol with caching and rate limiting
        
        Args:
            symbol: Asset symbol
            days: Number of days
            db: Database session
            
        Returns:
            Series with dates as index and prices as values
        """
        cache_key = f"{symbol}_{days}"
        cache_file = self._cache_dir / f"{cache_key.replace('/', '_')}.pkl"
        
        # 0. Quick check: if we know this symbol has insufficient data, return early
        if symbol in self._insufficient_data_symbols:
            available_days = self._insufficient_data_symbols[symbol]
            if available_days < days * 0.8:
                # Return empty series to indicate insufficient data
                # This prevents repeated API calls for symbols we know don't have enough data
                return pd.Series(dtype=float)
        
        # 1. Check in-memory cache first (fastest)
        with self._cache_lock:
            if cache_key in self._price_cache:
                cached_series = self._price_cache[cache_key]
                if len(cached_series) >= days * 0.8:  # At least 80% of requested days
                    return cached_series.copy()
                # Remove from cache if insufficient data
                del self._price_cache[cache_key]
        
        # 2. Get lock for this specific symbol/days to prevent duplicate requests
        with self._fetching_locks_lock:
            if cache_key not in self._fetching_locks:
                self._fetching_locks[cache_key] = threading.Lock()
            fetch_lock = self._fetching_locks[cache_key]
        
        # 3. Acquire lock for this specific symbol/days combination
        with fetch_lock:
            # Double-check cache after acquiring lock (another thread might have loaded it)
            with self._cache_lock:
                if cache_key in self._price_cache:
                    cached_series = self._price_cache[cache_key]
                    if len(cached_series) >= days * 0.8:  # At least 80% of requested days
                        return cached_series.copy()
            # Double-check cache after acquiring lock (another thread might have loaded it)
            with self._cache_lock:
                if cache_key in self._price_cache:
                    cached_series = self._price_cache[cache_key]
                    if len(cached_series) >= days * 0.8:
                        return cached_series.copy()
            
            # 4. Check file cache (persistent across restarts)
            if cache_file.exists():
                try:
                    with open(cache_file, 'rb') as f:
                        price_series = pickle.load(f)
                    
                    if len(price_series) >= days * 0.8:
                        # Load into memory cache for faster access
                        with self._cache_lock:
                            self._price_cache[cache_key] = price_series.copy()
                            # Limit cache size
                            if len(self._price_cache) > 200:
                                oldest_key = next(iter(self._price_cache))
                                del self._price_cache[oldest_key]
                        return price_series
                    else:
                        # Delete cache file if insufficient data
                        try:
                            cache_file.unlink()
                        except Exception:
                            pass
                except Exception:
                    # If file is corrupted, delete it
                    try:
                        cache_file.unlink()
                    except Exception:
                        pass
            
            # 5. Fetch from API (with rate limiting)
            with self._request_lock:
                current_time = time.time()
                time_since_last = current_time - self._last_request_time
                if time_since_last < self._min_request_interval:
                    time.sleep(self._min_request_interval - time_since_last)
                
                try:
                    # Log the request
                    print(f"Fetching {days} days of data for {symbol}...")
                    df = self.fetch_ohlcv(symbol, days, db)
                    self._last_request_time = time.time()
                    
                    if df.empty:
                        print(f"⚠️  Warning: No data returned from API for {symbol}")
                        # Try to return from file cache even if API failed
                        if cache_file.exists():
                            try:
                                with open(cache_file, 'rb') as f:
                                    price_series = pickle.load(f)
                                print(f"  → Using cached data for {symbol}: {len(price_series)} days (requested {days})")
                                return price_series
                            except Exception:
                                pass
                        # Mark as failed
                        self._insufficient_data_symbols[symbol] = 0
                        return pd.Series(dtype=float)
                    
                    price_series = df['close']
                    days_received = len(price_series)
                    
                    # Verify we got enough data
                    if days_received < days * 0.8:
                        print(f"⚠️  Warning: Only got {days_received} days of data for {symbol}, requested {days} days")
                        print(f"  → Possible reasons: asset recently listed, API error, or insufficient historical data")
                        # Cache this to avoid repeated requests
                        self._insufficient_data_symbols[symbol] = days_received
                        # Still return the data we have (might be useful for some pairs)
                    elif days_received < days:
                        print(f"  ✓ Got {days_received} days for {symbol} (requested {days}, missing {days - days_received} days)")
                    else:
                        print(f"  ✓ Successfully fetched {days_received} days of data for {symbol}")
                    
                    # 6. Save to file cache (persistent)
                    try:
                        with open(cache_file, 'wb') as f:
                            pickle.dump(price_series, f)
                    except Exception:
                        # Non-critical if file cache fails
                        pass
                    
                    # 7. Cache in memory
                    with self._cache_lock:
                        self._price_cache[cache_key] = price_series.copy()
                        # Limit cache size to prevent memory issues
                        if len(self._price_cache) > 200:
                            # Remove oldest entries (simple FIFO)
                            oldest_key = next(iter(self._price_cache))
                            del self._price_cache[oldest_key]
                    
                    return price_series
                except Exception as e:
                    print(f"Error loading price series for {symbol}: {e}")
                    # Try to return from file cache even if API failed
                    if cache_file.exists():
                        try:
                            with open(cache_file, 'rb') as f:
                                price_series = pickle.load(f)
                            print(f"Using cached data for {symbol}: {len(price_series)} days (requested {days})")
                            return price_series
                        except Exception:
                            pass
                    
                    # Return cached data from memory if available
                    with self._cache_lock:
                        if cache_key in self._price_cache:
                            cached = self._price_cache[cache_key].copy()
                            print(f"Using in-memory cache for {symbol}: {len(cached)} days (requested {days})")
                            return cached
                    
                    return pd.Series(dtype=float)
    
    def clear_cache(self, symbol: Optional[str] = None, days: Optional[int] = None):
        """
        Clear cache for a specific symbol and/or days, or clear all cache
        
        Args:
            symbol: Asset symbol to clear (None = all symbols)
            days: Number of days to clear (None = all days)
        """
        # Clear in-memory cache
        with self._cache_lock:
            if symbol and days:
                # Clear specific cache entry
                cache_key = f"{symbol}_{days}"
                if cache_key in self._price_cache:
                    del self._price_cache[cache_key]
            elif symbol:
                # Clear all entries for this symbol
                keys_to_remove = [k for k in self._price_cache.keys() if k.startswith(f"{symbol}_")]
                for key in keys_to_remove:
                    del self._price_cache[key]
            elif days:
                # Clear all entries for this days value
                keys_to_remove = [k for k in self._price_cache.keys() if k.endswith(f"_{days}")]
                for key in keys_to_remove:
                    del self._price_cache[key]
            else:
                # Clear all cache
                self._price_cache.clear()
        
        # Clear file cache
        if symbol and days:
            # Clear specific file
            cache_key = f"{symbol}_{days}"
            cache_file = self._cache_dir / f"{cache_key.replace('/', '_')}.pkl"
            if cache_file.exists():
                try:
                    cache_file.unlink()
                except Exception:
                    pass
        elif symbol:
            # Clear all files for this symbol
            pattern = f"{symbol.replace('/', '_')}_*.pkl"
            for cache_file in self._cache_dir.glob(pattern):
                try:
                    cache_file.unlink()
                except Exception:
                    pass
        elif days:
            # Clear all files for this days value
            pattern = f"*_{days}.pkl"
            for cache_file in self._cache_dir.glob(pattern):
                try:
                    cache_file.unlink()
                except Exception:
                    pass
        else:
            # Clear all cache files
            for cache_file in self._cache_dir.glob("*.pkl"):
                try:
                    cache_file.unlink()
                except Exception:
                    pass

