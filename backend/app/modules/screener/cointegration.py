"""
Cointegration testing using Engle-Granger method
"""
import numpy as np
import pandas as pd
from statsmodels.tsa.stattools import adfuller
from statsmodels.regression.linear_model import OLS
from typing import Tuple, Optional


class CointegrationTester:
    """Tests for cointegration between two price series"""
    
    @staticmethod
    def engle_granger_test(
        price_a: pd.Series,
        price_b: pd.Series
    ) -> Tuple[bool, float, float, float, float]:
        """
        Perform Engle-Granger cointegration test
        
        Args:
            price_a: Price series for asset A
            price_b: Price series for asset B
            
        Returns:
            Tuple of (is_cointegrated, beta, adf_statistic, adf_pvalue, spread_std)
            is_cointegrated: True if p-value < 0.10
            beta: Hedge ratio from OLS regression
            adf_statistic: ADF test statistic
            adf_pvalue: ADF test p-value
            spread_std: Standard deviation of spread residuals
        """
        # Align series (remove NaN values)
        aligned = pd.DataFrame({'a': price_a, 'b': price_b}).dropna()
        
        if len(aligned) < 50:  # Need minimum data points
            return False, 0.0, 0.0, 1.0, 0.0
        
        price_a_aligned = aligned['a']
        price_b_aligned = aligned['b']
        
        # Step 1: OLS regression: Price_A = alpha + beta * Price_B + epsilon
        X = price_b_aligned.values.reshape(-1, 1)
        y = price_a_aligned.values
        
        # Add constant term
        X_with_const = np.column_stack([np.ones(len(X)), X])
        
        try:
            model = OLS(y, X_with_const).fit()
            alpha = model.params[0]
            beta = model.params[1]
            
            # Step 2: Calculate residuals (spread)
            residuals = price_a_aligned - (alpha + beta * price_b_aligned)
            
            # Normalize spread_std to avoid issues with different price scales
            # Use percentage of average price A to make it comparable across pairs
            avg_price_a = price_a_aligned.mean()
            spread_std_absolute = residuals.std()
            
            # Normalized spread_std as percentage (more comparable across different price levels)
            if avg_price_a > 0:
                spread_std = (spread_std_absolute / avg_price_a) * 100
            else:
                spread_std = spread_std_absolute
            
            # Step 3: ADF test on residuals
            adf_result = adfuller(residuals.dropna(), autolag='AIC')
            adf_statistic = adf_result[0]
            adf_pvalue = adf_result[1]
            
            # Cointegrated if p-value < 0.10
            is_cointegrated = adf_pvalue < 0.10
            
            return is_cointegrated, beta, adf_statistic, adf_pvalue, spread_std
            
        except Exception as e:
            print(f"Error in cointegration test: {e}")
            return False, 0.0, 0.0, 1.0, 0.0
    
    @staticmethod
    def calculate_spread(
        price_a: pd.Series,
        price_b: pd.Series,
        beta: float,
        alpha: float = 0.0
    ) -> pd.Series:
        """
        Calculate spread between two price series
        
        Args:
            price_a: Price series for asset A
            price_b: Price series for asset B
            beta: Hedge ratio
            alpha: Constant term from regression (default 0)
        
        Returns:
            Spread series: Price_A - (alpha + beta * Price_B)
        """
        aligned = pd.DataFrame({'a': price_a, 'b': price_b}).dropna()
        spread = aligned['a'] - (alpha + beta * aligned['b'])
        return spread
    
    @staticmethod
    def calculate_zscore(spread: pd.Series) -> pd.Series:
        """
        Calculate z-score of spread (normalized spread)
        
        Args:
            spread: Spread series
        
        Returns:
            Z-score series: (spread - mean) / std
        """
        spread_clean = spread.dropna()
        if len(spread_clean) == 0:
            return pd.Series(dtype=float)
        
        mean_spread = spread_clean.mean()
        std_spread = spread_clean.std()
        
        if std_spread == 0:
            return pd.Series(0, index=spread_clean.index)
        
        zscore = (spread_clean - mean_spread) / std_spread
        return zscore

