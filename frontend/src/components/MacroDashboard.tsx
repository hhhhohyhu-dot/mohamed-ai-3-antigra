import React, { useEffect, useState } from 'react';
import { fetchMacro, fetchMacroCommentary } from '../services/api';
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart2, ShieldAlert, TrendingUp, Brain, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export const MacroDashboard = () => {
  const [macroData, setMacroData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [commentary, setCommentary] = useState<any>(null);
  const [commentaryLoading, setCommentaryLoading] = useState(false);

  useEffect(() => {
    loadMacro();
  }, []);

  const loadMacro = async () => {
    setLoading(true);
    try {
      const data = await fetchMacro();
      setMacroData(data);
      // Load AI commentary in background after macro data loads
      setCommentaryLoading(true);
      fetchMacroCommentary()
        .then(res => setCommentary(res?.commentary || null))
        .catch(() => setCommentary(null))
        .finally(() => setCommentaryLoading(false));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!macroData || !macroData.indicators) {
    return <div className="text-center text-slate-400 p-8">Unable to load Macro Data.</div>;
  }

  const { stress_index, indicators, divergences } = macroData;

  const getStressColor = (regime: string) => {
    if (regime === 'RISK-ON') return 'text-emerald-400';
    if (regime === 'NEUTRAL') return 'text-yellow-400';
    if (regime === 'RISK-OFF') return 'text-orange-400';
    return 'text-red-500';
  };

  const getZScoreColor = (regime: string) => {
    if (regime === 'EXTREME') return 'bg-red-500/20 text-red-400 border-red-500/50';
    if (regime === 'WARNING') return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
    return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
  };

  const getMomentumLabel = (score: number) => {
    if (score === 3) return { label: 'STRONG BULLISH', color: 'text-emerald-500' };
    if (score === 2) return { label: 'BULLISH', color: 'text-emerald-400' };
    if (score === 1) return { label: 'SLIGHTLY BULLISH', color: 'text-emerald-300' };
    if (score === -1) return { label: 'SLIGHTLY BEARISH', color: 'text-red-300' };
    if (score === -2) return { label: 'BEARISH', color: 'text-red-400' };
    if (score === -3) return { label: 'STRONG BEARISH', color: 'text-red-500' };
    return { label: 'NEUTRAL', color: 'text-slate-400' };
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Stress Index */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm col-span-1">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Activity className="mr-2 text-blue-400" size={20} />
            Stress Index Composite
          </h2>
          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative">
              <svg className="w-40 h-40 transform -rotate-90">
                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-800" />
                <circle 
                  cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" 
                  strokeDasharray="440" strokeDashoffset={440 - (440 * stress_index.value) / 100}
                  className={`${getStressColor(stress_index.regime).replace('text-', 'text-')} transition-all duration-1000 ease-out`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{stress_index.value.toFixed(0)}</span>
                <span className={`text-sm font-medium ${getStressColor(stress_index.regime)}`}>{stress_index.regime}</span>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-400 text-center mt-2">
            Based on VIX, VVIX, HYG, TLT, and DXY
          </div>
        </div>

        {/* Divergences */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm col-span-1 md:col-span-2">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <ShieldAlert className="mr-2 text-yellow-400" size={20} />
            Intermarket Alerts & Divergences
          </h2>
          {divergences.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400">
              <Activity size={32} className="mb-2 opacity-50" />
              <p>No major divergences detected.</p>
              <p className="text-sm">The market is aligned.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {divergences.map((div: any, i: number) => (
                <div key={i} className={`p-4 rounded-lg border ${div.type === 'danger' ? 'bg-red-500/10 border-red-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-sm tracking-wide">{div.code}</span>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${div.type === 'danger' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {div.action}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm">{div.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Macro Commentary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-slate-900/50 border border-indigo-500/20 rounded-xl p-6 backdrop-blur-sm"
      >
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Brain className="mr-2 text-indigo-400" size={20} />
          AI Macro Commentary
        </h2>
        {commentaryLoading && (
          <div className="flex items-center gap-3 text-slate-400">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-indigo-400" />
            <span className="text-sm">Generating AI commentary...</span>
          </div>
        )}
        {commentary && !commentaryLoading && (
          <div className="space-y-4">
            {/* Bias + Risk Level badges */}
            <div className="flex flex-wrap gap-2 mb-2">
              {commentary.bias && (
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  commentary.bias === 'Risk-On' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' :
                  commentary.bias === 'Risk-Off' ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' :
                  'bg-yellow-500/15 border-yellow-500/30 text-yellow-400'
                }`}>
                  {commentary.bias}
                </span>
              )}
              {commentary.risk_level && (
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  commentary.risk_level === 'Low' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' :
                  commentary.risk_level === 'High' || commentary.risk_level === 'Extreme' ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' :
                  'bg-yellow-500/15 border-yellow-500/30 text-yellow-400'
                }`}>
                  Risk: {commentary.risk_level}
                </span>
              )}
            </div>
            {/* Key theme */}
            {commentary.key_theme && (
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-yellow-300">{commentary.key_theme}</p>
              </div>
            )}
            {/* Main commentary */}
            {commentary.commentary && (
              <p className="text-sm text-slate-300 leading-relaxed italic border-l-2 border-indigo-500/40 pl-3">
                "{commentary.commentary}"
              </p>
            )}
            {/* Actionable insight */}
            {commentary.actionable_insight && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3">
                <p className="text-xs font-semibold text-indigo-400 mb-1">Actionable Insight</p>
                <p className="text-sm text-slate-300">{commentary.actionable_insight}</p>
              </div>
            )}
          </div>
        )}
        {!commentary && !commentaryLoading && (
          <p className="text-slate-500 text-sm">AI commentary will appear after macro data loads.</p>
        )}
      </motion.div>

      {/* Heatmap des Indicateurs */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <BarChart2 className="mr-2 text-indigo-400" size={20} />
          Z-Score & Momentum Dashboard
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-sm">
                <th className="pb-3 px-4">Indicator</th>
                <th className="pb-3 px-4">Price</th>
                <th className="pb-3 px-4">Change</th>
                <th className="pb-3 px-4">Z-Score (252d)</th>
                <th className="pb-3 px-4">Regime</th>
                <th className="pb-3 px-4">Momentum</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(indicators).map(([name, data]: [string, any]) => {
                const mom = getMomentumLabel(data.momentum_score);
                return (
                  <tr key={name} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-medium">{name}</td>
                    <td className="py-3 px-4">{data.price.toFixed(2)}</td>
                    <td className={`py-3 px-4 flex items-center ${data.change_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {data.change_pct >= 0 ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
                      {Math.abs(data.change_pct).toFixed(2)}%
                    </td>
                    <td className="py-3 px-4">{data.z_score.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded border ${getZScoreColor(data.regime)}`}>
                        {data.regime}
                      </span>
                    </td>
                    <td className={`py-3 px-4 text-xs font-semibold ${mom.color}`}>
                      {mom.label}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
