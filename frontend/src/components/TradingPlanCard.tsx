import React from 'react';
import { Target, TrendingUp, TrendingDown, Crosshair, DollarSign, Activity, Clock, Timer } from 'lucide-react';
import { LotSizeCalculator } from './LotSizeCalculator';

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
    best_entry_time?: string;
    holding_period?: string;
    forex_pips?: {
      sl_pips?: number;
      tp1_pips?: number;
      tp2_pips?: number;
      tp3_pips?: number;
    };
  };
  signal: string;
  symbol?: string;
  capital?: number;
  explanation?: string;
  institutional_perspective?: string;
  risk_warning?: string;
}

export const TradingPlanCard: React.FC<TradingPlanProps> = ({ plan, signal, symbol, capital, explanation, institutional_perspective, risk_warning }) => {
  if (!plan) return null;

  const isBuy = signal?.includes("Buy");
  const isSell = signal?.includes("Sell");
  
  if (!isBuy && !isSell) return null;

  // Forex Detection
  const sym = symbol?.toUpperCase() || '';
  const isForex = sym.includes('=X') || sym.includes('/') || (sym.length === 6 && !sym.includes('-'));
  const isJpy = sym.includes('JPY') || (isForex && Number(plan.entry) > 50);

  const formatPriceVal = (val: string | number | undefined) => {
    if (val === undefined || val === null || isNaN(Number(val))) return '---';
    const num = Number(val);
    if (isForex) {
      return num.toFixed(isJpy ? 3 : 5);
    }
    return num.toFixed(2);
  };

  const getCurrencyPrefix = () => {
    if (isForex) {
      if (sym.includes('JPY')) return '¥';
      if (sym.includes('GBP')) return '£';
      if (sym.includes('EUR')) return '€';
      if (sym.endsWith('USD') || sym.includes('USD')) return '$';
      return ''; // naked forex pricing format
    }
    return '$';
  };

  const currencyPrefix = getCurrencyPrefix();
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
            <p className="text-xl font-mono font-bold text-slate-200">{currencyPrefix}{formatPriceVal(plan.entry)}</p>
          </div>
          
          <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20 flex flex-col items-center justify-center">
            <p className="text-xs text-emerald-400/70 uppercase tracking-wider mb-1">Take Profit 1</p>
            <p className="text-xl font-mono font-bold text-emerald-400">{currencyPrefix}{formatPriceVal(plan.tp1)}</p>
            {isForex && plan.forex_pips?.tp1_pips && (
              <span className="text-[10px] text-emerald-400/80 mt-1 font-semibold">+{plan.forex_pips.tp1_pips} pips</span>
            )}
          </div>

          <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20 flex flex-col items-center justify-center">
            <p className="text-xs text-emerald-400/70 uppercase tracking-wider mb-1">Take Profit 2</p>
            <p className="text-xl font-mono font-bold text-emerald-400">{currencyPrefix}{formatPriceVal(plan.tp2)}</p>
            {isForex && plan.forex_pips?.tp2_pips && (
              <span className="text-[10px] text-emerald-400/80 mt-1 font-semibold">+{plan.forex_pips.tp2_pips} pips</span>
            )}
          </div>

          <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent"></div>
            <p className="text-xs text-emerald-400/70 uppercase tracking-wider mb-1 relative z-10">Take Profit 3</p>
            <p className="text-xl font-mono font-bold text-emerald-400 relative z-10">{currencyPrefix}{formatPriceVal(plan.tp3)}</p>
            {isForex && plan.forex_pips?.tp3_pips && (
              <span className="text-[10px] text-emerald-400/80 mt-1 font-semibold relative z-10">+{plan.forex_pips.tp3_pips} pips</span>
            )}
          </div>

          <div className="bg-rose-500/10 rounded-lg p-4 border border-rose-500/20 flex flex-col items-center justify-center">
            <p className="text-xs text-rose-400/70 uppercase tracking-wider mb-1">Stop Loss</p>
            <p className="text-xl font-mono font-bold text-rose-400">{currencyPrefix}{formatPriceVal(plan.sl)}</p>
            <div className="flex flex-col items-center mt-1">
              <span className="text-[10px] text-rose-500/70">Risk: {riskPct.toFixed(2)}%</span>
              {isForex && plan.forex_pips?.sl_pips && (
                <span className="text-[10px] text-rose-400 font-semibold mt-0.5">-{plan.forex_pips.sl_pips} pips</span>
              )}
            </div>
          </div>
        </div>

        {/* Execution Session / Duration */}
        {(plan.best_entry_time || plan.holding_period) && (
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plan.best_entry_time && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center gap-4 hover:border-blue-500/30 transition-colors">
                  <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-400/70 font-bold uppercase tracking-wider">Optimal Entry Timing</p>
                    <p className="text-sm font-semibold text-white mt-1">{plan.best_entry_time}</p>
                  </div>
                </div>
              )}
              {plan.holding_period && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 flex items-center gap-4 hover:border-purple-500/30 transition-colors">
                  <div className="p-3 bg-purple-500/20 rounded-lg text-purple-400">
                    <Timer className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-purple-400/70 font-bold uppercase tracking-wider">Expected Hold Duration</p>
                    <p className="text-sm font-semibold text-white mt-1">{plan.holding_period}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lot Size Calculator (Only for Forex assets) */}
        {isForex && (
          <div className="mt-6 pt-6 border-t border-slate-800">
            <LotSizeCalculator 
              initialSlPips={plan.forex_pips?.sl_pips || 30} 
              initialCapital={capital || 10000}
            />
          </div>
        )}

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
