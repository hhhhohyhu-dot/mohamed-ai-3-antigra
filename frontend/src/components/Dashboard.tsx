"use client";
import React, { useState, useEffect } from 'react';
import { TradingChart } from './TradingChart';
import { AIChat } from './AIChat';
import { Watchlist } from './Watchlist';
import { Portfolio } from './Portfolio';
import { Alerts } from './Alerts';
import { MarketScanner } from './MarketScanner';
import { AITradingSignal } from './AITradingSignal';
import { TradingPlanCard } from './TradingPlanCard';
import { AIForecastCard } from './AIForecastCard';
import { MacroDashboard } from './MacroDashboard';
import { ProTerminal } from './ProTerminal';
import { OptionsFrameworkCard } from './OptionsFrameworkCard';
import { fetchChart, fetchDashboard, fetchIndicators, fetchNews, fetchSentiment, fetchAnalyze } from '../services/api';
import { Activity, TrendingUp, TrendingDown, MessageSquare, Newspaper, Target, LayoutDashboard, List, Briefcase, Bell, Globe, Monitor } from 'lucide-react';
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
  const [capital, setCapital] = useState<number>(10000);

  const loadData = async (sym: string) => {
    setLoading(true);
    try {
      // Load fast data first (chart, dashboard, indicators, news)
      const [chartRes, dashRes, indRes, newsRes] = await Promise.all([
        fetchChart(sym),
        fetchDashboard(sym),
        fetchIndicators(sym),
        fetchNews(sym),
      ]);

      setChartData(chartRes.data || []);
      setDashboardData(dashRes);
      setIndicators(indRes.indicators);
      setNews(newsRes.news);
      setLoading(false);

      // Load AI data in the background (won't block the UI)
      fetchSentiment(sym)
        .then((sentRes) => setSentiment(sentRes.sentiment))
        .catch(() => setSentiment({ score: 50, label: "Neutral", summary: "Could not load sentiment." }));

      if (indRes.indicators) {
        fetchAnalyze(sym, indRes.indicators, capital)
          .then((analyzeRes) => setAnalysis(analyzeRes.analysis))
          .catch(() => setAnalysis({ signal: "Hold", explanation: "AI analysis timed out. Try again.", plan: null }));
      }

    } catch (error) {
      console.error("Failed to load data", error);
      setLoading(false);
    }
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
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Mohamed Z AI Pro</h1>
              <p className="text-slate-400 mt-1">Professional Trading Platform</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                <span className="pl-3 text-slate-400 font-medium">$</span>
                <input 
                  type="number" 
                  value={capital}
                  onChange={(e) => setCapital(Number(e.target.value))}
                  onKeyDown={(e) => e.key === 'Enter' && loadData(symbol)}
                  className="bg-transparent text-white px-2 py-2 focus:outline-none w-24"
                  placeholder="Capital"
                  title="Total Capital for Position Sizing"
                />
              </div>
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
              { id: 'terminal', icon: <Monitor size={18} className="mr-2"/>, label: 'Pro Terminal' },
              { id: 'dashboard', icon: <LayoutDashboard size={18} className="mr-2"/>, label: 'Dashboard' },
              { id: 'macro', icon: <Globe size={18} className="mr-2"/>, label: 'Macro Agent' },
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

        {activeTab === 'terminal' && <ProTerminal initialSymbol={symbol} />}
        {activeTab === 'macro' && <MacroDashboard />}
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
                      <div className="p-3 bg-slate-800/50 rounded-xl"><p className="text-slate-400 text-xs">Candlestick Pattern</p><p className="font-semibold text-xs">{typeof indicators.Candlestick_Pattern === 'object' ? indicators.Candlestick_Pattern?.name : indicators.Candlestick_Pattern || 'None'}</p></div>
                      <div className="p-3 bg-slate-800/50 rounded-xl"><p className="text-slate-400 text-xs">PA EMA50 Dist (%)</p><p className="font-semibold">{indicators.PA_EMA50_Dist_Pct?.toFixed(2) || 'N/A'}%</p></div>
                      
                      {/* Institutional SMC */}
                      <div className="p-3 bg-indigo-900/30 rounded-xl"><p className="text-indigo-400 text-xs">Order Blocks</p><p className="font-semibold text-xs">{indicators.Bullish_OB ? 'Bullish OB' : indicators.Bearish_OB ? 'Bearish OB' : 'None'}</p></div>
                      <div className="p-3 bg-indigo-900/30 rounded-xl"><p className="text-indigo-400 text-xs">Fair Value Gaps</p><p className="font-semibold text-xs">{indicators.Bullish_FVG ? 'Bullish FVG' : indicators.Bearish_FVG ? 'Bearish FVG' : 'None'}</p></div>
                      <div className="p-3 bg-indigo-900/30 rounded-xl"><p className="text-indigo-400 text-xs">Mitigation/Breaker</p><p className="font-semibold text-xs">{indicators.Breaker_Block ? 'Breaker' : indicators.Mitigation_Block ? 'Mitigation' : 'None'}</p></div>
                      <div className="p-3 bg-indigo-900/30 rounded-xl"><p className="text-indigo-400 text-xs">Market Session</p><p className="font-semibold text-xs">{indicators.London_Session ? 'London' : indicators.NY_Session ? 'New York' : indicators.Asian_Session ? 'Asian' : 'Unknown'}</p></div>

                      <div className="p-3 bg-slate-800/50 rounded-xl col-span-2 md:col-span-2"><p className="text-slate-400 text-xs">ATR Stop Loss (Long/Short)</p><p className="font-semibold text-xs text-blue-400">${indicators.ATR_SL_Long?.toFixed(2) || 'N/A'} / ${indicators.ATR_SL_Short?.toFixed(2) || 'N/A'}</p></div>
                      <div className="p-3 bg-slate-800/50 rounded-xl col-span-2 md:col-span-2"><p className="text-slate-400 text-xs">Multi-Timeframe (Weekly)</p><p className={`font-semibold ${indicators.MTF_Trend_Weekly === 'Bullish' ? 'text-emerald-400' : indicators.MTF_Trend_Weekly === 'Bearish' ? 'text-rose-400' : 'text-slate-300'}`}>{indicators.MTF_Trend_Weekly || 'Unknown'}</p></div>
                    </div>
                  </motion.div>
                )}

                {/* Options Framework Section */}
                {dashboardData && !dashboardData.symbol.includes('=X') && !dashboardData.symbol.includes('-USD') && (
                  <div className="mt-6">
                    <OptionsFrameworkCard symbol={dashboardData.symbol} />
                  </div>
                )}
              </div>

              {/* Right Column: AI Analysis, Chat, News */}
              <div className="space-y-6">
                
                {/* Error State for AI */}
                {analysis && analysis.signal === 'Error' && (
                  <div className="bg-slate-900 rounded-2xl border border-rose-500/50 p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>
                    <h3 className="text-xl font-bold mb-2 flex items-center text-rose-400">
                      <Target className="mr-2" /> AI Analysis Unavailable
                    </h3>
                    <p className="text-slate-400 text-sm">{analysis.explanation}</p>
                    <p className="text-slate-500 text-xs mt-2">Displaying technical indicators normally.</p>
                  </div>
                )}

                {/* Risk Engine Rejection State */}
                {analysis && analysis.signal === 'NO TRADE' && analysis.strict_evaluation && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-slate-900 rounded-2xl border border-orange-500/50 p-6 shadow-xl relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-orange-500"></div>
                    <h3 className="text-xl font-bold mb-2 flex items-center text-orange-400">
                      <Target className="mr-2" /> Trade Rejected by Risk Engine
                    </h3>
                    <p className="text-slate-300 text-sm mb-4">{analysis.explanation}</p>
                    <div className="bg-slate-800/50 p-4 rounded-lg">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Rejection Reasons</p>
                      <ul className="space-y-2">
                        {analysis.strict_evaluation.reasons_for_rejection.map((r: string, i: number) => (
                          <li key={i} className="flex items-start text-sm text-rose-300">
                            <span className="mr-2 mt-0.5 text-rose-500">✗</span> {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}

                {/* AI Forecast Card */}
                {analysis && analysis.forecast && analysis.signal !== 'Error' && analysis.signal !== 'NO TRADE' && (
                  <AIForecastCard forecast={analysis.forecast} />
                )}

                {/* Trading Plan Card */}
                {analysis && analysis.plan && analysis.signal !== 'Error' && analysis.signal !== 'NO TRADE' && (
                  <TradingPlanCard 
                    plan={analysis.plan} 
                    signal={analysis.signal} 
                    explanation={analysis.explanation}
                    institutional_perspective={analysis.institutional_perspective}
                    risk_warning={analysis.risk_warning}
                  />
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
                    {!news && loading && (
                      <p className="text-slate-500 text-sm">Loading latest news...</p>
                    )}
                    {(!news || news.length === 0) && !loading && (
                      <p className="text-slate-500 text-sm">No recent news available.</p>
                    )}
                    {news && news.length > 0 && news.slice(0, 5).map((item: any, i: number) => {
                      // Date Validation
                      let dateStr = "Recent";
                      if (item.providerPublishTime) {
                         const d = new Date(item.providerPublishTime * 1000);
                         if (!isNaN(d.getTime())) dateStr = d.toLocaleString();
                      } else if (item.datetime) {
                         const d = new Date(item.datetime);
                         if (!isNaN(d.getTime())) dateStr = d.toLocaleString();
                      }
                      
                      return (
                      <a key={i} href={item.link || '#'} target="_blank" rel="noreferrer" className="block p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700">
                        <p className="text-sm font-medium line-clamp-2 text-slate-200">{item.title}</p>
                        <p className="text-xs text-slate-500 mt-2">{dateStr}</p>
                      </a>
                    )})}
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
