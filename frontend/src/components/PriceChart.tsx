import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PairResult, SpreadDataPoint } from '../services/api';

interface PriceChartProps {
  pair: PairResult;
  spreadData: SpreadDataPoint[];
}

const PriceChart: React.FC<PriceChartProps> = ({ pair, spreadData }) => {
  // Filter and format data points
  const chartData = spreadData
    .filter(point => point.price_a_norm !== null && point.price_a_norm !== undefined &&
                     point.price_b_hedged_norm !== null && point.price_b_hedged_norm !== undefined)
    .map(point => ({
      date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: point.date,
      price_a_norm: point.price_a_norm!,
      price_b_hedged_norm: point.price_b_hedged_norm!,
    }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1a24] border border-[#2a2a34] rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium mb-2">
            {payload[0].payload.fullDate ? new Date(payload[0].payload.fullDate).toLocaleString() : ''}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return null;
  }

  // Calculate Y-axis domain with 10% padding from min/max values
  const allValues = [
    ...chartData.map(d => d.price_a_norm),
    ...chartData.map(d => d.price_b_hedged_norm)
  ];
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  
  // 10% padding from min/max values
  // Example: if max = 128%, then upper bound = 128 + (128 × 0.1) = 140.8%
  // Example: if min = 50%, then lower bound = 50 - (50 × 0.1) = 45%
  const paddingTop = Math.abs(maxValue) * 0.1;
  const paddingBottom = Math.abs(minValue) * 0.1;
  
  // Exact boundaries with padding (no rounding)
  const yAxisMin = Math.max(0, minValue - paddingBottom);
  const yAxisMax = maxValue + paddingTop;
  
  // Generate ticks: multiples of 10 that fit within the domain
  // Prefer maximum 5 values above 100 and 5 values below 100
  const step = 10;
  const startTick = Math.ceil(yAxisMin / step) * step;
  const endTick = Math.floor(yAxisMax / step) * step;
  
  // Collect all candidate ticks
  const allTicks: number[] = [];
  for (let i = startTick; i <= endTick; i += step) {
    allTicks.push(i);
  }
  
  // Filter to prefer max 5 above 100 and 5 below 100
  const ticksAbove100 = allTicks.filter(t => t > 100);
  const ticksBelow100 = allTicks.filter(t => t < 100);
  const tickAt100 = allTicks.find(t => t === 100);
  
  const priceTicks: number[] = [];
  
  // Add ticks below 100 (max 5, take last 5 if more)
  if (ticksBelow100.length > 5) {
    priceTicks.push(...ticksBelow100.slice(-5));
  } else {
    priceTicks.push(...ticksBelow100);
  }
  
  // Add tick at 100 if it exists
  if (tickAt100 !== undefined) {
    priceTicks.push(100);
  }
  
  // Add ticks above 100 (max 5, take first 5 if more)
  if (ticksAbove100.length > 5) {
    priceTicks.push(...ticksAbove100.slice(0, 5));
  } else {
    priceTicks.push(...ticksAbove100);
  }
  
  // Sort ticks
  priceTicks.sort((a, b) => a - b);
  
  // Format price ticks to show clean numbers
  const formatPriceTick = (value: number) => {
    if (Math.abs(value - Math.round(value)) < 0.01) {
      return Math.round(value).toString();
    }
    return value.toFixed(1);
  };

  return (
    <div className="bg-[#111118] border border-[#1a1a24] rounded-xl p-6 backdrop-blur-sm">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-white mb-1">
          Normalized Prices: {pair.asset_a} vs {pair.asset_b} (Hedged)
        </h3>
        <p className="text-xs text-gray-400">
          {pair.asset_a} vs {pair.asset_b} × {pair.beta.toFixed(4)} (hedged). Distance between lines = spread
        </p>
      </div>
      
      <ResponsiveContainer width="100%" height={400}>
        <LineChart 
          data={chartData} 
          margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a34" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            angle={-45}
            textAnchor="end"
            height={60}
            interval="preserveStartEnd"
          />
          <YAxis 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            domain={[yAxisMin, yAxisMax]}
            tickFormatter={formatPriceTick}
            ticks={priceTicks}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: '#9ca3af' }} />
          
          {/* Asset A line */}
          <Line
            type="monotone"
            dataKey="price_a_norm"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name={pair.asset_a}
            activeDot={{ r: 4 }}
          />
          
          {/* Hedged Asset B line */}
          <Line
            type="monotone"
            dataKey="price_b_hedged_norm"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            name={`${pair.asset_b} (hedged × ${pair.beta.toFixed(2)})`}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceChart;
