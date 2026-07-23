import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, Layers } from 'lucide-react';
import { fetchCorrelation as apiFetchCorrelation } from '../services/api';

interface CorrelationResponse {
  status: string;
  matrix: {
    [key: string]: {
      [key: string]: number;
    };
  };
  pairs: string[];
}

export const CorrelationHeatmap: React.FC = () => {
  const [data, setData] = useState<CorrelationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredCell, setHoveredCell] = useState<{ row: string; col: string; val: number } | null>(null);

  const loadCorrelation = async () => {
    setLoading(true);
    try {
      const corrData = await apiFetchCorrelation();
      setData(corrData);
    } catch (e) {
      console.error("Failed to fetch correlation matrix", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCorrelation();
  }, []);

  if (loading && !data) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 flex flex-col justify-center items-center h-72 shadow-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        <p className="text-xs text-slate-500 mt-3 animate-pulse">Calculating Pearson correlations...</p>
      </div>
    );
  }

  if (!data || !data.pairs || data.pairs.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 text-center text-xs text-slate-500 h-72 flex justify-center items-center shadow-lg">
        No correlation data available.
      </div>
    );
  }

  const { matrix, pairs } = data;

  const getCellColor = (val: number) => {
    if (val === 1.0) return 'bg-slate-800 border-slate-700 text-slate-400 font-bold';
    
    // Positive correlation (Warm green/emerald)
    if (val > 0) {
      const opacity = Math.round(val * 100);
      if (val > 0.7) return `bg-emerald-500/30 text-emerald-300 border-emerald-500/20 font-bold`;
      if (val > 0.4) return `bg-emerald-500/20 text-emerald-400 border-emerald-500/10`;
      return `bg-emerald-500/10 text-emerald-400/80 border-emerald-500/5`;
    }
    
    // Negative correlation (Cool rose/red)
    if (val < 0) {
      const absVal = Math.abs(val);
      if (absVal > 0.7) return `bg-rose-500/30 text-rose-300 border-rose-500/20 font-bold`;
      if (absVal > 0.4) return `bg-rose-500/20 text-rose-400 border-rose-500/10`;
      return `bg-rose-500/10 text-rose-400/80 border-rose-500/5`;
    }
    
    return 'bg-slate-900/30 text-slate-500 border-slate-900/20';
  };

  const getRiskExplanation = () => {
    if (!hoveredCell) return "Hover over any correlation cell to analyze inter-market exposure risks.";
    const { row, col, val } = hoveredCell;
    if (row === col) return `Correlation for ${row} is 1.00 (Self correlation).`;
    
    if (val > 0.75) {
      return `⚠️ Strong Positive correlation (${val.toFixed(2)}). Opening concurrent BUY positions on ${row} and ${col} doubles USD/base currency risk exposure.`;
    }
    if (val < -0.75) {
      return `🔄 Strong Negative correlation (${val.toFixed(2)}). BUY on ${row} and BUY on ${col} act as direct hedges, canceling potential profits out.`;
    }
    if (Math.abs(val) < 0.25) {
      return `✅ Independent pairs (${val.toFixed(2)}). Trading ${row} and ${col} provides high diversification value.`;
    }
    return `Neutral relationship (${val.toFixed(2)}) between ${row} and ${col}. Normal exposure variables apply.`;
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-lg flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Forex Correlation Matrix</h2>
          </div>
          <button 
            onClick={loadCorrelation} 
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
            title="Recalculate Correlations"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Matrix Grid Wrapper */}
        <div className="overflow-x-auto">
          <div className="min-w-[480px]">
            {/* Top header row */}
            <div className="grid grid-cols-11 gap-1 text-center font-mono text-[9px] text-slate-500 font-bold mb-1">
              <div></div> {/* Empty top-left cell */}
              {pairs.map(p => (
                <div key={p} className="truncate uppercase px-0.5" title={p}>{p}</div>
              ))}
            </div>

            {/* Matrix Rows */}
            <div className="space-y-1">
              {pairs.map(rowPair => (
                <div key={rowPair} className="grid grid-cols-11 gap-1 items-center">
                  {/* Left row label */}
                  <div className="font-mono text-[9px] text-slate-500 font-bold uppercase text-left truncate pr-1" title={rowPair}>
                    {rowPair}
                  </div>
                  
                  {/* Correlation cells */}
                  {pairs.map(colPair => {
                    const val = matrix[rowPair]?.[colPair] ?? 0.0;
                    const isHovered = hoveredCell && hoveredCell.row === rowPair && hoveredCell.col === colPair;
                    
                    return (
                      <div
                        key={colPair}
                        onMouseEnter={() => setHoveredCell({ row: rowPair, col: colPair, val })}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`font-mono text-[10px] py-1.5 rounded border transition-all text-center cursor-pointer select-none ${getCellColor(val)} ${
                          isHovered ? 'scale-105 ring-1 ring-white/20' : ''
                        }`}
                      >
                        {val === 1.0 ? '1.0' : val.toFixed(2)}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Advisory explanation footer */}
      <div className="mt-5 p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-300 leading-normal">{getRiskExplanation()}</p>
      </div>
    </div>
  );
};
