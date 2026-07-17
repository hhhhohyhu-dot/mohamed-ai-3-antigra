"use client";
import React, { useState, useEffect } from 'react';
import { fetchDashboard, fetchIndicators, fetchAnalyze } from '../services/api';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

const SCAN_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOGL', 'BTC-USD'];

export const MarketScanner = ({ onSelectSymbol }: { onSelectSymbol: (sym: string) => void }) => {
  const [results, setResults] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);

  const scanMarket = async () => {
    setScanning(true);
    setResults([]);
    
    for (const sym of SCAN_SYMBOLS) {
      try {
        const [dash, ind] = await Promise.all([
          fetchDashboard(sym),
          fetchIndicators(sym)
        ]);
        
        let signal = 'Hold';
        if (ind.indicators) {
          const analysis = await fetchAnalyze(sym, ind.indicators);
          signal = analysis.analysis?.signal || 'Hold';
        }
        
        setResults(prev => [...prev, { symbol: sym, price: dash.price, change: dash.change_percent, signal, indicators: ind.indicators }]);
      } catch (e) {
        console.error("Failed to scan", sym);
      }
    }
    
    setScanning(false);
  };

  useEffect(() => {
    scanMarket();
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center"><Activity className="mr-2 text-emerald-400" /> Market Scanner</h2>
        <button onClick={scanMarket} disabled={scanning} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium disabled:opacity-50">
          {scanning ? 'Scanning...' : 'Rescan'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-sm">
              <th className="pb-3 font-medium">Symbol</th>
              <th className="pb-3 font-medium">Price</th>
              <th className="pb-3 font-medium">24h Change</th>
              <th className="pb-3 font-medium">RSI</th>
              <th className="pb-3 font-medium">MACD</th>
              <th className="pb-3 font-medium">Signal</th>
            </tr>
          </thead>
          <tbody>
            {results.map(r => (
              <tr key={r.symbol} onClick={() => onSelectSymbol(r.symbol)} className="border-b border-slate-800/50 hover:bg-slate-800/50 cursor-pointer transition-colors">
                <td className="py-3 font-bold">{r.symbol}</td>
                <td className="py-3">${r.price?.toFixed(2)}</td>
                <td className={`py-3 ${r.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {r.change > 0 ? '+' : ''}{r.change?.toFixed(2)}%
                </td>
                <td className={`py-3 ${r.indicators?.RSI > 70 ? 'text-rose-400' : r.indicators?.RSI < 30 ? 'text-emerald-400' : ''}`}>
                  {r.indicators?.RSI?.toFixed(2) || 'N/A'}
                </td>
                <td className="py-3">{r.indicators?.MACD?.toFixed(2) || 'N/A'}</td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                    r.signal === 'Buy' ? 'bg-emerald-500/20 text-emerald-400' : 
                    r.signal === 'Sell' ? 'bg-rose-500/20 text-rose-400' : 
                    'bg-slate-500/20 text-slate-300'
                  }`}>
                    {r.signal}
                  </span>
                </td>
              </tr>
            ))}
            {scanning && SCAN_SYMBOLS.length > results.length && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-slate-500 animate-pulse">Scanning {SCAN_SYMBOLS[results.length]}...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
