"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Newspaper, TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';

interface ArticleData {
  title: string;
  link?: string;
  providerPublishTime?: number;
  datetime?: string;
  score?: number;
  label?: 'Bullish' | 'Bearish' | 'Neutral';
  reason?: string;
}

interface SentimentData {
  score?: number;
  label?: string;
  summary?: string;
  articles?: ArticleData[];
}

interface AINewsScorerProps {
  sentimentData?: SentimentData | null;
  sentiment?: SentimentData | null;
  loading?: boolean;
}

const SentimentBadge = ({ label, score }: { label?: string; score?: number }) => {
  const l = label?.toLowerCase();
  if (l === 'bullish') {
    return (
      <span className="flex items-center gap-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
        <TrendingUp className="w-3 h-3" /> Bullish {score !== undefined && <span className="opacity-70">·{score}</span>}
      </span>
    );
  }
  if (l === 'bearish') {
    return (
      <span className="flex items-center gap-1 bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
        <TrendingDown className="w-3 h-3" /> Bearish {score !== undefined && <span className="opacity-70">·{score}</span>}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 bg-slate-700/50 text-slate-400 border border-slate-600/50 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap">
      <Minus className="w-3 h-3" /> Neutral {score !== undefined && <span className="opacity-70">·{score}</span>}
    </span>
  );
};

const ScoreBar = ({ score }: { score?: number }) => {
  if (score === undefined) return null;
  const pct = score;
  const color = score > 60 ? 'bg-emerald-500' : score < 40 ? 'bg-rose-500' : 'bg-slate-500';
  return (
    <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

export const AINewsScorer: React.FC<AINewsScorerProps> = ({ sentimentData, sentiment, loading }) => {
  const activeSentiment = sentimentData || sentiment;

  if (loading) {
    return (
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-5 h-5 bg-slate-800 rounded" />
          <div className="h-6 bg-slate-800 rounded w-48" />
        </div>
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-800 animate-pulse space-y-3">
          <div className="flex justify-between">
            <div className="h-4 bg-slate-800 rounded w-24" />
            <div className="h-4 bg-slate-800 rounded w-16" />
          </div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 p-3 rounded-xl bg-slate-800/20 border border-slate-800/40 animate-pulse">
              <div className="w-16 h-3 bg-slate-800 rounded mt-1" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-800 rounded w-3/4" />
                <div className="h-3 bg-slate-800 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!activeSentiment) return null;

  const { score = 50, label = 'Neutral', summary, articles = [] } = activeSentiment;

  const overallColor = score > 60 ? 'text-emerald-400' : score < 40 ? 'text-rose-400' : 'text-slate-300';
  const overallBarColor = score > 60 ? 'bg-emerald-500' : score < 40 ? 'bg-rose-500' : 'bg-slate-500';

  const formatDate = (article: ArticleData): string => {
    if (article.providerPublishTime) {
      const d = new Date(article.providerPublishTime * 1000);
      if (!isNaN(d.getTime())) return d.toLocaleString();
    }
    if (article.datetime) {
      const d = new Date(article.datetime);
      if (!isNaN(d.getTime())) return d.toLocaleString();
    }
    return 'Recent';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Newspaper className="w-5 h-5 text-purple-400" />
        <h3 className="text-xl font-bold text-white">Market Sentiment & News</h3>
      </div>

      {/* Overall Sentiment Gauge */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-slate-400 text-sm font-medium">AI Sentiment Score</span>
          <div className="flex items-center gap-2">
            <SentimentBadge label={label} />
            <span className={`font-bold text-lg ${overallColor}`}>{score}<span className="text-slate-500 text-sm">/100</span></span>
          </div>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${overallBarColor}`}
          />
        </div>
        {summary && (
          <p className="mt-3 text-sm text-slate-400 italic">"{summary}"</p>
        )}
      </div>

      {/* Per-article scored list */}
      {articles.length > 0 && (
        <>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Newspaper className="w-3.5 h-3.5" /> AI-Scored News Articles
          </h4>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {articles.map((article, i) => (
              <motion.a
                key={i}
                href={article.link || '#'}
                target="_blank"
                rel="noreferrer"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="group flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all duration-200"
              >
                {/* Score bar on the left */}
                <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                  <ScoreBar score={article.score} />
                  <span className={`text-[10px] font-bold ${
                    (article.score || 50) > 60 ? 'text-emerald-500' :
                    (article.score || 50) < 40 ? 'text-rose-500' :
                    'text-slate-500'
                  }`}>{article.score ?? 50}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-slate-200 line-clamp-2 group-hover:text-white transition-colors leading-snug">
                      {article.title}
                    </p>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <SentimentBadge label={article.label} score={article.score} />
                    {article.reason && (
                      <span className="text-xs text-slate-500 italic truncate max-w-[200px]">{article.reason}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{formatDate(article)}</p>
                </div>
              </motion.a>
            ))}
          </div>
        </>
      )}

      {/* No articles fallback */}
      {articles.length === 0 && (
        <div className="text-center py-6 text-slate-500">
          <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No recent news available.</p>
        </div>
      )}
    </motion.div>
  );
};
