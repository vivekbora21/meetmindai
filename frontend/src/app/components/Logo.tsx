import React from "react";
import Image from "next/image";

interface LogoProps {
  invert?: boolean;
}

export function Logo({ invert = false }: LogoProps) {
  return (
    <div className="flex items-center gap-2 pl-2">
      <Image 
        className="flex-shrink-0 h-10 w-auto rounded-xl object-contain shadow-sm" 
        src="/new_logo.png" 
        alt="MeetingMind AI Logo" 
        width={40}
        height={40}
        priority
      />
      <span className={`font-bold text-lg tracking-tight ${invert ? 'text-white' : 'text-gray-900'}`}>
        MeetingMind AI
      </span>
    </div>
  );
}
