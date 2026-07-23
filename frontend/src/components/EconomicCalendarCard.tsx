import React, { useState, useEffect } from 'react';
import { Calendar, AlertTriangle, Clock, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchCalendar as apiFetchCalendar } from '../services/api';

interface EconomicEvent {
  title: string;
  currency: string;
  impact: 'High' | 'Medium' | 'Low';
  date: string;
  forecast: string;
  previous: string;
  actual: string;
  time_to_event_mins: number;
  is_upcoming: boolean;
}

export const EconomicCalendarCard: React.FC = () => {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const loadCalendar = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await apiFetchCalendar();
      if (data.status === 'success') {
        setEvents(data.events);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendar();
    // Refresh every 2 minutes
    const interval = setInterval(loadCalendar, 120000);
    return () => clearInterval(interval);
  }, []);

  // Check if there is any High impact event within 2 hours (120 mins)
  const activeWarningEvent = events.find(
    (e) => e.impact === 'High' && e.time_to_event_mins > 0 && e.time_to_event_mins <= 120
  );

  const getImpactBadge = (impact: string) => {
    if (impact === 'High') {
      return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">High</span>;
    }
    return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Medium</span>;
  };

  const getRemainingTimeText = (mins: number) => {
    if (mins < 0) {
      const hoursAgo = Math.abs(mins) / 60.0;
      if (hoursAgo < 1) {
        return `${Math.round(Math.abs(mins))}m ago`;
      }
      return `${hoursAgo.toFixed(1)}h ago`;
    }
    if (mins < 60) {
      return `In ${Math.round(mins)}m`;
    }
    return `In ${(mins / 60.0).toFixed(1)}h`;
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-indigo-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Economic Calendar Alerts</h2>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={loadCalendar} 
            className={`p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors ${loading ? 'animate-spin' : ''}`}
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setCollapsed(!collapsed)} 
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {/* Warning Alert Banner */}
            {activeWarningEvent && (
              <div className="bg-rose-500/10 border-b border-rose-500/20 p-4 flex gap-3 items-start animate-pulse">
                <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">HIGH IMPACT NEWS AHEAD</h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    <span className="font-bold text-white">{activeWarningEvent.currency} {activeWarningEvent.title}</span> is scheduled in {Math.round(activeWarningEvent.time_to_event_mins)} minutes. Anticipate increased spreads and volatility. Adjust position sizes.
                  </p>
                </div>
              </div>
            )}

            <div className="p-4">
              {loading && events.length === 0 ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                </div>
              ) : error ? (
                <p className="text-center text-xs text-slate-500 py-4">Failed to load economic events.</p>
              ) : events.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-4">No upcoming economic events.</p>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {events.map((event, idx) => {
                    const isClosingIn = event.impact === 'High' && event.time_to_event_mins > 0 && event.time_to_event_mins <= 120;
                    return (
                      <div 
                        key={idx} 
                        className={`flex flex-col md:flex-row justify-between p-3 rounded-lg border transition-all ${
                          isClosingIn 
                            ? 'bg-rose-500/5 border-rose-500/30' 
                            : 'bg-slate-800/30 border-slate-800/80 hover:border-slate-700/80'
                        }`}
                      >
                        {/* Event Left: Currency & Title & Impact */}
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center justify-center bg-slate-800 border border-slate-700 font-mono font-black text-xs px-2 py-1 rounded min-w-[50px] text-slate-300">
                            {event.currency}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-200 leading-snug">{event.title}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              {getImpactBadge(event.impact)}
                              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {getRemainingTimeText(event.time_to_event_mins)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Event Right: Actual vs Forecast vs Previous */}
                        <div className="flex items-center gap-4 mt-3 md:mt-0 justify-end md:justify-start">
                          <div className="text-right">
                            <span className="block text-[9px] text-slate-500 uppercase tracking-wide">Actual</span>
                            <span className={`text-xs font-mono font-bold ${
                              event.actual === 'N/A' 
                                ? 'text-slate-400' 
                                : 'text-slate-200'
                            }`}>{event.actual}</span>
                          </div>
                          <div className="text-right border-l border-slate-800 pl-3">
                            <span className="block text-[9px] text-slate-500 uppercase tracking-wide">Forecast</span>
                            <span className="text-xs font-mono text-slate-400 font-semibold">{event.forecast}</span>
                          </div>
                          <div className="text-right border-l border-slate-800 pl-3">
                            <span className="block text-[9px] text-slate-500 uppercase tracking-wide">Previous</span>
                            <span className="text-xs font-mono text-slate-400 font-semibold">{event.previous}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
