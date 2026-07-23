import React, { useState, useEffect } from 'react';
import { Shield, Calculator, Percent, ChevronRight } from 'lucide-react';

interface LotSizeCalculatorProps {
  initialSlPips?: number;
  initialCapital?: number;
}

export const LotSizeCalculator: React.FC<LotSizeCalculatorProps> = ({ initialSlPips = 30, initialCapital = 10000 }) => {
  const [capital, setCapital] = useState<number>(initialCapital);
  const [riskPct, setRiskPct] = useState<number>(1.0);
  const [slPips, setSlPips] = useState<number>(initialSlPips);

  useEffect(() => {
    setSlPips(initialSlPips);
  }, [initialSlPips]);

  useEffect(() => {
    setCapital(initialCapital);
  }, [initialCapital]);

  // Risk Math:
  // Risk Amount = Capital * (Risk Pct / 100)
  // For USD quoted pairs (e.g. EURUSD, GBPUSD), 1 Pip for 1 Standard Lot (100,000 units) = $10.00.
  // Standard Lot Size = Risk Amount / (SL Pips * 10)
  const riskAmount = capital * (riskPct / 100.0);
  const standardLots = slPips > 0 ? (riskAmount / (slPips * 10.0)) : 0;
  const miniLots = standardLots * 10;
  const microLots = standardLots * 100;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl relative overflow-hidden backdrop-blur-md">
      <div className="flex items-center gap-3 mb-4">
        <Calculator className="w-5 h-5 text-indigo-400" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Position Size & Lot Calculator</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Capital Input */}
        <div>
          <label className="block text-slate-400 text-xs font-semibold mb-1 uppercase tracking-wider">Capital ($)</label>
          <input
            type="number"
            value={capital}
            onChange={(e) => setCapital(Math.max(0, Number(e.target.value)))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
          />
        </div>

        {/* Risk Percentage Input */}
        <div>
          <label className="block text-slate-400 text-xs font-semibold mb-1 uppercase tracking-wider">Risk %</label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              value={riskPct}
              onChange={(e) => setRiskPct(Math.max(0.1, Math.min(10, Number(e.target.value))))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-3 pr-8 py-1.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
            />
            <Percent className="absolute right-3 top-2.5 w-3 h-3 text-slate-500" />
          </div>
        </div>

        {/* Stop Loss Pips Input */}
        <div>
          <label className="block text-slate-400 text-xs font-semibold mb-1 uppercase tracking-wider">Stop Loss (Pips)</label>
          <input
            type="number"
            value={slPips}
            onChange={(e) => setSlPips(Math.max(1, Number(e.target.value)))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
          />
        </div>
      </div>

      {/* Lot Sizing Output Grid */}
      <div className="grid grid-cols-3 gap-3 bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 mb-3">
        <div className="flex flex-col items-center justify-center p-2 bg-indigo-500/5 border border-indigo-500/10 rounded-lg">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Standard Lot</span>
          <span className="text-lg font-mono font-black text-indigo-400">{standardLots.toFixed(2)}</span>
          <span className="text-[9px] text-slate-500">100k units</span>
        </div>

        <div className="flex flex-col items-center justify-center p-2 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Mini Lot</span>
          <span className="text-lg font-mono font-black text-emerald-400">{miniLots.toFixed(2)}</span>
          <span className="text-[9px] text-slate-500">10k units</span>
        </div>

        <div className="flex flex-col items-center justify-center p-2 bg-amber-500/5 border border-amber-500/10 rounded-lg">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Micro Lot</span>
          <span className="text-lg font-mono font-black text-amber-400">{microLots.toFixed(2)}</span>
          <span className="text-[9px] text-slate-500">1k units</span>
        </div>
      </div>

      {/* Sizing Information Footer */}
      <div className="flex items-center gap-2 text-xs text-slate-500 border-t border-slate-800/50 pt-3 mt-3">
        <Shield className="w-3.5 h-3.5 text-indigo-500/70" />
        <span>Risking <span className="font-semibold text-slate-300">${riskAmount.toFixed(2)}</span> ({riskPct}%) with a {slPips} pips Stop Loss.</span>
      </div>
    </div>
  );
};
