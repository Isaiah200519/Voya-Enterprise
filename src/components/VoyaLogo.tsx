import React from 'react';

interface VoyaLogoProps {
  light?: boolean; // true for light backgrounds (charcoal text), false for dark backgrounds (white text)
  className?: string; // custom classes for resizing/spacing
}

export default function VoyaLogo({ light = false, className = "" }: VoyaLogoProps) {
  return (
    <div id="voya-platform-logo" className={`flex flex-col items-start select-none font-sans ${className}`}>
      <div className="flex items-baseline leading-none gap-0.5">
        <span className={`font-display font-black text-xl md:text-2xl tracking-tight uppercase italic leading-none ${light ? 'text-slate-900' : 'text-white'}`}>
          Voya
        </span>
        <span className="text-[#ff9900] text-[9px] md:text-[10px] font-black tracking-widest uppercase leading-none">
          Direct
        </span>
      </div>
      {/* Curved Amazon-style smile arrow scaling with parent */}
      <svg className="w-[60px] md:w-[72px] h-[5px] md:h-[7px] mt-0.5" viewBox="0 0 100 10" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 2 Q 50 12 95 2" fill="none" stroke="#ff9900" strokeWidth="3" strokeLinecap="round" />
        <path d="M91 1.5 L95 4.5 L90 8" fill="none" stroke="#ff9900" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}
