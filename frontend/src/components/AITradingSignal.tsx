import React from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, TrendingDown, Activity, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

interface AITradingSignalProps {
  indicators: any;
  currentPrice: number;
}

export const AITradingSignal: React.FC<AITradingSignalProps> = ({ indicators, currentPrice }) => {
  if (!indicators || !currentPrice) return null;

  let score = 0;
  const reasons: string[] = [];
  const { EMA20, EMA50, EMA100, EMA200, MACD, MACD_signal, Volume_Surge, RSI, ADX, Candlestick_Pattern, Market_Structure } = indicators;

  // 1. Trend (EMA Alignment) - 30%
  let trendScore = 0;
  if (currentPrice > EMA20 && EMA20 > EMA50 && EMA50 > EMA100 && EMA100 > EMA200) {
    trendScore = 30;
    reasons.push("✓ Perfect Bullish EMA Alignment (20 > 50 > 100 > 200)");
  } else if (currentPrice > EMA50 && EMA50 > EMA200) {
    trendScore = 20;
    reasons.push("✓ Price above key EMAs (50, 200) indicating solid uptrend");
  } else if (currentPrice < EMA20 && EMA20 < EMA50 && EMA50 < EMA100 && EMA100 < EMA200) {
    trendScore = 0;
    reasons.push("✗ Perfect Bearish EMA Alignment (20 < 50 < 100 < 200)");
  } else if (currentPrice < EMA50 && EMA50 < EMA200) {
    trendScore = 5;
    reasons.push("✗ Price below key EMAs (50, 200) indicating solid downtrend");
  } else {
    trendScore = 15;
    reasons.push("○ Mixed moving average alignment (Consolidating)");
  }
  score += trendScore;

  // 2. Market Structure - 20%
  let msScore = 0;
  if (Market_Structure === "Bullish (HH/HL)") {
    msScore = 20;
    reasons.push("✓ Bullish Market Structure (Higher Highs, Higher Lows)");
  } else if (Market_Structure === "Bearish (LH/LL)") {
    msScore = 0;
    reasons.push("✗ Bearish Market Structure (Lower Highs, Lower Lows)");
  } else {
    msScore = 10;
    reasons.push("○ Consolidating Market Structure");
  }
  score += msScore;

  // 3. Volume Confirmation - 15%
  let volScore = 0;
  if (Volume_Surge && currentPrice > EMA20) {
    volScore = 15;
    reasons.push("✓ Strong Bullish volume surge detected");
  } else if (Volume_Surge && currentPrice < EMA20) {
    volScore = 0;
    reasons.push("✗ Strong Bearish volume surge detected");
  } else {
    volScore = 7.5;
    reasons.push("○ Average volume");
  }
  score += volScore;

  // 4. MACD - 15%
  let macdScore = 0;
  if (MACD > MACD_signal && MACD > 0) {
    macdScore = 15;
    reasons.push("✓ MACD Bullish Crossover above zero line");
  } else if (MACD > MACD_signal) {
    macdScore = 10;
    reasons.push("✓ MACD Bullish Crossover below zero line (Recovery)");
  } else if (MACD < MACD_signal && MACD > 0) {
    macdScore = 5;
    reasons.push("✗ MACD Bearish Crossover above zero line (Pullback)");
  } else {
    macdScore = 0;
    reasons.push("✗ MACD Bearish Crossover below zero line");
  }
  score += macdScore;

  // 5. RSI - 10%
  let rsiScore = 0;
  if (RSI >= 40 && RSI <= 65) {
    rsiScore = 10;
    reasons.push(`✓ RSI is healthy (${RSI?.toFixed(2)})`);
  } else if (RSI > 65 && RSI < 75) {
    rsiScore = 7;
    reasons.push(`! RSI is approaching overbought (${RSI?.toFixed(2)})`);
  } else if (RSI >= 75) {
    rsiScore = 2; // Overbought, risky to buy
    reasons.push(`✗ RSI is Overbought (${RSI?.toFixed(2)})`);
  } else if (RSI < 30) {
    rsiScore = 8; // Oversold bounce potential
    reasons.push(`! RSI is Oversold (${RSI?.toFixed(2)})`);
  } else {
    rsiScore = 5;
    reasons.push(`○ RSI indicates weakness (${RSI?.toFixed(2)})`);
  }
  score += rsiScore;

  // 6. ADX (Trend Strength) - 5%
  let adxScore = 0;
  if (ADX > 25 && currentPrice > EMA50) {
    adxScore = 5;
    reasons.push(`✓ ADX confirms strong bullish trend (${ADX?.toFixed(2)})`);
  } else if (ADX > 25 && currentPrice < EMA50) {
    adxScore = 0; // Strong bearish trend
    reasons.push(`✗ ADX confirms strong bearish trend (${ADX?.toFixed(2)})`);
  } else {
    adxScore = 2.5;
    reasons.push(`○ ADX shows weak trend (${ADX?.toFixed(2)})`);
  }
  score += adxScore;

  // 7. Candlestick Pattern - 5%
  let candleScore = 0;
  const bullishPatterns = ["Bullish Engulfing", "Hammer", "Morning Star"];
  const bearishPatterns = ["Bearish Engulfing", "Shooting Star", "Evening Star"];
  
  const patternName = typeof Candlestick_Pattern === 'object' ? Candlestick_Pattern?.name : Candlestick_Pattern;

  if (patternName && bullishPatterns.includes(patternName)) {
    candleScore = 5;
    reasons.push(`✓ Bullish Pattern Detected: ${patternName}`);
  } else if (patternName && bearishPatterns.includes(patternName)) {
    candleScore = 0;
    reasons.push(`✗ Bearish Pattern Detected: ${patternName}`);
  } else if (patternName === "Doji") {
    candleScore = 2.5;
    reasons.push("○ Market Indecision: Doji Pattern");
  } else {
    candleScore = 2.5;
  }
  score += candleScore;

  // Hard Cap Logic: If price is significantly below 200 EMA (Long term bearish), cap max score to 60 (Hold)
  if (currentPrice < EMA200 * 0.95 && score > 60) {
    score = 60;
    reasons.push("⚠️ Score capped: Price is heavily below 200 EMA (Macro Bearish)");
  }

  // Determine Signal & Level
  let signal = "Hold";
  let confidence = "Medium";
  let color = "text-yellow-400";
  let Icon = Activity;

  if (score >= 90) {
    signal = "Strong Buy";
    confidence = "Very High";
    color = "text-emerald-400";
    Icon = TrendingUp;
  } else if (score >= 75) {
    signal = "Buy";
    confidence = "High";
    color = "text-green-400";
    Icon = TrendingUp;
  } else if (score >= 55) {
    signal = "Hold";
    confidence = "Medium";
    color = "text-yellow-400";
    Icon = Activity;
  } else if (score >= 35) {
    signal = "Sell";
    confidence = "High";
    color = "text-orange-400";
    Icon = TrendingDown;
  } else {
    signal = "Strong Sell";
    confidence = "Very High";
    color = "text-rose-500";
    Icon = TrendingDown;
  }

  // Dynamic Recommendation Generator
  const generateRecommendation = () => {
    if (signal.includes("Buy")) {
      let rec = `The asset is in a healthy uptrend with a score of ${score}/100. `;
      if (RSI > 65) rec += `However, momentum is nearing overbought levels; consider waiting for a minor pullback toward the EMA20 before entering heavy positions. `;
      else if (Volume_Surge) rec += `The recent volume surge strongly supports continued upward price action. `;
      return rec + `This setup provides a favorable risk-to-reward ratio for long positions.`;
    } else if (signal.includes("Sell")) {
      let rec = `The asset is exhibiting strong bearish signals with a score of ${score}/100. `;
      if (currentPrice < EMA200) rec += `Trading below the 200 EMA indicates macro weakness. `;
      if (MACD < MACD_signal) rec += `Momentum remains negative. `;
      return rec + `Exiting long positions or looking for short entries is recommended until market structure shifts.`;
    } else {
      let rec = `The asset is currently consolidating with mixed signals (Score: ${score}/100). `;
      if (Market_Structure && Market_Structure.includes("Consolidating")) rec += `Price action is trapped in a range without clear directional momentum. `;
      else if (currentPrice < EMA50 && currentPrice > EMA200) rec += `The short-term trend is weak but long-term support holds. `;
      return rec + `Capital preservation is advised. Wait for a definitive breakout or breakdown confirmation before deploying capital.`;
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden relative shadow-lg">
      <div className={`absolute top-0 left-0 w-full h-1 ${signalScoreGradient(score)}`}></div>
      
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Target className="w-6 h-6 text-indigo-400" />
          <h2 className="text-xl font-bold text-white">AI Trading Signal</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Signal Main Box */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 flex flex-col justify-center items-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <p className="text-slate-400 text-xs font-semibold tracking-wider uppercase mb-2">Overall Signal</p>
            <div className="flex items-center gap-3 mb-4">
              <Icon className={`w-10 h-10 ${color}`} />
              <h3 className={`text-4xl font-black ${color} tracking-tight`}>{signal}</h3>
            </div>
            
            <div className="w-full flex justify-between items-center bg-slate-900/80 rounded-lg p-3 text-sm border border-slate-700/50">
              <div className="flex flex-col items-center">
                <span className="text-slate-500 text-xs mb-1">Confidence</span>
                <span className="font-bold text-slate-200">{confidence}</span>
              </div>
              <div className="w-px h-8 bg-slate-700"></div>
              <div className="flex flex-col items-center">
                <span className="text-slate-500 text-xs mb-1">AI Score</span>
                <span className="font-bold text-white">{score.toFixed(1)}/100</span>
              </div>
            </div>
          </div>

          {/* Confluence Factors */}
          <div className="flex flex-col justify-center">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Confluence Factors
            </h4>
            <div className="space-y-3">
              {reasons.map((reason, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className={`text-sm mt-0.5 ${
                    reason.startsWith('✓') ? 'text-emerald-400' : 
                    reason.startsWith('✗') ? 'text-rose-400' : 
                    reason.startsWith('!') ? 'text-orange-400' : 
                    'text-slate-400'
                  }`}>
                    {reason.charAt(0)}
                  </span>
                  <span className="text-sm text-slate-300 leading-tight">
                    {reason.substring(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Recommendation Context */}
        <div className="mt-6 bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 flex gap-3">
          <HelpCircle className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-300 leading-relaxed">
            <span className="font-semibold text-slate-200">Recommendation:</span> {generateRecommendation()}
          </p>
        </div>
      </div>
    </div>
  );
};

function signalScoreGradient(score: number) {
  if (score >= 90) return "bg-gradient-to-r from-emerald-400 to-green-300";
  if (score >= 75) return "bg-gradient-to-r from-emerald-500 to-green-400";
  if (score >= 55) return "bg-gradient-to-r from-yellow-500 to-orange-400";
  if (score >= 35) return "bg-gradient-to-r from-orange-500 to-red-400";
  return "bg-gradient-to-r from-red-600 to-rose-500";
}
