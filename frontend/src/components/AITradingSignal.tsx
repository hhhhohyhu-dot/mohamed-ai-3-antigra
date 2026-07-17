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

  // 1. Trend (EMA Alignment) - 30%
  const { EMA20, EMA50, EMA100, EMA200, MACD, MACD_signal, Volume_Surge, RSI, ADX, Candlestick_Pattern, Market_Structure } = indicators;
  let trendScore = 0;
  if (currentPrice > EMA20 && EMA20 > EMA50 && EMA50 > EMA100 && EMA100 > EMA200) {
    trendScore = 30;
    reasons.push("✓ Price above all major moving averages (EMA20, 50, 100, 200)");
  } else if (currentPrice > EMA20 && EMA20 > EMA50) {
    trendScore = 20;
    reasons.push("✓ Price above short-term moving averages (EMA20, 50)");
  } else if (currentPrice < EMA20 && EMA20 < EMA50 && EMA50 < EMA100 && EMA100 < EMA200) {
    trendScore = 0;
    reasons.push("✗ Price below all major moving averages (Bearish)");
  } else if (currentPrice < EMA20 && EMA20 < EMA50) {
    trendScore = 5;
    reasons.push("✗ Price below short-term moving averages (Bearish)");
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

  // 3. MACD - 15%
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

  // 4. Volume Confirmation - 15%
  let volScore = 0;
  if (Volume_Surge) {
    volScore = 15;
    reasons.push("✓ Strong volume confirmation");
  } else {
    volScore = 5; // Neutral baseline
    reasons.push("○ Average volume");
  }
  score += volScore;

  // 5. RSI - 10%
  let rsiScore = 0;
  if (RSI >= 40 && RSI <= 70) {
    rsiScore = 10;
    reasons.push("✓ RSI is healthy (" + RSI?.toFixed(2) + ")");
  } else if (RSI > 70) {
    rsiScore = 5;
    reasons.push("! RSI is Overbought (" + RSI?.toFixed(2) + ")");
  } else if (RSI < 30) {
    rsiScore = 5; // Oversold bounce potential, but bearish
    reasons.push("! RSI is Oversold (" + RSI?.toFixed(2) + ")");
  } else {
    rsiScore = 0;
    reasons.push("✗ RSI indicates weakness (" + RSI?.toFixed(2) + ")");
  }
  score += rsiScore;

  // 6. ADX (Trend Strength) - 5%
  let adxScore = 0;
  if (ADX > 25) {
    adxScore = 5;
    reasons.push("✓ ADX confirms strong trend (" + ADX?.toFixed(2) + ")");
  } else {
    adxScore = 0;
    reasons.push("○ ADX indicates weak trend (" + ADX?.toFixed(2) + ")");
  }
  score += adxScore;

  // 7. Candlestick Pattern - 5%
  let candleScore = 0;
  if (Candlestick_Pattern === "Bullish Engulfing" || Candlestick_Pattern === "Hammer") {
    candleScore = 5;
    reasons.push("✓ Bullish Candlestick Pattern (" + Candlestick_Pattern + ")");
  } else if (Candlestick_Pattern === "Bearish Engulfing") {
    candleScore = 0;
    reasons.push("✗ Bearish Candlestick Pattern (" + Candlestick_Pattern + ")");
  } else {
    candleScore = 2.5;
  }
  score += candleScore;

  // Final Signal Determination
  let signalText = "Hold";
  let signalColor = "text-slate-400";
  let signalBg = "bg-slate-500/20";
  let signalBorder = "border-slate-500/30";
  let signalIcon = <HelpCircle className="mr-2 text-slate-400" size={24} />;
  let trendText = "Sideways";
  let riskText = "Medium";
  let recommendation = "";

  if (score >= 90) {
    signalText = "Strong Buy";
    signalColor = "text-emerald-400";
    signalBg = "bg-emerald-500/20";
    signalBorder = "border-emerald-500/30";
    signalIcon = <TrendingUp className="mr-2 text-emerald-400" size={24} />;
    trendText = "Bullish";
    riskText = "Low";
    recommendation = "The asset is trading above all major moving averages with strong momentum, healthy trend strength, and bullish market structure. Buying is highly favored.";
  } else if (score >= 75) {
    signalText = "Buy";
    signalColor = "text-emerald-400";
    signalBg = "bg-emerald-500/20";
    signalBorder = "border-emerald-500/30";
    signalIcon = <TrendingUp className="mr-2 text-emerald-400" size={24} />;
    trendText = "Bullish";
    riskText = "Low to Medium";
    recommendation = "The asset shows positive momentum and favorable technicals. Consider long positions while monitoring key resistance levels.";
  } else if (score >= 55) {
    signalText = "Hold";
    signalColor = "text-yellow-400";
    signalBg = "bg-yellow-500/20";
    signalBorder = "border-yellow-500/30";
    signalIcon = <Activity className="mr-2 text-yellow-400" size={24} />;
    trendText = "Sideways";
    riskText = "Medium";
    recommendation = "Mixed signals are present. The asset is consolidating or experiencing a pullback. Wait for a clearer trend confirmation before entering new positions.";
  } else if (score >= 35) {
    signalText = "Sell";
    signalColor = "text-rose-400";
    signalBg = "bg-rose-500/20";
    signalBorder = "border-rose-500/30";
    signalIcon = <TrendingDown className="mr-2 text-rose-400" size={24} />;
    trendText = "Bearish";
    riskText = "High";
    recommendation = "The asset is showing weakness and trading below key support levels. Selling or shorting is favored. Exercise caution.";
  } else {
    signalText = "Strong Sell";
    signalColor = "text-rose-400";
    signalBg = "bg-rose-500/20";
    signalBorder = "border-rose-500/30";
    signalIcon = <AlertTriangle className="mr-2 text-rose-400" size={24} />;
    trendText = "Bearish";
    riskText = "Very High";
    recommendation = "The asset is in a strong downtrend with negative momentum across multiple indicators. Avoid long positions.";
  }

  // Filter out neutral/mixed reasons to highlight the most important ones if there are too many
  const displayReasons = reasons.filter(r => !r.startsWith("○")).slice(0, 6);
  if (displayReasons.length < 5) {
    const neutrals = reasons.filter(r => r.startsWith("○"));
    displayReasons.push(...neutrals.slice(0, 5 - displayReasons.length));
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl relative overflow-hidden mb-6"
    >
      <div className={`absolute top-0 left-0 w-full h-1 ${signalScoreGradient(score)}`}></div>
      
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        
        {/* Left Side: Signal */}
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-4 flex items-center text-slate-100">
            <ShieldCheck className="mr-2 text-blue-400" /> AI Trading Signal
          </h3>
          <div className="flex items-center space-x-6">
            <div className={`flex items-center px-6 py-3 rounded-xl border ${signalBg} ${signalBorder}`}>
              {signalIcon}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Overall Signal</p>
                <p className={`text-2xl font-bold ${signalColor}`}>{signalText}</p>
              </div>
            </div>
            
            <div className="flex flex-col space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 text-sm w-24">Confidence:</span>
                <span className="font-bold text-white text-lg">{score}%</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 text-sm w-24">AI Score:</span>
                <span className="font-bold text-white text-lg">{score}/100</span>
              </div>
            </div>
            
            <div className="flex flex-col space-y-1 pl-4 border-l border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 text-sm w-20">Trend:</span>
                <span className={`font-semibold ${trendText === 'Bullish' ? 'text-emerald-400' : trendText === 'Bearish' ? 'text-rose-400' : 'text-yellow-400'}`}>{trendText}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 text-sm w-20">Risk Level:</span>
                <span className={`font-semibold ${riskText.includes('High') ? 'text-rose-400' : riskText.includes('Low') ? 'text-emerald-400' : 'text-yellow-400'}`}>{riskText}</span>
              </div>
            </div>
          </div>
          
          <p className="mt-5 text-slate-300 text-sm leading-relaxed border-t border-slate-800 pt-4">
            <span className="font-semibold text-white">Recommendation:</span> {recommendation}
          </p>
        </div>

        {/* Right Side: Reasons */}
        <div className="flex-1 bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 w-full lg:w-auto">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3">Confluence Factors</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {displayReasons.map((reason, idx) => (
              <div key={idx} className="flex items-start text-sm">
                <span className={`mr-2 mt-0.5 ${reason.startsWith('✓') ? 'text-emerald-400' : reason.startsWith('✗') || reason.startsWith('!') ? 'text-rose-400' : 'text-slate-500'}`}>
                  {reason.charAt(0)}
                </span>
                <span className="text-slate-300">{reason.substring(2)}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </motion.div>
  );
};

function signalScoreGradient(score: number) {
  if (score >= 75) return "bg-gradient-to-r from-emerald-500 to-green-400";
  if (score >= 55) return "bg-gradient-to-r from-yellow-500 to-orange-400";
  return "bg-gradient-to-r from-rose-500 to-red-400";
}
