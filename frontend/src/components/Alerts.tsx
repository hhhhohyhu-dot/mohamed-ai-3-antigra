"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Bell } from 'lucide-react';

interface Alert {
  id: number;
  symbol: string;
  price: number;
  condition: 'above' | 'below';
  active: boolean;
}

export const Alerts = ({ currentSymbol, currentPrice }: { currentSymbol: string, currentPrice: number }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [price, setPrice] = useState(0);
  const [condition, setCondition] = useState<'above' | 'below'>('above');

  useEffect(() => {
    if (currentPrice && price === 0) setPrice(currentPrice);
  }, [currentPrice]);

  useEffect(() => {
    const saved = localStorage.getItem('alerts');
    if (saved) setAlerts(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('alerts', JSON.stringify(alerts));
  }, [alerts]);

  const addAlert = () => {
    setAlerts([...alerts, { id: Date.now(), symbol: currentSymbol, price, condition, active: true }]);
  };

  const removeAlert = (id: number) => {
    setAlerts(alerts.filter(a => a.id !== id));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl">
      <h2 className="text-2xl font-bold mb-6 flex items-center"><Bell className="mr-2 text-yellow-400" /> Price Alerts</h2>
      
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mb-6">
        <h3 className="font-semibold mb-3">Add Alert for {currentSymbol}</h3>
        <div className="flex space-x-2">
          <select value={condition} onChange={(e) => setCondition(e.target.value as any)} className="bg-slate-700 text-white rounded px-2 focus:outline-none">
            <option value="above">Crosses Above</option>
            <option value="below">Crosses Below</option>
          </select>
          <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 text-white" />
          <button onClick={addAlert} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold text-white">Add</button>
        </div>
      </div>

      <div className="space-y-2">
        {alerts.length === 0 && <p className="text-slate-500 text-sm">No alerts set.</p>}
        {alerts.map(a => (
          <div key={a.id} className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
            <div>
              <p className="font-bold">{a.symbol}</p>
              <p className="text-sm text-slate-400">If price {a.condition} ${a.price}</p>
            </div>
            <button onClick={() => removeAlert(a.id)} className="text-slate-500 hover:text-rose-400"><Trash2 size={18} /></button>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
