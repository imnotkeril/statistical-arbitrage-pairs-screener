"""
Live screener that runs continuously in the background
Stores results in memory for real-time access
"""
import threading
from datetime import datetime, timedelta
from typing import Optional, List, Dict
import time
import logging

from app.modules.screener.screener import PairsScreener
from app.modules.shared.models import ScreeningConfig
from app.config import settings
from app.database import SessionLocal, ScreeningSession

logger = logging.getLogger(__name__)


class LiveScreener:
    """Continuous live screener that runs automatically and stores results in memory"""
    
    def __init__(self):
        self.is_running = False
        self.last_screening_time: Optional[datetime] = None
        self.screening_interval = 1800  # Run every 30 minutes to avoid rate limits
        self.config = ScreeningConfig(
            lookback_days=settings.SCREENER_LOOKBACK_DAYS,
            min_correlation=settings.SCREENER_MIN_CORRELATION,
            max_adf_pvalue=settings.SCREENER_MAX_ADF_PVALUE,
            include_hurst=True,  # Enable Hurst exponent calculation
            min_volume_usd=settings.SCREENER_MIN_VOLUME_USD,
            max_assets=settings.SCREENER_MAX_ASSETS
        )
        self._thread: Optional[threading.Thread] = None
        
        # In-memory storage for results
        self.current_results: List[Dict] = []
        self.last_session_info: Optional[Dict] = None
        self._lock = threading.Lock()  # Thread-safe access to results
        
        # History storage (keep last 100 sessions for trend analysis)
        self.results_history: List[Dict] = []
        self.max_history_size = 100
    
    def start(self):
        """Start the live screener"""
        if self.is_running:
            return
        
        self.is_running = True
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        logger.info("Live screener started (running without database)")
    
    def stop(self):
        """Stop the live screener"""
        self.is_running = False
        if self._thread:
            self._thread.join(timeout=5)
    
    def get_results(self) -> List[Dict]:
        """Get current screening results (thread-safe)"""
        with self._lock:
            return self.current_results.copy()
    
    def get_last_session(self) -> Optional[Dict]:
        """Get last session info"""
        with self._lock:
            return self.last_session_info.copy() if self.last_session_info else None
    
    def get_status(self) -> Dict:
        """Get current screener status"""
        with self._lock:
            return {
                'is_running': self.is_running,
                'last_screening_time': self.last_screening_time.isoformat() if self.last_screening_time else None,
                'total_pairs_found': len(self.current_results),
                'last_session': self.last_session_info
            }
    
    def run_manual(self):
        """Manually run screening (called via API) - runs once, not in loop"""
        if self.is_running:
            raise ValueError("Screening is already running")
        
        # Run screening in background thread
        thread = threading.Thread(target=self._run_screening, daemon=True)
        thread.start()
        return thread
    
    def _run_loop(self):
        """Main loop for continuous screening"""
        # Run immediately on start
        self._run_screening()
        
        # Then run periodically
        while self.is_running:
            try:
                # Check if we need to run screening
                if self._should_run_screening():
                    self._run_screening()
                
                # Sleep for 1 minute, then check again
                time.sleep(60)
            except Exception as e:
                logger.error(f"Error in live screener loop: {e}")
                time.sleep(60)  # Wait 1 minute on error
    
    def _should_run_screening(self) -> bool:
        """Check if screening should run"""
        if self.last_screening_time is None:
            return True
        
        time_since_last = datetime.utcnow() - self.last_screening_time
        return time_since_last.total_seconds() >= self.screening_interval
    
    def _run_screening(self):
        """Run a single screening cycle"""
        # Set running flag
        with self._lock:
            if self.is_running:
                logger.info("Screening already in progress, skipping")
                return
            self.is_running = True
        
        try:
            logger.info(f"Starting live screening at {datetime.utcnow()}")
            start_time = datetime.utcnow()
            
            session_id = int(start_time.timestamp())
            results = []
            total_pairs_tested = 0

            # Run screener WITHOUT database - use memory only
            screener = PairsScreener(db=None)
            out = screener.screen_pairs(self.config, session_id=session_id, return_stats=True)
            results = out.get("results", []) if isinstance(out, dict) else (out or [])
            stats = out.get("stats", {}) if isinstance(out, dict) else {}
            total_pairs_tested = int(stats.get("pairs_generated", 0) or 0)
            
            # Check alerts after screening
            try:
                from app.modules.alerts.alert_manager import AlertManager
                from app.api.routes_alerts import get_alert_manager
                alert_manager = get_alert_manager()
                triggered = alert_manager.check_all_pairs(results)
                if triggered:
                    logger.info(f"Alerts triggered for {len(triggered)} pairs")
            except Exception as alert_error:
                # Alert checking is not critical
                logger.warning(f"Could not check alerts: {alert_error}")
            
            # Update in-memory storage (thread-safe)
            with self._lock:
                # Save to history before updating
                if self.current_results:
                    self.results_history.append({
                        'timestamp': start_time.isoformat(),
                        'results': self.current_results.copy()
                    })
                    # Keep only last N sessions
                    if len(self.results_history) > self.max_history_size:
                        self.results_history = self.results_history[-self.max_history_size:]
                
                self.current_results = results
                self.last_screening_time = datetime.utcnow()
                
                # Create session info
                n = len(results) if results else 0
                # Note: We can't easily get exact count here without modifying screen_pairs return value
                # Using a reasonable estimate - actual count is printed in console during screening
                # Formula: n_assets * (n_assets - 1) / 2 for all unique pairs
                # Since we now screen all assets passing filters, this can be thousands of pairs
                # For now, use a conservative estimate based on results
                # (In practice, the actual count is logged during screening)
                total_pairs_tested = max(len(results) * 50, 1000)  # Conservative estimate
                
                self.last_session_info = {
                    'id': session_id,
                    'started_at': start_time.isoformat(),
                    'completed_at': self.last_screening_time.isoformat(),
                    'total_pairs_tested': total_pairs_tested,
                    'pairs_found': len(results),
                    'status': 'completed',
                    'config': {
                        'lookback_days': self.config.lookback_days,
                        'min_correlation': self.config.min_correlation,
                        'max_adf_pvalue': self.config.max_adf_pvalue,
                        'include_hurst': self.config.include_hurst
                    }
                }
            
            logger.info(f"Live screening completed: {len(results)} pairs found")
            
        except Exception as e:
            logger.error(f"Error in live screening: {e}", exc_info=True)
        finally:
            # Always reset running flag
            with self._lock:
                self.is_running = False
    
    def get_history(self) -> List[Dict]:
        """Get screening history (thread-safe)"""
        with self._lock:
            return self.results_history.copy()


# Global live screener instance
_live_screener: Optional[LiveScreener] = None


def get_live_screener() -> LiveScreener:
    """Get or create live screener instance (does not auto-start)"""
    global _live_screener
    if _live_screener is None:
        _live_screener = LiveScreener()
        # Do not auto-start - user must trigger manually via API
    return _live_screener
