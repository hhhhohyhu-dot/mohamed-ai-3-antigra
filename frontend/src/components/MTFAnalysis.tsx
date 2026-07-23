import React from 'react';
import { motion } from 'framer-motion';
import { Layers, TrendingUp, TrendingDown, Minus, CheckCircle, XCircle } from 'lucide-react';

interface MTFTrendData {
  trend?: string;
  rsi?: number | null;
  macd_bullish?: boolean | null;
  ema20_above_50?: boolean | null;
  close?: number | null;
  ema20?: number | null;
  ema50?: number | null;
  ema200?: number | null;
  market_structure?: string;
  volume_surge?: boolean;
}

interface MTFData {
  weekly?: MTFTrendData;
  daily?: MTFTrendData;
  h4?: MTFTrendData;
  alignment_score?: number;
  bearish_count?: number;
}

interface MTFAnalysisProps {
  mtfData?: MTFData | null;
  mtf?: MTFData | null;
}

const TrendBadge = ({ trend }: { trend?: string }) => {
  if (!trend || trend === 'Unknown') {
    return (
      <span className="flex items-center gap-1 text-slate-400 text-xs font-medium px-2 py-0.5 bg-slate-800 rounded-full border border-slate-700">
        <Minus className="w-3 h-3" /> Unknown
      </span>
    );
  }
  const isBullish = trend.includes('Bullish');
  const isBearish = trend.includes('Bearish');
  const isStrong = trend.includes('Strong');

  if (isBullish) {
    return (
      <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${isStrong ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-emerald-900/30 text-emerald-400 border-emerald-700/40'}`}>
        <TrendingUp className="w-3 h-3" /> {trend}
      </span>
    );
  }
  if (isBearish) {
    return (
      <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${isStrong ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-rose-900/30 text-rose-400 border-rose-700/40'}`}>
        <TrendingDown className="w-3 h-3" /> {trend}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 bg-yellow-900/20 text-yellow-400 rounded-full border border-yellow-700/40">
      <Minus className="w-3 h-3" /> {trend}
    </span>
  );
};

const BoolIcon = ({ value }: { value?: boolean | null }) => {
  if (value === null || value === undefined) return <Minus className="w-4 h-4 text-slate-600" />;
  return value
    ? <CheckCircle className="w-4 h-4 text-emerald-400" />
    : <XCircle className="w-4 h-4 text-rose-400" />;
};

const RSIBadge = ({ rsi }: { rsi?: number | null }) => {
  if (rsi === null || rsi === undefined) return <span className="text-slate-500 text-xs">N/A</span>;
  const color = rsi > 70 ? 'text-rose-400' : rsi < 30 ? 'text-emerald-400' : 'text-slate-300';
  return <span className={`text-sm font-bold ${color}`}>{rsi.toFixed(1)}</span>;
};

export const MTFAnalysis: React.FC<MTFAnalysisProps> = ({ mtfData, mtf }) => {
  const activeMtfData = mtfData || mtf;
  if (!activeMtfData) return null;

  const { weekly, daily, h4, alignment_score = 0, bearish_count = 0 } = activeMtfData;
  const total = 3;
  const alignmentPct = (alignment_score / total) * 100;

  const rows = [
    { label: 'Weekly', icon: '📅', data: weekly, color: 'text-purple-400' },
    { label: 'Daily',  icon: '📆', data: daily,  color: 'text-blue-400'   },
    { label: '4H',     icon: '⏱',  data: h4,     color: 'text-cyan-400'   },
  ];

  const overallBias = alignment_score >= 2 ? 'Bullish' : bearish_count >= 2 ? 'Bearish' : 'Neutral';
  const biasColor = overallBias === 'Bullish' ? 'text-emerald-400' : overallBias === 'Bearish' ? 'text-rose-400' : 'text-yellow-400';
  const biasGradient = overallBias === 'Bullish'
    ? 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30'
    : overallBias === 'Bearish'
    ? 'from-rose-500/20 to-rose-600/5 border-rose-500/30'
    : 'from-yellow-500/10 to-yellow-600/5 border-yellow-500/20';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/70 rounded-xl border border-slate-800 overflow-hidden shadow-lg mt-6"
    >
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-bold text-white">Multi-Timeframe Analysis</h3>
        </div>
        <div className={`bg-gradient-to-r ${biasGradient} border px-4 py-1.5 rounded-full`}>
          <span className={`text-sm font-bold ${biasColor}`}>MTF Bias: {overallBias}</span>
          <span className="text-slate-500 text-xs ml-2">({alignment_score}/3 Bullish)</span>
        </div>
      </div>

      {/* Alignment bar */}
      <div className="px-6 py-3 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium w-28 shrink-0">MTF Alignment</span>
          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${alignmentPct >= 67 ? 'bg-emerald-500' : alignmentPct >= 34 ? 'bg-yellow-500' : 'bg-rose-500'}`}
              style={{ width: `${alignmentPct}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-400 w-8 text-right">{alignmentPct.toFixed(0)}%</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800/80 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-5 py-3 text-left font-semibold">Timeframe</th>
              <th className="px-4 py-3 text-left font-semibold">Trend</th>
              <th className="px-4 py-3 text-center font-semibold">RSI</th>
              <th className="px-4 py-3 text-center font-semibold">MACD ↑</th>
              <th className="px-4 py-3 text-center font-semibold">EMA20&gt;50</th>
              <th className="px-4 py-3 text-center font-semibold">Vol Surge</th>
              <th className="px-4 py-3 text-left font-semibold">Structure</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, icon, data, color }, i) => (
              <motion.tr
                key={label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{icon}</span>
                    <span className={`font-bold ${color}`}>{label}</span>
                  </div>
                </td>
                <td className="px-4 py-4"><TrendBadge trend={data?.trend} /></td>
                <td className="px-4 py-4 text-center"><RSIBadge rsi={data?.rsi} /></td>
                <td className="px-4 py-4 text-center"><div className="flex justify-center"><BoolIcon value={data?.macd_bullish} /></div></td>
                <td className="px-4 py-4 text-center"><div className="flex justify-center"><BoolIcon value={data?.ema20_above_50} /></div></td>
                <td className="px-4 py-4 text-center"><div className="flex justify-center"><BoolIcon value={data?.volume_surge} /></div></td>
                <td className="px-4 py-4">
                  <span className={`text-xs font-medium ${
                    data?.market_structure?.includes('Bullish') ? 'text-emerald-400' :
                    data?.market_structure?.includes('Bearish') ? 'text-rose-400' :
                    'text-slate-400'
                  }`}>
                    {data?.market_structure || 'N/A'}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* EMA Levels footer */}
      <div className="px-6 py-3 bg-slate-950/40 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-800/60">
        {rows.map(({ label, data, color }) => (
          <div key={label} className="text-xs text-slate-500 space-y-1">
            <span className={`font-semibold ${color}`}>{label}</span>
            {data?.close ? (
              <div className="flex gap-3 flex-wrap mt-1">
                {data.ema20 != null && <span>EMA20: <span className="text-slate-300">{data.ema20.toFixed(2)}</span></span>}
                {data.ema50 != null && <span>EMA50: <span className="text-slate-300">{data.ema50.toFixed(2)}</span></span>}
                {data.ema200 != null && <span>EMA200: <span className="text-slate-300">{data.ema200.toFixed(2)}</span></span>}
              </div>
            ) : (
              <span className="text-slate-700">No data</span>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
};
