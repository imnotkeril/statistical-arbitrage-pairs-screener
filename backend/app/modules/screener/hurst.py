"""
Hurst exponent calculation for mean reversion detection
"""
import numpy as np
import pandas as pd
from typing import Optional


class HurstCalculator:
    """Calculates Hurst exponent for spread series"""
    
    @staticmethod
    def generalized_hurst_exponent(
        series: pd.Series,
        max_lags: int = 50,
        q: int = 1
    ) -> Optional[float]:
        """
        Calculate generalized Hurst exponent (GHE)
        
        Args:
            series: Time series (typically spread)
            max_lags: Maximum lag for calculation
            q: Moment order (q=1 for standard Hurst)
            
        Returns:
            Hurst exponent (H < 0.5 = mean reverting, H > 0.5 = trending)
        """
        if len(series) < max_lags * 2:
            return None
        
        # Remove NaN
        series_clean = series.dropna().values
        
        if len(series_clean) < max_lags * 2:
            return None
        
        # Calculate increments
        increments = np.diff(series_clean)
        
        if len(increments) < max_lags:
            return None
        
        tau_values = np.arange(1, min(max_lags, len(increments) // 2))
        k_values = []
        
        for tau in tau_values:
            if tau >= len(increments):
                break
            
            # Calculate K_q(tau)
            diff_tau = increments[tau:] - increments[:-tau]
            numerator = np.mean(np.abs(diff_tau) ** q)
            denominator = np.mean(np.abs(increments) ** q)
            
            if denominator == 0:
                continue
            
            k = numerator / denominator
            k_values.append(k)
        
        if len(k_values) < 5:  # Need minimum points for regression
            return None
        
        # Log-log regression: log(K) = q*H*log(tau) + C
        log_tau = np.log(tau_values[:len(k_values)])
        log_k = np.log(np.array(k_values) + 1e-10)  # Add small value to avoid log(0)
        
        # Linear regression
        try:
            slope, _ = np.polyfit(log_tau, log_k, 1)
            h_exponent = slope / q
            return h_exponent
        except:
            return None

