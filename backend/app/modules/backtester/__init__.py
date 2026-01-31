"""
Backtester module for pairs trading strategies
"""
from .backtester import Backtester
from .strategy import ZScoreStrategy

__all__ = ['Backtester', 'ZScoreStrategy']

