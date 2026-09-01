import React from 'react';
import { LogOut } from 'lucide-react';
import { HRUser } from '../types';
import { BrandLogo } from './BrandLogo';

interface NavbarProps {
  user: HRUser;
  onLogout: () => void;
  insightCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout, insightCount }) => {
  return (
    <header className="h-16 flex items-center justify-between px-6 sm:px-10 border-b border-white/5 bg-[#0a0a0c]/80 backdrop-blur-md sticky top-0 z-30 w-full">
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <BrandLogo size="md" />
        <span className="hidden md:inline-flex items-center text-[10px] font-semibold text-indigo-300/80 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full uppercase tracking-widest ml-2">
          {insightCount} Insights
        </span>
      </div>

      {/* User Profile & Actions */}
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="flex flex-col items-end hidden sm:flex">
          <span className="text-sm font-medium text-slate-200">{user.name}</span>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
            {user.role}
          </span>
        </div>

        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 font-bold text-sm">
          {user.initials}
        </div>

        <button
          id="hr-logout-button"
          onClick={onLogout}
          title="Sign Out"
          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
