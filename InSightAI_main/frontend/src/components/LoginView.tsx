import React, { useState } from "react";
import {
  Mail,
  Lock,
  BriefcaseBusiness,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { HRUser, UserRole } from "../types";

interface LoginViewProps {
  onLogin: (user: HRUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("HR");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    const authenticatedUser: HRUser = {
      name: email.split("@")[0] || "User",
      email: email || "user@company.com",
      role: role,
    };

    onLogin(authenticatedUser);
  };

  return (
    <div className="min-h-screen w-full bg-[#f4f4f2] flex items-center justify-center px-4 py-8">
      {/* MAIN LOGIN CONTAINER */}
      <div
        className="
          w-full
          max-w-6xl
          min-h-[720px]
          bg-white
          rounded-[32px]
          shadow-[0_20px_70px_rgba(0,0,0,0.12)]
          overflow-hidden
          grid
          grid-cols-1
          lg:grid-cols-2
        "
      >
        {/* ================= LEFT SIDE ================= */}

        <div className="hidden lg:flex flex-col justify-between p-12 bg-[#f8f8f7]">
          {/* LOGO */}
          <div>
            <div className="brand-cursive text-4xl font-bold tracking-wide">
              <span className="text-[#1f2937]">Insight</span>
              <span className="text-[#a855f7]">A</span>
              <span className="text-[#9AD0D3]">I</span>
            </div>

            <p className="mt-3 text-sm tracking-[0.22em] text-[#6b7280] uppercase">
              Decision Intelligence
            </p>
          </div>

          {/* ILLUSTRATION */}

          <div className="flex-1 flex items-center justify-center py-8">
            <img
              src="/login-illustration.png"
              alt="Business analytics illustration"
              className="w-full max-w-[430px] object-contain"
            />
          </div>

          {/* FOOTER */}

          <div className="text-xs tracking-[0.18em] uppercase text-[#6b7280]">
            InsightAI · Decision Intelligence
          </div>
        </div>

        {/* ================= RIGHT SIDE ================= */}

        <div className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16">
          {/* MOBILE LOGO */}

          <div className="lg:hidden text-center mb-8">
            <div className="brand-cursive text-4xl font-bold tracking-wide">
              <span className="text-[#1f2937]">Insight</span>

              <span className="text-[#a855f7]">A</span>

              <span className="text-[#38bdf8]">I</span>
            </div>

            <p className="mt-2 text-[10px] tracking-[0.22em] text-[#6b7280] uppercase">
              Decision Intelligence
            </p>
          </div>

          {/* MOBILE ILLUSTRATION */}

          <div className="lg:hidden flex justify-center mb-6">
            <img
              src="/login-illustration.png"
              alt="Business analytics illustration"
              className="w-full max-w-[260px] object-contain"
            />
          </div>

          {/* HEADING */}

          <div className="mb-10">
            <h1 className="text-4xl sm:text-5xl font-semibold text-[#1f2937] tracking-tight">
              Welcome
            </h1>

            <p className="mt-3 text-base text-[#6b7280]">
              Sign in to access your personalized insights
            </p>
          </div>

          {/* ================= LOGIN FORM ================= */}

          <form onSubmit={handleLogin} className="space-y-6">
            {/* EMAIL */}

            <div className="flex items-center gap-4">
              <div
                className="
                  w-14
                  h-14
                  rounded-full
                  bg-[#dcebed]
                  flex
                  items-center
                  justify-center
                  shrink-0
                "
              >
                <Mail size={23} className="text-[#6f969c]" />
              </div>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@company.com"
                className="
                  w-full
                  h-14
                  rounded-full
                  border
                  border-[#b8c9cc]
                  bg-white
                  px-6
                  text-[#1f2937]
                  outline-none
                  transition
                  focus:border-[#6f969c]
                  focus:ring-2
                  focus:ring-[#dcebed]
                "
              />
            </div>

            {/* PASSWORD */}

            <div className="flex items-center gap-4">
              <div
                className="
                  w-14
                  h-14
                  rounded-full
                  bg-[#dcebed]
                  flex
                  items-center
                  justify-center
                  shrink-0
                "
              >
                <Lock size={23} className="text-[#6f969c]" />
              </div>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="
                  w-full
                  h-14
                  rounded-full
                  border
                  border-[#b8c9cc]
                  bg-white
                  px-6
                  text-[#1f2937]
                  outline-none
                  transition
                  focus:border-[#6f969c]
                  focus:ring-2
                  focus:ring-[#dcebed]
                "
              />
            </div>

            {/* ROLE */}

            <div className="flex items-center gap-4">
              <div
                className="
                  w-14
                  h-14
                  rounded-full
                  bg-[#dcebed]
                  flex
                  items-center
                  justify-center
                  shrink-0
                "
              >
                <BriefcaseBusiness size={23} className="text-[#6f969c]" />
              </div>

              <div className="relative w-full">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="
                    appearance-none
                    w-full
                    h-14
                    rounded-full
                    border
                    border-[#b8c9cc]
                    bg-white
                    px-6
                    text-[#1f2937]
                    outline-none
                    cursor-pointer
                    transition
                    focus:border-[#6f969c]
                    focus:ring-2
                    focus:ring-[#dcebed]
                  "
                >
                  <option value="HR">Human Resources</option>

                  <option value="Manager">Manager</option>

                  <option value="Executive">Executive</option>

                  <option value="Retail">Retail</option>

                  <option value="Finance">Finance</option>

                  <option value="Operations">Operations</option>
                </select>

                <ChevronDown
                  size={20}
                  className="
                    absolute
                    right-5
                    top-1/2
                    -translate-y-1/2
                    pointer-events-none
                    text-[#6b7280]
                  "
                />
              </div>
            </div>

            {/* LOGIN BUTTON */}

            <div className="pt-4 flex justify-center">
              <button
                type="submit"
                className="
                  group
                  flex
                  items-center
                  justify-center
                  gap-3
                  min-w-[220px]
                  h-14
                  px-10
                  rounded-full
                  bg-[#efc29f]
                  text-[#1f2937]
                  font-semibold
                  text-base
                  shadow-sm
                  transition-all
                  duration-200
                  hover:-translate-y-0.5
                  hover:shadow-md
                  active:translate-y-0
                "
              >
                <span>Log in</span>

                <ArrowRight
                  size={19}
                  className="
                    transition-transform
                    duration-200
                    group-hover:translate-x-1
                  "
                />
              </button>
            </div>

            {/* FORGOT PASSWORD */}

            <div className="text-center">
              <button
                type="button"
                className="
                  text-sm
                  text-[#6b7280]
                  hover:text-[#1f2937]
                  transition
                "
              >
                Forgot Password?
              </button>
            </div>
          </form>

          {/* FOOTER */}

          <div className="mt-12 text-center">
            <p className="text-xs tracking-[0.18em] uppercase text-[#9ca3af]">
              InsightAI · Decision Intelligence
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// import React, { useState } from 'react';
// import { motion } from 'motion/react';
// import {
//   Shield,
//   User,
//   Lock,
//   ArrowRight,
//   Briefcase,
//   ChevronDown
// } from 'lucide-react';

// import { HRUser, UserRole } from '../types';
// import { BrandLogo } from './BrandLogo';

// interface LoginViewProps {
//   onLogin: (user: HRUser) => void;
// }

// export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {

//   // Form state
//   const [email, setEmail] = useState('user@company.com');
//   const [password, setPassword] = useState('••••••••••••');

//   // Selected user role
//   const [role, setRole] = useState<UserRole>('HR');

//   const [isLoading, setIsLoading] = useState(false);

//   // Get display name based on email or selected role
//   const getDisplayName = (
//     emailInput: string,
//     selectedRole: UserRole
//   ): string => {

//     if (emailInput && emailInput.includes('@')) {
//       const prefix = emailInput.split('@')[0];
//       const cleaned = prefix.replace(/[._-]/g, ' ').trim();

//       if (cleaned.length > 0) {
//         return cleaned.replace(/\b\w/g, (l) => l.toUpperCase());
//       }
//     }

//     switch (selectedRole) {
//       case 'HR':
//         return 'Sarah Jenkins';

//       case 'Manager':
//         return 'Marcus Vance';

//       case 'Executive':
//         return 'Elena Rostova';

//       case 'Retail':
//         return 'Olivia Carter';

//       case 'Finance':
//         return 'Daniel Morgan';

//       case 'Operations':
//         return 'James Wilson';

//       default:
//         return 'Enterprise User';
//     }
//   };

//   // Get department based on selected role
//   const getDepartment = (
//     selectedRole: UserRole
//   ): string => {

//     switch (selectedRole) {
//       case 'HR':
//         return 'Workforce Strategy & People Ops';

//       case 'Manager':
//         return 'Operations & Team Leadership';

//       case 'Executive':
//         return 'Executive Leadership & C-Suite';

//       case 'Retail':
//         return 'Retail Operations & Customer Experience';

//       case 'Finance':
//         return 'Finance & Business Planning';

//       case 'Operations':
//         return 'Business Operations & Process Management';

//       default:
//         return 'InSightAI Corporate';
//     }
//   };

//   // Generate initials from name
//   const getInitials = (name: string): string => {
//     const parts = name.split(' ').filter(Boolean);

//     if (parts.length >= 2) {
//       return (
//         parts[0][0] +
//         parts[1][0]
//       ).toUpperCase();
//     }

//     return (name.slice(0, 2) || 'US').toUpperCase();
//   };

//   // Handle login
//   const handleSubmit = (e: React.FormEvent) => {

//     e.preventDefault();

//     setIsLoading(true);

//     setTimeout(() => {

//       const userName = getDisplayName(email, role);

//       const userDepartment = getDepartment(role);

//       const initials = getInitials(userName);

//       const authenticatedUser: HRUser = {
//         id: `usr_${role.toLowerCase()}_${Date.now()}`,
//         name: userName,
//         email: email || 'user@company.com',
//         role: role,
//         department: userDepartment,
//         initials: initials
//       };

//       onLogin(authenticatedUser);

//       setIsLoading(false);

//     }, 300);
//   };

//   return (

//     <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-[#0a0a0c] text-[#f8fafc]">

//       {/* Ambient background glow */}
//       <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />

//       <motion.div
//         initial={{ opacity: 0, y: 15 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.4, ease: 'easeOut' }}
//         className="w-full max-w-md relative z-10"
//       >

//         {/* Brand Header */}
//         <div className="text-center mb-8">
//           <BrandLogo
//             size="lg"
//             showSubtitle={false}
//             align="center"
//           />
//         </div>

//         {/* Login Card */}
//         <div className="bg-gradient-to-br from-[#1e1b4b]/60 to-[#2e1065]/60 backdrop-blur-2xl border border-indigo-500/20 rounded-3xl p-8 shadow-2xl sophisticated-card-glow">

//           <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/5">

//             <div>
//               <h2 className="text-base font-semibold text-white">
//                 Portal Access
//               </h2>

//               <p className="text-xs text-slate-400">
//                 Sign in to review latest updates & insights
//               </p>
//             </div>

//             <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-300 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full uppercase tracking-wider">

//               <Shield className="w-3 h-3 text-indigo-400" />

//               Secure

//             </span>

//           </div>

//           <form
//             onSubmit={handleSubmit}
//             className="space-y-4"
//           >

//             {/* Email Input */}
//             <div>

//               <label className="block text-[11px] font-bold text-indigo-300/70 mb-1.5 uppercase tracking-widest">
//                 Email
//               </label>

//               <div className="relative">

//                 <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
//                   <User className="w-4 h-4" />
//                 </div>

//                 <input
//                   id="email-input"
//                   type="email"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   required
//                   className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
//                   placeholder="user@company.com"
//                 />

//               </div>

//             </div>

//             {/* Password Input */}
//             <div>

//               <label className="block text-[11px] font-bold text-indigo-300/70 mb-1.5 uppercase tracking-widest">
//                 Password
//               </label>

//               <div className="relative">

//                 <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
//                   <Lock className="w-4 h-4" />
//                 </div>

//                 <input
//                   id="password-input"
//                   type="password"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   required
//                   className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
//                   placeholder="••••••••••••"
//                 />

//               </div>

//             </div>

//             {/* Role Dropdown */}
//             <div>

//               <label className="block text-[11px] font-bold text-indigo-300/70 mb-1.5 uppercase tracking-widest">
//                 Designation
//               </label>

//               <div className="relative">

//                 <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
//                   <Briefcase className="w-4 h-4 text-purple-400" />
//                 </div>

//                 <select
//                   id="designation-select"
//                   value={role}
//                   onChange={(e) =>
//                     setRole(e.target.value as UserRole)
//                   }
//                   className="w-full pl-10 pr-10 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors cursor-pointer appearance-none"
//                 >

//                   <option
//                     value="HR"
//                     className="bg-[#1e1b4b] text-white"
//                   >
//                     HR
//                   </option>

//                   <option
//                     value="Manager"
//                     className="bg-[#1e1b4b] text-white"
//                   >
//                     Manager
//                   </option>

//                   <option
//                     value="Executive"
//                     className="bg-[#1e1b4b] text-white"
//                   >
//                     Executive / Director
//                   </option>

//                   <option
//                     value="Retail"
//                     className="bg-[#1e1b4b] text-white"
//                   >
//                     Retail Manager
//                   </option>

//                   <option
//                     value="Finance"
//                     className="bg-[#1e1b4b] text-white"
//                   >
//                     Finance Analyst
//                   </option>

//                   <option
//                     value="Operations"
//                     className="bg-[#1e1b4b] text-white"
//                   >
//                     Operations Manager
//                   </option>

//                 </select>

//                 <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
//                   <ChevronDown className="w-4 h-4" />
//                 </div>

//               </div>

//             </div>

//             {/* Submit Button */}
//             <button
//               id="login-submit-button"
//               type="submit"
//               disabled={isLoading}
//               className="w-full mt-3 py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
//             >

//               {isLoading ? (

//                 <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />

//               ) : (

//                 <>
//                   <span>Enter Dashboard</span>
//                   <ArrowRight className="w-4 h-4" />
//                 </>

//               )}

//             </button>

//           </form>

//         </div>

//       </motion.div>

//     </div>
//   );
// };
