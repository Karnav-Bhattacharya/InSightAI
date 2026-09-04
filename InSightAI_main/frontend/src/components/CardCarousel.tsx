import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Insight } from "../types";
import { InsightCard } from "./InsightCard";

interface CardCarouselProps {
  insights: Insight[];
}

export const CardCarousel: React.FC<CardCarouselProps> = ({ insights }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<number>(0);

  const totalCards = insights.length;

  const handleNext = useCallback(() => {
    if (totalCards === 0) return;

    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % totalCards);
  }, [totalCards]);

  const handlePrev = useCallback(() => {
    if (totalCards === 0) return;

    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + totalCards) % totalCards);
  }, [totalCards]);

  const handleDotClick = (index: number) => {
    if (index === currentIndex) return;

    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleNext, handlePrev]);

  if (totalCards === 0) {
    return (
      <div className="text-center py-20 text-[#64748B]">
        <p>No insights generated yet.</p>
      </div>
    );
  }

  const currentInsight = insights[currentIndex];

  // Slide animation variants
  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 280 : -280,
      opacity: 0,
      scale: 0.96,
    }),

    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: {
          type: "spring",
          stiffness: 280,
          damping: 28,
        },
        opacity: {
          duration: 0.28,
        },
        scale: {
          duration: 0.28,
        },
      },
    },

    exit: (dir: number) => ({
      x: dir > 0 ? -280 : 280,
      opacity: 0,
      scale: 0.96,
      transition: {
        x: {
          type: "spring",
          stiffness: 280,
          damping: 28,
        },
        opacity: {
          duration: 0.22,
        },
        scale: {
          duration: 0.22,
        },
      },
    }),
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
      {/* Main Carousel */}
      <div className="w-full flex items-center justify-between gap-3 sm:gap-6 md:gap-8 relative min-h-[560px]">
        {/* Previous */}
        <button
          id="carousel-prev-arrow"
          onClick={handlePrev}
          aria-label="Previous Insight Card"
          className="w-11 h-11 sm:w-13 sm:h-13 rounded-full border border-[#B8CBD0] flex items-center justify-center bg-white hover:bg-[#F3F7F7] hover:border-[#9AD0D3] transition-all text-[#475569] hover:text-[#1E293B] shrink-0 group cursor-pointer shadow-md"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 group-hover:-translate-x-0.5 transition-transform" />
        </button>

        {/* Animated Card */}
        <div className="flex-1 flex justify-center overflow-hidden py-2">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full flex justify-center"
            >
              <InsightCard insight={currentInsight} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Next */}
        <button
          id="carousel-next-arrow"
          onClick={handleNext}
          aria-label="Next Insight Card"
          className="w-11 h-11 sm:w-13 sm:h-13 rounded-full border border-[#B8CBD0] flex items-center justify-center bg-white hover:bg-[#F3F7F7] hover:border-[#9AD0D3] transition-all text-[#475569] hover:text-[#1E293B] shrink-0 group cursor-pointer shadow-md"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Pagination */}
      <div className="flex flex-col items-center gap-2.5 mt-6 sm:mt-7">
        <div
          id="carousel-pagination-dots"
          className="flex items-center gap-2.5"
        >
          {insights.map((insight, idx) => {
            const isActive = idx === currentIndex;

            return (
              <button
                key={insight.id}
                id={`carousel-dot-${idx}`}
                onClick={() => handleDotClick(idx)}
                aria-label={`Jump to Insight ${idx + 1}: ${insight.title}`}
                className={`transition-all duration-300 rounded-full cursor-pointer focus:outline-none ${
                  isActive
                    ? "w-2.5 h-2.5 bg-[#A855F7] shadow-lg shadow-purple-200 scale-110"
                    : "w-2 h-2 bg-[#C9D5D8] hover:bg-[#9AD0D3]"
                }`}
              />
            );
          })}
        </div>

        {/* Keyboard Navigation */}
        <div className="text-[11px] text-[#64748B] flex items-center gap-1.5 font-medium tracking-wide">
          <span>Browse with</span>

          <kbd className="px-1.5 py-0.5 rounded bg-[#F5F7F7] border border-[#D6E0E2] text-[#64748B] font-mono text-[10px]">
            ←
          </kbd>

          <kbd className="px-1.5 py-0.5 rounded bg-[#F5F7F7] border border-[#D6E0E2] text-[#64748B] font-mono text-[10px]">
            →
          </kbd>
        </div>
      </div>
    </div>
  );
};
// import React, { useState, useEffect, useCallback } from 'react';
// import { motion, AnimatePresence } from 'motion/react';
// import { ChevronLeft, ChevronRight } from 'lucide-react';
// import { Insight } from '../types';
// import { InsightCard } from './InsightCard';

// interface CardCarouselProps {
//   insights: Insight[];
// }

// export const CardCarousel: React.FC<CardCarouselProps> = ({ insights }) => {
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const [direction, setDirection] = useState<number>(0);

//   const totalCards = insights.length;

//   const handleNext = useCallback(() => {
//     if (totalCards === 0) return;
//     setDirection(1);
//     setCurrentIndex((prev) => (prev + 1) % totalCards);
//   }, [totalCards]);

//   const handlePrev = useCallback(() => {
//     if (totalCards === 0) return;
//     setDirection(-1);
//     setCurrentIndex((prev) => (prev - 1 + totalCards) % totalCards);
//   }, [totalCards]);

//   const handleDotClick = (index: number) => {
//     if (index === currentIndex) return;
//     setDirection(index > currentIndex ? 1 : -1);
//     setCurrentIndex(index);
//   };

//   // Keyboard navigation support (ArrowLeft / ArrowRight)
//   useEffect(() => {
//     const handleKeyDown = (e: KeyboardEvent) => {
//       if (e.key === 'ArrowLeft') {
//         handlePrev();
//       } else if (e.key === 'ArrowRight') {
//         handleNext();
//       }
//     };

//     window.addEventListener('keydown', handleKeyDown);
//     return () => window.removeEventListener('keydown', handleKeyDown);
//   }, [handleNext, handlePrev]);

//   if (totalCards === 0) {
//     return (
//       <div className="text-center py-20 text-slate-400">
//         <p>No insights generated yet.</p>
//       </div>
//     );
//   }

//   const currentInsight = insights[currentIndex];

//   // Slide animation variants for Google AI Studio style card carousel
//   const variants = {
//     enter: (dir: number) => ({
//       x: dir > 0 ? 280 : -280,
//       opacity: 0,
//       scale: 0.96,
//     }),
//     center: {
//       x: 0,
//       opacity: 1,
//       scale: 1,
//       transition: {
//         x: { type: 'spring', stiffness: 280, damping: 28 },
//         opacity: { duration: 0.28 },
//         scale: { duration: 0.28 }
//       }
//     },
//     exit: (dir: number) => ({
//       x: dir > 0 ? -280 : 280,
//       opacity: 0,
//       scale: 0.96,
//       transition: {
//         x: { type: 'spring', stiffness: 280, damping: 28 },
//         opacity: { duration: 0.22 },
//         scale: { duration: 0.22 }
//       }
//     })
//   };

//   return (
//     <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
//       {/* Main Carousel Stage with Symmetrically Flanking Arrow Controls */}
//       <div className="w-full flex items-center justify-between gap-3 sm:gap-6 md:gap-8 relative min-h-[560px]">
//         {/* Left Navigation Arrow */}
//         <button
//           id="carousel-prev-arrow"
//           onClick={handlePrev}
//           aria-label="Previous Insight Card"
//           className="w-11 h-11 sm:w-13 sm:h-13 rounded-full border border-white/10 flex items-center justify-center bg-white/5 hover:bg-white/10 hover:border-indigo-500/40 transition-all text-slate-300 hover:text-white shrink-0 group cursor-pointer shadow-xl backdrop-blur-md"
//         >
//           <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 group-hover:-translate-x-0.5 transition-transform" />
//         </button>

//         {/* Center Animated Main Card */}
//         <div className="flex-1 flex justify-center overflow-hidden py-2">
//           <AnimatePresence initial={false} custom={direction} mode="wait">
//             <motion.div
//               key={currentIndex}
//               custom={direction}
//               variants={variants}
//               initial="enter"
//               animate="center"
//               exit="exit"
//               className="w-full flex justify-center"
//             >
//               <InsightCard insight={currentInsight} />
//             </motion.div>
//           </AnimatePresence>
//         </div>

//         {/* Right Navigation Arrow */}
//         <button
//           id="carousel-next-arrow"
//           onClick={handleNext}
//           aria-label="Next Insight Card"
//           className="w-11 h-11 sm:w-13 sm:h-13 rounded-full border border-white/10 flex items-center justify-center bg-white/5 hover:bg-white/10 hover:border-indigo-500/40 transition-all text-slate-300 hover:text-white shrink-0 group cursor-pointer shadow-xl backdrop-blur-md"
//         >
//           <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-0.5 transition-transform" />
//         </button>
//       </div>

//       {/* Pagination Dots Below Card */}
//       <div className="flex flex-col items-center gap-2.5 mt-6 sm:mt-7">
//         <div
//           id="carousel-pagination-dots"
//           className="flex items-center gap-2.5"
//         >
//           {insights.map((insight, idx) => {
//             const isActive = idx === currentIndex;
//             return (
//               <button
//                 key={insight.id}
//                 id={`carousel-dot-${idx}`}
//                 onClick={() => handleDotClick(idx)}
//                 aria-label={`Jump to Insight ${idx + 1}: ${insight.title}`}
//                 className={`transition-all duration-300 rounded-full cursor-pointer focus:outline-none ${
//                   isActive
//                     ? 'w-2.5 h-2.5 bg-indigo-500 shadow-lg shadow-indigo-500/50 scale-110'
//                     : 'w-2 h-2 bg-white/20 hover:bg-white/40'
//                 }`}
//               />
//             );
//           })}
//         </div>

//         {/* Keyboard Navigation Hint */}
//         <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium tracking-wide">
//           <span>Browse with</span>
//           <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 font-mono text-[10px]">←</kbd>
//           <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 font-mono text-[10px]">→</kbd>
//         </div>
//       </div>
//     </div>
//   );
// };
