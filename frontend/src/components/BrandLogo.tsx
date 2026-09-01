import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  align?: 'left' | 'center';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showSubtitle = false,
  align = 'left'
}) => {
  const isLarge = size === 'lg';
  const isSmall = size === 'sm';

  const fontClass = isLarge
    ? 'text-5xl sm:text-6xl'
    : isSmall
    ? 'text-2xl sm:text-3xl'
    : 'text-3xl sm:text-4xl';

  return (
    <div className={`flex flex-col ${align === 'center' ? 'items-center text-center' : 'items-start'} select-none`}>
      {/* InsightAI in Elegant Cursive Script without AI square box */}
      <div className="flex items-center pt-1 pb-2">
        <span
          className={`brand-cursive ${fontClass} font-bold text-white tracking-wide leading-normal inline-block drop-shadow-[0_2px_12px_rgba(168,85,247,0.5)]`}
        >
          Insight<span className="text-[#a855f7]">A</span><span className="text-[#38bdf8]">I</span>
        </span>
      </div>
    </div>
  );
};

