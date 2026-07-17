"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Position {
  symbol: string;
  qty: number;
  entryPrice: number;
  currentPrice: number;
}

export const Portfolio = ({ currentSymbol, currentPrice }: { currentSymbol: string, currentPrice: number }) => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [balance, setBalance] = useState(100000);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    const saved = localStorage.getItem('portfolio');
    if (saved) {
      const parsed = JSON.parse(saved);
      setPositions(parsed.positions || []);
      setBalance(parsed.balance || 100000);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('portfolio', JSON.stringify({ positions, balance }));
  }, [positions, balance]);

  const buy = () => {
    const cost = currentPrice * qty;
    if (balance >= cost) {
      setBalance(balance - cost);
      const existing = positions.find(p => p.symbol === currentSymbol);
      if (existing) {
        const newQty = existing.qty + qty;
        const newEntry = ((existing.qty * existing.entryPrice) + (qty * currentPrice)) / newQty;
        setPositions(positions.map(p => p.symbol === currentSymbol ? { ...p, qty: newQty, entryPrice: newEntry, currentPrice } : p));
      } else {
        setPositions([...positions, { symbol: currentSymbol, qty, entryPrice: currentPrice, currentPrice }]);
      }
    }
  };

  const sell = () => {
    const existing = positions.find(p => p.symbol === currentSymbol);
    if (existing && existing.qty >= qty) {
      const revenue = currentPrice * qty;
      setBalance(balance + revenue);
      if (existing.qty === qty) {
        setPositions(positions.filter(p => p.symbol !== currentSymbol));
      } else {
        setPositions(positions.map(p => p.symbol === currentSymbol ? { ...p, qty: existing.qty - qty, currentPrice } : p));
      }
    }
  };

  const totalValue = balance + positions.reduce((acc, p) => acc + (p.qty * p.currentPrice), 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl">
      <h2 className="text-2xl font-bold mb-6">Paper Trading Portfolio</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-800 p-4 rounded-xl">
          <p className="text-slate-400 text-sm">Available Cash</p>
          <p className="text-2xl font-bold text-emerald-400">${balance.toFixed(2)}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl">
          <p className="text-slate-400 text-sm">Total Equity</p>
          <p className="text-2xl font-bold text-blue-400">${totalValue.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mb-6">
        <h3 className="font-semibold mb-3">Trade {currentSymbol}</h3>
        <p className="text-sm mb-3">Current Price: ${currentPrice?.toFixed(2) || '---'}</p>
        <div className="flex space-x-2">
          <input type="number" min="1" value={qty} onChange={e => setQty(Number(e.target.value))} className="w-24 bg-slate-700 border border-slate-600 rounded px-2" />
          <button onClick={buy} className="flex-1 bg-emerald-600 hover:bg-emerald-700 py-2 rounded font-semibold text-white">Buy</button>
          <button onClick={sell} className="flex-1 bg-rose-600 hover:bg-rose-700 py-2 rounded font-semibold text-white">Sell</button>
        </div>
      </div>

      <h3 className="font-semibold mb-3">Open Positions</h3>
      <div className="space-y-2">
        {positions.length === 0 && <p className="text-slate-500 text-sm">No open positions.</p>}
        {positions.map(p => {
          const pnl = (p.currentPrice - p.entryPrice) * p.qty;
          const pnlPercent = (pnl / (p.entryPrice * p.qty)) * 100;
          return (
            <div key={p.symbol} className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
              <div>
                <p className="font-bold">{p.symbol}</p>
                <p className="text-xs text-slate-400">{p.qty} shares @ ${p.entryPrice.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">${(p.qty * p.currentPrice).toFixed(2)}</p>
                <p className={`text-xs font-semibold ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} ({pnlPercent.toFixed(2)}%)
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  );
};
