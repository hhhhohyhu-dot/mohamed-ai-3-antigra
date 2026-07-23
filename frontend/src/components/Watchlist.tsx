"use client";
import React, { useState, useEffect } from 'react';
import { fetchDashboard } from '../services/api';
import { TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const Watchlist = ({ onSelectSymbol }: { onSelectSymbol: (sym: string) => void }) => {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [newSymbol, setNewSymbol] = useState('');
  const [data, setData] = useState<any>({});

  useEffect(() => {
    const saved = localStorage.getItem('watchlist');
    if (saved) setWatchlist(JSON.parse(saved));
    else setWatchlist(['AAPL', 'MSFT', 'BTC-USD']);
  }, []);

  useEffect(() => {
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
    watchlist.forEach(sym => {
      if (!data[sym]) {
        fetchDashboard(sym).then(res => {
          setData((prev: any) => ({ ...prev, [sym]: res }));
        }).catch(console.error);
      }
    });
  }, [watchlist]);

  const addSymbol = () => {
    const sym = newSymbol.toUpperCase().trim();
    if (sym && !watchlist.includes(sym)) {
      setWatchlist([...watchlist, sym]);
      setNewSymbol('');
    }
  };

  const removeSymbol = (sym: string) => {
    setWatchlist(watchlist.filter(s => s !== sym));
  };

  const formatWatchlistPrice = (price: number, symbol: string) => {
    if (price === undefined || price === null || isNaN(price)) return '---';
    const sym = symbol.toUpperCase();
    const isForex = sym.includes('=X') || (sym.length === 6 && !sym.includes('-')) || sym.includes('/');
    const isJpy = sym.includes('JPY') || (isForex && price > 50);
    
    const formatted = isForex ? price.toFixed(isJpy ? 3 : 5) : price.toFixed(2);
    
    let prefix = '$';
    if (isForex) {
      if (sym.includes('JPY')) prefix = '¥';
      else if (sym.includes('GBP')) prefix = '£';
      else if (sym.includes('EUR')) prefix = '€';
      else if (sym.endsWith('USD') || sym.includes('USD')) prefix = '$';
      else prefix = '';
    }
    return `${prefix}${formatted}`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl">
      <h2 className="text-2xl font-bold mb-6">Watchlist</h2>
      <div className="flex space-x-2 mb-6">
        <input 
          type="text" 
          value={newSymbol}
          onChange={(e) => setNewSymbol(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addSymbol()}
          placeholder="ADD SYMBOL"
          className="flex-1 bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none"
        />
        <button onClick={addSymbol} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium">Add</button>
      </div>
      <div className="space-y-3">
        {watchlist.map(sym => {
          const symData = data[sym];
          return (
            <div key={sym} className="flex justify-between items-center p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 cursor-pointer transition-colors" onClick={() => onSelectSymbol(sym)}>
              <div>
                <h3 className="font-bold text-lg">{sym}</h3>
              </div>
              <div className="flex items-center space-x-4">
                {symData ? (
                  <>
                    <span className="font-semibold">{formatWatchlistPrice(symData.price, sym)}</span>
                    <span className={`flex items-center ${symData.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {symData.change >= 0 ? <TrendingUp size={16} className="mr-1"/> : <TrendingDown size={16} className="mr-1"/>}
                      {symData.change_percent?.toFixed(2)}%
                    </span>
                  </>
                ) : (
                  <span className="text-slate-500">Loading...</span>
                )}
                <button onClick={(e) => { e.stopPropagation(); removeSymbol(sym); }} className="text-slate-500 hover:text-rose-400"><Trash2 size={18} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
