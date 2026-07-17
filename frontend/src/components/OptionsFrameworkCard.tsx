import React, { useEffect, useState } from 'react';
import { fetchOptions } from '../services/api';
import { Target, TrendingDown, TrendingUp, Layers, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  symbol: string;
}

export const OptionsFrameworkCard: React.FC<Props> = ({ symbol }) => {
  const [optionsData, setOptionsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (symbol) loadOptions();
  }, [symbol]);

  const loadOptions = async () => {
    setLoading(true);
    try {
      const data = await fetchOptions(symbol);
      setOptionsData(data);
    } catch (e) {
      console.error(e);
      setOptionsData({ error: 'Failed to fetch' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!optionsData || optionsData.error) {
    return null; // Don't show the card if no options data (e.g. Forex/Crypto)
  }

  const { max_pain, surface, distribution, spot_price, expiry, dte } = optionsData;

  const getSkewColor = (status: string) => {
    if (status.includes('ELEVÉ')) return 'text-red-400 bg-red-400/10 border-red-400/30';
    if (status.includes('APLATI')) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
    return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
  };

  const getTermColor = (status: string) => {
    if (status.includes('BACKWARDATION')) return 'text-red-400';
    if (status.includes('CONTANGO')) return 'text-emerald-400';
    return 'text-yellow-400';
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          <Layers className="mr-2 text-purple-400" size={24} />
          Options Framework (Expir: {expiry})
        </h2>
        <span className="bg-slate-800 px-3 py-1 rounded-full text-xs text-slate-300 border border-slate-700">
          DTE: {dte} Jours
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Framework A: Surface IV */}
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">A. Surface IV</h3>
          <div className="space-y-4">
            <div>
              <div className="text-xs text-slate-400 mb-1">Skew (Asymétrie de la peur)</div>
              <div className={`text-sm font-medium px-3 py-1 rounded-md border ${getSkewColor(surface.skew_status)} inline-block`}>
                {surface.skew_status}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex justify-between">
                <span>Puts: {(surface.put_iv_avg*100).toFixed(1)}%</span>
                <span>Calls: {(surface.call_iv_avg*100).toFixed(1)}%</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Term Structure</div>
              <div className={`text-sm font-medium ${getTermColor(surface.term_structure)}`}>
                {surface.term_structure}
              </div>
            </div>
          </div>
        </div>

        {/* Framework B: Distribution Implicite */}
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">B. Distribution</h3>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-slate-400">Move Implicite ({dte}j)</div>
              <div className="text-2xl font-bold text-white flex items-end">
                ±{distribution.implied_move_pct.toFixed(1)}%
                <span className="text-sm font-normal text-slate-400 ml-2 mb-1">(${distribution.implied_move_value.toFixed(2)})</span>
              </div>
            </div>
            
            <div className="pt-2 border-t border-slate-700/50">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-red-400">Lower Bound</span>
                <span className="text-emerald-400">Upper Bound</span>
              </div>
              <div className="flex justify-between font-medium text-sm">
                <span>${distribution.lower_bound.toFixed(2)}</span>
                <span>${distribution.upper_bound.toFixed(2)}</span>
              </div>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1.5 mt-1 relative">
              <div className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-3 bg-blue-500 rounded-full"></div>
            </div>
            <div className="text-[10px] text-center text-slate-500 mt-1">Spot: ${spot_price.toFixed(2)}</div>
          </div>
        </div>

        {/* Framework C: Max Pain */}
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 relative overflow-hidden">
          {dte > 3 && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-4 text-center">
              <AlertTriangle className="text-yellow-400 mb-2" size={24} />
              <p className="text-sm text-white font-medium">Gravité Inactive</p>
              <p className="text-xs text-slate-400 mt-1">Le Max Pain n'attire le prix que dans les 2-3 derniers jours (DTE &le; 3).</p>
            </div>
          )}
          
          <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">C. Max Pain</h3>
          <div className="text-center mb-4">
            <div className="text-xs text-slate-400">Zone de Gravité (Strike)</div>
            <div className="text-3xl font-bold text-orange-400 mt-1">${max_pain.strike}</div>
            <div className="text-xs mt-1 text-slate-500">
              Distance: {((max_pain.strike - spot_price) / spot_price * 100).toFixed(1)}%
            </div>
          </div>

          <div className="flex h-16 items-end justify-center space-x-1 border-b border-slate-700 pb-1">
            {max_pain.data && max_pain.data.map((d: any, i: number) => {
              const maxL = Math.max(...max_pain.data.map((x: any) => x.loss));
              const height = (d.loss / maxL) * 100;
              const isTarget = d.strike === max_pain.strike;
              const isSpot = Math.abs(d.strike - spot_price) < ((max_pain.data[1]?.strike || 0) - max_pain.data[0].strike) / 2;
              
              return (
                <div key={i} className="flex flex-col items-center group relative">
                  {isSpot && <div className="absolute -top-3 w-1 h-1 rounded-full bg-blue-500 mb-1"></div>}
                  <div 
                    className={`w-3 rounded-t-sm ${isTarget ? 'bg-orange-500' : 'bg-slate-600'}`} 
                    style={{ height: `${height}%` }}
                  ></div>
                  <div className="absolute opacity-0 group-hover:opacity-100 bottom-full mb-1 bg-slate-800 text-[10px] px-1 rounded z-20 whitespace-nowrap">
                    ${d.strike}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
