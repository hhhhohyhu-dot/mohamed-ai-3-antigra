import React from 'react';
import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface AIForecastProps {
  forecast: {
    tomorrow: { trend: string; confidence: number };
    week: { trend: string; confidence: number };
    month: { trend: string; confidence: number };
  };
}

export const AIForecastCard: React.FC<AIForecastProps> = ({ forecast }) => {
  if (!forecast) return null;

  const renderForecastBox = (title: string, data: { trend: string; confidence: number }) => {
    let color = "text-slate-400";
    let bg = "bg-slate-800/50 border-slate-700/50";
    let Icon = Minus;

    if (data?.trend?.toLowerCase() === "bullish") {
      color = "text-emerald-400";
      bg = "bg-emerald-500/10 border-emerald-500/20";
      Icon = TrendingUp;
    } else if (data?.trend?.toLowerCase() === "bearish") {
      color = "text-rose-400";
      bg = "bg-rose-500/10 border-rose-500/20";
      Icon = TrendingDown;
    }

    return (
      <div className={`rounded-xl p-4 border ${bg} flex flex-col items-center justify-center relative overflow-hidden`}>
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">{title}</p>
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`w-5 h-5 ${color}`} />
          <span className={`text-lg font-bold ${color}`}>{data.trend}</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">Confidence: {data.confidence}%</p>
      </div>
    );
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg mt-6">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-bold text-white">AI Price Forecast</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderForecastBox("Tomorrow", forecast.tomorrow || { trend: "Neutral", confidence: 50 })}
          {renderForecastBox("1 Week", forecast.week || { trend: "Neutral", confidence: 50 })}
          {renderForecastBox("1 Month", forecast.month || { trend: "Neutral", confidence: 50 })}
        </div>
      </div>
    </div>
  );
};
