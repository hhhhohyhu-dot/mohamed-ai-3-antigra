import React, { useState, useEffect, useContext } from 'react';
import { TradingChart } from './TradingChart';
import { fetchChart, fetchAnalyze, fetchIndicators, executeTrade, closeTrade, fetchActiveTrades, fetchTradeHistory, API_URL } from '../services/api';
import { Activity, Clock, FileText, Settings, X, TrendingUp, LogOut } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

interface ProTerminalProps {
  initialSymbol?: string;
}

export const ProTerminal: React.FC<ProTerminalProps> = ({ initialSymbol = 'AAPL' }) => {
  const { user, logout } = useContext(AuthContext);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [chartData, setChartData] = useState<any[]>([]);
  const [indicators, setIndicators] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [livePrice, setLivePrice] = useState<number>(0);
  
  // Terminal Bottom Panel State
  const [activeBottomTab, setActiveBottomTab] = useState('trade');
  
  // Paper Trading State
  const [balance, setBalance] = useState(10000.00);
  const [equity, setEquity] = useState(10000.00);
  const [positions, setPositions] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [tradeVolume, setTradeVolume] = useState(1.0);

  const marketWatchList = [
    { sym: 'EURUSD', type: 'Forex' },
    { sym: 'GBPUSD', type: 'Forex' },
    { sym: 'USDJPY', type: 'Forex' },
    { sym: 'AAPL', type: 'Stock' },
    { sym: 'TSLA', type: 'Stock' },
    { sym: 'NVDA', type: 'Stock' },
    { sym: 'BTC-USD', type: 'Crypto' },
    { sym: 'ETH-USD', type: 'Crypto' },
    { sym: 'NQ=F', type: 'Futures' },
    { sym: 'GC=F', type: 'Futures' }
  ];

  const addLog = (msg: string, type: 'info' | 'warning' | 'error' | 'success' = 'info') => {
    setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg, type }, ...prev]);
  };

  useEffect(() => {
    loadData(symbol);
  }, [symbol]);

  const loadData = async (sym: string) => {
    setLoading(true);
    addLog(`Loading data for ${sym}...`, 'info');
    try {
      const [cData, iData] = await Promise.all([
        fetchChart(sym),
        fetchIndicators(sym)
      ]);
      
      const indicatorsData = iData.indicators || null;
      setChartData(cData.data || []);
      setIndicators(indicatorsData);
      
      let aData = null;
      if (indicatorsData) {
        aData = await fetchAnalyze(sym, indicatorsData, balance);
      }
      
      setAnalysis(aData || null);
      addLog(`Data loaded successfully for ${sym}.`, 'success');
      
      if (aData?.signal === 'NO TRADE') {
        addLog(`AI Expert: Trade rejected by Risk Engine for ${sym}.`, 'warning');
      } else if (aData?.signal) {
        addLog(`AI Expert: Signal is ${aData.signal} for ${sym}.`, 'info');
      }
    } catch (e) {
      console.error(e);
      addLog(`Failed to fetch data for ${sym}.`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Determine the WS URL (ws:// or wss://)
    const wsProtocol = API_URL.includes('https') ? 'wss' : 'ws';
    const wsHost = API_URL.replace('http://', '').replace('https://', '').replace('/api', '');
    const wsUrl = `${wsProtocol}://${wsHost}/ws/stream`;
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setWsConnected(true);
      addLog('WebSocket connected for live stream', 'success');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'tick' && message.data[symbol]) {
          const { price } = message.data[symbol];
          setLivePrice(price);
          
          setChartData(prev => {
            if (prev.length === 0) return prev;
            const newData = [...prev];
            newData[newData.length - 1].close = price; // update current candle
            return newData;
          });
        }
      } catch (e) {
        // ignore parse error
      }
    };

    ws.onclose = () => setWsConnected(false);

    return () => ws.close();
  }, [symbol]);

  const loadBackendTrades = async () => {
    try {
      const active = await fetchActiveTrades();
      const hist = await fetchTradeHistory();
      
      // Map backend trades to frontend format
      const formattedActive = active.map((t: any) => ({
        id: t.id,
        time: t.opened_at,
        symbol: t.symbol,
        type: t.type,
        volume: t.volume,
        entryPrice: t.entry_price,
        pnl: t.pnl
      }));
      setPositions(formattedActive);
      
      const formattedHist = hist.map((t: any) => ({
        id: t.id,
        closeTime: t.closed_at,
        symbol: t.symbol,
        type: t.type,
        volume: t.volume,
        entryPrice: t.entry_price,
        closePrice: t.exit_price,
        finalPnl: t.pnl
      }));
      setHistory(formattedHist);
      
    } catch (e) {
      console.error("Failed to load backend trades", e);
    }
  };

  useEffect(() => {
    loadBackendTrades();
  }, []);

  const currentPrice = livePrice || (chartData.length > 0 ? chartData[chartData.length - 1].close : 0);

  const executeTradeAction = async (type: 'BUY' | 'SELL') => {
    if (!currentPrice) return;
    try {
      addLog(`Sending ${type} order to exchange...`, 'info');
      await executeTrade(symbol, type, tradeVolume, currentPrice);
      addLog(`Order executed: ${type} ${tradeVolume} ${symbol} @ ${currentPrice.toFixed(2)}`, 'success');
      loadBackendTrades();
    } catch (e) {
      addLog(`Trade rejected: Server error`, 'error');
    }
  };

  const closePositionAction = async (id: string, entryPrice: number, type: string) => {
    if (!currentPrice) return;
    try {
      addLog(`Closing position #${id}...`, 'info');
      await closeTrade(Number(id), currentPrice);
      addLog(`Closed position #${id} successfully`, 'success');
      loadBackendTrades();
    } catch (e) {
      addLog(`Failed to close position #${id}`, 'error');
    }
  };

  useEffect(() => {
    let floatingPnl = 0;
    positions.forEach(pos => {
      if (pos.symbol === symbol && currentPrice) {
        if (pos.type === 'BUY') floatingPnl += (currentPrice - pos.entryPrice) * pos.volume;
        if (pos.type === 'SELL') floatingPnl += (pos.entryPrice - currentPrice) * pos.volume;
      } else {
         floatingPnl += pos.pnl;
      }
    });
    setEquity(balance + floatingPnl);
  }, [currentPrice, positions, balance, symbol]);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] bg-[#0d1117] text-slate-300 font-sans border border-slate-800 rounded-lg overflow-hidden mt-6">
      
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-2 py-1 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex space-x-4">
          <span className="font-semibold text-white">Pro Terminal</span>
          <span className="text-slate-500 cursor-pointer hover:text-slate-300">File</span>
          <span className="text-slate-500 cursor-pointer hover:text-slate-300">View</span>
          <span className="text-slate-500 cursor-pointer hover:text-slate-300">Insert</span>
          <span className="text-slate-500 cursor-pointer hover:text-slate-300">Charts</span>
          <span className="text-slate-500 cursor-pointer hover:text-slate-300">Tools</span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-emerald-500 font-mono">
            <Activity size={14} className={wsConnected ? 'animate-pulse' : 'text-red-500'} />
            <span className={!wsConnected ? 'text-red-500' : ''}>{wsConnected ? 'Connected: Live' : 'Disconnected'}</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-400 border-l border-slate-700 pl-4">
            <span className="font-medium text-white">{user?.username}</span>
            <button onClick={logout} className="hover:text-red-400 transition-colors" title="Log Out">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Panel: Market Watch */}
        <div className="w-64 flex flex-col border-r border-slate-800 bg-slate-900/50">
          <div className="px-3 py-2 bg-slate-800 text-xs font-bold text-slate-200 border-b border-slate-700 flex justify-between items-center">
            <span>Market Watch</span>
            <Settings size={14} className="text-slate-400 cursor-pointer hover:text-white" />
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-900/80 sticky top-0">
                <tr className="text-left text-slate-500 border-b border-slate-800">
                  <th className="py-2 px-2 font-normal">Symbol</th>
                  <th className="py-2 px-2 font-normal text-right">Bid</th>
                  <th className="py-2 px-2 font-normal text-right">Ask</th>
                </tr>
              </thead>
              <tbody>
                {marketWatchList.map((item, i) => (
                  <tr 
                    key={i} 
                    onClick={() => setSymbol(item.sym)}
                    className={`cursor-pointer border-b border-slate-800/50 hover:bg-blue-600/20 transition-colors ${symbol === item.sym ? 'bg-blue-600/30 text-white' : ''}`}
                  >
                    <td className="py-2 px-2 font-medium">{item.sym}</td>
                    <td className="py-2 px-2 text-right text-red-400">{symbol === item.sym && currentPrice ? (currentPrice * 0.9998).toFixed(2) : '---'}</td>
                    <td className="py-2 px-2 text-right text-blue-400">{symbol === item.sym && currentPrice ? (currentPrice * 1.0002).toFixed(2) : '---'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Center/Right Workspace */}
        <div className="flex-1 flex flex-col relative bg-[#131722]">
          {/* Chart Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-[#1e222d] border-b border-[#2a2e39]">
            <div className="flex items-center space-x-3">
              <span className="text-white font-bold text-sm tracking-wider">{symbol}</span>
              <span className="text-slate-400 text-xs">H1 (Simulated)</span>
              {loading && <span className="text-blue-400 text-xs animate-pulse">Loading data...</span>}
            </div>
          </div>
          
          {/* Chart Area */}
          <div className="flex-1 relative h-full">
            <TradingChart data={chartData} colors={{ backgroundColor: '#131722', textColor: '#d1d5db' }} />
            
            {/* Overlay One-Click Trading Panel */}
            <div className="absolute top-4 left-4 bg-slate-900/90 border border-slate-700 rounded shadow-xl backdrop-blur-md p-3 w-48 z-10">
              <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-2">
                <span className="font-bold text-white text-sm">{symbol}</span>
                <span className="text-xs text-slate-400">Vol:</span>
                <input 
                  type="number" 
                  value={tradeVolume} 
                  onChange={(e) => setTradeVolume(Number(e.target.value))}
                  className="w-12 bg-slate-800 text-white text-xs border border-slate-600 rounded px-1 py-0.5 text-center" 
                  step="0.1" 
                  min="0.01" 
                />
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => executeTradeAction('SELL')}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded text-xs font-bold transition flex flex-col items-center"
                >
                  <span>SELL</span>
                  <span className="font-mono mt-0.5 opacity-80">{currentPrice ? (currentPrice * 0.9998).toFixed(2) : '---'}</span>
                </button>
                <button 
                  onClick={() => executeTradeAction('BUY')}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded text-xs font-bold transition flex flex-col items-center"
                >
                  <span>BUY</span>
                  <span className="font-mono mt-0.5 opacity-80">{currentPrice ? (currentPrice * 1.0002).toFixed(2) : '---'}</span>
                </button>
              </div>
            </div>

            {/* Overlay AI Expert Advisor Panel */}
            <div className="absolute top-4 right-4 bg-slate-900/95 border border-indigo-500/50 rounded-lg shadow-2xl backdrop-blur-md w-72 z-10 overflow-hidden">
              <div className="bg-indigo-600/20 px-3 py-2 border-b border-indigo-500/30 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity size={14} className="text-indigo-400" />
                  <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Expert Advisor AI</span>
                </div>
                <div className={`w-2 h-2 rounded-full ${analysis?.signal === 'Error' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
              </div>
              <div className="p-3">
                {analysis?.signal === 'NO TRADE' ? (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded p-2 mb-2">
                    <p className="text-orange-400 font-bold text-xs mb-1">REJECTED BY RISK ENGINE</p>
                    <ul className="text-[10px] space-y-1 text-slate-300">
                      {analysis?.strict_evaluation?.reasons_for_rejection?.slice(0,3).map((r: string, i: number) => (
                        <li key={i} className="flex"><span className="text-orange-500 mr-1">✗</span>{r}</li>
                      ))}
                    </ul>
                  </div>
                ) : analysis?.signal ? (
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-400">AI Signal:</span>
                    <span className={`text-sm font-bold ${analysis.signal.includes('Buy') ? 'text-emerald-400' : analysis.signal.includes('Sell') ? 'text-rose-400' : 'text-yellow-400'}`}>{analysis.signal}</span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 text-center py-2">Analyzing...</div>
                )}
                
                {indicators && (
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Weekly MTF</span>
                      <span className={`text-xs font-bold ${indicators.MTF_Trend_Weekly === 'Bullish' ? 'text-emerald-400' : 'text-rose-400'}`}>{indicators.MTF_Trend_Weekly || 'Neutral'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Structure</span>
                      <span className="text-xs font-bold text-slate-300">{indicators.Market_Structure?.split(' ')[0] || 'Consolidating'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">FVG / OB</span>
                      <span className="text-[10px] font-bold text-indigo-400">
                        {indicators.Bullish_OB ? 'Bull OB' : indicators.Bearish_OB ? 'Bear OB' : 'None'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Vol Surge</span>
                      <span className="text-xs font-bold text-slate-300">{indicators.Volume_Surge ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Bottom Terminal Panel */}
      <div className="h-48 bg-slate-900 border-t border-slate-800 flex flex-col">
        {/* Terminal Tabs */}
        <div className="flex border-b border-slate-700 bg-slate-800 px-2">
          {[
            { id: 'trade', label: 'Trade', icon: <TrendingUp size={12} className="mr-1" /> },
            { id: 'history', label: 'History', icon: <Clock size={12} className="mr-1" /> },
            { id: 'journal', label: 'Expert Journal', icon: <FileText size={12} className="mr-1" /> }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveBottomTab(tab.id)}
              className={`flex items-center px-4 py-1.5 text-xs font-medium border-b-2 transition-colors ${activeBottomTab === tab.id ? 'border-blue-500 text-white bg-slate-700/50' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Terminal Content */}
        <div className="flex-1 overflow-y-auto">
          {activeBottomTab === 'trade' && (
            <table className="w-full text-xs text-right">
              <thead className="text-slate-500 sticky top-0 bg-slate-900 border-b border-slate-800">
                <tr>
                  <th className="py-1 px-4 text-left font-normal">Order</th>
                  <th className="py-1 px-4 font-normal">Time</th>
                  <th className="py-1 px-4 text-left font-normal">Type</th>
                  <th className="py-1 px-4 font-normal">Size</th>
                  <th className="py-1 px-4 text-left font-normal">Symbol</th>
                  <th className="py-1 px-4 font-normal">Price</th>
                  <th className="py-1 px-4 font-normal">S/L</th>
                  <th className="py-1 px-4 font-normal">T/P</th>
                  <th className="py-1 px-4 font-normal">Profit</th>
                  <th className="py-1 px-4 font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {positions.map(pos => {
                  let pnl = pos.pnl;
                  if (pos.symbol === symbol && currentPrice) {
                    if (pos.type === 'BUY') pnl += (currentPrice - pos.entryPrice) * pos.volume;
                    if (pos.type === 'SELL') pnl += (pos.entryPrice - currentPrice) * pos.volume;
                  }
                  
                  return (
                    <tr key={pos.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="py-1 px-4 text-left font-mono">{pos.id}</td>
                      <td className="py-1 px-4">{pos.time}</td>
                      <td className={`py-1 px-4 text-left font-bold ${pos.type === 'BUY' ? 'text-blue-400' : 'text-red-400'}`}>{pos.type}</td>
                      <td className="py-1 px-4">{pos.volume}</td>
                      <td className="py-1 px-4 text-left font-bold">{pos.symbol}</td>
                      <td className="py-1 px-4 font-mono">{pos.entryPrice.toFixed(2)}</td>
                      <td className="py-1 px-4">0.00</td>
                      <td className="py-1 px-4">0.00</td>
                      <td className={`py-1 px-4 font-mono font-bold ${pnl >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                        {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                      </td>
                      <td className="py-1 px-4">
                        <button onClick={() => closePositionAction(pos.id, pos.entryPrice, pos.type)} className="text-slate-500 hover:text-red-500"><X size={14}/></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {activeBottomTab === 'history' && (
            <table className="w-full text-xs text-right">
              <thead className="text-slate-500 sticky top-0 bg-slate-900 border-b border-slate-800">
                <tr>
                  <th className="py-1 px-4 text-left font-normal">Order</th>
                  <th className="py-1 px-4 font-normal">Close Time</th>
                  <th className="py-1 px-4 text-left font-normal">Type</th>
                  <th className="py-1 px-4 font-normal">Size</th>
                  <th className="py-1 px-4 text-left font-normal">Symbol</th>
                  <th className="py-1 px-4 font-normal">Entry</th>
                  <th className="py-1 px-4 font-normal">Exit</th>
                  <th className="py-1 px-4 font-normal">Profit</th>
                </tr>
              </thead>
              <tbody>
                {history.map(pos => (
                  <tr key={pos.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-1 px-4 text-left font-mono">{pos.id}</td>
                    <td className="py-1 px-4">{pos.closeTime}</td>
                    <td className={`py-1 px-4 text-left font-bold ${pos.type === 'BUY' ? 'text-blue-400' : 'text-red-400'}`}>{pos.type}</td>
                    <td className="py-1 px-4">{pos.volume}</td>
                    <td className="py-1 px-4 text-left font-bold">{pos.symbol}</td>
                    <td className="py-1 px-4 font-mono">{pos.entryPrice.toFixed(2)}</td>
                    <td className="py-1 px-4 font-mono">{pos.closePrice.toFixed(2)}</td>
                    <td className={`py-1 px-4 font-mono font-bold ${pos.finalPnl >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                      {pos.finalPnl >= 0 ? '+' : ''}{pos.finalPnl.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeBottomTab === 'journal' && (
            <div className="font-mono text-[11px] p-2 space-y-1">
              {logs.map((log, i) => (
                <div key={i} className="flex space-x-3 hover:bg-slate-800/30 px-2 py-0.5 rounded">
                  <span className="text-slate-500 w-20 flex-shrink-0">{log.time}</span>
                  <span className={`${
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'warning' ? 'text-orange-400' :
                    log.type === 'success' ? 'text-emerald-400' : 'text-slate-300'
                  }`}>
                    {log.msg}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Terminal Footer (Balance) */}
        {activeBottomTab === 'trade' && (
          <div className="bg-slate-800 px-4 py-1 text-xs border-t border-slate-700 flex space-x-6 font-mono text-slate-300">
            <span>Balance: <span className="font-bold text-white">{balance.toFixed(2)}</span></span>
            <span>Equity: <span className="font-bold text-white">{equity.toFixed(2)}</span></span>
            <span>Margin: <span className="font-bold text-white">0.00</span></span>
            <span>Free Margin: <span className="font-bold text-white">{equity.toFixed(2)}</span></span>
          </div>
        )}
      </div>

    </div>
  );
};
