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
    position_amount?: number | string;
    position_size_rationale?: string;
  };
  signal: string;
  explanation?: string;
  institutional_perspective?: string;
  risk_warning?: string;
}

export const TradingPlanCard: React.FC<TradingPlanProps> = ({ plan, signal, explanation, institutional_perspective, risk_warning }) => {
  if (!plan) return null;

  const isBuy = signal?.includes("Buy");
  const isSell = signal?.includes("Sell");
  
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

        {/* Position Sizing Section */}
        {plan.position_amount && (
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 flex flex-col md:flex-row items-center gap-6">
              <div className="flex flex-col items-center justify-center p-4 bg-amber-500/20 rounded-lg border border-amber-500/30 min-w-[200px]">
                <p className="text-xs text-amber-500 font-bold uppercase tracking-wider mb-1">Recommended Position</p>
                <p className="text-3xl font-mono font-black text-amber-400">${Number(plan.position_amount).toFixed(2)}</p>
              </div>
              
              {plan.position_size_rationale && (
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-amber-500 mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> Position Sizing Math
                  </h4>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {plan.position_size_rationale}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Veteran Insights Section */}
        {(explanation || institutional_perspective || risk_warning) && (
          <div className="mt-6 pt-6 border-t border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">Veteran Insights</h3>
            
            {explanation && (
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                <p className="text-xs text-blue-400 uppercase tracking-wider mb-1 font-semibold">Technical Rationale</p>
                <p className="text-sm text-slate-300 leading-relaxed">{explanation}</p>
              </div>
            )}
            
            {institutional_perspective && (
              <div className="bg-indigo-900/20 rounded-lg p-4 border border-indigo-500/20">
                <p className="text-xs text-indigo-400 uppercase tracking-wider mb-1 font-semibold">Smart Money Perspective</p>
                <p className="text-sm text-slate-300 leading-relaxed">{institutional_perspective}</p>
              </div>
            )}
            
            {risk_warning && (
              <div className="bg-rose-900/20 rounded-lg p-4 border border-rose-500/20">
                <p className="text-xs text-rose-400 uppercase tracking-wider mb-1 font-semibold">Risk Warning</p>
                <p className="text-sm text-slate-300 leading-relaxed">{risk_warning}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
