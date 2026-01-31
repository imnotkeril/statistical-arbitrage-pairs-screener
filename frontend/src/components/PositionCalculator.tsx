import React, { useState } from 'react';
import { api, PairResult } from '../services/api';

interface PositionCalculatorProps {
  pair: PairResult;
}

interface PositionCalculation {
  asset_a: {
    side: string;
    quantity: number;
    dollar_amount: number;
    price: number;
  };
  asset_b: {
    side: string;
    quantity: number;
    dollar_amount: number;
    price: number;
  };
  total_capital: number;
  strategy: string;
  beta: number;
  zscore: number;
  net_exposure: number;
}

const PositionCalculator: React.FC<PositionCalculatorProps> = ({ pair }) => {
  const [capital, setCapital] = useState<number>(10000);
  const [strategy, setStrategy] = useState<string>('dollar_neutral');
  const [loading, setLoading] = useState<boolean>(false);
  const [position, setPosition] = useState<PositionCalculation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async () => {
    if (capital <= 0) {
      setError('Capital must be greater than 0');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await api.calculatePosition(pair.id, capital, strategy);
      setPosition(result);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate position');
      setPosition(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number, decimals: number = 4) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  const getSideColor = (side: string) => {
    return side === 'long' ? 'text-emerald-400' : 'text-red-400';
  };

  const getSideBg = (side: string) => {
    return side === 'long' ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-red-500/20 border-red-500/50';
  };

  return (
    <div className="bg-[#0a0a0f] border border-[#1a1a24] rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">Position Calculator</h3>
      </div>

      {/* Input Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Capital (USD)
          </label>
          <input
            type="number"
            value={capital}
            onChange={(e) => setCapital(parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-2 bg-[#1a1a24] border border-[#2a2a34] rounded-lg text-white focus:outline-none focus:border-emerald-500"
            placeholder="10000"
            min="1"
            step="100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Strategy
          </label>
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            className="w-full px-4 py-2 bg-[#1a1a24] border border-[#2a2a34] rounded-lg text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="dollar_neutral">Dollar Neutral (Long $X, Short $X×β)</option>
            <option value="equal_dollar">Equal Dollar (Split capital, apply β)</option>
            <option value="long_asset_a">Always Long {pair.asset_a}</option>
            <option value="long_asset_b">Always Long {pair.asset_b}</option>
          </select>
        </div>

        <button
          onClick={handleCalculate}
          disabled={loading || capital <= 0}
          className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Calculating...
            </>
          ) : (
            'Calculate Position'
          )}
        </button>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {position && (
        <div className="mt-6 space-y-4">
          <div className="border-t border-[#1a1a24] pt-4">
            <div className="text-sm font-medium text-gray-400 mb-3">Position Details</div>
            
            {/* Asset A */}
            <div className={`${getSideBg(position.asset_a.side)} border rounded-lg p-4 mb-3`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{pair.asset_a}</span>
                  <span className={`text-xs px-2 py-1 rounded ${getSideColor(position.asset_a.side)} ${getSideBg(position.asset_a.side)}`}>
                    {position.asset_a.side.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm text-gray-400">${formatNumber(position.asset_a.price, 2)}</div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">Quantity</div>
                  <div className="text-white font-medium">{formatNumber(position.asset_a.quantity, 4)}</div>
                </div>
                <div>
                  <div className="text-gray-400">Dollar Amount</div>
                  <div className="text-white font-medium">{formatCurrency(position.asset_a.dollar_amount)}</div>
                </div>
              </div>
            </div>

            {/* Asset B */}
            <div className={`${getSideBg(position.asset_b.side)} border rounded-lg p-4 mb-3`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{pair.asset_b}</span>
                  <span className={`text-xs px-2 py-1 rounded ${getSideColor(position.asset_b.side)} ${getSideBg(position.asset_b.side)}`}>
                    {position.asset_b.side.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm text-gray-400">${formatNumber(position.asset_b.price, 2)}</div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">Quantity</div>
                  <div className="text-white font-medium">{formatNumber(position.asset_b.quantity, 4)}</div>
                </div>
                <div>
                  <div className="text-gray-400">Dollar Amount</div>
                  <div className="text-white font-medium">{formatCurrency(position.asset_b.dollar_amount)}</div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-[#1a1a24] border border-[#2a2a34] rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">Total Capital</div>
                  <div className="text-white font-medium">{formatCurrency(position.total_capital)}</div>
                </div>
                <div>
                  <div className="text-gray-400">Net Exposure</div>
                  <div className="text-white font-medium">{formatCurrency(position.net_exposure)}</div>
                </div>
                <div>
                  <div className="text-gray-400">Beta (Hedge Ratio)</div>
                  <div className="text-white font-medium">{formatNumber(position.beta, 4)}</div>
                </div>
                <div>
                  <div className="text-gray-400">Current Z-Score</div>
                  <div className={`font-medium ${Math.abs(position.zscore) >= 2 ? 'text-red-400' : Math.abs(position.zscore) >= 1 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                    {formatNumber(position.zscore, 2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PositionCalculator;

