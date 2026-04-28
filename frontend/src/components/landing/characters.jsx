import React from 'react';

export function Toddler() {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full">
      <ellipse cx="60" cy="70" rx="35" ry="30" fill="url(#toddlerGrad)" />
      <circle cx="48" cy="62" r="10" fill="#1a1a2e" />
      <circle cx="72" cy="62" r="10" fill="#1a1a2e" />
      <circle cx="50" cy="59" r="4" fill="white" />
      <circle cx="74" cy="59" r="4" fill="white" />
      <path d="M50 82 Q60 90 70 82" stroke="#1a1a2e" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="35" cy="72" r="6" fill="#ffb3c6" opacity="0.6" />
      <circle cx="85" cy="72" r="6" fill="#ffb3c6" opacity="0.6" />
      <ellipse cx="25" cy="75" rx="10" ry="8" fill="url(#toddlerGrad)" />
      <ellipse cx="95" cy="75" rx="10" ry="8" fill="url(#toddlerGrad)" />
      <circle cx="60" cy="95" r="8" fill="#FFD93D" stroke="#1a1a2e" strokeWidth="2" />
      <defs>
        <linearGradient id="toddlerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFB6C1" />
          <stop offset="100%" stopColor="#FFC0CB" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Explorer() {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full">
      <ellipse cx="60" cy="70" rx="35" ry="32" fill="url(#expGrad)" />
      <circle cx="45" cy="60" r="9" fill="#1a1a2e" />
      <circle cx="75" cy="60" r="9" fill="#1a1a2e" />
      <circle cx="47" cy="57" r="3" fill="white" />
      <circle cx="77" cy="57" r="3" fill="white" />
      <path d="M45 80 Q60 95 75 80" stroke="#1a1a2e" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="60" cy="35" rx="25" ry="8" fill="#8B4513" />
      <ellipse cx="60" cy="32" rx="18" ry="12" fill="#A0522D" />
      <circle cx="100" cy="50" r="12" fill="none" stroke="#1a1a2e" strokeWidth="3" />
      <line x1="108" y1="58" x2="115" y2="65" stroke="#1a1a2e" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="20" cy="70" rx="12" ry="10" fill="url(#expGrad)" />
      <ellipse cx="95" cy="55" rx="10" ry="12" fill="url(#expGrad)" />
      <defs>
        <linearGradient id="expGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD93D" />
          <stop offset="100%" stopColor="#FF8E53" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Learner() {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full">
      <ellipse cx="60" cy="70" rx="35" ry="32" fill="url(#lrnGrad)" />
      <circle cx="45" cy="58" r="12" fill="none" stroke="#1a1a2e" strokeWidth="2" />
      <circle cx="75" cy="58" r="12" fill="none" stroke="#1a1a2e" strokeWidth="2" />
      <line x1="57" y1="58" x2="63" y2="58" stroke="#1a1a2e" strokeWidth="2" />
      <circle cx="45" cy="58" r="6" fill="#1a1a2e" />
      <circle cx="75" cy="58" r="6" fill="#1a1a2e" />
      <circle cx="47" cy="56" r="2" fill="white" />
      <circle cx="77" cy="56" r="2" fill="white" />
      <path d="M48 82 Q60 90 72 82" stroke="#1a1a2e" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="10" y="75" width="20" height="25" rx="2" fill="#4169E1" />
      <line x1="20" y1="75" x2="20" y2="100" stroke="#1a1a2e" strokeWidth="1" />
      <circle cx="60" cy="20" r="12" fill="#FFD93D" />
      <rect x="56" y="30" width="8" height="6" fill="#FFD93D" />
      <ellipse cx="15" cy="80" rx="10" ry="12" fill="url(#lrnGrad)" />
      <ellipse cx="100" cy="75" rx="12" ry="10" fill="url(#lrnGrad)" />
      <defs>
        <linearGradient id="lrnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6FFF00" />
          <stop offset="100%" stopColor="#00D4AA" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Achiever() {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full">
      <ellipse cx="60" cy="70" rx="35" ry="32" fill="url(#achGrad)" />
      <circle cx="45" cy="58" r="7" fill="#1a1a2e" />
      <circle cx="75" cy="58" r="7" fill="#1a1a2e" />
      <circle cx="47" cy="56" r="2" fill="white" />
      <circle cx="77" cy="56" r="2" fill="white" />
      <path d="M50 80 Q60 86 72 78" stroke="#1a1a2e" strokeWidth="3" fill="none" strokeLinecap="round" />
      <polygon points="60,20 30,35 60,50 90,35" fill="#1a1a2e" />
      <rect x="40" y="30" width="40" height="8" fill="#1a1a2e" />
      <line x1="80" y1="35" x2="95" y2="50" stroke="#FFD93D" strokeWidth="2" />
      <circle cx="95" cy="52" r="4" fill="#FFD93D" />
      <rect x="95" y="60" width="15" height="20" rx="2" fill="#FFD93D" />
      <ellipse cx="102" cy="60" rx="10" ry="6" fill="#FFD93D" />
      <ellipse cx="20" cy="70" rx="12" ry="10" fill="url(#achGrad)" />
      <ellipse cx="95" cy="68" rx="8" ry="12" fill="url(#achGrad)" />
      <defs>
        <linearGradient id="achGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00B4D8" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
    </svg>
  );
}
