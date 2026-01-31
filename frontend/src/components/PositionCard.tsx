import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface PositionCardProps {
  position: any;
  onUpdate: () => void;
}

const PositionCard: React.FC<PositionCardProps> = ({ position, onUpdate }) => {
  const [pnl, setPnl] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPnl = async () => {
      try {
        // Get current prices (simplified - in real app would fetch from API)
        // For now, we'll use entry prices as placeholder
        const pnlData = await api.getPositionPnl(
          position.position_id,
          position.entry_price_a,
          position.entry_price_b
        );
        setPnl(pnlData);
      } catch (error) {
        console.error('Error fetching P&L:', error);
      }
    };

    fetchPnl();
    const interval = setInterval(fetchPnl, 5000);
    return () => clearInterval(interval);
  }, [position]);

  const handleClose = async () => {
    setLoading(true);
    try {
      await api.deletePosition(position.position_id);
      onUpdate();
    } catch (error) {
      console.error('Error closing position:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-[#0a0a0f] border rounded-lg p-4 ${position.side === 'long' ? 'border-emerald-500/50' : 'border-red-500/50'}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-white font-medium">
            {position.asset_a} / {position.asset_b}
          </div>
          <div className="text-xs text-gray-400">
            {position.side.toUpperCase()} • Entry Z-Score: {position.entry_zscore.toFixed(2)}
          </div>
        </div>
        <button
          onClick={handleClose}
          disabled={loading}
          className="px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded text-red-400 transition-colors disabled:opacity-50"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-400">Quantity A</div>
          <div className="text-white">{position.quantity_a.toFixed(4)}</div>
        </div>
        <div>
          <div className="text-gray-400">Quantity B</div>
          <div className="text-white">{position.quantity_b.toFixed(4)}</div>
        </div>
        <div>
          <div className="text-gray-400">Entry Price A</div>
          <div className="text-white">${position.entry_price_a.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-gray-400">Entry Price B</div>
          <div className="text-white">${position.entry_price_b.toFixed(2)}</div>
        </div>
      </div>

      {pnl && (
        <div className="mt-3 pt-3 border-t border-[#1a1a24]">
          <div className={`text-lg font-medium ${pnl.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            P&L: ${pnl.total_pnl.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
};

export default PositionCard;

