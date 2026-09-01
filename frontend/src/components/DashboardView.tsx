import React, { useState, useMemo, useEffect } from 'react';
import { RefreshCw, SlidersHorizontal, AlertTriangle, MessageSquare, Sparkles } from 'lucide-react';
import { Insight, HRUser } from '../types';
import { CardCarousel } from './CardCarousel';

interface DashboardViewProps {
  user: HRUser;
  insights: Insight[];
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenChat: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  insights,
  onRefresh,
  isRefreshing,
  onOpenChat
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // =========================================================================
  // 📍 DYNAMIC CATEGORY FILTERS
  // Derives categories based on the current role's loaded insights.
  // =========================================================================
  const categories = useMemo(() => {
    const uniqueRoleCategories = Array.from(
      new Set(insights.map((item) => item.category).filter(Boolean) as string[])
    );
    return ['All', 'High Priority', ...uniqueRoleCategories];
  }, [insights]);

  // Reset filter when insights change (e.g. on role switch or refresh)
  useEffect(() => {
    setSelectedCategory('All');
  }, [insights]);

  // Filter insights if user chooses a category tab
  const filteredInsights = useMemo(() => {
    if (selectedCategory === 'All') return insights;
    if (selectedCategory === 'High Priority') {
      return insights.filter(item => item.severity === 'High');
    }
    return insights.filter(item => item.category === selectedCategory);
  }, [insights, selectedCategory]);

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-between px-4 sm:px-10 py-8 relative text-[#f8fafc]">
      {/* Top Header Section */}
      <div className="text-center max-w-2xl mx-auto mb-4 sm:mb-5 select-none">
        <h1 className="font-display text-3xl sm:text-4xl md:text-[38px] font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-200 drop-shadow-[0_2px_16px_rgba(168,85,247,0.35)] leading-tight">
          Latest Updates
        </h1>
      </div>

      {/* Quick Filter Navigation Bar - Fully visible, centered, and aligned without clipping */}
      <div className="w-full max-w-3xl mx-auto flex items-center justify-center min-h-[42px] mb-6 px-2 sm:px-4">
        <div className="flex items-center justify-center flex-wrap gap-2 sm:gap-2.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400 shrink-0 mr-0.5 hidden sm:block" />
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            const count = cat === 'All' 
              ? insights.length 
              : cat === 'High Priority'
              ? insights.filter(i => i.severity === 'High').length
              : insights.filter(i => i.category === cat).length;

            if (count === 0 && cat !== 'All') return null;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow-lg shadow-purple-600/30 border border-purple-400/40'
                    : 'bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white border border-white/10 hover:border-white/20'
                }`}
              >
                {cat === 'High Priority' && <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />}
                <span>{cat}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isActive ? 'bg-purple-950/80 text-purple-200 border border-purple-400/30' : 'bg-white/10 text-slate-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}

          {/* Refresh Button neatly positioned alongside filters */}
          <div className="h-4 w-px bg-white/10 shrink-0 mx-1 hidden sm:block" />
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh Updates"
            className="shrink-0 p-1.5 sm:p-2 text-slate-300 hover:text-purple-300 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/20 rounded-full transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-purple-400' : 'text-slate-300'}`} />
          </button>
        </div>
      </div>

      {/* Center Main Carousel */}
      <div className="w-full flex-1 flex flex-col items-center justify-center my-auto">
        <CardCarousel insights={filteredInsights} />
      </div>

      {/* ========================================================================= */}
      {/* 📍 ASK ANYTHING PROMINENT BUTTON (Identical size, text, and position)     */}
      {/* ========================================================================= */}
      <div className="w-full flex justify-center mt-7 sm:mt-8 mb-2">
        <button
          id="ask-anything-btn"
          onClick={onOpenChat}
          aria-label="Open Ask Anything Chatbot"
          className="group relative inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 text-white font-semibold text-sm sm:text-base shadow-xl shadow-purple-950/60 border border-purple-400/40 hover:border-purple-300/80 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] cursor-pointer min-w-[200px]"
        >
          <span className="text-lg select-none">💬</span>
          <span className="tracking-tight">Ask Anything</span>
        </button>
      </div>

      {/* Footer Section */}
      <footer className="w-full h-12 border-t border-white/5 px-2 sm:px-4 flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-widest mt-8">
        <span>© 2024 InSightAI Global Logistics</span>
        <div className="flex gap-6">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            System Status: Optimal
          </span>
          <span className="hidden sm:inline">Data Refresh: 2m ago</span>
        </div>
      </footer>
    </div>
  );
};

