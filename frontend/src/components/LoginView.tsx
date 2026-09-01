import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, User, Lock, ArrowRight, Briefcase, ChevronDown } from 'lucide-react';
import { HRUser, UserRole } from '../types';
import { BrandLogo } from './BrandLogo';

interface LoginViewProps {
  onLogin: (user: HRUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  // Form State
  const [email, setEmail] = useState('user@company.com');
  const [password, setPassword] = useState('••••••••••••');
  
  // =========================================================================
  // 📍 SELECTED USER ROLE STATE
  // Stored in component state and passed up on submit to power future
  // role-based dashboard insights ('HR' | 'Manager' | 'Executive').
  // =========================================================================
  const [role, setRole] = useState<UserRole>('HR');
  const [isLoading, setIsLoading] = useState(false);

  // Helper to extract display name from email or default based on role
  const getDisplayName = (emailInput: string, selectedRole: UserRole): string => {
    if (emailInput && emailInput.includes('@')) {
      const prefix = emailInput.split('@')[0];
      const cleaned = prefix.replace(/[._-]/g, ' ').trim();
      if (cleaned.length > 0) {
        return cleaned.replace(/\b\w/g, (l) => l.toUpperCase());
      }
    }
    switch (selectedRole) {
      case 'HR':
        return 'Sarah Jenkins';
      case 'Manager':
        return 'Marcus Vance';
      case 'Executive':
        return 'Elena Rostova';
      default:
        return 'Enterprise User';
    }
  };

  const getDepartment = (selectedRole: UserRole): string => {
    switch (selectedRole) {
      case 'HR':
        return 'Workforce Strategy & People Ops';
      case 'Manager':
        return 'Operations & Team Leadership';
      case 'Executive':
        return 'Executive Leadership & C-Suite';
      default:
        return 'InSightAI Corporate';
    }
  };

  const getInitials = (name: string): string => {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name.slice(0, 2) || 'US').toUpperCase();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      const userName = getDisplayName(email, role);
      const userDepartment = getDepartment(role);
      const initials = getInitials(userName);

      // =====================================================================
      // 📍 USER OBJECT CREATION WITH SELECTED ROLE
      // The selected role ('HR' | 'Manager' | 'Executive') is saved in
      // application state (`user.role`) across the entire session.
      // =====================================================================
      const authenticatedUser: HRUser = {
        id: `usr_${role.toLowerCase()}_${Date.now()}`,
        name: userName,
        email: email || 'user@company.com',
        role: role, // <-- 🎯 HERE: Selected Role Stored
        department: userDepartment,
        initials: initials
      };

      onLogin(authenticatedUser);
      setIsLoading(false);
    }, 300);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-[#0a0a0c] text-[#f8fafc]">
      {/* Ambient background glow */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <BrandLogo size="lg" showSubtitle={false} align="center" />
        </div>

        {/* Login Card */}
        <div className="bg-gradient-to-br from-[#1e1b4b]/60 to-[#2e1065]/60 backdrop-blur-2xl border border-indigo-500/20 rounded-3xl p-8 shadow-2xl sophisticated-card-glow">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/5">
            <div>
              <h2 className="text-base font-semibold text-white">Portal Access</h2>
              <p className="text-xs text-slate-400">Sign in to review latest updates & insights</p>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-300 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
              <Shield className="w-3 h-3 text-indigo-400" />
              Secure
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Email Input */}
            <div>
              <label className="block text-[11px] font-bold text-indigo-300/70 mb-1.5 uppercase tracking-widest">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                  placeholder="user@company.com"
                />
              </div>
            </div>

            {/* 2. Password Input */}
            <div>
              <label className="block text-[11px] font-bold text-indigo-300/70 mb-1.5 uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            {/* 3. Role / Designation Dropdown */}
            <div>
              <label className="block text-[11px] font-bold text-indigo-300/70 mb-1.5 uppercase tracking-widest">
                Designation
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Briefcase className="w-4 h-4 text-purple-400" />
                </div>
                <select
                  id="designation-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full pl-10 pr-10 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors cursor-pointer appearance-none"
                >
                  <option value="HR" className="bg-[#1e1b4b] text-white">HR</option>
                  <option value="Manager" className="bg-[#1e1b4b] text-white">Manager</option>
                  <option value="Executive" className="bg-[#1e1b4b] text-white">Executive / Director</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="login-submit-button"
              type="submit"
              disabled={isLoading}
              className="w-full mt-3 py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Enter Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
