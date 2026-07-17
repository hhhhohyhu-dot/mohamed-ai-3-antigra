"use client";
import React, { useState, useEffect } from 'react';
import { TradingChart } from './TradingChart';
import { AIChat } from './AIChat';
import { Watchlist } from './Watchlist';
import { Portfolio } from './Portfolio';
import { Alerts } from './Alerts';
import { MarketScanner } from './MarketScanner';
import { AITradingSignal } from './AITradingSignal';
import { fetchChart, fetchDashboard, fetchIndicators, fetchNews, fetchSentiment, fetchAnalyze } from '../services/api';
import { Activity, TrendingUp, TrendingDown, MessageSquare, Newspaper, Target, LayoutDashboard, List, Briefcase, Bell } from 'lucide-react';
import { motion } from 'framer-motion';

export const Dashboard = () => {
  const [symbol, setSymbol] = useState('AAPL');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [chartData, setChartData] = useState([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [indicators, setIndicators] = useState<any>(null);
  const [news, setNews] = useState<any>(null);
  const [sentiment, setSentiment] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async (sym: string) => {
    setLoading(true);
    try {
      const [chartRes, dashRes, indRes, newsRes, sentRes] = await Promise.all([
        fetchChart(sym),
        fetchDashboard(sym),
        fetchIndicators(sym),
        fetchNews(sym),
        fetchSentiment(sym)
      ]);

      setChartData(chartRes.data || []);
      setDashboardData(dashRes);
      setIndicators(indRes.indicators);
      setNews(newsRes.news);
      setSentiment(sentRes.sentiment);

      if (indRes.indicators) {
        const analyzeRes = await fetchAnalyze(sym, indRes.indicators);
        setAnalysis(analyzeRes.analysis);
      }

    } catch (error) {
      console.error("Failed to load data", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData(symbol);
  }, [symbol]);

  const handleSelectSymbol = (sym: string) => {
    setSymbol(sym);
    setActiveTab('dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header & Navigation */}
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Mohamed Z AI</h1>
              <p className="text-slate-400 mt-1">Professional Trading Platform</p>
            </div>
            <div className="flex items-center space-x-4">
              <input 
                type="text" 
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && loadData(symbol)}
                className="bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase w-32"
                placeholder="SYMBOL"
              />
              <button 
                onClick={() => loadData(symbol)}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Analyze
              </button>
            </div>
          </div>
          
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {[
              { id: 'dashboard', icon: <LayoutDashboard size={18} className="mr-2"/>, label: 'Dashboard' },
              { id: 'scanner', icon: <Activity size={18} className="mr-2"/>, label: 'Market Scanner' },
              { id: 'watchlist', icon: <List size={18} className="mr-2"/>, label: 'Watchlist' },
              { id: 'portfolio', icon: <Briefcase size={18} className="mr-2"/>, label: 'Portfolio' },
              { id: 'alerts', icon: <Bell size={18} className="mr-2"/>, label: 'Alerts' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'scanner' && <MarketScanner onSelectSymbol={handleSelectSymbol} />}
        {activeTab === 'watchlist' && <Watchlist onSelectSymbol={handleSelectSymbol} />}
        {activeTab === 'portfolio' && <Portfolio currentSymbol={symbol} currentPrice={dashboardData?.price || 0} />}
        {activeTab === 'alerts' && <Alerts currentSymbol={symbol} currentPrice={dashboardData?.price || 0} />}

        {activeTab === 'dashboard' && (
          loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-6">
              <AITradingSignal indicators={indicators} currentPrice={dashboardData?.price} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Chart & Indicators */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Chart Card */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl"
                >
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-2xl font-bold">{symbol}</h2>
                      {dashboardData && (
                        <div className="flex items-center space-x-3 mt-2">
                          <span className="text-3xl font-semibold">${dashboardData.price?.toFixed(2)}</span>
                          <span className={`flex items-center ${dashboardData.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {dashboardData.change >= 0 ? <TrendingUp size={20} className="mr-1"/> : <TrendingDown size={20} className="mr-1"/>}
                            {dashboardData.change?.toFixed(2)} ({dashboardData.change_percent?.toFixed(2)}%)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="w-full h-[400px]">
                    <TradingChart data={chartData} />
                  </div>
                </motion.div>

                {/* Comprehensive Indicators Panel */}
                {indicators && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl"
                  >
                    <h3 className="text-xl font-bold mb-4">Technical Indicators</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Standard Indicators */}
                      <div className="p-3 bg-slate-800/50 rounded-xl"><p className="text-slate-400 text-xs">RSI</p><p className={`font-semibold ${(indicators.RSI || 50) > 70 ? 'text-rose-400' : (indicators.RSI || 50) < 30 ? 'text-emerald-400' : 'text-white'}`}>{indicators.RSI?.toFixed(2) || 'N/A'}</p></div>
                      <div className="p-3 bg-slate-800/50 rounded-xl"><p className="text-slate-400 text-xs">MACD</p><p className="font-semibold">{indicators.MACD?.toFixed(2) || 'N/A'}</p></div>
                      <div className="p-3 bg-slate-800/50 rounded-xl"><p className="text-slate-400 text-xs">ATR</p><p className="font-semibold">{indicators.ATR?.toFixed(2) || 'N/A'}</p></div>
                      <div className="p-3 bg-slate-800/50 rounded-xl"><p className="text-slate-400 text-xs">ADX (Trend)</p><p className="font-semibold">{indicators.ADX?.toFixed(2) || 'N/A'} ({indicators.Trend_Strength})</p></div>
                      
                      {/* EMAs */}
                      <div className="p-3 bg-slate-800/50 rounded-xl"><p className="text-slate-400 text-xs text-blue-400">EMA 20</p><p className="font-semibold">{indicators.EMA20?.toFixed(2) || 'N/A'}</p></div>
                      <div className="p-3 bg-slate-800/50 rounded-xl"><p className="text-slate-400 text-xs text-yellow-500">EMA 50</p><p className="font-semibold">{indicators.EMA50?.toFixed(2) || 'N/A'}</p></div>
                      <div className="p-3 bg-slate-800/50 rounded-xl"><p className="text-slate-400 text-xs text-orange-500">EMA 100</p><p className="font-semibold">{indicators.EMA100?.toFixed(2) || 'N/A'}</p></div>
                      <div className="p-3 bg-slate-800/50 rounded-xl"><p className="text-slate-400 text-xs text-red-500">EMA 200</p><p className="font-semibold">{indicators.EMA200?.toFixed(2) || 'N/A'}</p></div>

                      {/* Advanced */}
                      <div className="p-3 bg-slate-800/50 rounded-xl"><p className="text-slate-400 text-xs">Stoch RSI (K/D)</p><p className="font-semibold">{indicators.StochRSI_K?.toFixed(2) || '-'} / {indicators.StochRSI_D?.toFixed(2) || '-'}</p></div>
                      <div className="p-3 bg-slate-800/50 rounded-xl"><p className="text-slate-400 text-xs">CCI</p><p className="font-semibold">{indicators.CCI?.toFixed(2) || 'N/A'}</p></div>
                      <div className="p-3 bg-slate-800/50 rounded-xl"><p className="text-slate-400 text-xs">VWAP</p><p className="font-semibold text-purple-400">{indicators.VWAP?.toFixed(2) || 'N/A'}</p></div>
                      <div className="p-3 bg-slate-800/50 rounded-xl"><p className="text-slate-400 text-xs">OBV</p><p className="font-semibold">{indicators.OBV ? (indicators.OBV / 1e6).toFixed(2) + 'M' : 'N/A'}</p></div>
                      
                      {/* Bands & Levels */}
                      <div className="p-3 bg-slate-800/50 rounded-xl"><p className="text-slate-400 text-xs">Bollinger Bands</p><p className="font-semibold text-xs">{indicators.BB_lower?.toFixed(2)} - {indicators.BB_upper?.toFixed(2)}</p></div>
                      
                      {/* Levels */}
                      <div className="p-3 bg-slate-800/50 rounded-xl"><p className="text-slate-400 text-xs">Support</p><p className="font-semibold text-emerald-400">{indicators.Support?.toFixed(2) || 'N/A'}</p></div>
                      <div className="p-3 bg-slate-800/50 rounded-xl"><p className="text-slate-400 text-xs">Resistance</p><p className="font-semibold text-rose-400">{indicators.Resistance?.toFixed(2) || 'N/A'}</p></div>
                      <div className="p-3 bg-slate-800/50 rounded-xl"><p className="text-slate-400 text-xs">Pivot / R1 / S1</p><p className="font-semibold text-xs">{indicators.Pivot?.toFixed(2)} / {indicators.R1?.toFixed(2)} / {indicators.S1?.toFixed(2)}</p></div>
                      <div className="p-3 bg-slate-800/50 rounded-xl"><p className="text-slate-400 text-xs">Volatility</p><p className="font-semibold">{indicators.Volatility?.toFixed(2) || 'N/A'}%</p></div>

                      {/* Advanced Confirmations */}
                      <div className="p-3 bg-slate-800/50 rounded-xl"><p className="text-slate-400 text-xs">Market Structure</p><p className="font-semibold text-xs">{indicators.Market_Structure || 'N/A'}</p></div>
                      <div className="p-3 bg-slate-800/50 rounded-xl"><p className="text-slate-400 text-xs">Volume Surge</p><p className="font-semibold">{indicators.Volume_Surge ? 'Yes' : 'No'}</p></div>
                      <div className="p-3 bg-slate-800/50 rounded-xl"><p className="text-slate-400 text-xs">Candlestick Pattern</p><p className="font-semibold text-xs">{indicators.Candlestick_Pattern || 'None'}</p></div>
                      <div className="p-3 bg-slate-800/50 rounded-xl"><p className="text-slate-400 text-xs">PA EMA50 Dist (%)</p><p className="font-semibold">{indicators.PA_EMA50_Dist_Pct?.toFixed(2) || 'N/A'}%</p></div>
                      <div className="p-3 bg-slate-800/50 rounded-xl col-span-2 md:col-span-2"><p className="text-slate-400 text-xs">ATR Stop Loss (Long/Short)</p><p className="font-semibold text-xs text-blue-400">${indicators.ATR_SL_Long?.toFixed(2) || 'N/A'} / ${indicators.ATR_SL_Short?.toFixed(2) || 'N/A'}</p></div>
                      <div className="p-3 bg-slate-800/50 rounded-xl col-span-2 md:col-span-2"><p className="text-slate-400 text-xs">Multi-Timeframe (Weekly)</p><p className={`font-semibold ${indicators.MTF_Trend_Weekly === 'Bullish' ? 'text-emerald-400' : indicators.MTF_Trend_Weekly === 'Bearish' ? 'text-rose-400' : 'text-slate-300'}`}>{indicators.MTF_Trend_Weekly || 'Unknown'}</p></div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Right Column: AI Analysis, Chat, News */}
              <div className="space-y-6">
                
                {/* AI Trading Plan */}
                {analysis && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                    <h3 className="text-xl font-bold mb-4 flex items-center">
                      <Target className="mr-2 text-blue-400" /> AI Trading Plan
                    </h3>
                    
                    <div className="mb-6 flex justify-between items-center p-4 bg-slate-800/80 rounded-xl border border-slate-700/50">
                      <span className="text-slate-300">Action</span>
                      <span className={`px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider ${
                        analysis.signal === 'Buy' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 
                        analysis.signal === 'Sell' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 
                        'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                      }`}>
                        {analysis.signal}
                      </span>
                    </div>

                    <p className="text-slate-300 text-sm leading-relaxed mb-6 italic">
                      "{analysis.explanation}"
                    </p>

                    {analysis.plan && (
                      <div className="space-y-3">
                        <div className="flex justify-between p-2 rounded bg-slate-800/30">
                          <span className="text-slate-400">Entry</span>
                          <span className="font-medium">${analysis.plan.entry}</span>
                        </div>
                        <div className="flex justify-between p-2 rounded bg-slate-800/30">
                          <span className="text-slate-400">Stop Loss</span>
                          <span className="font-medium text-rose-400">${analysis.plan.sl}</span>
                        </div>
                        <div className="flex justify-between p-2 rounded bg-slate-800/30">
                          <span className="text-slate-400">Take Profit 1</span>
                          <span className="font-medium text-emerald-400">${analysis.plan.tp1}</span>
                        </div>
                        <div className="flex justify-between p-2 rounded bg-slate-800/30">
                          <span className="text-slate-400">Take Profit 2</span>
                          <span className="font-medium text-emerald-400">${analysis.plan.tp2}</span>
                        </div>
                        <div className="flex justify-between p-2 rounded bg-slate-800/30">
                          <span className="text-slate-400">Take Profit 3</span>
                          <span className="font-medium text-emerald-400">${analysis.plan.tp3}</span>
                        </div>
                        <div className="flex justify-between p-2 rounded bg-slate-800/30">
                          <span className="text-slate-400">Risk/Reward</span>
                          <span className="font-medium text-blue-400">{analysis.plan.risk_reward}</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* AI Chat component */}
                {indicators && (
                  <AIChat symbol={symbol} context={{ price: dashboardData?.price, indicators }} />
                )}

                {/* Sentiment & News */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl"
                >
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <MessageSquare className="mr-2 text-purple-400" /> Market Sentiment
                  </h3>
                  
                  {sentiment && (
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-400">AI Sentiment Score</span>
                        <span className={`font-bold ${
                          sentiment.score > 60 ? 'text-emerald-400' : 
                          sentiment.score < 40 ? 'text-rose-400' : 'text-slate-300'
                        }`}>{sentiment.score}/100</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            sentiment.score > 60 ? 'bg-emerald-500' : 
                            sentiment.score < 40 ? 'bg-rose-500' : 'bg-slate-500'
                          }`} 
                          style={{ width: `${sentiment.score}%` }}
                        ></div>
                      </div>
                      <p className="mt-4 text-sm text-slate-300 italic">"{sentiment.summary}"</p>
                    </div>
                  )}
                  
                  <h4 className="font-semibold text-slate-300 mb-3 flex items-center mt-6 border-t border-slate-800 pt-4">
                    <Newspaper className="mr-2 text-slate-400" size={16} /> Latest News
                  </h4>
                  <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                    {news && news.slice(0, 5).map((item: any, i: number) => (
                      <a key={i} href={item.link} target="_blank" rel="noreferrer" className="block p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors">
                        <p className="text-sm font-medium line-clamp-2">{item.title}</p>
                        <p className="text-xs text-slate-500 mt-2">{new Date(item.providerPublishTime * 1000).toLocaleString()}</p>
                      </a>
                    ))}
                  </div>
                </motion.div>

              </div>
            </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};
