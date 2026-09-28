import React from 'react';

export const EXTERNAL_PLATFORM_URL = 'https://sabir511-platform.vercel.app';

interface PlatformLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textColor?: string;
  subtitle?: string;
}

/**
 * شعار منصة العلوم والتقنية للجميع (صابر السيالي - Sabir Alsayyali)
 * يجسد الدورق الكيميائي العلمي، فقاعات التفاعل والابتكار، المدار الذري، وأقواس التركيز التقنية [ ]
 */
export const PlatformLogoEmblem: React.FC<{ sizePx?: number; className?: string }> = ({
  sizePx = 48,
  className = ''
}) => {
  return (
    <svg
      width={sizePx}
      height={sizePx}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform ${className}`}
      aria-label="شعار منصة العلوم والتقنية للجميع"
    >
      <defs>
        {/* Gradients matching the platform color scheme */}
        <linearGradient id="flaskGrad" x1="20" y1="20" x2="80" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="50%" stopColor="#009BB0" />
          <stop offset="100%" stopColor="#0C2340" />
        </linearGradient>

        <linearGradient id="liquidGrad" x1="30" y1="45" x2="70" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#009BB0" />
          <stop offset="100%" stopColor="#007A8A" />
        </linearGradient>

        <linearGradient id="bracketGrad" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00B4D8" />
          <stop offset="100%" stopColor="#0C2340" />
        </linearGradient>

        <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Cyber/Tech Corner Brackets [ ] */}
      {/* Top Left Bracket */}
      <path
        d="M 12 28 V 14 H 26"
        stroke="#009BB0"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Top Right Bracket */}
      <path
        d="M 88 28 V 14 H 74"
        stroke="#009BB0"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bottom Left Bracket */}
      <path
        d="M 12 72 V 86 H 26"
        stroke="#009BB0"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bottom Right Bracket */}
      <path
        d="M 88 72 V 86 H 74"
        stroke="#009BB0"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Atom Orbit Ellipse */}
      <ellipse
        cx="50"
        cy="55"
        rx="36"
        ry="14"
        transform="rotate(-25 50 55)"
        stroke="#22D3EE"
        strokeWidth="1.8"
        strokeDasharray="4 2"
        opacity="0.8"
      />
      {/* Orbit electron dots */}
      <circle cx="24" cy="42" r="2.5" fill="#38BDF8" filter="url(#glowFilter)" />
      <circle cx="76" cy="68" r="2.2" fill="#00B4D8" filter="url(#glowFilter)" />

      {/* Science Laboratory Flask (Erlenmeyer) */}
      {/* Flask Outline / Neck & Rim */}
      <path
        d="M 43 22 H 57 M 45 22 V 36 L 27 68 C 24 74 28 80 35 80 H 65 C 72 80 76 74 73 68 L 55 36 V 22"
        stroke="#102B4C"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="dark:stroke-[#E2E8F0]"
      />

      {/* Liquid inside the flask */}
      <path
        d="M 33 58 Q 42 54 50 58 T 67 58 L 71 67 C 73 72 70 77 64 77 H 36 C 30 77 27 72 29 67 Z"
        fill="url(#liquidGrad)"
      />

      {/* Science Bubbles inside Liquid */}
      <circle cx="43" cy="67" r="3" fill="#E0F7FA" opacity="0.9" />
      <circle cx="56" cy="64" r="2.2" fill="#FFFFFF" opacity="0.85" />
      <circle cx="48" cy="71" r="1.8" fill="#E0F7FA" opacity="0.75" />
      <circle cx="52" cy="49" r="1.6" fill="#22D3EE" filter="url(#glowFilter)" />

      {/* Glow Center Spark */}
      <path
        d="M 50 40 L 51.5 44 L 55 45.5 L 51.5 47 L 50 51 L 48.5 47 L 45 45.5 L 48.5 44 Z"
        fill="#22D3EE"
      />
    </svg>
  );
};

export const PlatformLogo: React.FC<PlatformLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  textColor,
  subtitle = 'العلوم والتقنية للجميع'
}) => {
  const sizeMap = {
    sm: { px: 36, text: 'text-base', sub: 'text-[10px]' },
    md: { px: 46, text: 'text-xl', sub: 'text-xs' },
    lg: { px: 56, text: 'text-2xl', sub: 'text-sm' },
    xl: { px: 72, text: 'text-3xl', sub: 'text-base' }
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`} dir="rtl">
      <div className="relative flex items-center justify-center p-1 rounded-2xl bg-gradient-to-br from-white via-teal-50/50 to-cyan-50/80 dark:from-[#102B4C] dark:to-[#081528] border border-cyan-200/80 dark:border-cyan-800/60 shadow-sm shadow-[#009BB0]/10">
        <PlatformLogoEmblem sizePx={currentSize.px} />
      </div>

      {showText && (
        <div className="flex flex-col text-right leading-tight">
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-tight ${currentSize.text} ${textColor || 'text-[#102B4C] dark:text-[#F1F5F9]'}`}>
              تَنافُسْ
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#009BB0]/10 text-[#009BB0] dark:bg-[#00B4D8]/20 dark:text-[#00B4D8] border border-[#009BB0]/20">
              الرسمية
            </span>
          </div>
          <span className={`font-bold text-[#009BB0] dark:text-[#00B4D8] ${currentSize.sub} flex items-center gap-1`}>
            <span>{subtitle}</span>
            <span className="text-[9px] text-[#5A6E85] dark:text-[#94A3B8] font-mono tracking-wider font-normal">
              • Sabir Alsayyali
            </span>
          </span>
        </div>
      )}
    </div>
  );
};
