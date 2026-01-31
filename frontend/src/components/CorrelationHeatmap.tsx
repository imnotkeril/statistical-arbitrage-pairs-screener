import React, { useMemo } from 'react';
import { PairResult } from '../services/api';

interface CorrelationHeatmapProps {
  pairs: PairResult[];
}

const CorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({ pairs }) => {
  // Extract unique assets
  const assets = useMemo(() => {
    const assetSet = new Set<string>();
    pairs.forEach(pair => {
      assetSet.add(pair.asset_a);
      assetSet.add(pair.asset_b);
    });
    return Array.from(assetSet).sort();
  }, [pairs]);

  // Create correlation matrix
  const correlationMatrix = useMemo(() => {
    const matrix: { [key: string]: { [key: string]: number } } = {};
    
    assets.forEach(asset => {
      matrix[asset] = {};
      assets.forEach(otherAsset => {
        if (asset === otherAsset) {
          matrix[asset][otherAsset] = 1.0;
        } else {
          // Find pair
          const pair = pairs.find(
            p => (p.asset_a === asset && p.asset_b === otherAsset) ||
                 (p.asset_a === otherAsset && p.asset_b === asset)
          );
          matrix[asset][otherAsset] = pair ? pair.correlation : 0;
        }
      });
    });
    
    return matrix;
  }, [assets, pairs]);

  const getColor = (correlation: number) => {
    if (correlation === 0) return 'bg-[#0a0a0f]';
    if (correlation >= 0.90) return 'bg-gradient-to-br from-emerald-500 to-teal-500';
    if (correlation >= 0.85) return 'bg-gradient-to-br from-teal-500 to-cyan-500';
    if (correlation >= 0.80) return 'bg-gradient-to-br from-blue-500 to-indigo-500';
    if (correlation >= 0.70) return 'bg-gradient-to-br from-yellow-500 to-orange-500';
    return 'bg-gradient-to-br from-red-500 to-pink-500';
  };

  const getIntensity = (correlation: number) => {
    if (correlation === 0) return 'opacity-20';
    if (correlation >= 0.90) return 'opacity-100';
    if (correlation >= 0.85) return 'opacity-90';
    if (correlation >= 0.80) return 'opacity-80';
    if (correlation >= 0.70) return 'opacity-60';
    return 'opacity-40';
  };

  // Limit to top 15 assets for readability
  const displayAssets = assets.slice(0, 15);

  return (
    <div className="bg-[#111118] border border-[#1a1a24] rounded-xl p-6 backdrop-blur-sm">
      <div className="mb-4">
        <h2 className="text-lg font-medium text-white mb-1">Correlation Matrix</h2>
        <p className="text-xs text-gray-400">{displayAssets.length} assets</p>
      </div>
      
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="px-2 py-2 text-xs font-medium text-gray-400 sticky left-0 bg-[#111118] z-10"></th>
                {displayAssets.map(asset => (
                  <th
                    key={asset}
                    className="px-2 py-2 text-xs font-medium text-gray-400 text-center min-w-[60px]"
                  >
                    {asset}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayAssets.map(assetA => (
                <tr key={assetA}>
                  <td className="px-2 py-2 text-xs font-medium text-gray-300 sticky left-0 bg-[#111118] z-10">
                    {assetA}
                  </td>
                  {displayAssets.map(assetB => {
                    const corr = correlationMatrix[assetA]?.[assetB] || 0;
                    const isDiagonal = assetA === assetB;
                    return (
                      <td
                        key={`${assetA}-${assetB}`}
                        className={`px-2 py-2 text-center ${getColor(corr)} ${getIntensity(corr)} ${isDiagonal ? 'rounded' : ''}`}
                        title={`${assetA} - ${assetB}: ${corr.toFixed(3)}`}
                      >
                        {corr > 0 && !isDiagonal && (
                          <span className="text-[10px] font-medium text-white/90">
                            {corr.toFixed(2)}
                          </span>
                        )}
                        {isDiagonal && (
                          <div className="w-4 h-4 mx-auto rounded-full bg-emerald-500/30 border border-emerald-500/50"></div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-emerald-500 to-teal-500"></div>
          <span className="text-xs text-gray-400">&gt; 0.90</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-teal-500 to-cyan-500"></div>
          <span className="text-xs text-gray-400">0.85-0.90</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-blue-500 to-indigo-500"></div>
          <span className="text-xs text-gray-400">0.80-0.85</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#0a0a0f] border border-[#1a1a24]"></div>
          <span className="text-xs text-gray-400">No data</span>
        </div>
      </div>
    </div>
  );
};

export default CorrelationHeatmap;
