import React, { useState } from 'react';
import { 
  Check, 
  Copy, 
  CheckCircle2, 
  Circle,
  Zap
} from 'lucide-react';
import { Insight, FeasibilityLevel } from '../types';

interface InsightCardProps {
  insight: Insight;
}

export const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  const getRecommendationData = (
    rec: string | { text: string; feasibility?: FeasibilityLevel }, 
    index: number
  ): { text: string; feasibility: FeasibilityLevel } => {
    const text = typeof rec === 'string' ? rec : rec.text;
    const explicitFeasibility = (typeof rec !== 'string' ? rec.feasibility : undefined)
      || (insight.actionFeasibilities && insight.actionFeasibilities[index])
      || (index === 0 ? 'Medium' : index === 1 ? 'Easy' : 'Hard');
    return { text, feasibility: explicitFeasibility };
  };

  const getFeasibilityBadgeStyle = (feasibility: FeasibilityLevel) => {
    switch (feasibility) {
      case 'Easy':
        return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300';
      case 'Medium':
        return 'bg-amber-500/15 border-amber-500/30 text-amber-300';
      case 'Hard':
        return 'bg-rose-500/15 border-rose-500/30 text-rose-300';
      default:
        return 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300';
    }
  };

  const toggleAction = (recText: string) => {
    setCompletedActions(prev => ({
      ...prev,
      [recText]: !prev[recText]
    }));
  };

  const handleCopy = () => {
    const text = `InSightAI Recommendation: ${insight.title} (${insight.region})\nMetric: ${insight.metric} ${insight.change}\n\nCause: ${insight.cause}\n\nRecommended Actions:\n${insight.recommendations.map((r, i) => {
      const { text: actionText, feasibility } = getRecommendationData(r, i);
      return `• [${feasibility}] ${actionText}`;
    }).join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHigh = insight.severity === 'High';
  const isMedium = insight.severity === 'Medium';
  const isDown = insight.trend === 'down';

  // Severity specific badge styling according to Sophisticated Dark theme
  const severityBadge = isHigh ? (
    <span className="px-4 py-1.5 bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold rounded-full tracking-wider flex items-center gap-2 uppercase">
      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      ⚠ High Priority
    </span>
  ) : isMedium ? (
    <span className="px-4 py-1.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-full tracking-wider flex items-center gap-2 uppercase">
      <span className="w-2 h-2 bg-amber-500 rounded-full" />
      Medium Priority
    </span>
  ) : (
    <span className="px-4 py-1.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-xs font-bold rounded-full tracking-wider flex items-center gap-2 uppercase">
      <span className="w-2 h-2 bg-indigo-400 rounded-full" />
      Low Priority
    </span>
  );

  const trendColorClass = isDown ? 'text-red-400' : 'text-emerald-400';
  const formattedChange = `${isDown ? '↓' : '↑'} ${insight.change.replace('+', '').replace('-', '')}`;

  return (
    <div 
      id={`insight-card-${insight.id}`}
      className="w-full max-w-2xl bg-gradient-to-br from-[#1e1b4b] to-[#2e1065] rounded-3xl p-6 sm:p-9 shadow-2xl border border-indigo-500/20 relative overflow-hidden sophisticated-card-glow text-[#f8fafc] flex flex-col justify-between min-h-[560px] sm:min-h-[540px]"
    >
      {/* Ambient Inner Blur */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />

      {/* Top Header: Severity Badge & Insight ID */}
      <div className="flex justify-between items-center mb-6 relative z-10">
        <div className="flex items-center gap-2.5">
          {severityBadge}
          {insight.category && (
            <span className="text-[10px] text-indigo-300/70 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold">
              {insight.category}
            </span>
          )}
        </div>
        <span className="text-indigo-300/60 text-xs font-mono tracking-widest font-medium">
          INSIGHT-00{insight.id}
        </span>
      </div>

      {/* Title & Metric Hero - Stable min-height for uniform baseline alignment */}
      <div className="mb-6 relative z-10 min-h-[110px] flex flex-col justify-start">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight text-white mb-1 font-sans">
          {insight.title}
          <span className={`${trendColorClass} block mt-1.5 text-3xl sm:text-4xl font-bold tracking-tight`}>
            {formattedChange}
          </span>
        </h2>

        {/* Metric & Region Info Bar */}
        <div className="flex items-center gap-6 mt-3 pt-1">
          <div className="flex flex-col">
            <span className="text-[10px] text-indigo-300/50 uppercase font-bold tracking-widest">
              Metric
            </span>
            <span className="text-sm text-indigo-100 font-semibold">
              {insight.metric}
            </span>
          </div>
          <div className="w-px h-7 bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[10px] text-indigo-300/50 uppercase font-bold tracking-widest">
              Region
            </span>
            <span className="text-sm text-indigo-100 font-semibold">
              {insight.region}
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column Content Grid: What Happened & Recommended Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-7 pt-1 relative z-10 flex-1">
        {/* Left Column: What Happened */}
        <div className="flex flex-col justify-between space-y-3">
          <div>
            <h3 className="text-xs font-bold text-indigo-300/80 uppercase tracking-widest border-b border-white/5 pb-1.5 mb-2">
              What Happened?
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              {insight.summary}
            </p>
          </div>
          <div className="pt-2 text-xs text-slate-400 border-t border-white/5 space-y-1">
            <span className="text-indigo-300/80 font-bold uppercase tracking-wider text-[10px] block">
              Root Cause
            </span>
            <p className="text-slate-300 text-xs leading-normal">
              {insight.cause}
            </p>
          </div>
        </div>

        {/* Right Column: Recommended Actions */}
        <div className="flex flex-col space-y-2.5">
          <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
            <h3 className="text-xs font-bold text-indigo-300/80 uppercase tracking-widest">
              Recommended Actions
            </h3>
            <button
              onClick={handleCopy}
              title="Copy action plan"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-indigo-200 bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-md transition-colors cursor-pointer border border-white/5"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-indigo-300" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <ul className="space-y-2">
            {insight.recommendations.map((rec, index) => {
              const { text: recText, feasibility } = getRecommendationData(rec, index);
              const isChecked = !!completedActions[recText];
              return (
                <li
                  key={index}
                  onClick={() => toggleAction(recText)}
                  className="flex items-start justify-between gap-2.5 text-xs sm:text-sm text-slate-200 p-1.5 sm:p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <span className="mt-0.5 text-xs font-bold shrink-0">
                      {isChecked ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <span className="text-indigo-400 group-hover:text-indigo-300">✓</span>
                      )}
                    </span>
                    <span className={`leading-snug ${isChecked ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {recText}
                    </span>
                  </div>
                  <span 
                    className={`text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 border mt-0.5 select-none ${getFeasibilityBadgeStyle(feasibility)}`}
                  >
                    {feasibility}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Footer Info Strip */}
      <div className="mt-6 pt-3.5 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 relative z-10 shrink-0">
        <span className="flex items-center gap-1.5 text-indigo-300/70">
          <Zap className="w-3.5 h-3.5 text-indigo-400" />
          Autonomous Intelligence
        </span>
        <span>
          {Object.values(completedActions).filter(Boolean).length} of {insight.recommendations.length} actions complete
        </span>
      </div>
    </div>
  );
};
