import React from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';
import { EXTERNAL_PLATFORM_URL, PlatformLogoEmblem } from './PlatformLogo';

interface PlatformRedirectButtonProps {
  className?: string;
  variant?: 'nav' | 'hero' | 'icon-only' | 'footer' | 'pill';
  title?: string;
}

export const PlatformRedirectButton: React.FC<PlatformRedirectButtonProps> = ({
  className = '',
  variant = 'nav',
  title = 'منصة العلوم والتقنية للجميع'
}) => {
  if (variant === 'icon-only') {
    return (
      <a
        href={EXTERNAL_PLATFORM_URL}
        target="_blank"
        rel="noopener noreferrer"
        title="الانتقال إلى منصة العلوم والتقنية للجميع"
        aria-label="الانتقال إلى منصة العلوم والتقنية للجميع"
        className={`group relative flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 hover:bg-[#009BB0] text-[#009BB0] hover:text-white dark:bg-slate-800 dark:hover:bg-[#00B4D8] dark:text-[#00B4D8] dark:hover:text-[#0B1321] border border-[#009BB0]/30 transition-all shadow-xs cursor-pointer ${className}`}
      >
        <PlatformLogoEmblem sizePx={24} className="group-hover:scale-110 transition-transform" />
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#009BB0]"></span>
        </span>
      </a>
    );
  }

  if (variant === 'hero') {
    return (
      <a
        href={EXTERNAL_PLATFORM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-50 via-cyan-50 to-white dark:from-[#102B4C] dark:to-[#0A1A2F] border border-[#009BB0]/40 dark:border-cyan-700/60 shadow-md shadow-[#009BB0]/10 hover:shadow-lg hover:border-[#009BB0] transition-all group cursor-pointer ${className}`}
      >
        <div className="flex items-center justify-center p-1 rounded-xl bg-white dark:bg-[#0C2340] border border-cyan-200 dark:border-cyan-900 shadow-xs">
          <PlatformLogoEmblem sizePx={28} className="group-hover:scale-110 transition-transform" />
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#5A6E85] dark:text-[#94A3B8]">
            <span>المنصة الرئيسية</span>
            <ExternalLink className="w-3 h-3 text-[#009BB0] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div className="text-sm font-black text-[#102B4C] dark:text-[#F1F5F9] group-hover:text-[#009BB0] dark:group-hover:text-[#00B4D8] transition-colors">
            {title}
          </div>
        </div>
      </a>
    );
  }

  if (variant === 'footer') {
    return (
      <a
        href={EXTERNAL_PLATFORM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#0C2340] hover:bg-[#163861] border border-cyan-500/30 text-white transition-all group shadow-sm cursor-pointer ${className}`}
      >
        <PlatformLogoEmblem sizePx={24} className="group-hover:scale-110 transition-transform" />
        <span className="text-xs sm:text-sm font-bold text-cyan-200 group-hover:text-white transition-colors">
          {title}
        </span>
        <ExternalLink className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </a>
    );
  }

  // Default: 'nav'
  return (
    <a
      href={EXTERNAL_PLATFORM_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="زيارة منصة العلوم والتقنية للجميع"
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#F0F9FB] hover:bg-teal-100/70 dark:bg-slate-800/90 dark:hover:bg-slate-700/80 border border-[#009BB0]/30 hover:border-[#009BB0] text-[#102B4C] dark:text-[#F1F5F9] text-xs sm:text-sm font-bold transition-all shadow-xs group cursor-pointer ${className}`}
    >
      <PlatformLogoEmblem sizePx={22} className="group-hover:scale-110 transition-transform" />
      <span className="hidden xl:inline group-hover:text-[#009BB0] dark:group-hover:text-[#00B4D8] transition-colors">
        منصة العلوم والتقنية للجميع
      </span>
      <span className="hidden md:inline xl:hidden group-hover:text-[#009BB0] dark:group-hover:text-[#00B4D8] transition-colors">
        العلوم والتقنية
      </span>
      <ExternalLink className="w-3.5 h-3.5 text-[#009BB0] dark:text-[#00B4D8] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
    </a>
  );
};
