"use client";
import React, { useState } from 'react';
import { fetchChat } from '../services/api';
import { Send, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

export const AIChat = ({ symbol, context }: { 
  symbol: string; 
  context: {
    price?: number;
    indicators?: any;
    trade_plan?: any;
    signal?: string;
    risk_engine_result?: any;
    mtf?: any;
  };
}) => {
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const SUGGESTIONS = [
    "Should I buy now?",
    "What's the best entry price?",
    "Explain the current trade plan",
    "What are key Support & Resistance levels?",
    "How does the MTF analysis affect this setup?",
    "What's the Risk/Reward on this trade?",
    "Is the trend aligned across timeframes?",
    "Explain why the Risk Engine rejected the trade",
  ];

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    const userMsg = text;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetchChat(symbol, userMsg, context);
      setMessages(prev => [...prev, { role: 'ai', content: res.response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Error communicating with AI.' }]);
    }
    setLoading(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl flex flex-col h-[550px]"
    >
      <h3 className="text-xl font-bold mb-4 flex items-center">
        <MessageSquare className="mr-2 text-blue-400" /> Ask AI about {symbol}
      </h3>
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="w-12 h-12 text-slate-700 mb-4" />
            <p className="text-slate-400 text-sm mb-6">Ask a question or select a suggestion below.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`p-3 rounded-lg max-w-[85%] ${msg.role === 'user' ? 'bg-blue-600 ml-auto' : 'bg-slate-800 mr-auto'}`}>
            <p className="text-sm text-slate-100 whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
        {loading && <div className="text-slate-500 text-sm animate-pulse">AI is analyzing...</div>}
      </div>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {SUGGESTIONS.map((sug, i) => (
            <button
              key={i}
              onClick={() => handleSend(sug)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-full border border-slate-700 transition-colors"
            >
              {sug}
            </button>
          ))}
        </div>
      )}

      <div className="flex space-x-2">
        <input 
          type="text" 
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
          placeholder={`Ask about ${symbol}...`}
          disabled={loading}
        />
        <button 
          className={`bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => handleSend(input)}
          disabled={loading}
        >
          <Send size={20} />
        </button>
      </div>
    </motion.div>
  );
};
