import React from 'react';
import { PairResult, PairSpreadData } from '../services/api';
import PositionCalculator from './PositionCalculator';
import BacktestSection from './BacktestSection';

interface PairDetailsProps {
  pair: PairResult;
  spreadData: PairSpreadData;
}

const PairDetails: React.FC<PairDetailsProps> = ({ pair, spreadData }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-teal-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/20 border-emerald-500/50';
    if (score >= 60) return 'bg-teal-500/20 border-teal-500/50';
    if (score >= 40) return 'bg-yellow-500/20 border-yellow-500/50';
    return 'bg-orange-500/20 border-orange-500/50';
  };

  const getZScoreColor = (zscore: number) => {
    if (Math.abs(zscore) >= 2) return 'text-red-400';
    if (Math.abs(zscore) >= 1) return 'text-yellow-400';
    return 'text-emerald-400';
  };

  const getZScoreRecommendation = (zscore: number) => {
    if (zscore >= 2) return { action: 'Sell Spread', color: 'text-red-400', bg: 'bg-red-500/20' };
    if (zscore <= -2) return { action: 'Buy Spread', color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
    if (zscore >= 1) return { action: 'Watch (High)', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    if (zscore <= -1) return { action: 'Watch (Low)', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    return { action: 'Neutral', color: 'text-gray-400', bg: 'bg-gray-500/20' };
  };

  const recommendation = getZScoreRecommendation(spreadData.current_zscore);

  return (
    <div className="space-y-6">
      {/* Composite Score & Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`${getScoreBg(spreadData.composite_score)} border rounded-xl p-4`}>
          <div className="text-xs text-gray-400 mb-2">Pair Strength</div>
          <div className={`text-3xl font-light ${getScoreColor(spreadData.composite_score)} mb-1`}>
            {spreadData.composite_score.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">Composite Score</div>
          <div className="mt-2 h-2 bg-[#1a1a24] rounded-full overflow-hidden">
            <div 
              className={`h-full ${getScoreColor(spreadData.composite_score).replace('text-', 'bg-')}`}
              style={{ width: `${spreadData.composite_score}%` }}
            ></div>
          </div>
        </div>

        <div className={`${recommendation.bg} border rounded-xl p-4`}>
          <div className="text-xs text-gray-400 mb-2">Current Z-Score</div>
          <div className={`text-3xl font-light ${getZScoreColor(spreadData.current_zscore)} mb-1`}>
            {spreadData.current_zscore.toFixed(2)}
          </div>
          <div className={`text-sm font-medium ${recommendation.color} mt-2`}>
            {recommendation.action}
          </div>
        </div>

        <div className="bg-[#1a1a24] border border-[#2a2a34] rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-2">Beta (Hedge Ratio)</div>
          <div className="text-3xl font-light text-white mb-1">
            {pair.beta.toFixed(4)}
          </div>
          <div className="text-xs text-gray-500">Hedge: {pair.beta.toFixed(2)}x {pair.asset_b} per {pair.asset_a}</div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0a0a0f] border border-[#1a1a24] rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Correlation</div>
          <div className={`text-lg font-medium ${pair.correlation >= 0.9 ? 'text-emerald-400' : pair.correlation >= 0.85 ? 'text-teal-400' : 'text-blue-400'}`}>
            {pair.correlation.toFixed(4)}
          </div>
        </div>
        <div className="bg-[#0a0a0f] border border-[#1a1a24] rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">ADF p-value</div>
          <div className={`text-lg font-medium ${pair.adf_pvalue < 0.05 ? 'text-emerald-400' : 'text-teal-400'}`}>
            {pair.adf_pvalue.toFixed(4)}
          </div>
        </div>
        {pair.hurst_exponent !== null && pair.hurst_exponent !== undefined && (
          <div className="bg-[#0a0a0f] border border-[#1a1a24] rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Hurst Exponent</div>
            <div className={`text-lg font-medium ${pair.hurst_exponent < 0.5 ? 'text-emerald-400' : 'text-gray-400'}`}>
              {pair.hurst_exponent.toFixed(3)}
            </div>
          </div>
        )}
        <div className="bg-[#0a0a0f] border border-[#1a1a24] rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Spread Std</div>
          <div className="text-lg font-medium text-gray-300">
            {pair.spread_std.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Z-Score Range */}
      <div className="bg-[#0a0a0f] border border-[#1a1a24] rounded-xl p-4">
        <div className="text-sm font-medium text-gray-300 mb-3">Z-Score Range</div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Min: {spreadData.min_zscore.toFixed(2)}</span>
              <span>Max: {spreadData.max_zscore.toFixed(2)}</span>
            </div>
            <div className="relative h-8 bg-[#1a1a24] rounded-full overflow-hidden">
              {/* Range bar */}
              <div 
                className="absolute h-full bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500 opacity-30"
                style={{ 
                  left: `${((spreadData.min_zscore + 3) / 6) * 100}%`,
                  width: `${((spreadData.max_zscore - spreadData.min_zscore) / 6) * 100}%`
                }}
              ></div>
              {/* Current position */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-emerald-400"
                style={{ left: `${((spreadData.current_zscore + 3) / 6) * 100}%` }}
              ></div>
              {/* Reference lines */}
              <div className="absolute left-1/3 top-0 bottom-0 w-px bg-yellow-500/50"></div>
              <div className="absolute left-2/3 top-0 bottom-0 w-px bg-yellow-500/50"></div>
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-emerald-500/50"></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>-3</span>
              <span>-2</span>
              <span>0</span>
              <span>+2</span>
              <span>+3</span>
            </div>
          </div>
        </div>
      </div>

      {/* Spread Statistics */}
      {spreadData.spread_statistics ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0a0a0f] border border-[#1a1a24] rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Mean Spread</div>
            <div className="text-sm font-medium text-gray-300">
              {spreadData.spread_statistics.mean.toFixed(4)}
            </div>
            {spreadData.spread_statistics.std_pct !== null && (
              <div className="text-xs text-gray-500 mt-1">
                Std: {spreadData.spread_statistics.std_pct.toFixed(2)}% of mean
              </div>
            )}
          </div>
          <div className="bg-[#0a0a0f] border border-[#1a1a24] rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Std Deviation</div>
            <div className="text-sm font-medium text-gray-300">
              {spreadData.spread_statistics.std.toFixed(4)}
            </div>
            {spreadData.spread_statistics.std_pct !== null && (
              <div className="text-xs text-gray-500 mt-1">
                {spreadData.spread_statistics.std_pct.toFixed(2)}% of mean
              </div>
            )}
          </div>
          <div className="bg-[#0a0a0f] border border-[#1a1a24] rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Min Spread</div>
            <div className="text-sm font-medium text-gray-300">
              {spreadData.spread_statistics.min.toFixed(4)}
            </div>
            {spreadData.spread_statistics.min_pct !== null && (
              <div className="text-xs text-gray-500 mt-1">
                {spreadData.spread_statistics.min_pct.toFixed(2)}% from mean
              </div>
            )}
          </div>
          <div className="bg-[#0a0a0f] border border-[#1a1a24] rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Max Spread</div>
            <div className="text-sm font-medium text-gray-300">
              {spreadData.spread_statistics.max.toFixed(4)}
            </div>
            {spreadData.spread_statistics.max_pct !== null && (
              <div className="text-xs text-gray-500 mt-1">
                {spreadData.spread_statistics.max_pct.toFixed(2)}% from mean
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0a0a0f] border border-[#1a1a24] rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Mean Spread</div>
            <div className="text-sm font-medium text-gray-300">
              {spreadData.mean_spread.toFixed(4)}
            </div>
          </div>
          <div className="bg-[#0a0a0f] border border-[#1a1a24] rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Std Deviation</div>
            <div className="text-sm font-medium text-gray-300">
              {spreadData.std_spread.toFixed(4)}
            </div>
          </div>
          <div className="bg-[#0a0a0f] border border-[#1a1a24] rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Min Spread</div>
            <div className="text-sm font-medium text-gray-300">
              {spreadData.min_spread.toFixed(4)}
            </div>
          </div>
          <div className="bg-[#0a0a0f] border border-[#1a1a24] rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Max Spread</div>
            <div className="text-sm font-medium text-gray-300">
              {spreadData.max_spread.toFixed(4)}
            </div>
          </div>
        </div>
      )}

      {/* Current Deviation Analysis */}
      {spreadData.current_deviation && (
        <div className="bg-[#0a0a0f] border border-[#1a1a24] rounded-xl p-4">
          <div className="text-sm font-medium text-gray-300 mb-3">Current Deviation Analysis</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#111118] border border-[#1a1a24] rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Z-Score Percentile</div>
              <div className="text-lg font-medium text-emerald-400">
                {spreadData.current_deviation.zscore_percentile.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {spreadData.current_deviation.zscore_percentile > 95 || spreadData.current_deviation.zscore_percentile < 5
                  ? 'Extreme position'
                  : spreadData.current_deviation.zscore_percentile > 80 || spreadData.current_deviation.zscore_percentile < 20
                  ? 'Unusual position'
                  : 'Normal position'}
              </div>
            </div>
            <div className="bg-[#111118] border border-[#1a1a24] rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Rarity</div>
              <div className={`text-lg font-medium ${
                spreadData.current_deviation.rarity === 'Very Rare' ? 'text-red-400' :
                spreadData.current_deviation.rarity === 'Rare' ? 'text-orange-400' :
                spreadData.current_deviation.rarity === 'Uncommon' ? 'text-yellow-400' :
                'text-gray-400'
              }`}>
                {spreadData.current_deviation.rarity}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Event probability: {spreadData.current_deviation.probability_extreme.toFixed(2)}%
              </div>
            </div>
            <div className="bg-[#111118] border border-[#1a1a24] rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Extreme Event Probability</div>
              <div className={`text-lg font-medium ${
                spreadData.current_deviation.probability_extreme < 5 ? 'text-red-400' :
                spreadData.current_deviation.probability_extreme < 10 ? 'text-orange-400' :
                'text-yellow-400'
              }`}>
                {spreadData.current_deviation.probability_extreme.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Two-tailed probability
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mean Reversion Statistics */}
      {spreadData.mean_reversion && (
        <div className="bg-[#0a0a0f] border border-[#1a1a24] rounded-xl p-4">
          <div className="text-sm font-medium text-gray-300 mb-3">Mean Reversion Statistics</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {spreadData.mean_reversion.half_life_days !== null && (
              <div className="bg-[#111118] border border-[#1a1a24] rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Half-Life</div>
                <div className="text-lg font-medium text-emerald-400">
                  {spreadData.mean_reversion.half_life_days.toFixed(1)} days
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Time to revert 50% to mean
                </div>
              </div>
            )}
            {spreadData.mean_reversion.avg_reversion_time_days !== null && (
              <div className="bg-[#111118] border border-[#1a1a24] rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Avg Reversion Time</div>
                <div className="text-lg font-medium text-teal-400">
                  {spreadData.mean_reversion.avg_reversion_time_days.toFixed(1)} days
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Average time to return to mean
                </div>
              </div>
            )}
            <div className="bg-[#111118] border border-[#1a1a24] rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Mean Crossings</div>
              <div className="text-lg font-medium text-blue-400">
                {spreadData.mean_reversion.mean_crossings}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Total crossings of mean
              </div>
            </div>
            <div className="bg-[#111118] border border-[#1a1a24] rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Time Outside ±1σ</div>
              <div className="text-lg font-medium text-yellow-400">
                {spreadData.mean_reversion.time_outside_1sigma_pct.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Historical percentage
              </div>
            </div>
            <div className="bg-[#111118] border border-[#1a1a24] rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Time Outside ±2σ</div>
              <div className="text-lg font-medium text-orange-400">
                {spreadData.mean_reversion.time_outside_2sigma_pct.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Historical percentage
              </div>
            </div>
            <div className="bg-[#111118] border border-[#1a1a24] rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Time Outside ±3σ</div>
              <div className="text-lg font-medium text-red-400">
                {spreadData.mean_reversion.time_outside_3sigma_pct.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Historical percentage
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expected Return */}
      {spreadData.expected_return && (
        <div className="bg-[#0a0a0f] border border-[#1a1a24] rounded-xl p-4">
          <div className="text-sm font-medium text-gray-300 mb-1">Expected Return (5-day forecast)</div>
          <div className="text-xs text-gray-500 mb-3">
            Based on historical analysis over full lookback period
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#111118] border border-[#1a1a24] rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Expected Return</div>
              <div className={`text-lg font-medium ${
                spreadData.expected_return.expected_return_5d > 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {spreadData.expected_return.expected_return_5d > 0 ? '+' : ''}
                {spreadData.expected_return.expected_return_5d.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                ±{spreadData.expected_return.expected_return_std.toFixed(2)}% std dev
              </div>
            </div>
            <div className="bg-[#111118] border border-[#1a1a24] rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Win Rate</div>
              <div className={`text-lg font-medium ${
                spreadData.expected_return.win_rate > 60 ? 'text-emerald-400' :
                spreadData.expected_return.win_rate > 50 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {spreadData.expected_return.win_rate.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Historical success rate
              </div>
            </div>
            <div className="bg-[#111118] border border-[#1a1a24] rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Sample Size</div>
              <div className="text-lg font-medium text-gray-300">
                {spreadData.expected_return.sample_size}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Historical observations
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Risk Metrics */}
      {spreadData.risk_metrics && (
        <div className="bg-[#0a0a0f] border border-[#1a1a24] rounded-xl p-4">
          <div className="text-sm font-medium text-gray-300 mb-1">Risk Metrics (Z-Score Based)</div>
          <div className="text-xs text-gray-500 mb-3">
            Metrics calculated from z-score changes (normalized spread volatility)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#111118] border border-[#1a1a24] rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">VaR (95%)</div>
              <div className="text-lg font-medium text-red-400">
                {spreadData.risk_metrics.var_95.toFixed(3)} σ
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Daily z-score change at 5th percentile
              </div>
            </div>
            <div className="bg-[#111118] border border-[#1a1a24] rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Max Drawdown</div>
              <div className={`text-lg font-medium ${
                spreadData.risk_metrics.max_drawdown < 2 ? 'text-emerald-400' :
                spreadData.risk_metrics.max_drawdown < 3 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {spreadData.risk_metrics.max_drawdown.toFixed(2)} σ
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Maximum absolute z-score deviation
              </div>
            </div>
            <div className="bg-[#111118] border border-[#1a1a24] rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Annual Volatility</div>
              <div className={`text-lg font-medium ${
                spreadData.risk_metrics.volatility_annual < 1 ? 'text-emerald-400' :
                spreadData.risk_metrics.volatility_annual < 2 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {spreadData.risk_metrics.volatility_annual.toFixed(3)} σ
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Annualized z-score volatility
              </div>
              {spreadData.risk_metrics.volatility_annual > 3 && spreadData.mean_reversion && (
                <div className="text-xs mt-2">
                  {spreadData.mean_reversion.half_life_days && spreadData.mean_reversion.half_life_days < 10 ? (
                    <span className="text-yellow-400">
                      ⚠️ High volatility, but fast reversion ({spreadData.mean_reversion.half_life_days.toFixed(1)}d half-life)
                    </span>
                  ) : (
                    <span className="text-red-400">
                      ⚠️ High volatility - spread may not revert quickly
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Return Probabilities by Zone */}
      {spreadData.return_probabilities && (
        <div className="bg-[#0a0a0f] border border-[#1a1a24] rounded-xl p-4">
          <div className="text-sm font-medium text-gray-300 mb-3">Return Probabilities by Z-Score Zone (5-day)</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {spreadData.return_probabilities.extreme_high !== null && (
              <div className="bg-[#111118] border border-[#1a1a24] rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Extreme High (&gt;2σ)</div>
                <div className={`text-lg font-medium ${
                  (spreadData.return_probabilities.extreme_high || 0) > 60 ? 'text-emerald-400' :
                  (spreadData.return_probabilities.extreme_high || 0) > 50 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {spreadData.return_probabilities.extreme_high?.toFixed(1) || 'N/A'}%
                </div>
                {spreadData.return_probabilities_samples && (
                  <div className="text-xs text-gray-500 mt-1">
                    n={spreadData.return_probabilities_samples.extreme_high}
                  </div>
                )}
              </div>
            )}
            {spreadData.return_probabilities.high !== null && (
              <div className="bg-[#111118] border border-[#1a1a24] rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">High (1-2σ)</div>
                <div className={`text-lg font-medium ${
                  (spreadData.return_probabilities.high || 0) > 60 ? 'text-emerald-400' :
                  (spreadData.return_probabilities.high || 0) > 50 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {spreadData.return_probabilities.high?.toFixed(1) || 'N/A'}%
                </div>
                {spreadData.return_probabilities_samples && (
                  <div className="text-xs text-gray-500 mt-1">
                    n={spreadData.return_probabilities_samples.high}
                  </div>
                )}
              </div>
            )}
            {spreadData.return_probabilities.neutral !== null && (
              <div className="bg-[#111118] border border-[#1a1a24] rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Neutral (±1σ)</div>
                <div className="text-lg font-medium text-gray-400">
                  {spreadData.return_probabilities.neutral?.toFixed(1) || 'N/A'}%
                </div>
                {spreadData.return_probabilities_samples && (
                  <div className="text-xs text-gray-500 mt-1">
                    n={spreadData.return_probabilities_samples.neutral}
                  </div>
                )}
              </div>
            )}
            {spreadData.return_probabilities.low !== null && (
              <div className="bg-[#111118] border border-[#1a1a24] rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Low (-2 to -1σ)</div>
                <div className={`text-lg font-medium ${
                  (spreadData.return_probabilities.low || 0) > 60 ? 'text-emerald-400' :
                  (spreadData.return_probabilities.low || 0) > 50 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {spreadData.return_probabilities.low?.toFixed(1) || 'N/A'}%
                </div>
                {spreadData.return_probabilities_samples && (
                  <div className="text-xs text-gray-500 mt-1">
                    n={spreadData.return_probabilities_samples.low}
                  </div>
                )}
              </div>
            )}
            {spreadData.return_probabilities.extreme_low !== null && (
              <div className="bg-[#111118] border border-[#1a1a24] rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Extreme Low (&lt;-2σ)</div>
                <div className={`text-lg font-medium ${
                  (spreadData.return_probabilities.extreme_low || 0) > 60 ? 'text-emerald-400' :
                  (spreadData.return_probabilities.extreme_low || 0) > 50 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {spreadData.return_probabilities.extreme_low?.toFixed(1) || 'N/A'}%
                </div>
                {spreadData.return_probabilities_samples && (
                  <div className="text-xs text-gray-500 mt-1">
                    n={spreadData.return_probabilities_samples.extreme_low}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-3">
            Probability of profitable mean reversion within 5 days based on historical data
          </div>
        </div>
      )}

      {/* Position Calculator */}
      <PositionCalculator pair={pair} />

      {/* Backtest Section */}
      <BacktestSection pair={pair} spreadData={spreadData} />
    </div>
  );
};

export default PairDetails;

