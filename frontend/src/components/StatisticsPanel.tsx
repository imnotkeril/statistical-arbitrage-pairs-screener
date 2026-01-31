import React from 'react';
import { Statistics } from '../services/api';

interface StatisticsPanelProps {
  stats: Statistics;
}

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-gradient-to-br from-[#111118] to-[#0a0a0f] border border-[#1a1a24] rounded-xl p-5 backdrop-blur-sm hover:border-emerald-500/30 transition-colors">
        <div className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Total Pairs</div>
        <div className="text-3xl font-light text-white mb-1">{stats.total_pairs}</div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
          <div className="text-xs text-gray-500">Active</div>
        </div>
      </div>
      
      <div className="bg-gradient-to-br from-[#111118] to-[#0a0a0f] border border-[#1a1a24] rounded-xl p-5 backdrop-blur-sm">
        <div className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Avg Correlation</div>
        <div className="text-3xl font-light text-emerald-400 mb-1">
          {stats.avg_correlation.toFixed(3)}
        </div>
        <div className="text-xs text-gray-500">Mean</div>
      </div>
      
      <div className="bg-gradient-to-br from-[#111118] to-[#0a0a0f] border border-[#1a1a24] rounded-xl p-5 backdrop-blur-sm">
        <div className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Avg ADF p-value</div>
        <div className="text-3xl font-light text-teal-400 mb-1">
          {stats.avg_adf_pvalue.toFixed(4)}
        </div>
        <div className="text-xs text-gray-500">Cointegrated</div>
      </div>
      
      {stats.avg_hurst !== null && stats.avg_hurst !== undefined && (
        <div className="bg-gradient-to-br from-[#111118] to-[#0a0a0f] border border-[#1a1a24] rounded-xl p-5 backdrop-blur-sm">
          <div className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Avg Hurst</div>
          <div className={`text-3xl font-light mb-1 ${stats.avg_hurst < 0.5 ? 'text-emerald-400' : 'text-orange-400'}`}>
            {stats.avg_hurst.toFixed(3)}
          </div>
          <div className="text-xs text-gray-500">
            {stats.avg_hurst < 0.5 ? 'Mean Reverting' : 'Trending'}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatisticsPanel;
