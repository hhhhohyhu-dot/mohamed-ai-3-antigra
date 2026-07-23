"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, TrendingDown, Activity, ShieldCheck, HelpCircle, Zap, DollarSign, Eye } from 'lucide-react';

interface AITradingSignalProps {
  indicators: any;
  currentPrice: number;
}

export const AITradingSignal: React.FC<AITradingSignalProps> = ({ indicators, currentPrice }) => {
  if (!indicators || !currentPrice) return null;

  let score = 0;
  const reasons: { text: string; pts: number; type: 'bull' | 'bear' | 'neutral' }[] = [];
  
  const {
    EMA20, EMA50, EMA100, EMA200,
    MACD, MACD_signal, MACD_hist,
    Volume_Surge, RSI, ADX, CCI,
    Candlestick_Pattern, Market_Structure,
    Bullish_OB, Bearish_OB, Bullish_FVG, Bearish_FVG,
    Liquidity_Top_Present, Liquidity_Bottom_Present,
    Fib_Proximity, StochRSI_K,
    CMF, CMF_Signal,
    BB_lower, BB_upper,
    MTF_Trend_Weekly, MTF_Trend_Daily,
    Pivot, S1
  } = indicators;

  // ============================================================
  // FACTOR 1: EMA Trend Alignment (0–22 pts)
  // ============================================================
  let trendScore = 0;
  if (currentPrice > EMA20 && EMA20 > EMA50 && EMA50 > EMA100 && EMA100 > EMA200) {
    trendScore = 22;
    reasons.push({ text: 'Perfect Bullish EMA Alignment (20>50>100>200)', pts: 22, type: 'bull' });
  } else if (currentPrice > EMA50 && EMA50 > EMA200) {
    trendScore = 15;
    reasons.push({ text: 'Price above EMA50 & EMA200 — solid uptrend', pts: 15, type: 'bull' });
  } else if (currentPrice < EMA20 && EMA20 < EMA50 && EMA50 < EMA100 && EMA100 < EMA200) {
    trendScore = 0;
    reasons.push({ text: 'Perfect Bearish EMA Alignment (20<50<100<200)', pts: 0, type: 'bear' });
  } else if (currentPrice < EMA50 && EMA50 < EMA200) {
    trendScore = 3;
    reasons.push({ text: 'Price below EMA50 & EMA200 — macro downtrend', pts: 3, type: 'bear' });
  } else {
    trendScore = 11;
    reasons.push({ text: 'Mixed EMA alignment — consolidating', pts: 11, type: 'neutral' });
  }
  score += trendScore;

  // ============================================================
  // FACTOR 2: Market Structure (0–13 pts)
  // ============================================================
  let msScore = 0;
  if (Market_Structure === 'Bullish (HH/HL)') {
    msScore = 13; reasons.push({ text: 'Bullish Market Structure — Higher Highs & Lows', pts: 13, type: 'bull' });
  } else if (Market_Structure === 'Bearish (LH/LL)') {
    msScore = 0; reasons.push({ text: 'Bearish Market Structure — Lower Highs & Lows', pts: 0, type: 'bear' });
  } else {
    msScore = 6; reasons.push({ text: 'Consolidating Market Structure', pts: 6, type: 'neutral' });
  }
  score += msScore;

  // ============================================================
  // FACTOR 3: MACD (0–12 pts)
  // ============================================================
  let macdScore = 0;
  if (MACD > MACD_signal && MACD > 0) {
    macdScore = 12; reasons.push({ text: 'MACD Bullish Crossover above zero line', pts: 12, type: 'bull' });
  } else if (MACD > MACD_signal) {
    macdScore = 8; reasons.push({ text: 'MACD Bullish Crossover (below zero — recovery)', pts: 8, type: 'bull' });
  } else if (MACD < MACD_signal && MACD > 0) {
    macdScore = 4; reasons.push({ text: 'MACD Bearish Cross above zero — pullback risk', pts: 4, type: 'bear' });
  } else {
    macdScore = 0; reasons.push({ text: 'MACD Bearish Crossover below zero line', pts: 0, type: 'bear' });
  }
  score += macdScore;

  // ============================================================
  // FACTOR 4: RSI (0–10 pts)
  // ============================================================
  let rsiScore = 0;
  if (RSI >= 40 && RSI <= 65) {
    rsiScore = 10; reasons.push({ text: `RSI healthy momentum zone (${RSI?.toFixed(1)})`, pts: 10, type: 'bull' });
  } else if (RSI > 65 && RSI < 75) {
    rsiScore = 6; reasons.push({ text: `RSI approaching overbought (${RSI?.toFixed(1)})`, pts: 6, type: 'neutral' });
  } else if (RSI >= 75) {
    rsiScore = 2; reasons.push({ text: `RSI Overbought — reversal risk (${RSI?.toFixed(1)})`, pts: 2, type: 'bear' });
  } else if (RSI < 30) {
    rsiScore = 7; reasons.push({ text: `RSI Oversold — bounce potential (${RSI?.toFixed(1)})`, pts: 7, type: 'bull' });
  } else {
    rsiScore = 4; reasons.push({ text: `RSI below neutral zone (${RSI?.toFixed(1)})`, pts: 4, type: 'bear' });
  }
  score += rsiScore;

  // ============================================================
  // FACTOR 5: Volume Surge (0–8 pts)
  // ============================================================
  let volScore = 0;
  if (Volume_Surge && currentPrice > EMA20) {
    volScore = 8; reasons.push({ text: 'Bullish volume surge confirms upward move', pts: 8, type: 'bull' });
  } else if (Volume_Surge && currentPrice < EMA20) {
    volScore = 0; reasons.push({ text: 'Bearish volume surge confirms downward move', pts: 0, type: 'bear' });
  } else {
    volScore = 4; reasons.push({ text: 'Average volume — no strong conviction', pts: 4, type: 'neutral' });
  }
  score += volScore;

  // ============================================================
  // FACTOR 6: SMC / ICT — Order Blocks & FVG (0–8 pts)
  // ============================================================
  let smcScore = 0;
  if (Bullish_OB || Bullish_FVG) {
    smcScore = 8; reasons.push({ text: `Bullish SMC Confirmation: ${Bullish_OB ? 'OB' : ''} ${Bullish_FVG ? 'FVG' : ''}`.trim(), pts: 8, type: 'bull' });
  } else if (Bearish_OB || Bearish_FVG) {
    smcScore = 0; reasons.push({ text: `Bearish SMC Confirmation: ${Bearish_OB ? 'OB' : ''} ${Bearish_FVG ? 'FVG' : ''}`.trim(), pts: 0, type: 'bear' });
  } else {
    smcScore = 4; reasons.push({ text: 'No active SMC structure detected', pts: 4, type: 'neutral' });
  }
  score += smcScore;

  // ============================================================
  // FACTOR 7: CMF Money Flow (0–5 pts)
  // ============================================================
  let cmfScore = 0;
  if (CMF !== null && CMF !== undefined) {
    if (CMF > 0.05) {
      cmfScore = 5; reasons.push({ text: `CMF Accumulation (${CMF.toFixed(3)})`, pts: 5, type: 'bull' });
    } else if (CMF < -0.05) {
      cmfScore = 0; reasons.push({ text: `CMF Distribution (${CMF.toFixed(3)})`, pts: 0, type: 'bear' });
    } else {
      cmfScore = 2; reasons.push({ text: `CMF Neutral (${CMF.toFixed(3)})`, pts: 2, type: 'neutral' });
    }
  }
  score += cmfScore;

  // ============================================================
  // FACTOR 8: ADX Trend Strength (0–3 pts)
  // ============================================================
  let adxScore = 0;
  if (ADX > 25) {
    adxScore = 3; reasons.push({ text: `ADX confirms trend strength (${ADX?.toFixed(1)})`, pts: 3, type: 'bull' });
  } else {
    adxScore = 1; reasons.push({ text: `ADX indicates weak trend (${ADX?.toFixed(1)})`, pts: 1, type: 'neutral' });
  }
  score += adxScore;

  // ============================================================
  // FACTOR 9: Candlestick Pattern (0–5 pts)
  // ============================================================
  let candleScore = 0;
  const bullishPatterns = ['Bullish Engulfing', 'Hammer', 'Morning Star', 'Bullish Pin Bar', 'Bullish Harami', 'Three White Soldiers', 'Tweezer Bottom', 'Inverted Hammer'];
  const bearishPatterns = ['Bearish Engulfing', 'Shooting Star', 'Evening Star', 'Bearish Pin Bar', 'Bearish Harami', 'Three Black Crows', 'Tweezer Top'];
  const patternName = typeof Candlestick_Pattern === 'object' ? Candlestick_Pattern?.name : Candlestick_Pattern;
  
  if (patternName && bullishPatterns.includes(patternName)) {
    candleScore = 5; reasons.push({ text: `Bullish Pattern: ${patternName}`, pts: 5, type: 'bull' });
  } else if (patternName && bearishPatterns.includes(patternName)) {
  } else {
    candleScore = 2;
  }
  score += candleScore;

  // ============================================================
  // FACTOR 10: Fibonacci Proximity (0–5 pts)
  // ============================================================
  let fibScore = 0;
  if (Fib_Proximity) {
    const goldenLevels = ['0.618', '0.500', '0.382'];
    if (goldenLevels.includes(Fib_Proximity)) {
      fibScore = 5; reasons.push({ text: `Price at key Fibonacci level (${Fib_Proximity}) — high probability zone`, pts: 5, type: 'bull' });
    } else {
      fibScore = 3; reasons.push({ text: `Price near Fibonacci level (${Fib_Proximity})`, pts: 3, type: 'bull' });
    }
  }
  score += fibScore;

  // ============================================================
  // FACTOR 11: Liquidity Sweeps (0–4 pts)
  // ============================================================
  let liqScore = 0;
  if (Liquidity_Bottom_Present && currentPrice > EMA20) {
    liqScore = 4; reasons.push({ text: 'Liquidity bottom swept — smart money reversal signal', pts: 4, type: 'bull' });
  } else if (Liquidity_Top_Present && currentPrice < EMA20) {
    liqScore = 0; reasons.push({ text: 'Liquidity top swept — potential smart money reversal', pts: 0, type: 'bear' });
  } else if (Liquidity_Bottom_Present || Liquidity_Top_Present) {
    liqScore = 2; reasons.push({ text: 'Liquidity level detected nearby', pts: 2, type: 'neutral' });
  }
  score += liqScore;

  // ============================================================
  // FACTOR 12: Stochastic RSI Confirmation (0–3 pts)
  // ============================================================
  let stochScore = 0;
  if (StochRSI_K !== null && StochRSI_K !== undefined) {
    if (StochRSI_K < 20) {
      stochScore = 3; reasons.push({ text: `StochRSI oversold — momentum reversal (${StochRSI_K?.toFixed(1)})`, pts: 3, type: 'bull' });
    } else if (StochRSI_K > 80) {
      stochScore = 0; reasons.push({ text: `StochRSI overbought — momentum exhaustion (${StochRSI_K?.toFixed(1)})`, pts: 0, type: 'bear' });
    } else {
      stochScore = 1;
    }
  }
  score += stochScore;

  // --- Hard cap: If price is significantly below 200 EMA, cap bull scenario ---
  if (EMA200 && currentPrice < EMA200 * 0.95 && score > 55) {
    score = 55;
    reasons.push({ text: '⚠ Score capped: Price far below 200 EMA (macro bearish)', pts: 0, type: 'bear' });
  }

  // Clamp to 100
  score = Math.min(100, Math.max(0, score));

  // --- Determine Signal ---
  let signal = 'Hold';
  let confidence = 'Medium';
  let color = 'text-yellow-400';
  let gradientFrom = 'from-yellow-500';
  let gradientTo = 'to-orange-400';
  let Icon = Activity;

  if (score >= 88) {
    signal = 'Strong Buy'; confidence = 'Very High'; color = 'text-emerald-300';
    gradientFrom = 'from-emerald-400'; gradientTo = 'to-green-300'; Icon = TrendingUp;
  } else if (score >= 72) {
    signal = 'Buy'; confidence = 'High'; color = 'text-emerald-400';
    gradientFrom = 'from-emerald-500'; gradientTo = 'to-green-400'; Icon = TrendingUp;
  } else if (score >= 50) {
    signal = 'Hold'; confidence = 'Medium'; color = 'text-yellow-400';
    gradientFrom = 'from-yellow-500'; gradientTo = 'to-orange-400'; Icon = Activity;
  } else if (score >= 30) {
    signal = 'Sell'; confidence = 'High'; color = 'text-orange-400';
    gradientFrom = 'from-orange-500'; gradientTo = 'to-red-400'; Icon = TrendingDown;
  } else {
    signal = 'Strong Sell'; confidence = 'Very High'; color = 'text-rose-400';
    gradientFrom = 'from-red-600'; gradientTo = 'to-rose-500'; Icon = TrendingDown;
  }

  const bullCount = reasons.filter(r => r.type === 'bull').length;
  const bearCount = reasons.filter(r => r.type === 'bear').length;

  const generateRecommendation = () => {
    const smcInfo = Bullish_OB ? ' Bullish Order Block active adds institutional demand confluence.' : Bearish_OB ? ' Bearish Order Block acting as supply.' : '';
    const cmfInfo = CMF_Signal && CMF_Signal !== 'Neutral' ? ` ${CMF_Signal} detected via CMF.` : '';
    if (signal.includes('Buy')) {
      return `Score ${score}/100 with ${bullCount} bullish confirmations. ${cmfInfo}${smcInfo} Risk is favorable — focus on managing position sizing strictly.`;
    } else if (signal.includes('Sell')) {
      return `Score ${score}/100 with ${bearCount} bearish signals. ${cmfInfo}${smcInfo} Exit longs or look for short setups until structure shifts bullish.`;
    } else {
      return `Score ${score}/100 — ${bullCount} bullish vs ${bearCount} bearish factors. Mixed signals suggest waiting for a definitive break with volume before committing capital.`;
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden relative shadow-lg">
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${gradientFrom} ${gradientTo}`} />
      
      <div className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <Target className="w-6 h-6 text-indigo-400" />
          <h2 className="text-xl font-bold text-white">AI Trading Signal</h2>
          <span className="ml-auto text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">12 factors</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
          {/* Main Signal Box */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 flex flex-col justify-center items-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <p className="text-slate-400 text-xs font-semibold tracking-wider uppercase mb-2">Overall Signal</p>
            <div className="flex items-center gap-3 mb-4">
              <Icon className={`w-10 h-10 ${color}`} />
              <h3 className={`text-4xl font-black ${color} tracking-tight`}>{signal}</h3>
            </div>
            <div className="w-full flex justify-between items-center bg-slate-900/80 rounded-lg p-3 text-sm border border-slate-700/50 mb-3">
              <div className="flex flex-col items-center">
                <span className="text-slate-500 text-xs mb-1">Confidence</span>
                <span className="font-bold text-slate-200">{confidence}</span>
              </div>
              <div className="w-px h-8 bg-slate-700" />
              <div className="flex flex-col items-center">
                <span className="text-slate-500 text-xs mb-1">AI Score</span>
                <span className="font-bold text-white">{score.toFixed(0)}/100</span>
              </div>
              <div className="w-px h-8 bg-slate-700" />
              <div className="flex flex-col items-center">
                <span className="text-slate-500 text-xs mb-1">Factors</span>
                <span className="text-emerald-400 text-xs font-semibold">{bullCount}✓</span>
              </div>
            </div>
            {/* Score progress bar */}
            <div className="w-full bg-slate-700 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full bg-gradient-to-r ${gradientFrom} ${gradientTo} transition-all duration-700`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>

          {/* Confluence Factors */}
          <div className="flex flex-col justify-center">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Confluence Factors
            </h4>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {reasons.map((reason, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className={`text-sm mt-0.5 flex-shrink-0 ${
                    reason.type === 'bull' ? 'text-emerald-400' :
                    reason.type === 'bear' ? 'text-rose-400' :
                    'text-slate-500'
                  }`}>
                    {reason.type === 'bull' ? '✓' : reason.type === 'bear' ? '✗' : '○'}
                  </span>
                  <span className="text-xs text-slate-300 leading-tight">{reason.text}</span>
                  <span className={`ml-auto text-xs font-bold flex-shrink-0 ${
                    reason.type === 'bull' ? 'text-emerald-500' :
                    reason.type === 'bear' ? 'text-rose-500' :
                    'text-slate-500'
                  }`}>+{reason.pts}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Recommendation */}
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 flex gap-3">
          <HelpCircle className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-300 leading-relaxed">
            <span className="font-semibold text-slate-200">AI Recommendation: </span>
            {generateRecommendation()}
          </p>
        </div>
      </div>
    </div>
  );
};
