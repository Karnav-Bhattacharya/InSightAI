import React from "react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showSubtitle?: boolean;
  align?: "left" | "center";
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = "md",
  showSubtitle = false,
  align = "left",
}) => {
  const isLarge = size === "lg";
  const isSmall = size === "sm";

  const fontClass = isLarge
    ? "text-5xl sm:text-6xl"
    : isSmall
      ? "text-2xl sm:text-3xl"
      : "text-3xl sm:text-4xl";

  return (
    <div
      className={`flex flex-col ${
        align === "center" ? "items-center text-center" : "items-start"
      } select-none`}
    >
      <div className="flex items-center pt-1 pb-2">
        <span
          className={`brand-cursive ${fontClass} font-bold tracking-wide leading-normal inline-block`}
        >
          <span className="text-[#1E293B]">Insight</span>

          {/* A */}
          <span className="text-[#A855F7]">A</span>

          {/* I — light blue/teal */}
          <span className="text-[#A9CDD1]">I</span>
        </span>
      </div>

      {showSubtitle && (
        <span className="text-[9px] uppercase tracking-[0.25em] text-slate-500">
          Decision Intelligence
        </span>
      )}
    </div>
  );
};
