import React from 'react';
import { Target, TrendingUp, TrendingDown, Crosshair, DollarSign, Activity } from 'lucide-react';

interface TradingPlanProps {
  plan: {
    entry: string | number;
    sl: string | number;
    tp1: string | number;
    tp2: string | number;
    tp3: string | number;
    risk_reward: string;
  };
  signal: string;
}

export const TradingPlanCard: React.FC<TradingPlanProps> = ({ plan, signal }) => {
  if (!plan) return null;

  const isBuy = signal.includes("Buy");
  const isSell = signal.includes("Sell");
  
  if (!isBuy && !isSell) return null;

  const entry = Number(plan.entry);
  const tp3 = Number(plan.tp3);
  const sl = Number(plan.sl);
  
  let expectedMove = 0;
  let riskPct = 0;
  
  if (!isNaN(entry) && !isNaN(tp3) && entry > 0) {
    expectedMove = Math.abs((tp3 - entry) / entry) * 100;
  }
  if (!isNaN(entry) && !isNaN(sl) && entry > 0) {
    riskPct = Math.abs((entry - sl) / entry) * 100;
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg mt-6">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Crosshair className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Execution Plan</h2>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Expected Move</p>
              <p className="text-sm font-bold text-blue-400">{expectedMove.toFixed(2)}%</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Risk/Reward</p>
              <p className="text-sm font-bold text-white">{plan.risk_reward}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 flex flex-col items-center justify-center">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Entry Range</p>
            <p className="text-xl font-mono font-bold text-slate-200">${Number(plan.entry).toFixed(2)}</p>
          </div>
          
          <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20 flex flex-col items-center justify-center">
            <p className="text-xs text-emerald-400/70 uppercase tracking-wider mb-1">Take Profit 1</p>
            <p className="text-xl font-mono font-bold text-emerald-400">${Number(plan.tp1).toFixed(2)}</p>
          </div>

          <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20 flex flex-col items-center justify-center">
            <p className="text-xs text-emerald-400/70 uppercase tracking-wider mb-1">Take Profit 2</p>
            <p className="text-xl font-mono font-bold text-emerald-400">${Number(plan.tp2).toFixed(2)}</p>
          </div>

          <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent"></div>
            <p className="text-xs text-emerald-400/70 uppercase tracking-wider mb-1 relative z-10">Take Profit 3</p>
            <p className="text-xl font-mono font-bold text-emerald-400 relative z-10">${Number(plan.tp3).toFixed(2)}</p>
          </div>

          <div className="bg-rose-500/10 rounded-lg p-4 border border-rose-500/20 flex flex-col items-center justify-center">
            <p className="text-xs text-rose-400/70 uppercase tracking-wider mb-1">Stop Loss</p>
            <p className="text-xl font-mono font-bold text-rose-400">${Number(plan.sl).toFixed(2)}</p>
            <p className="text-[10px] text-rose-500/70 mt-1">Risk: {riskPct.toFixed(2)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
};
