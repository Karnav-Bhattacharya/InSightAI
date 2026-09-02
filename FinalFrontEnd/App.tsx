
import React, { useState, useEffect } from 'react';

import { motion, AnimatePresence } from 'motion/react';

import { HRUser, Insight, UserRole } from './types';

import { insightService } from './services/insightService';

import { LoginView } from './components/LoginView';

import { Navbar } from './components/Navbar';

import { DashboardView } from './components/DashboardView';

import { ChatbotView } from './components/ChatbotView';

export default function App() {

  // =========================================================================
  // AUTHENTICATED USER STATE
  // =========================================================================

  const [user, setUser] = useState<HRUser | null>(null);

  const [insights, setInsights] = useState<Insight[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [currentView, setCurrentView] =
    useState<'dashboard' | 'chat'>('dashboard');


  // =========================================================================
  // LOAD ROLE-BASED INSIGHTS
  // =========================================================================

  const loadInsights = async (
    role: UserRole = 'HR',
    showLoadingState = true
  ) => {

    if (showLoadingState) setIsLoading(true);

    try {

      const data =
        await insightService.getLatestInsights(role);

      setInsights(data);

    } catch (err) {

      console.error(
        'Failed to load insights:',
        err
      );

    } finally {

      setIsLoading(false);

      setIsRefreshing(false);

    }

  };


  useEffect(() => {

    if (user) {

      loadInsights(user.role);

    }

  }, [user]);


  // =========================================================================
  // REFRESH INSIGHTS
  // =========================================================================

  const handleRefresh = async () => {

    const role = user?.role || 'HR';

    setIsRefreshing(true);

    try {

      const data =
        await insightService.refreshInsights(role);

      setInsights(data);

    } catch (err) {

      console.error(
        'Failed to refresh insights:',
        err
      );

    } finally {

      setIsRefreshing(false);

    }

  };


  // =========================================================================
  // LOGIN HANDLER
  // =========================================================================

  const handleLogin = (
    authenticatedUser: HRUser
  ) => {

    setUser(authenticatedUser);

    setCurrentView('dashboard');

    loadInsights(
      authenticatedUser.role,
      true
    );

  };


  // =========================================================================
  // LOGOUT HANDLER
  // =========================================================================

  const handleLogout = () => {

    setUser(null);

    setCurrentView('dashboard');

  };


  return (
 <div className="min-h-screen bg-gradient-to-br from-[#D9D0E8] via-[#E8D9D0] to-[#F2C9A5] text-[#334155] flex flex-col selection:bg-purple-500 selection:text-white relative overflow-x-hidden font-sans">

      <AnimatePresence mode="wait">

        {!user ? (

          /* ================= LOGIN SCREEN ================= */

          <motion.div

            key="login-screen"

            initial={{ opacity: 0 }}

            animate={{ opacity: 1 }}

            exit={{
              opacity: 0,
              scale: 0.98
            }}

            transition={{
              duration: 0.3
            }}

            className="
              w-full
              flex-1
              relative
              z-10
            "

          >

            <LoginView
              onLogin={handleLogin}
            />

          </motion.div>


        ) : (

          /* ================= MAIN APPLICATION ================= */

          <motion.div

            key="app-screen"

            initial={{
              opacity: 0,
              y: 12
            }}

            animate={{
              opacity: 1,
              y: 0
            }}

            exit={{
              opacity: 0,
              y: -12
            }}

            transition={{
              duration: 0.35
            }}

            className="
              w-full
              min-h-screen
              flex
              flex-col
              relative
              z-10
            "

          >

            {/* ================= NAVBAR ================= */}

            <Navbar

              user={user}

              onLogout={handleLogout}

              insightCount={insights.length}

            />


            {/* ================= LOADING SCREEN ================= */}

            {isLoading ? (

              <div className="
                flex-1
                flex
                flex-col
                items-center
                justify-center
                py-24
                space-y-4
              ">

                <div className="
                  w-10
                  h-10
                  border-2
                  border-[#a100ff]
                  border-t-transparent
                  rounded-full
                  animate-spin
                " />

                <p className="
                  text-sm
                  text-slate-300
                  font-medium
                ">

                  Loading autonomous {user.role} insights...

                </p>

              </div>


            ) : currentView === 'chat' ? (

              /* ================= CHATBOT ================= */

              <motion.div

                key="chatbot-view"

                initial={{
                  opacity: 0,
                  scale: 0.99
                }}

                animate={{
                  opacity: 1,
                  scale: 1
                }}

                exit={{
                  opacity: 0,
                  scale: 0.99
                }}

                transition={{
                  duration: 0.25
                }}

                className="
                  flex-1
                  flex
                  flex-col
                "

              >

                <ChatbotView

                  user={user}

                  insights={insights}

                  onBackToDashboard={() =>
                    setCurrentView('dashboard')
                  }

                />

              </motion.div>


            ) : (

              /* ================= DASHBOARD ================= */

              <motion.div

                key="dashboard-view"

                initial={{
                  opacity: 0
                }}

                animate={{
                  opacity: 1
                }}

                exit={{
                  opacity: 0
                }}

                transition={{
                  duration: 0.25
                }}

                className="
                  flex-1
                  flex
                  flex-col
                "

              >

                <DashboardView

                  user={user}

                  insights={insights}

                  onRefresh={handleRefresh}

                  isRefreshing={isRefreshing}

                  onOpenChat={() =>
                    setCurrentView('chat')
                  }

                />

              </motion.div>

            )}

          </motion.div>

        )}

      </AnimatePresence>

    </div>

  );

}

// import React, { useState, useEffect } from 'react';
// import { motion, AnimatePresence } from 'motion/react';
// import { HRUser, Insight, UserRole } from './types';
// import { insightService } from './services/insightService';
// import { LoginView } from './components/LoginView';
// import { Navbar } from './components/Navbar';
// import { DashboardView } from './components/DashboardView';
// import { ChatbotView } from './components/ChatbotView';

// export default function App() {
//   // =========================================================================
//   // 📍 AUTHENTICATED USER STATE (Includes selected role: HR | Manager | Executive)
//   // `user.role` holds the designation selected at login for role-based features.
//   // =========================================================================
//   const [user, setUser] = useState<HRUser | null>(null);
//   const [insights, setInsights] = useState<Insight[]>([]);
//   const [isLoading, setIsLoading] = useState<boolean>(true);
//   const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
//   const [currentView, setCurrentView] = useState<'dashboard' | 'chat'>('dashboard');

//   // Load insights from the modular service layer based on user role
//   const loadInsights = async (role: UserRole = 'HR', showLoadingState = true) => {
//     if (showLoadingState) setIsLoading(true);
//     try {
//       const data = await insightService.getLatestInsights(role);
//       setInsights(data);
//     } catch (err) {
//       console.error('Failed to load insights:', err);
//     } finally {
//       setIsLoading(false);
//       setIsRefreshing(false);
//     }
//   };

//   useEffect(() => {
//     if (user) {
//       loadInsights(user.role);
//     }
//   }, [user]);

//   const handleRefresh = async () => {
//     const role = user?.role || 'HR';
//     setIsRefreshing(true);
//     try {
//       const data = await insightService.refreshInsights(role);
//       setInsights(data);
//     } catch (err) {
//       console.error('Failed to refresh insights:', err);
//     } finally {
//       setIsRefreshing(false);
//     }
//   };

//   // =========================================================================
//   // 📍 LOGIN HANDLER
//   // Saves the authenticated user and selected role (user.role) into state.
//   // Resets view to dashboard and loads role-specific insights.
//   // =========================================================================
//   const handleLogin = (authenticatedUser: HRUser) => {
//     setUser(authenticatedUser);
//     setCurrentView('dashboard');
//     loadInsights(authenticatedUser.role, true);
//   };

//   const handleLogout = () => {
//     setUser(null);
//     setCurrentView('dashboard');
//   };

//   return (
//     <div className="min-h-screen bg-[#0a0a0c] text-[#f8fafc] flex flex-col selection:bg-indigo-500 selection:text-white relative overflow-x-hidden font-sans">
//       {/* Ambient Radial Lighting */}
//       <div className="fixed inset-0 dark-radial-glow pointer-events-none z-0" />

//       <AnimatePresence mode="wait">
//         {!user ? (
//           <motion.div
//             key="login-screen"
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0, scale: 0.98 }}
//             transition={{ duration: 0.3 }}
//             className="w-full flex-1 relative z-10"
//           >
//             <LoginView onLogin={handleLogin} />
//           </motion.div>
//         ) : (
//           <motion.div
//             key="app-screen"
//             initial={{ opacity: 0, y: 12 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -12 }}
//             transition={{ duration: 0.35 }}
//             className="w-full min-h-screen flex flex-col relative z-10"
//           >
//             <Navbar
//               user={user}
//               onLogout={handleLogout}
//               insightCount={insights.length}
//             />

//             {isLoading ? (
//               <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-4">
//                 <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
//                 <p className="text-sm text-indigo-300 font-medium">
//                   Loading autonomous {user.role} insights...
//                 </p>
//               </div>
//             ) : currentView === 'chat' ? (
//               <motion.div
//                 key="chatbot-view"
//                 initial={{ opacity: 0, scale: 0.99 }}
//                 animate={{ opacity: 1, scale: 1 }}
//                 exit={{ opacity: 0, scale: 0.99 }}
//                 transition={{ duration: 0.25 }}
//                 className="flex-1 flex flex-col"
//               >
//                 <ChatbotView
//                   user={user}
//                   insights={insights}
//                   onBackToDashboard={() => setCurrentView('dashboard')}
//                 />
//               </motion.div>
//             ) : (
//               <motion.div
//                 key="dashboard-view"
//                 initial={{ opacity: 0 }}
//                 animate={{ opacity: 1 }}
//                 exit={{ opacity: 0 }}
//                 transition={{ duration: 0.25 }}
//                 className="flex-1 flex flex-col"
//               >
//                 <DashboardView
//                   user={user}
//                   insights={insights}
//                   onRefresh={handleRefresh}
//                   isRefreshing={isRefreshing}
//                   onOpenChat={() => setCurrentView('chat')}
//                 />
//               </motion.div>
//             )}
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </div>
//   );
// }

