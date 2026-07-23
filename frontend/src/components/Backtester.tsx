import React, { useState, useEffect } from 'react';
import { runBacktest } from '../services/api';
import { Play, TrendingUp, TrendingDown, DollarSign, Activity, Percent, BookOpen, AlertTriangle, Cpu, ChevronRight, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface BacktestResult {
  symbol: string;
  strategy: string;
  initial_capital: number;
  final_capital: number;
  total_return_pct: number;
  win_rate_pct: number;
  profit_factor: number;
  max_drawdown_pct: number;
  total_trades: number;
  completed_trades: any[];
  equity_curve: { time: string; value: number }[];
  ai_report?: {
    summary?: string;
    regime_analysis?: string;
    optimizations?: string;
    risk_rules?: string;
  };
}

export const Backtester = ({ initialSymbol = 'AAPL' }: { initialSymbol?: string }) => {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [strategy, setStrategy] = useState('EMA_Crossover');
  const [capital, setCapital] = useState(10000);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Strategy Parameters
  const [emaFast, setEmaFast] = useState(9);
  const [emaSlow, setEmaSlow] = useState(21);
  const [rsiPeriod, setRsiPeriod] = useState(14);
  const [rsiOversold, setRsiOversold] = useState(30);
  const [rsiOverbought, setRsiOverbought] = useState(70);
  const [macdFast, setMacdFast] = useState(12);
  const [macdSlow, setMacdSlow] = useState(26);
  const [macdSignal, setMacdSignal] = useState(9);
  const [bbPeriod, setBbPeriod] = useState(20);
  const [bbStdDev, setBbStdDev] = useState(2.0);

  useEffect(() => {
    setSymbol(initialSymbol);
  }, [initialSymbol]);

  const handleRunBacktest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    // Build parameters mapping
    const parameters: Record<string, any> = {};
    if (strategy === 'EMA_Crossover') {
      parameters.fast_period = emaFast;
      parameters.slow_period = emaSlow;
    } else if (strategy === 'RSI_Reversion') {
      parameters.rsi_period = rsiPeriod;
      parameters.oversold_threshold = rsiOversold;
      parameters.overbought_threshold = rsiOverbought;
    } else if (strategy === 'MACD_Crossover') {
      parameters.fast_period = macdFast;
      parameters.slow_period = macdSlow;
      parameters.signal_period = macdSignal;
    } else if (strategy === 'Bollinger_Bands') {
      parameters.bb_period = bbPeriod;
      parameters.std_dev = bbStdDev;
    }

    try {
      const data = await runBacktest(symbol, strategy, capital, parameters);
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to draw custom responsive SVG chart for Equity Curve
  const renderEquityChart = () => {
    if (!result || !result.equity_curve || result.equity_curve.length === 0) return null;
    
    const data = result.equity_curve;
    const values = data.map(d => d.value);
    const minVal = Math.min(...values) * 0.98;
    const maxVal = Math.max(...values) * 1.02;
    const valRange = maxVal - minVal;

    const width = 800;
    const height = 280;
    const padding = 20;

    const points = data.map((d, index) => {
      const x = padding + (index / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((d.value - minVal) / valRange) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    const closedPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full text-blue-500 overflow-visible">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.4)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#334155" strokeDasharray="4 4" strokeWidth="0.5" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#334155" strokeDasharray="4 4" strokeWidth="0.5" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#475569" strokeWidth="1" />

        {/* Gradient fill */}
        <polygon points={closedPoints} fill="url(#chartGradient)" />

        {/* Path line */}
        <polyline fill="none" stroke="#3b82f6" strokeWidth="2.5" points={points} className="drop-shadow-[0_4px_6px_rgba(59,130,246,0.5)]" />

        {/* Start / End values */}
        <text x={padding} y={height - padding - 8} fill="#94a3b8" className="text-[10px] font-medium">
          Start: ${result.initial_capital}
        </text>
        <text x={width - padding - 70} y={padding + 12} fill="#10b981" className="text-[10px] font-bold">
          End: ${result.final_capital}
        </text>
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sidebar: Control Form */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6">
          <div>
            <h2 className="text-xl font-bold flex items-center text-white">
              <Activity className="mr-2 text-blue-500" size={20} /> Backtest Strategy
            </h2>
            <p className="text-xs text-slate-400 mt-1">Simulate historical performance and verify rules.</p>
          </div>

          <form onSubmit={handleRunBacktest} className="space-y-4">
            {/* Symbol input */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Asset Symbol</label>
              <input 
                type="text" 
                value={symbol}
                onChange={e => setSymbol(e.target.value.toUpperCase())}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-semibold"
                placeholder="e.g. AAPL, BTC-USD"
                required
              />
            </div>

            {/* Strategy Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Strategy</label>
              <select 
                value={strategy}
                onChange={e => setStrategy(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="EMA_Crossover">EMA Crossover</option>
                <option value="RSI_Reversion">RSI Mean Reversion</option>
                <option value="MACD_Crossover">MACD Crossover</option>
                <option value="Bollinger_Bands">Bollinger Bands</option>
              </select>
            </div>

            {/* Capital */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Starting Capital ($)</label>
              <input 
                type="number" 
                value={capital}
                onChange={e => setCapital(Number(e.target.value))}
                min="100"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                required
              />
            </div>

            <hr className="border-slate-800" />

            {/* Dynamic Strategy Parameters */}
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Strategy Parameters</h3>
              
              {strategy === 'EMA_Crossover' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Fast EMA</label>
                    <input type="number" value={emaFast} onChange={e => setEmaFast(Number(e.target.value))} className="w-full bg-slate-850 border border-slate-750 rounded px-2 py-1 text-white text-xs text-center" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Slow EMA</label>
                    <input type="number" value={emaSlow} onChange={e => setEmaSlow(Number(e.target.value))} className="w-full bg-slate-850 border border-slate-750 rounded px-2 py-1 text-white text-xs text-center" />
                  </div>
                </div>
              )}

              {strategy === 'RSI_Reversion' && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">RSI Period</label>
                    <input type="number" value={rsiPeriod} onChange={e => setRsiPeriod(Number(e.target.value))} className="w-full bg-slate-850 border border-slate-750 rounded px-2 py-1 text-white text-xs text-center" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Oversold (Buy)</label>
                      <input type="number" value={rsiOversold} onChange={e => setRsiOversold(Number(e.target.value))} className="w-full bg-slate-850 border border-slate-750 rounded px-2 py-1 text-white text-xs text-center" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Overbought (Sell)</label>
                      <input type="number" value={rsiOverbought} onChange={e => setRsiOverbought(Number(e.target.value))} className="w-full bg-slate-850 border border-slate-750 rounded px-2 py-1 text-white text-xs text-center" />
                    </div>
                  </div>
                </div>
              )}

              {strategy === 'MACD_Crossover' && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] text-slate-400 mb-1 text-center">Fast EMA</label>
                    <input type="number" value={macdFast} onChange={e => setMacdFast(Number(e.target.value))} className="w-full bg-slate-850 border border-slate-750 rounded px-2 py-1 text-white text-xs text-center" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-400 mb-1 text-center">Slow EMA</label>
                    <input type="number" value={macdSlow} onChange={e => setMacdSlow(Number(e.target.value))} className="w-full bg-slate-850 border border-slate-750 rounded px-2 py-1 text-white text-xs text-center" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-400 mb-1 text-center">Signal EMA</label>
                    <input type="number" value={macdSignal} onChange={e => setMacdSignal(Number(e.target.value))} className="w-full bg-slate-850 border border-slate-750 rounded px-2 py-1 text-white text-xs text-center" />
                  </div>
                </div>
              )}

              {strategy === 'Bollinger_Bands' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">MA Period</label>
                    <input type="number" value={bbPeriod} onChange={e => setBbPeriod(Number(e.target.value))} className="w-full bg-slate-850 border border-slate-750 rounded px-2 py-1 text-white text-xs text-center" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Std Dev</label>
                    <input type="number" step="0.1" value={bbStdDev} onChange={e => setBbStdDev(Number(e.target.value))} className="w-full bg-slate-850 border border-slate-750 rounded px-2 py-1 text-white text-xs text-center" />
                  </div>
                </div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Simulating...
                </>
              ) : (
                <>
                  <Play size={16} /> Run Backtest
                </>
              )}
            </button>
          </form>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Error display */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl flex items-center gap-3">
              <AlertTriangle className="text-rose-500" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Loader Overlay */}
          {loading && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-12 shadow-xl flex flex-col items-center justify-center h-full min-h-[450px] space-y-4">
              <div className="relative">
                <div className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-blue-400 opacity-20"></div>
                <div className="relative animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
              <h3 className="font-bold text-white text-lg">Running historical backtest simulation...</h3>
              <p className="text-sm text-slate-400 max-w-sm text-center">Calculating daily strategy triggers and constructing the AI-Powered quant report summary.</p>
            </div>
          )}

          {/* Prompt State */}
          {!loading && !result && !error && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-12 shadow-xl flex flex-col items-center justify-center text-center min-h-[450px] space-y-4">
              <div className="p-4 bg-slate-850 rounded-full text-blue-400 border border-slate-800">
                <Cpu size={36} />
              </div>
              <h3 className="text-xl font-bold text-white">Execute Strategy Backtest</h3>
              <p className="text-sm text-slate-400 max-w-md">Configure your rules on the sidebar, then click "Run Backtest" to check returns, drawdowns, win rates, and get custom quantitative advice from our AI.</p>
            </div>
          )}

          {/* Results dashboard */}
          {result && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                
                {/* Total Return */}
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow flex flex-col justify-between relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-full h-1 ${result.total_return_pct >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Return</p>
                  <p className={`text-xl font-extrabold mt-2 ${result.total_return_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {result.total_return_pct >= 0 ? '+' : ''}{result.total_return_pct.toFixed(2)}%
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1">${result.final_capital.toLocaleString()} final</span>
                </div>

                {/* Win Rate */}
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow flex flex-col justify-between">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Win Rate</p>
                  <p className="text-xl font-extrabold text-white mt-2 flex items-center gap-1">
                    <Percent size={16} className="text-blue-400" /> {result.win_rate_pct.toFixed(1)}%
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1">Based on {result.total_trades} trades</span>
                </div>

                {/* Profit Factor */}
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow flex flex-col justify-between">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Profit Factor</p>
                  <p className="text-xl font-extrabold text-blue-400 mt-2 flex items-center gap-1">
                    <TrendingUp size={16} /> {result.profit_factor.toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1">Gross Gain / Loss</span>
                </div>

                {/* Max Drawdown */}
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow flex flex-col justify-between relative overflow-hidden">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Max Drawdown</p>
                  <p className="text-xl font-extrabold text-rose-400 mt-2">
                    -{result.max_drawdown_pct.toFixed(2)}%
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1">Peak-to-trough risk</span>
                </div>

                {/* Total Trades */}
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow flex flex-col justify-between col-span-2 md:col-span-1">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Trades</p>
                  <p className="text-xl font-extrabold text-purple-400 mt-2">
                    {result.total_trades}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1">Daily cycles</span>
                </div>
              </div>

              {/* Equity Curve Card */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl">
                <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Equity Curve Simulation</h3>
                <div className="w-full h-[280px]">
                  {renderEquityChart()}
                </div>
              </div>

              {/* AI Quantitative Audit Section */}
              {result.ai_report && (
                <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 text-indigo-500 opacity-10">
                    <Cpu size={80} />
                  </div>
                  <h3 className="font-bold text-indigo-300 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                    <Cpu className="text-indigo-400" size={18} /> AI Quantitative Strategy Report
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Executive Summary */}
                    {result.ai_report.summary && (
                      <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-1">Executive Audit</h4>
                        <p className="text-sm text-slate-200 leading-relaxed">{result.ai_report.summary}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Regime Analysis */}
                      {result.ai_report.regime_analysis && (
                        <div className="bg-slate-950/20 p-4 rounded-xl border border-slate-850">
                          <h4 className="text-xs font-bold text-indigo-400 uppercase mb-2 flex items-center gap-1">
                            <Activity size={12} /> Market Regime
                          </h4>
                          <p className="text-xs text-slate-300 leading-relaxed">{result.ai_report.regime_analysis}</p>
                        </div>
                      )}

                      {/* Optimizations */}
                      {result.ai_report.optimizations && (
                        <div className="bg-slate-950/20 p-4 rounded-xl border border-slate-850">
                          <h4 className="text-xs font-bold text-blue-400 uppercase mb-2 flex items-center gap-1">
                            <ChevronRight size={12} /> Optimization
                          </h4>
                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{result.ai_report.optimizations}</p>
                        </div>
                      )}

                      {/* Risk Rules */}
                      {result.ai_report.risk_rules && (
                        <div className="bg-slate-950/20 p-4 rounded-xl border border-slate-850">
                          <h4 className="text-xs font-bold text-amber-400 uppercase mb-2 flex items-center gap-1">
                            <AlertTriangle size={12} /> Custom Risk Rules
                          </h4>
                          <p className="text-xs text-slate-300 leading-relaxed">{result.ai_report.risk_rules}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Trades Log */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-800">
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider">Executed Simulation Trades</h3>
                </div>
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                        <th className="px-5 py-3">ID</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Entry Date</th>
                        <th className="px-4 py-3">Exit Date</th>
                        <th className="px-4 py-3">Entry ($)</th>
                        <th className="px-4 py-3">Exit ($)</th>
                        <th className="px-4 py-3 text-right">PNL (%)</th>
                        <th className="px-5 py-3 text-right">PNL ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {result.completed_trades.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-5 py-6 text-center text-slate-500">
                            No trades triggered during this period. Try loosening your strategy parameters.
                          </td>
                        </tr>
                      )}
                      {result.completed_trades.map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                          <td className="px-5 py-3 font-semibold text-slate-400">{t.id}</td>
                          <td className="px-4 py-3 font-bold text-slate-300">{t.type}</td>
                          <td className="px-4 py-3 text-slate-400">{t.entry_date}</td>
                          <td className="px-4 py-3 text-slate-400">{t.exit_date}</td>
                          <td className="px-4 py-3 text-slate-300">${t.entry_price.toFixed(2)}</td>
                          <td className="px-4 py-3 text-slate-300">${t.exit_price.toFixed(2)}</td>
                          <td className={`px-4 py-3 text-right font-semibold ${t.pnl_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {t.pnl_pct >= 0 ? '+' : ''}{t.pnl_pct}%
                          </td>
                          <td className={`px-5 py-3 text-right font-bold ${t.pnl_abs >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {t.pnl_abs >= 0 ? '+' : ''}${t.pnl_abs.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
};
