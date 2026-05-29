'use client';

import React from 'react';
import Link from 'next/link';

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  href?: string;
  lightText?: boolean;
}

export function RodaNexoIcon({ size = 32, className, ...props }: { size?: number } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Outer tire left half (dark slate) */}
      <path
        d="M 50 10 A 40 40 0 0 0 50 90"
        stroke="#1E293B"
        strokeWidth="9"
        strokeLinecap="round"
      />

      {/* Outer tire tread marks (radial lines on the left side) */}
      {/* 120deg */}
      <line x1="30" y1="15.4" x2="25.5" y2="7.6" stroke="#1E293B" strokeWidth="5" strokeLinecap="round" />
      {/* 140deg */}
      <line x1="19.4" y1="24.3" x2="13.9" y2="19.7" stroke="#1E293B" strokeWidth="5" strokeLinecap="round" />
      {/* 160deg */}
      <line x1="12.4" y1="36.3" x2="6.6" y2="34.2" stroke="#1E293B" strokeWidth="5" strokeLinecap="round" />
      {/* 180deg */}
      <line x1="10" y1="50" x2="3.5" y2="50" stroke="#1E293B" strokeWidth="5" strokeLinecap="round" />
      {/* 200deg */}
      <line x1="12.4" y1="63.7" x2="6.6" y2="65.8" stroke="#1E293B" strokeWidth="5" strokeLinecap="round" />
      {/* 220deg */}
      <line x1="19.4" y1="75.7" x2="13.9" y2="80.3" stroke="#1E293B" strokeWidth="5" strokeLinecap="round" />
      {/* 240deg */}
      <line x1="30" y1="84.6" x2="25.5" y2="92.4" stroke="#1E293B" strokeWidth="5" strokeLinecap="round" />

      {/* Blue splash/highlight on the bottom-left edge */}
      <path
        d="M 22 72 A 40 40 0 0 0 50 90"
        stroke="#0066FF"
        strokeWidth="9"
        strokeLinecap="round"
      />

      {/* Inner Wheel Rim (dark slate) */}
      <circle cx="50" cy="50" r="18" stroke="#1E293B" strokeWidth="3.5" fill="none" />
      <circle cx="50" cy="50" r="6" fill="#1E293B" />
      <circle cx="50" cy="50" r="2" fill="#FFFFFF" />

      {/* Spokes (6 spokes) */}
      {/* 0 deg */}
      <line x1="56" y1="50" x2="68" y2="50" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
      {/* 180 deg */}
      <line x1="44" y1="50" x2="32" y2="50" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
      {/* 60 deg */}
      <line x1="53" y1="55.2" x2="59" y2="65.6" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
      {/* 240 deg */}
      <line x1="47" y1="44.8" x2="41" y2="34.4" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
      {/* 120 deg */}
      <line x1="47" y1="55.2" x2="41" y2="65.6" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
      {/* 300 deg */}
      <line x1="53" y1="44.8" x2="59" y2="34.4" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />

      {/* Blue network lines connecting nodes on the right */}
      <line x1="50" y1="10" x2="78.28" y2="21.72" stroke="#0066FF" strokeWidth="5.5" strokeLinecap="round" />
      <line x1="78.28" y1="21.72" x2="90" y2="50" stroke="#0066FF" strokeWidth="5.5" strokeLinecap="round" />
      <line x1="90" y1="50" x2="78.28" y2="78.28" stroke="#0066FF" strokeWidth="5.5" strokeLinecap="round" />
      <line x1="78.28" y1="78.28" x2="50" y2="90" stroke="#0066FF" strokeWidth="5.5" strokeLinecap="round" />

      {/* Nodes (Circles with white center) */}
      <circle cx="78.28" cy="21.72" r="7" fill="#FFFFFF" stroke="#0066FF" strokeWidth="4.5" />
      <circle cx="90" cy="50" r="7" fill="#FFFFFF" stroke="#0066FF" strokeWidth="4.5" />
      <circle cx="78.28" cy="78.28" r="7" fill="#FFFFFF" stroke="#0066FF" strokeWidth="4.5" />
    </svg>
  );
}

export function RodaNexoLogo({
  size = 'md',
  showText = true,
  href,
  lightText = false,
  className = '',
  ...props
}: LogoProps) {
  const iconSizes = {
    sm: 24,
    md: 30,
    lg: 38,
  };

  const textSizes = {
    sm: 'text-base tracking-tight',
    md: 'text-xl tracking-tight',
    lg: 'text-2xl tracking-tight',
  };

  const textClass = lightText ? 'text-white' : 'text-slate-900';

  const logoContent = (
    <div className={`flex items-center gap-2 font-bold ${className}`} {...props}>
      <RodaNexoIcon size={iconSizes[size]} />
      {showText && (
        <span className={`${textSizes[size]} select-none font-bold`}>
          <span className={textClass}>Roda</span>
          <span className="text-blue-600">Nexo</span>
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-90 transition-opacity">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}
