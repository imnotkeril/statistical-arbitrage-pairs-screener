import React, { useState } from 'react';
import { api, ScreeningConfig } from '../services/api';

interface ScreenerSettingsProps {
  onSettingsApplied?: () => void;
}

const ScreenerSettings: React.FC<ScreenerSettingsProps> = ({ onSettingsApplied }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  
  const [settings, setSettings] = useState<ScreeningConfig>({
    lookback_days: 365,
    min_correlation: 0.80,
    max_adf_pvalue: 0.10,
    include_hurst: true,
    min_volume_usd: 1_000_000,
  });

  const handleRunScreening = async () => {
    setIsRunning(true);
    try {
      await api.runScreening(settings);
      setIsOpen(false);
      if (onSettingsApplied) {
        onSettingsApplied();
      }
      // Show success message
      setTimeout(() => setIsRunning(false), 2000);
    } catch (error) {
      console.error('Error running screening:', error);
      setIsRunning(false);
    }
  };

  // Check if lookback_days changed from default
  const defaultLookbackDays = 365;
  const lookbackChanged = settings.lookback_days !== defaultLookbackDays;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 text-sm font-medium text-white bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 rounded-lg transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Settings
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-[#111118] border border-[#1a1a24] rounded-xl max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#1a1a24] flex items-center justify-between">
              <h2 className="text-xl font-medium text-white">Screener Settings</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {lookbackChanged && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
                  <p className="text-xs text-amber-400">
                    ⚠️ Analysis period changed. After running the screening, all found pairs will use {settings.lookback_days} days of data. 
                    Old pairs (found with different settings) will show data for the period with which they were found.
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Lookback Days: {settings.lookback_days}
                </label>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="1"
                  value={settings.lookback_days}
                  onChange={(e) => setSettings({ ...settings, lookback_days: parseInt(e.target.value) })}
                  className="w-full h-2 bg-[#1a1a24] rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>50</span>
                  <span>1000</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Min Correlation: {settings.min_correlation.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={settings.min_correlation}
                  onChange={(e) => setSettings({ ...settings, min_correlation: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-[#1a1a24] rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.0</span>
                  <span>1.0</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max ADF p-value: {settings.max_adf_pvalue.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.01"
                  value={settings.max_adf_pvalue}
                  onChange={(e) => setSettings({ ...settings, max_adf_pvalue: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-[#1a1a24] rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.0</span>
                  <span>0.5</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Min Volume USD: {(settings.min_volume_usd / 1_000_000).toFixed(1)}M
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={settings.min_volume_usd / 1_000_000}
                  onChange={(e) => setSettings({ ...settings, min_volume_usd: parseFloat(e.target.value) * 1_000_000 })}
                  className="w-full h-2 bg-[#1a1a24] rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0M</span>
                  <span>100M</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="include_hurst"
                  checked={settings.include_hurst}
                  onChange={(e) => setSettings({ ...settings, include_hurst: e.target.checked })}
                  className="w-4 h-4 text-emerald-500 bg-[#1a1a24] border-[#2a2a34] rounded focus:ring-emerald-500"
                />
                <label htmlFor="include_hurst" className="text-sm text-gray-300">
                  Include Hurst Exponent calculation
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#1a1a24]">
                <button
                  onClick={handleRunScreening}
                  disabled={isRunning}
                  className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isRunning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Running...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Run Screening
                    </>
                  )}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-[#1a1a24] hover:bg-[#2a2a34] text-gray-300 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ScreenerSettings;

